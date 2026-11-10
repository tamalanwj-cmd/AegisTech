
/**
 * Authentication and account management service.
 * Authentication is handled by Supabase Auth.
 * Account creation and updates are handled by the admin-create-user Edge Function.
 */

import { supabase } from './supabaseClient';

/* ------------------------------- constants -------------------------------- */

export const ROLES = ['admin', 'participant', 'observer'];
export const STATUSES = ['Active', 'Inactive'];

export const PASSWORD_MIN_LENGTH = 8;

const USERNAME_RE = /^[A-Za-z0-9._-]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------- validation ------------------------------- */

const sanitizeRole = (role, fallback = 'participant') => {
  const value = String(role || '').trim().toLowerCase();
  return ROLES.includes(value) ? value : fallback;
};

const sanitizeStatus = (status, fallback = 'Active') => {
  const value = String(status || '').trim().toLowerCase();
  return STATUSES.find((item) => item.toLowerCase() === value) || fallback;
};

/* ------------------------------- session ---------------------------------- */

export async function getToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Failed to retrieve session:', error.message);
    return null;
  }

  return data.session?.access_token || null;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const user = data.user;
  const role = user.app_metadata?.role || 'participant';

  return {
    Id: user.id,
    Name: user.user_metadata?.first_name || user.email,
    Email: user.email,
    Role: role,
    isAdmin: role === 'admin',
  };
}

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

/* -------------------------------- login ----------------------------------- */
export async function login({
  identifier,
  password,
  portal,
  remember = true,
}) {
  const email = String(identifier || '').trim().toLowerCase();

  if (!email || !password) {
    throw new Error('Please enter email and password');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error('Invalid email or password');
  }

  const user = data.user;

  // Verify that the account exists and is active.
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('status')
    .eq('id', user.id)
    .maybeSingle();

  if (accountError || !account || account.status !== 'Active') {
    await supabase.auth.signOut();

    if (accountError) {
      throw new Error('Unable to verify your account. Please try again.');
    }

    throw new Error('Your account is inactive. Please contact an administrator.');
  }

  const role = user.app_metadata?.role || 'participant';

  if (portal === 'admin' && role !== 'admin') {
    await supabase.auth.signOut();
    throw new Error('This account does not have administrator access');
  }

  if (portal === 'participant' && role !== 'participant') {
    await supabase.auth.signOut();
    throw new Error('This account does not have participant access');
  }

  return {
    Id: user.id,
    Name: user.user_metadata?.first_name || user.email,
    Email: user.email,
    Role: role,
    isAdmin: role === 'admin',
  };
}


/* ---------------------------- Edge Function ------------------------------- */

async function invokeAdminUserFunction(payload) {
  const { data, error } = await supabase.functions.invoke(
    'admin-create-user',
    { body: payload }
  );

  if (error) {
    let message = error.message || 'Account operation failed';

    try {
      const response = await error.context?.json();

      if (response?.error) {
        message = response.error;
      }
    } catch {
      // Keep the original error message.
    }

    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

/* ---------------------------- user management ---------------------------- */

/** Retrieve accounts from Supabase. */
export async function listUsers({ limit = 500 } = {}) {
  const { data, error } = await supabase
    .from('accounts')
    .select(`
      id,
      first_name,
      last_name,
      username,
      email,
      is_admin,
      status,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to retrieve users:', error);
    throw new Error(error.message || 'Could not load users');
  }

  return (data || []).map((row) => ({
    Id: row.id,
    name: [row.first_name, row.last_name].filter(Boolean).join(' '),
    username: row.username || '',
    email: row.email || '',
    role: row.is_admin ? 'admin' : 'participant',
    isAdmin: row.is_admin,
    status: row.status || 'Active',
    signup_at: row.created_at || null,
    last_login: null,
  }));
}

/** Create an account through the administrator Edge Function. */
export async function createUser({
  username,
  email,
  name,
  password,
  role,
  status,
}) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();

  if (!USERNAME_RE.test(cleanUsername)) {
    throw new Error(
      'Username must be 3-32 characters: letters, numbers, . _ -'
    );
  }

  if (!EMAIL_RE.test(cleanEmail)) {
    throw new Error('Invalid email format');
  }

  if (!cleanName) {
    throw new Error('Please enter name');
  }

  if (String(password || '').length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    );
  }

  const cleanRole =
    sanitizeRole(role) === 'admin' ? 'admin' : 'participant';

  const cleanStatus = sanitizeStatus(status);

  const result = await invokeAdminUserFunction({
    action: 'create',
    username: cleanUsername,
    email: cleanEmail,
    firstName: cleanName,
    lastName: '',
    password,
    role: cleanRole,
    status: cleanStatus,
  });

  return {
    Id: result.user.id,
    username: cleanUsername,
  };
}

/** Update an account through the administrator Edge Function. */
export async function updateUser(
  id,
  { username, email, name, role, status, password }
) {
  if (!id) {
    throw new Error('A valid account ID is required');
  }

  const payload = {
    action: 'update',
    userId: String(id),
  };

  if (name !== undefined) {
    const cleanName = String(name).trim();

    if (!cleanName) {
      throw new Error('Please enter name');
    }

    payload.firstName = cleanName;
  }

  if (username !== undefined) {
    const cleanUsername = String(username).trim().toLowerCase();

    if (!USERNAME_RE.test(cleanUsername)) {
      throw new Error(
        'Username must be 3-32 characters: letters, numbers, . _ -'
      );
    }

    payload.username = cleanUsername;
  }

  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();

    if (!EMAIL_RE.test(cleanEmail)) {
      throw new Error('Invalid email format');
    }

    payload.email = cleanEmail;
  }

  if (role !== undefined) {
    payload.role =
      sanitizeRole(role) === 'admin' ? 'admin' : 'participant';
  }

  if (status !== undefined) {
    payload.status = sanitizeStatus(status);
  }

  if (password) {
    if (String(password).length < PASSWORD_MIN_LENGTH) {
      throw new Error(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
      );
    }

    payload.password = password;
  }

  const result = await invokeAdminUserFunction(payload);

  return {
    Id: result.user.id,
    username: result.user.username,
    email: result.user.email,
    role: result.user.role,
    status: result.user.status,
  };
}


/**
 * Activate or deactivate an account without deleting its records.
 */
export async function setUserStatus(id, status) {
  if (!id) {
    throw new Error('A valid account ID is required');
  }

  const cleanStatus = sanitizeStatus(status, '');

  if (!cleanStatus) {
    throw new Error('Invalid account status');
  }

  return updateUser(id, { status: cleanStatus });
}

