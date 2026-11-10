
import { supabase } from './supabaseClient';

/**
 * Returns all course enrolments belonging to a participant.
 * Joins courses, scenarios, crisis types and assigned scenario roles.
 */
export async function listMyEnrolments(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      id,
      enrollment_date,
      account_id,
      courses!inner (
        status,
        id,
        course_name,
        start_date,
        end_date,
        scenario_id,
        scenarios!inner (
          id,
          title,
          status,
          crisis_types (
            name
          )
        )
      ),
      scenario_roles (
        role_name
      )
    `)
    .eq('account_id', userId);

  if (error) {
    console.error('Failed to load enrolments:', error);
    throw new Error(error.message || 'Could not load enrolments');
  }

  const result = (data || []).map((enrolment) => {
    const course = enrolment.courses;
    const scenario = course?.scenarios;

    return {
      enrollmentId: enrolment.id,
      courseId: course.id,
      courseName: course.course_name,
      courseStatus: course.status || 'Active',
      scenarioId: scenario.id,
      scenarioName: scenario.title,
      crisisType: scenario.crisis_types?.name || '',
      scenarioStatus: scenario.status,
      role: enrolment.scenario_roles?.role_name || '',
    };
  });

  result.sort((a, b) => a.courseName.localeCompare(b.courseName));

  return result;
}
