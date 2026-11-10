/**
 * Local exercise session for the participant portal (P04-P06).
 *
 * Stores, per exercise, the selected role, draft responses for every inject,
 * which injects have been submitted and how long the participant has actually
 * spent on each inject. Kept in localStorage so drafts and timings survive a
 * page reload. Shape:
 *   { roleId, responses: { [injectId]: string }, submitted: [injectId],
 *     timings: { [injectId]: seconds }, completedAt }
 *
 * `timings` feeds the per-inject count-up on the exercise page and is stored on
 * the response row so an administrator can see it while marking.
 */
const key = (enrollmentId) => `tspes_en_${enrollmentId}`;

/** Coerce the stored timings into { [injectId: string]: seconds }. */
const normalizeTimings = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  Object.entries(value).forEach(([id, seconds]) => {
    const n = Number(seconds);
    if (Number.isFinite(n) && n > 0) out[String(id)] = Math.round(n);
  });
  return out;
};

export function getSession(enrollmentId) {
  try {
    const raw = localStorage.getItem(key(enrollmentId));
    if (!raw) return null;
    const session = JSON.parse(raw);
    return {
      roleId: session.roleId || null,
      responses: session.responses || {},
      submitted: Array.isArray(session.submitted) ? session.submitted : [],
      timings: normalizeTimings(session.timings),
      completedAt: session.completedAt || null,
    };
  } catch {
    return null;
  }
}

export function saveSession(enrollmentId, session) {
  try {
    localStorage.setItem(key(enrollmentId), JSON.stringify(session));
  } catch {
    /* storage unavailable — session cannot persist */
  }
}

/** Merge a patch into the stored session and return the result. */
export function updateSession(enrollmentId, patch) {
  const next = {
    ...(getSession(enrollmentId) || {
      roleId: null,
      responses: {},
      submitted: [],
      timings: {},
    }),
    ...patch,
  };
  saveSession(enrollmentId, next);
  return next;
}

/** Total seconds recorded across every inject of a session. */
export function totalTime(session) {
  const timings = normalizeTimings(session?.timings);
  return Object.values(timings).reduce((sum, seconds) => sum + seconds, 0);
}
