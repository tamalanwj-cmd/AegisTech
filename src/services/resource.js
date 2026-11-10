
/**
 * Shared utility functions for date formatting and list handling.
 */

/** Parse a JSON-array column, tolerating legacy comma-separated values. */
export function parseList(value) {
  if (Array.isArray(value)) return value;

  const raw = String(value ?? '').trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw.split(',').map((v) => v.trim()).filter(Boolean);
  }
}

/** Serialise a list into JSON text. */
export function serializeList(value) {
  const list = Array.isArray(value) ? value : [];
  return list.length ? JSON.stringify(list) : '';
}

/** Parse newline-separated text. */
export function parseLines(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  return String(value ?? '')
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Convert an array of lines into newline-separated text. */
export function serializeLines(value) {
  const list = Array.isArray(value) ? value : [];
  return list.map((v) => String(v).trim()).filter(Boolean).join('\n');
}

/** Parse a date value safely. */
export function toDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = toDate(value);

  if (!date) return '—';

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  const date = toDate(value);

  if (!date) return '—';

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** "3 min ago" / "2 hours ago" / "12 Oct 2026". */
export function formatRelative(value, now = Date.now()) {
  const date = toDate(value);

  if (!date) return '';

  const diff = now - date.getTime();

  if (diff < 0) return formatDate(value);

  const mins = Math.floor(diff / 60000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return formatDate(value);
}

/** True when a database error indicates a missing table. */
export const isMissingTableError = (error) => {
  if (!error) return false;

  if (error.status === 404) return true;

  return /was not found|does not exist|not found/i.test(
    String(error.message || '')
  );
};
