
import { supabase } from './supabaseClient';

export const COURSE_STATUSES = ['Active', 'Draft', 'Archived'];

const normalizeCourse = (row) => ({
  Id: row.id,
  name: row.course_name || '',
  description: row.description || '',
  enrolments: (row.enrollments || []).map((enrolment) => ({
    enrollmentId: enrolment.id,
    userId: enrolment.account_id,
    role: enrolment.scenario_roles?.role_name || '',
    roleId: enrolment.scenario_roles?.id || null,
  })),
  groupId: row.group_id ?? null,
  scenarioId: row.scenario_id ?? null,
  status: row.status || 'Active',
  createdAt: row.created_at
    ? new Date(row.created_at).toLocaleDateString()
    : '',
  createdAtISO: row.created_at || null,
});

async function resolveEnrolments(enrolments, scenarioId) {
  const cleanEnrolments = (enrolments || []).filter(
    (item) => item && item.userId && String(item.userId).trim()
  );

  if (!cleanEnrolments.length) return [];

  const { data: roles, error } = await supabase
    .from('scenario_roles')
    .select('id, role_name')
    .eq('scenario_id', scenarioId);

  if (error) throw error;

  const roleMap = new Map(
    (roles || []).map((role) => [
      role.role_name.trim().toLowerCase(),
      role.id,
    ])
  );

  return cleanEnrolments.map((item) => {
    const roleName = String(item.role || '').trim();
    const roleId = roleName
      ? roleMap.get(roleName.toLowerCase())
      : null;

    if (roleName && !roleId) {
      throw new Error(
        `The role "${roleName}" was not found for the selected scenario.`
      );
    }

    return {
      account_id: item.userId,
      scenario_role_id: roleId,
      enrollment_date: new Date().toISOString().slice(0, 10),
    };
  });
}

export async function listCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      id,
      course_name,
      description,
      group_id,
      scenario_id,
      status,
      created_at,
      enrollments (
        id,
        account_id,
        scenario_roles (
          id,
          role_name
        )
      )
    `)
    .order('id', { ascending: true });

  if (error) {
    console.error('Failed to retrieve courses:', error);
    throw new Error(error.message || 'Could not load courses');
  }

  return (data || []).map(normalizeCourse);
}

export async function createCourse({
  name,
  description,
  enrolments,
  groupId,
  scenarioId,
  status,
}) {
  const cleanName = String(name || '').trim();

  if (!cleanName) throw new Error('Please enter a course name');
  if (!scenarioId) throw new Error('Please choose a scenario');

  const enrolmentRows = await resolveEnrolments(enrolments, scenarioId);

  const { data, error } = await supabase
    .from('courses')
    .insert({
      course_name: cleanName,
      description: String(description || '').trim(),
      group_id: groupId || null,
      scenario_id: scenarioId,
      status: status || 'Active',
    })
    .select('id')
    .single();

  if (error) throw error;

  if (enrolmentRows.length > 0) {
    const rowsToInsert = enrolmentRows.map((row) => ({
      ...row,
      course_id: data.id,
    }));

    const { error: enrolmentError } = await supabase
      .from('enrollments')
      .insert(rowsToInsert);

    if (enrolmentError) {
      await supabase.from('courses').delete().eq('id', data.id);
      throw enrolmentError;
    }
  }

  return { id: data.id, Id: data.id };
}

export async function updateCourse(
  id,
  {
    name,
    description,
    enrolments,
    groupId,
    scenarioId,
    status,
  }
) {
  const cleanName = String(name || '').trim();

  if (!cleanName) throw new Error('Please enter a course name');
  if (!scenarioId) throw new Error('Please choose a scenario');

  const enrolmentRows = await resolveEnrolments(enrolments, scenarioId);

  const { error } = await supabase
    .from('courses')
    .update({
      course_name: cleanName,
      description: String(description || '').trim(),
      group_id: groupId || null,
      scenario_id: scenarioId,
      status: status || 'Active',
    })
    .eq('id', id);

  if (error) throw error;

  const { error: deleteError } = await supabase
    .from('enrollments')
    .delete()
    .eq('course_id', id);

  if (deleteError) throw deleteError;

  if (enrolmentRows.length > 0) {
    const rowsToInsert = enrolmentRows.map((row) => ({
      ...row,
      course_id: id,
    }));

    const { error: insertError } = await supabase
      .from('enrollments')
      .insert(rowsToInsert);

    if (insertError) throw insertError;
  }

  return { id, Id: id };
}

export async function deleteCourse(id) {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function linkScenarioToCourse(scenarioId, courseId) {
  if (!scenarioId) return;

  const { data: courses, error: fetchError } = await supabase
    .from('courses')
    .select('id, scenario_id')
    .eq('scenario_id', scenarioId);

  if (fetchError) throw fetchError;

  const updates = [];

  if (courseId) {
    updates.push(
      supabase
        .from('courses')
        .update({ scenario_id: scenarioId })
        .eq('id', courseId)
    );
  }

  (courses || [])
    .filter((course) => course.id !== courseId)
    .forEach((course) => {
      updates.push(
        supabase
          .from('courses')
          .update({ scenario_id: null })
          .eq('id', course.id)
      );
    });

  const results = await Promise.all(updates);
  const failedUpdate = results.find((result) => result.error);

  if (failedUpdate) throw failedUpdate.error;
}
