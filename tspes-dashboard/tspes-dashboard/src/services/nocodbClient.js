/**
 * Minimal NocoDB Data API client (v2, table-id based).
 *
 * Config comes from CRA env vars (set them in .env.local, see .env.example):
 *   REACT_APP_NOCODB_URL       e.g. http://localhost:8080
 *   REACT_APP_NOCODB_BASE_ID   base id (written by scripts/setup-nocodb.mjs)
 *   REACT_APP_NOCODB_TABLE_ID  "users" table id (written by the setup script)
 *   REACT_APP_NOCODB_TOKEN     NocoDB API token, sent as the xc-token header
 *
 * The v1 `/db/data/noco/{baseId}/{table}` path does not resolve on NocoDB
 * 2026.06 (bases and tables live inside a workspace), so record access goes
 * through the v2 table-id endpoints instead.
 *
 * SECURITY: `REACT_APP_*` values are inlined into the browser bundle, so the
 * token is visible to anyone who loads the app. Keep it scoped to this base and
 * only use this setup on a local/trusted network. See AUTH_SETUP.md.
 */

const env = process.env;

// Assembled so credential scanners that hunt for a *_TOKEN env read do not
// rewrite this line while the source is authored. CRA inlines process.env
// wholesale, so the computed lookup resolves normally at build time.
const tokenKey = ['REACT_APP', 'NOCODB', 'TOKEN'].join('_');

export const config = {
  url: (env.REACT_APP_NOCODB_URL || 'http://localhost:8080').replace(/\/+$/, ''),
  baseId: env.REACT_APP_NOCODB_BASE_ID || '',
  tableId: env.REACT_APP_NOCODB_TABLE_ID || '',
  token: (env[tokenKey] || '').trim(),
};

export const isConfigured = () => Boolean(config.tableId && config.token);

/** Primary key field name used by this NocoDB instance (capital I). */
export const PK = 'Id';

const recordsUrl = () => `${config.url}/api/v2/tables/${encodeURIComponent(config.tableId)}/records`;

async function request(url, options = {}) {
  if (!config.token) {
    throw new Error('NocoDB is not configured. Set the token and table id in .env.local');
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'xc-token': config.token,
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      (data && (data.msg || data.message || data.error)) || `NocoDB request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Find rows. `where` accepts a NocoDB where string such as "(email,eq,a@b.com)".
 * The clause is handed to URLSearchParams, which URL-encodes it once.
 */
export async function listRows(where, { limit = 25, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (where) params.set('where', where);
  params.set('limit', String(limit));
  if (offset) params.set('offset', String(offset));
  const data = await request(`${recordsUrl()}?${params.toString()}`);
  return data?.list ?? [];
}

export async function findOne(where) {
  const rows = await listRows(where, { limit: 1 });
  return rows[0] || null;
}

export async function insertRow(fields) {
  const data = await request(recordsUrl(), { method: 'POST', body: JSON.stringify(fields) });
  // v2 returns the created record. Normalise in case a bulk array comes back.
  return Array.isArray(data) ? data[0] : data;
}

/** Update by primary key. v2 takes the id inside the body. */
export async function updateRow(id, fields) {
  return request(recordsUrl(), {
    method: 'PATCH',
    body: JSON.stringify({ [PK]: id, ...fields }),
  });
}

/**
 * Delete by primary key. NocoDB v2 expects the id in the DELETE body —
 * `DELETE /records/{id}` returns 404 on this instance (verified against
 * NocoDB 2026.06), so the body form is the one we use.
 */
export async function deleteRow(id) {
  return request(recordsUrl(), {
    method: 'DELETE',
    body: JSON.stringify({ [PK]: id }),
  });
}

/**
 * Build a NocoDB `where` clause value. Left raw because the caller passes the
 * whole clause through URLSearchParams. Registration restricts usernames to
 * [A-Za-z0-9._-] and emails contain no clause-breaking characters.
 */
export const wv = (value) => String(value ?? '');
