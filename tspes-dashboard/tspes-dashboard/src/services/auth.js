/**
 * Auth service: register / login / password reset, backed by NocoDB.
 *
 * Passwords are never stored or sent in plaintext. We derive a PBKDF2-SHA256
 * hash (100k iterations) with a per-user random salt using the Web Crypto API.
 * The same derivation is mirrored in scripts/setup-nocodb.mjs for seeding.
 */
import * as db from './nocodbClient';

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/* ----------------------------- crypto helpers ----------------------------- */

const bytesToHex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const hexToBytes = (hex) => {
  const clean = hex.replace(/[^0-9a-f]/gi, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
};

const randomHex = (bytes = SALT_BYTES) => {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return bytesToHex(buf);
};

const randomCode = (digits = 6) => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 10 ** digits).padStart(digits, '0');
};

async function pbkdf2Hex(password, saltHex, iterations = PBKDF2_ITERATIONS) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations, hash: 'SHA-256' },
    key,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function hashPassword(password, saltHex = randomHex()) {
  return { salt: saltHex, hash: await pbkdf2Hex(password, saltHex) };
}

/* ------------------------------- session --------------------------------- */

const SESSION_TOKEN_KEY = 'token';
const SESSION_USER_KEY = 'user';

/**
 * Sessions live in localStorage when "Remember me" is checked and in
 * sessionStorage otherwise, so closing the browser ends the session.
 */
function readSession() {
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const token = store.getItem(SESSION_TOKEN_KEY);
      const raw = store.getItem(SESSION_USER_KEY);
      if (token && raw) return { token, user: JSON.parse(raw) };
    } catch {
      /* storage unavailable — skip */
    }
  }
  return null;
}

export function getToken() {
  return readSession()?.token || null;
}

export function getCurrentUser() {
  return readSession()?.user || null;
}

function normalizeUser(row) {
  return {
    Id: row.Id,
    Name: row.name || row.username || row.email,
    UserName: row.username,
    Email: row.email,
    Role: row.role || 'participant',
    isAdmin: (row.role || '').toLowerCase() === 'admin',
  };
}

function startSession(row, { persistent = true } = {}) {
  const store = persistent ? window.localStorage : window.sessionStorage;
  const other = persistent ? window.sessionStorage : window.localStorage;
  try {
    other.removeItem(SESSION_TOKEN_KEY);
    other.removeItem(SESSION_USER_KEY);
    store.setItem(SESSION_TOKEN_KEY, `nc-${randomHex(16)}`);
    store.setItem(SESSION_USER_KEY, JSON.stringify(normalizeUser(row)));
  } catch {
    /* storage unavailable — session cannot persist */
  }
}

export function logout() {
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      store.removeItem(SESSION_TOKEN_KEY);
      store.removeItem(SESSION_USER_KEY);
    } catch {
      /* storage unavailable */
    }
  }
}

/* -------------------------------- lookup --------------------------------- */

const findByEmail = (email) => db.findOne(`(email,eq,${db.wv(email.trim())})`);
const findByUsername = (username) => db.findOne(`(username,eq,${db.wv(username.trim())})`);

/* ------------------------------- register -------------------------------- */

/** Roles stored in the `role` column (lowercase, see AUTH_SETUP.md). */
export const ROLES = ['admin', 'facilitator', 'participant', 'observer'];
export const STATUSES = ['Active', 'Inactive'];

/** Roles a visitor may self-select by walking in through a portal card. */
export const SIGNUP_ROLES = { participant: 'participant', admin: 'admin' };

const USERNAME_RE = /^[A-Za-z0-9._-]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizeRole = (role, fallback = 'participant') => {
  const value = String(role || '').trim().toLowerCase();
  return ROLES.includes(value) ? value : fallback;
};

const sanitizeStatus = (status, fallback = 'Active') => {
  const value = String(status || '').trim().toLowerCase();
  return STATUSES.find((s) => s.toLowerCase() === value) || fallback;
};

/** Shape a NocoDB row for the UI: exposes the role/status the app expects. */
const publicUser = (row) => ({
  Id: row.Id,
  username: row.username || '',
  email: row.email || '',
  name: row.name || row.username || row.email || '',
  role: sanitizeRole(row.role, 'participant'),
  status: sanitizeStatus(row.status, 'Active'),
  signup_at: row.signup_at || row.CreatedAt || null,
  last_login: row.last_login || null,
});

/**
 * Register a new account.
 *
 * The portal the visitor came through decides the role: the Participant Portal
 * card signs up `participant` accounts, the Administrator Portal card signs up
 * `admin` accounts. Anything else falls back to `participant` so a tampered
 * query string cannot invent a role.
 */
export async function register({ username, email, name, password, portal }) {
  if (!db.isConfigured()) throw new Error('NocoDB is not configured (.env.local)');

  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim();
  const role = SIGNUP_ROLES[String(portal || '').toLowerCase()] || 'participant';

  if (!USERNAME_RE.test(cleanUsername)) {
    throw new Error('Username must be 3-32 characters: letters, numbers, . _ -');
  }

  if (await findByEmail(cleanEmail)) throw new Error('An account with this email already exists');
  if (await findByUsername(cleanUsername)) throw new Error('This username is already taken');

  const { salt, hash } = await hashPassword(password);

  await db.insertRow({
    username: cleanUsername,
    email: cleanEmail,
    name: name.trim(),
    password_hash: hash,
    salt,
    role,
    status: 'Active',
    signup_at: new Date().toISOString(),
  });

  return { email: cleanEmail, role };
}

/* --------------------------------- login --------------------------------- */

export async function login({ identifier, password, portal, remember = true }) {
  if (!db.isConfigured()) throw new Error('NocoDB is not configured (.env.local)');

  const value = identifier.trim();
  const row = value.includes('@') ? await findByEmail(value) : await findByUsername(value);

  // Uniform message so we do not reveal which accounts exist.
  const invalid = new Error('Invalid email/username or password');
  if (!row) throw invalid;

  const { hash } = await hashPassword(password, row.salt);
  if (hash !== row.password_hash) throw invalid;

  if ((row.status || '').toLowerCase() === 'inactive') {
    throw new Error('This account is inactive. Please contact an administrator.');
  }

  if (portal === 'admin' && (row.role || '').toLowerCase() !== 'admin') {
    throw new Error('This account does not have administrator access');
  }

  startSession(row, { persistent: remember });
  db.updateRow(row.Id, { last_login: new Date().toISOString() }).catch(() => {});

  return normalizeUser(row);
}

/* ---------------------------- user management ---------------------------- */

/** Everyone in the users table, oldest first, without password material. */
export async function listUsers({ limit = 500 } = {}) {
  if (!db.isConfigured()) throw new Error('NocoDB is not configured (.env.local)');

  const rows = await db.listRows('', { limit });
  return rows.slice().sort((a, b) => (a.Id || 0) - (b.Id || 0)).map(publicUser);
}

export async function getUserById(id) {
  if (!db.isConfigured()) throw new Error('NocoDB is not configured (.env.local)');
  const row = await db.findOne(`(Id,eq,${Number(id)})`);
  return row ? publicUser(row) : null;
}

/** Create an account from the admin Users page. */
export async function createUser({ username, email, name, password, role, status }) {
  if (!db.isConfigured()) throw new Error('NocoDB is not configured (.env.local)');

  const cleanUsername = String(username || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();

  if (!USERNAME_RE.test(cleanUsername)) {
    throw new Error('Username must be 3-32 characters: letters, numbers, . _ -');
  }
  if (!EMAIL_RE.test(cleanEmail)) throw new Error('Invalid email format');
  if (!cleanName) throw new Error('Please enter name');
  if (String(password || '').length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  if (await findByEmail(cleanEmail)) throw new Error('An account with this email already exists');
  if (await findByUsername(cleanUsername)) throw new Error('This username is already taken');

  const { salt, hash } = await hashPassword(password);

  const created = await db.insertRow({
    username: cleanUsername,
    email: cleanEmail,
    name: cleanName,
    password_hash: hash,
    salt,
    role: sanitizeRole(role),
    status: sanitizeStatus(status),
    signup_at: new Date().toISOString(),
  });

  return { Id: created?.Id ?? null, username: cleanUsername };
}

/**
 * Update an account. `password` is optional: when omitted the existing hash is
 * kept, so editing a name never resets a password.
 */
export async function updateUser(id, { username, email, name, role, status, password }) {
  if (!db.isConfigured()) throw new Error('NocoDB is not configured (.env.local)');

  const row = await db.findOne(`(Id,eq,${Number(id)})`);
  if (!row) throw new Error('This account no longer exists');

  const fields = {};

  if (name !== undefined) {
    const cleanName = String(name).trim();
    if (!cleanName) throw new Error('Please enter name');
    fields.name = cleanName;
  }

  if (username !== undefined) {
    const cleanUsername = String(username).trim();
    if (!USERNAME_RE.test(cleanUsername)) {
      throw new Error('Username must be 3-32 characters: letters, numbers, . _ -');
    }
    if (cleanUsername !== row.username) {
      if (await findByUsername(cleanUsername)) throw new Error('This username is already taken');
    }
    fields.username = cleanUsername;
  }

  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) throw new Error('Invalid email format');
    if (cleanEmail !== row.email) {
      if (await findByEmail(cleanEmail)) throw new Error('An account with this email already exists');
    }
    fields.email = cleanEmail;
  }

  if (role !== undefined) fields.role = sanitizeRole(role, row.role || 'participant');
  if (status !== undefined) fields.status = sanitizeStatus(status, row.status || 'Active');

  if (password) {
    if (String(password).length < 6) throw new Error('Password must be at least 6 characters');
    const { salt, hash } = await hashPassword(password);
    fields.password_hash = hash;
    fields.salt = salt;
    fields.reset_code_hash = null;
    fields.reset_code_expires = null;
  }

  if (!Object.keys(fields).length) return publicUser(row);

  await db.updateRow(row.Id, fields);
  return publicUser({ ...row, ...fields });
}

export async function deleteUser(id) {
  if (!db.isConfigured()) throw new Error('NocoDB is not configured (.env.local)');

  const row = await db.findOne(`(Id,eq,${Number(id)})`);
  if (!row) throw new Error('This account no longer exists');

  await db.deleteRow(row.Id);
  return { Id: row.Id };
}

/** Password strength rule shared by sign-up and admin forms. */
export const PASSWORD_MIN_LENGTH = 6;

/* --------------------------- password reset ------------------------------ */

/**
 * Creates a reset code for the account. Returns found:false for unknown emails
 * so callers can show a neutral message and avoid account enumeration.
 *
 * There is no mail service in this project, so the code is returned to the
 * caller for on-screen display (demo mode). Swap `code` for an email send step
 * when an email provider becomes available.
 */
export async function requestPasswordReset(email) {
  if (!db.isConfigured()) throw new Error('NocoDB is not configured (.env.local)');

  const row = await findByEmail(email);
  if (!row) return { found: false };

  const code = randomCode(6);
  await db.updateRow(row.Id, {
    reset_code_hash: await sha256Hex(code),
    reset_code_expires: new Date(Date.now() + RESET_CODE_TTL_MS).toISOString(),
  });

  return { found: true, code, email: row.email };
}

export async function resetPassword({ email, code, password }) {
  if (!db.isConfigured()) throw new Error('NocoDB is not configured (.env.local)');

  const row = await findByEmail(email);
  if (!row) throw new Error('Invalid or expired reset code');

  if (!row.reset_code_hash || !row.reset_code_expires) {
    throw new Error('Invalid or expired reset code');
  }
  if (new Date(row.reset_code_expires).getTime() < Date.now()) {
    throw new Error('This reset code has expired. Please request a new one.');
  }
  if ((await sha256Hex(String(code).trim())) !== row.reset_code_hash) {
    throw new Error('Invalid or expired reset code');
  }

  const { salt, hash } = await hashPassword(password);
  await db.updateRow(row.Id, {
    password_hash: hash,
    salt,
    reset_code_hash: null,
    reset_code_expires: null,
  });

  return { email: row.email };
}
