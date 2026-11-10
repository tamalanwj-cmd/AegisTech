
/**
 * Participant inject responses and administrator marking records.
 *
 * Each response is uniquely identified by (enrollment_id, inject_id).
 *
 * Participant submissions update only submission fields.
 * Administrator marking updates only marking fields.
 *
 * PostgreSQL RPC functions perform these updates atomically.
 */

import { supabase } from './supabaseClient';

export const MARKS_MAX = 100;

export const RESPONSES_TABLE_HINT =
  'Could not access the responses table. Check your Supabase table permissions and RLS policies.';

export const normalizeResponse = (row) => ({
  Id: row.id,
  enrollmentId: row.enrollment_id ?? null,
  userId: row.enrollments?.account_id ?? null,
  courseId: row.enrollments?.course_id ?? null,
  scenarioId: row.injects?.scenario_id ?? null,
  injectId: row.inject_id ?? null,
  answer: row.response_text || '',
  submittedAt: row.submitted_at || null,
  timeSpentSeconds: Number(row.response_time) || 0,
  marks:
    row.inject_score === null || row.inject_score === undefined
      ? null
      : Number(row.inject_score),
  feedback: row.marker_feedback || '',
  markedBy: row.marked_by ?? null,
  markedAt: row.marked_at || null,
});

export const isAnswered = (response) =>
  Boolean(
    response &&
    (response.submittedAt || String(response.answer || '').trim())
  );

export const isMarked = (response) =>
  Boolean(response) && response.marks !== null;

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;

  if (!mins) return `${secs} sec`;

  return `${mins} min ${secs} sec`;
}

function explain(error) {
  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    return new Error(RESPONSES_TABLE_HINT);
  }

  return error;
}

const RESPONSE_SELECT = `
  id,
  enrollment_id,
  inject_id,
  response_text,
  inject_score,
  start_time,
  end_time,
  response_time,
  marker_feedback,
  submitted_at,
  marked_by,
  marked_at,
  enrollments (
    account_id,
    course_id
  ),
  injects (
    scenario_id
  )
`;

export async function listResponses({
  scenarioId,
  courseId,
  userId,
} = {}) {
  try {
    let query = supabase
      .from('responses')
      .select(`
        id,
        enrollment_id,
        inject_id,
        response_text,
        inject_score,
        start_time,
        end_time,
        response_time,
        marker_feedback,
        submitted_at,
        marked_by,
        marked_at,
        enrollments!inner(account_id, course_id),
        injects!inner(scenario_id)
      `);

    if (scenarioId) {
      query = query.eq('injects.scenario_id', Number(scenarioId));
    }

    if (courseId) {
      query = query.eq('enrollments.course_id', Number(courseId));
    }

    if (userId) {
      query = query.eq('enrollments.account_id', userId);
    }

    const { data, error } = await query.order('submitted_at', {
      ascending: true,
      nullsFirst: true,
    });

    if (error) throw error;

    return (data || []).map(normalizeResponse);
  } catch (error) {
    console.error('Failed to list responses:', error);
    throw explain(error);
  }
}

async function getSavedResponse(enrollmentId, injectId) {
  const { data, error } = await supabase
    .from('responses')
    .select(RESPONSE_SELECT)
    .eq('enrollment_id', Number(enrollmentId))
    .eq('inject_id', Number(injectId))
    .single();

  if (error) throw error;

  return normalizeResponse(data);
}

export async function submitResponse({
  enrollmentId,
  injectId,
  answer,
  timeSpentSeconds,
  startTime,
  endTime,
}) {
  if (!enrollmentId) throw new Error('Missing enrolment');
  if (!injectId) throw new Error('Missing inject');

  try {
    const { error } = await supabase.rpc('submit_inject_response', {
      p_enrollment_id: Number(enrollmentId),
      p_inject_id: Number(injectId),
      p_response_text: String(answer ?? ''),
      p_response_time: Math.max(
        0,
        Math.round(Number(timeSpentSeconds) || 0)
      ),
      p_start_time: startTime || null,
      p_end_time: endTime || new Date().toISOString(),
    });

    if (error) throw error;

    return await getSavedResponse(enrollmentId, injectId);
  } catch (error) {
    console.error('Failed to submit response:', error);
    throw explain(error);
  }
}

export async function saveMark({
  enrollmentId,
  injectId,
  marks,
  feedback,
  markedBy,
}) {
  if (!enrollmentId) throw new Error('Missing enrolment');
  if (!injectId) throw new Error('Missing inject');

  const raw =
    marks === '' || marks === null || marks === undefined
      ? null
      : Number(marks);

  if (
    raw !== null &&
    (!Number.isFinite(raw) || raw < 0 || raw > MARKS_MAX)
  ) {
    throw new Error(
      `Marks must be a number between 0 and ${MARKS_MAX}`
    );
  }

  try {
    const { error } = await supabase.rpc('save_inject_response_mark', {
      p_enrollment_id: Number(enrollmentId),
      p_inject_id: Number(injectId),
      p_inject_score: raw,
      p_marker_feedback: String(feedback ?? '').trim(),
      p_marked_by: markedBy || null,
    });

    if (error) throw error;

    return await getSavedResponse(enrollmentId, injectId);
  } catch (error) {
    console.error('Failed to save response mark:', error);
    throw explain(error);
  }
}
