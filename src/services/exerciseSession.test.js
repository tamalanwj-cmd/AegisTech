import { getSession, saveSession, updateSession } from './exerciseSession';

test('returns null when no session is stored', () => {
  expect(getSession('unknown-exercise')).toBeNull();
});

test('session round-trips through localStorage', () => {
  saveSession('ex-1', { roleId: 'ic', responses: { 'inj-1': 'draft text' }, submitted: [] });
  const session = getSession('ex-1');
  expect(session.roleId).toBe('ic');
  expect(session.responses['inj-1']).toBe('draft text');
  expect(session.submitted).toEqual([]);
});

test('updateSession merges a patch and preserves the rest', () => {
  saveSession('ex-2', { roleId: 'pho', responses: { 'inj-1': 'first' }, submitted: [] });
  const next = updateSession('ex-2', { submitted: ['inj-1'], completedAt: '2026-09-22T00:00:00Z' });
  expect(next.roleId).toBe('pho');
  expect(next.responses['inj-1']).toBe('first');
  expect(next.submitted).toEqual(['inj-1']);
  expect(next.completedAt).toBe('2026-09-22T00:00:00Z');
  expect(getSession('ex-2')).toEqual(next);
});

test('updateSession creates a session when none exists', () => {
  const next = updateSession('ex-3', { roleId: 'log' });
  expect(next.roleId).toBe('log');
  expect(next.responses).toEqual({});
  expect(next.submitted).toEqual([]);
});
