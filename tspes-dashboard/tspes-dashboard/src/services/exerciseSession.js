/**
 * Local exercise session for the participant portal (P04-P06).
 *
 * Stores, per exercise, the selected role, draft responses for every inject
 * and which injects have been submitted. Kept in localStorage so drafts
 * survive a page reload. Shape:
 *   { roleId, responses: { [injectId]: string }, submitted: [injectId], completedAt }
 */
const key = (exerciseId) => `tspes_ex_${exerciseId}`;

export function getSession(exerciseId) {
  try {
    const raw = localStorage.getItem(key(exerciseId));
    if (!raw) return null;
    const session = JSON.parse(raw);
    return {
      roleId: session.roleId || null,
      responses: session.responses || {},
      submitted: Array.isArray(session.submitted) ? session.submitted : [],
      completedAt: session.completedAt || null,
    };
  } catch {
    return null;
  }
}

export function saveSession(exerciseId, session) {
  try {
    localStorage.setItem(key(exerciseId), JSON.stringify(session));
  } catch {
    /* storage unavailable — session cannot persist */
  }
}

/** Merge a patch into the stored session and return the result. */
export function updateSession(exerciseId, patch) {
  const next = { ...(getSession(exerciseId) || { roleId: null, responses: {}, submitted: [] }), ...patch };
  saveSession(exerciseId, next);
  return next;
}
