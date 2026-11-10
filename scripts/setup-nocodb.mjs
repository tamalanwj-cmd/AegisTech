/**
 * Provision the NocoDB tables the dashboard needs, and seed the first
 * administrator account.
 *
 * Run once against a fresh NocoDB instance, after REACT_APP_NOCODB_URL,
 * REACT_APP_NOCODB_BASE_ID and REACT_APP_NOCODB_TOKEN are set in .env.local:
 *
 *   npm run setup:nocodb
 *
 * The script is idempotent: tables that already exist are left untouched, extra
 * columns are only added when they are missing, and the administrator is only
 * created when the users table is still empty. It is therefore safe to re-run
 * at any time — and it is also how an existing installation picks up the tables
 * and columns added for marking:
 *
 *   categories  custom crisis categories created from the Scenarios page
 *   responses   participant answers, time taken, marks and feedback
 *   scenarios.objectives   learning objectives shown to participants
 *   injects.rubric         marking guide shown beside an answer
 *
 * Self sign-up is disabled in the app (only administrators create accounts), so
 * this seed is the only way to get the first account into a fresh instance.
 *
 * Existing tables are matched by table_name (the internal title), not by id,
 * because ids differ between NocoDB instances.
 *
 * Column types stay deliberately simple (text/number/date); allowed values for
 * status/role fields are enforced in the app, which avoids depending on
 * NocoDB's single-select option payload shape.
 *
 * Optional overrides for the seeded account: ADMIN_USERNAME, ADMIN_EMAIL and
 * ADMIN_PASSWORD (process env or .env.local).
 */
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* --------------------------------- env ----------------------------------- */

function loadEnv() {
  const file = resolve(root, '.env.local');
  if (!existsSync(file)) {
    console.error('[x] .env.local not found in tspes-dashboard/. Create it with the NocoDB settings.');
    process.exit(1);
  }

  const env = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = (env.REACT_APP_NOCODB_URL || 'http://localhost:8080').replace(/\/+$/, '');
const baseId = env.REACT_APP_NOCODB_BASE_ID;
const token = env.REACT_APP_NOCODB_TOKEN;

if (!baseId || !token) {
  console.error('[x] REACT_APP_NOCODB_BASE_ID and REACT_APP_NOCODB_TOKEN must be set in .env.local');
  process.exit(1);
}

const headers = { 'Content-Type': 'application/json', 'xc-token': token };

async function api(path, options = {}) {
  const res = await fetch(`${url}${path}`, { headers, ...options });
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const msg = body?.msg || body?.message || body?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

/* ----------------------------- password hashing --------------------------- */

/**
 * Mirrors src/services/auth.js so a seeded account can be verified by the app:
 * PBKDF2-SHA256, 100k iterations, 16-byte random salt, 32-byte key, hex output.
 * The app derives the hash in the browser with Web Crypto; Node's pbkdf2Sync
 * produces byte-identical results for the same salt and password.
 */
const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;

function hashPassword(password, saltHex = randomBytes(SALT_BYTES).toString('hex')) {
  const hash = pbkdf2Sync(password, Buffer.from(saltHex, 'hex'), PBKDF2_ITERATIONS, 32, 'sha256');
  return { salt: saltHex, hash: hash.toString('hex') };
}

/* ------------------------------ table schema ------------------------------ */

const T = {
  SingleLineText: 'SingleLineText',
  LongText: 'LongText',
  Number: 'Number',
  DateTime: 'DateTime',
};

const TABLES = [
  {
    title: 'Categories',
    table_name: 'categories',
    columns: [
      { title: 'name', uidt: T.SingleLineText },
      { title: 'created_at', uidt: T.DateTime },
    ],
  },
  {
    title: 'Groups',
    table_name: 'groups',
    columns: [
      { title: 'name', uidt: T.SingleLineText },
      { title: 'description', uidt: T.LongText },
      { title: 'members', uidt: T.LongText },
      { title: 'created_at', uidt: T.DateTime },
    ],
  },
  {
    title: 'Courses',
    table_name: 'courses',
    columns: [
      { title: 'name', uidt: T.SingleLineText },
      { title: 'description', uidt: T.LongText },
      { title: 'enrolments', uidt: T.LongText },
      { title: 'group_id', uidt: T.Number },
      { title: 'scenario_id', uidt: T.Number },
      { title: 'status', uidt: T.SingleLineText },
      { title: 'created_at', uidt: T.DateTime },
    ],
  },
  {
    title: 'Scenarios',
    table_name: 'scenarios',
    columns: [
      { title: 'name', uidt: T.SingleLineText },
      { title: 'description', uidt: T.LongText },
      { title: 'objectives', uidt: T.LongText },
      { title: 'course_id', uidt: T.Number },
      { title: 'crisis_type', uidt: T.SingleLineText },
      { title: 'status', uidt: T.SingleLineText },
      { title: 'created_at', uidt: T.DateTime },
    ],
  },
  {
    title: 'Injects',
    table_name: 'injects',
    columns: [
      { title: 'scenario_id', uidt: T.Number },
      { title: 'title', uidt: T.SingleLineText },
      { title: 'description', uidt: T.LongText },
      { title: 'information', uidt: T.LongText },
      { title: 'sequence', uidt: T.Number },
      { title: 'assigned_role', uidt: T.SingleLineText },
      { title: 'rubric', uidt: T.LongText },
    ],
  },
  {
    title: 'Responses',
    table_name: 'responses',
    columns: [
      { title: 'user_id', uidt: T.Number },
      { title: 'course_id', uidt: T.Number },
      { title: 'scenario_id', uidt: T.Number },
      { title: 'inject_id', uidt: T.Number },
      { title: 'answer', uidt: T.LongText },
      { title: 'submitted_at', uidt: T.DateTime },
      { title: 'time_spent_seconds', uidt: T.Number },
      { title: 'marks', uidt: T.Number },
      { title: 'feedback', uidt: T.LongText },
      { title: 'marked_by', uidt: T.Number },
      { title: 'marked_at', uidt: T.DateTime },
    ],
  },
];

/**
 * Columns added after the first release. Existing installations already have
 * the tables, so they only need the new columns — NocoDB does not add them when
 * the table already exists.
 */
const COLUMN_MIGRATIONS = [
  { table: 'scenarios', columns: [{ title: 'objectives', uidt: T.LongText }] },
  { table: 'injects', columns: [{ title: 'rubric', uidt: T.LongText }] },
];

/* --------------------------------- main ---------------------------------- */

async function listTables() {
  const data = await api(`/api/v2/meta/bases/${encodeURIComponent(baseId)}/tables`);
  return data?.list ?? [];
}

const tableKey = (table) => String(table.table_name || '').toLowerCase().split('___').pop();

/** Add any column that is missing from an existing table. */
async function ensureColumns(tables) {
  for (const spec of COLUMN_MIGRATIONS) {
    const table = tables.find((t) => tableKey(t) === spec.table);
    if (!table) {
      console.log(`  ! ${spec.table} table not found - skipped its column migration`);
      continue;
    }

    const meta = await api(`/api/v2/meta/tables/${encodeURIComponent(table.id)}`);
    const existing = new Set(
      (meta?.columns || []).map((column) => String(column.title || '').toLowerCase())
    );

    for (const column of spec.columns) {
      if (existing.has(column.title.toLowerCase())) {
        console.log(`  ok ${spec.table}.${column.title} already exists`);
        continue;
      }
      try {
        await api(`/api/v2/meta/tables/${encodeURIComponent(table.id)}/columns`, {
          method: 'POST',
          body: JSON.stringify(column),
        });
        console.log(`  + ${spec.table}.${column.title} added`);
      } catch (e) {
        console.error(`  x ${spec.table}.${column.title} failed: ${e.message}`);
        process.exitCode = 1;
      }
    }
  }
}

/* --------------------------- initial administrator ------------------------ */

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || env.ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || env.ADMIN_EMAIL || 'admin@tspes.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD || 'admin123';
const DEFAULT_PASSWORD = 'admin123';

/** Locate the users table by env id first, then by title/table_name. */
function findUsersTable(tables) {
  if (env.REACT_APP_NOCODB_TABLE_ID) {
    const byId = tables.find((t) => t.id === env.REACT_APP_NOCODB_TABLE_ID);
    if (byId) return byId;
  }
  const want = String(env.REACT_APP_NOCODB_USERS_TABLE || 'users').toLowerCase();
  return (
    tables.find((t) => String(t.title || '').toLowerCase() === want) ||
    tables.find((t) => tableKey(t) === want) ||
    null
  );
}

/**
 * Seed the first administrator. Self sign-up is disabled, so without this a
 * fresh instance would have no way to obtain its first account.
 */
async function seedAdmin(tables) {
  const usersTable = findUsersTable(tables);
  if (!usersTable) {
    console.log('\n[!] Users table not found - skipped the administrator seed.');
    console.log('  Create a "Users" table in NocoDB, then re-run this script.');
    return;
  }

  const recordsUrl = `/api/v2/tables/${encodeURIComponent(usersTable.id)}/records`;
  const existing = await api(`${recordsUrl}?limit=1`);
  if ((existing?.list || []).length > 0) {
    console.log('\n[ok] Administrator seed skipped - the users table already has accounts.');
    return;
  }

  const { salt, hash } = hashPassword(ADMIN_PASSWORD);
  await api(recordsUrl, {
    method: 'POST',
    body: JSON.stringify({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      name: 'Administrator',
      password_hash: hash,
      salt,
      role: 'admin',
      status: 'Active',
      signup_at: new Date().toISOString(),
    }),
  });

  console.log('\n+ Initial administrator created');
  console.log(`    username: ${ADMIN_USERNAME}`);
  // Only echo the built-in default; a custom password stays out of the logs.
  console.log(
    ADMIN_PASSWORD === DEFAULT_PASSWORD
      ? `    password: ${ADMIN_PASSWORD}`
      : '    password: (the value of ADMIN_PASSWORD)'
  );
  console.log('  Change this password after signing in.');
}

async function main() {
  console.log(`-> NocoDB ${url} - base ${baseId}`);

  const existing = await listTables();
  const byName = new Map(existing.map((t) => [tableKey(t), t]));

  for (const spec of TABLES) {
    if (byName.has(spec.table_name)) {
      console.log(`  ok ${spec.table_name} already exists`);
      continue;
    }
    try {
      await api(`/api/v2/meta/bases/${encodeURIComponent(baseId)}/tables`, {
        method: 'POST',
        body: JSON.stringify({
          title: spec.title,
          table_name: spec.table_name,
          columns: spec.columns,
        }),
      });
      console.log(`  + ${spec.table_name} created`);
    } catch (e) {
      console.error(`  x ${spec.table_name} failed: ${e.message}`);
      process.exitCode = 1;
    }
  }

  // Re-list so the ids printed are the ones NocoDB actually assigned (its
  // table_name is prefixed with the base prefix, e.g. "nc_olh6___groups").
  let finalTables = await listTables();

  console.log('\nColumn migrations:');
  await ensureColumns(finalTables);

  // Column changes alter the table metadata, so refresh before printing.
  finalTables = await listTables();

  console.log('\nTables in this base:');
  for (const t of finalTables.sort((a, b) => String(a.title).localeCompare(String(b.title)))) {
    console.log(`  ${String(t.title).padEnd(12)} ${String(t.id).padEnd(16)} ${t.table_name}`);
  }

  await seedAdmin(finalTables);

  console.log('\nDone. Table ids are resolved by title at runtime, so no env change is needed.');
}

main().catch((e) => {
  console.error(`\n[x] ${e.message}`);
  console.error('  Is NocoDB running and the token valid?');
  process.exit(1);
});
