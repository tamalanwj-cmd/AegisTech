/**
 * Read-model for the administrator dashboard, the reports page and the marking
 * index.
 *
 * Every number on those pages comes from NocoDB — there is no placeholder data
 * any more. One call assembles courses, scenarios, injects, groups, users and
 * responses, then derives the per-course progress rows that the three pages
 * render.
 *
 * The hierarchy is crisis category -> scenario -> course: a scenario describes
 * the tabletop and a course is that scenario scheduled for a group of
 * participants.
 */

/**
 * Read-model for the administrator dashboard, reports page and marking index.
 *
 * Assembles courses, scenarios, injects, groups, users and responses, then
 * derives per-course progress information.
 */

import { listCourses } from './courses';
import { listScenarios } from './scenarios';
import { listGroups } from './groups';
import { listInjects } from './injects';
import { listUsers } from './auth';
import { isAnswered, isMarked, listResponses } from './responses';
import { toDate } from './resource';

export const EXERCISE_STATUS = {
  notStarted: 'Not Started',
  inProgress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

/** CSS class fragment for a status label. */
export const statusClass = (status) =>
  String(status || EXERCISE_STATUS.notStarted)
    .toLowerCase()
    .replace(/\s+/g, '-');

/** Participants of a course: explicit enrolments plus group members. */
export function courseParticipantIds(course, group, userById) {
  const ids = new Set();

  (course.enrolments || []).forEach((entry) => {
    const id = String(entry.userId || '');
    if (id && userById.has(id)) ids.add(id);
  });

  (group?.members || []).forEach((member) => {
    const id = String(member || '');
    if (id && userById.has(id)) ids.add(id);
  });

  return [...ids];
}

/** Progress status of one exercise, from its response counts. */
export function deriveStatus({
  courseStatus,
  injectCount,
  participants,
  answered,
}) {
  if (String(courseStatus || '').toLowerCase() === 'archived') {
    return EXERCISE_STATUS.archived;
  }

  if (!injectCount || !participants) return EXERCISE_STATUS.notStarted;
  if (answered >= participants * injectCount) return EXERCISE_STATUS.completed;
  if (answered > 0) return EXERCISE_STATUS.inProgress;

  return EXERCISE_STATUS.notStarted;
}

/** Everyone who can be marked for a course, in a stable order. */
export function courseParticipants(course, group, userById, userOrder) {
  const ids = courseParticipantIds(course, group, userById);

  const order = new Map(
    (userOrder || []).map((user, index) => [String(user.Id), index])
  );

  return ids
    .map((id) => {
      const user = userById.get(id);

      const enrolment = (course.enrolments || []).find(
        (entry) => String(entry.userId) === id
      );

      return {
        userId: id,
        enrollmentId: enrolment?.enrollmentId ?? null,
        name: user?.name || user?.username || `User #${id}`,
        username: user?.username || '',
        email: user?.email || '',
        role: enrolment?.role || '',
      };
    })
    .sort(
      (a, b) =>
        (order.get(a.userId) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.userId) ?? Number.MAX_SAFE_INTEGER)
    );
}

/**
 * Load and aggregate everything the admin overview pages need.
 *
 * Returns:
 *   exercises  one row per course, with scenario, participants and progress
 *   totals     headline figures for the stat cards
 *   activity   newest-first timeline built from real records
 *   users/groups/scenarios  the raw normalised lists, for pickers
 */
export async function loadOverview() {
  const [courses, scenarios, groups, injects, users] = await Promise.all([
    listCourses(),
    listScenarios(),
    listGroups(),
    listInjects(),
    listUsers(),
  ]);

  let responses = [];
  let responsesAvailable = true;

  try {
    responses = await listResponses();
    console.table(responses.map((r) => ({
    Id: r.Id,
    courseId: r.courseId,
    enrollmentId: r.enrollmentId,
    answer: r.answer,
    submittedAt: r.submittedAt,
    marks: r.marks
  })));
    console.log('[Marking] Responses retrieved:', responses.length);
    console.log('[Marking] Sample response:', responses[0]);
  } catch (error) {
    console.error('[Marking] Failed to retrieve responses:', error);
    responsesAvailable = false;
  }

  // Supabase account IDs are UUIDs. Keep them as strings.
  // Course, group, scenario and inject IDs are numeric database IDs.
  const userById = new Map(
    users.map((user) => [String(user.Id), user])
  );

  const groupById = new Map(
    groups.map((group) => [Number(group.Id), group])
  );

  const scenarioById = new Map(
    scenarios.map((scenario) => [Number(scenario.Id), scenario])
  );

  const injectById = new Map(
    injects.map((inject) => [Number(inject.Id), inject])
  );

  const courseById = new Map(
    courses.map((course) => [Number(course.Id), course])
  );

  const injectsByScenario = new Map();

  injects.forEach((inject) => {
    if (!inject.scenarioId) return;

    const list = injectsByScenario.get(Number(inject.scenarioId)) || [];
    list.push(inject);
    injectsByScenario.set(Number(inject.scenarioId), list);
  });

  const courseByScenario = new Map();

  courses.forEach((course) => {
    if (
      course.scenarioId &&
      !courseByScenario.has(Number(course.scenarioId))
    ) {
      courseByScenario.set(Number(course.scenarioId), course);
    }
  });

  const exercises = courses.map((course) => {
    const scenario = course.scenarioId
      ? scenarioById.get(Number(course.scenarioId)) || null
      : null;

    const group = course.groupId
      ? groupById.get(Number(course.groupId)) || null
      : null;

    const participantIds = courseParticipantIds(course, group, userById);
    const participants = participantIds.length;

    const injectCount = scenario
      ? (injectsByScenario.get(Number(scenario.Id)) || []).length
      : 0;

    // Only count responses belonging to this course.
    // This prevents responses from another course using the same scenario
    // from being included in this course's progress.
    const courseEnrollmentIds = new Set(
      (course.enrolments || [])
        .map((entry) => String(entry.enrollmentId))
        .filter(Boolean)
    );

    const own = responses.filter(
      (response) =>
        courseEnrollmentIds.has(String(response.enrollmentId))
    );

    const answered = own.filter(isAnswered).length;
    const marked = own.filter(isMarked).length;
    const markedRows = own.filter(isMarked);

    const averageMark = markedRows.length
      ? Math.round(
          markedRows.reduce(
            (sum, response) => sum + Number(response.marks || 0),
            0
          ) / markedRows.length
        )
      : null;

    return {
      courseId: course.Id,
      courseName: course.name,
      courseDescription: course.description,
      courseStatus: course.status,
      createdAt: course.createdAtISO || null,
      scenarioId: scenario ? scenario.Id : null,
      scenarioName: scenario ? scenario.name : '—',
      crisisType: scenario ? scenario.crisisType : 'Other',
      scenarioStatus: scenario ? scenario.status : '',
      groupId: group ? group.Id : null,
      groupName: group ? group.name : '',
      participants,
      participantIds,
      injectCount,
      expected: participants * injectCount,
      answered,
      marked,
      averageMark,
      completion:
        participants * injectCount > 0
          ? Math.round(
              (answered / (participants * injectCount)) * 100
            )
          : 0,
      status: deriveStatus({
        courseStatus: course.status,
        injectCount,
        participants,
        answered,
      }),
    };
  });

  const active = exercises.filter(
    (exercise) => exercise.status !== EXERCISE_STATUS.archived
  );

  const participantTotal = new Set();

  active.forEach((exercise) => {
    exercise.participantIds.forEach((id) => participantTotal.add(id));
  });

  const expectedTotal = active.reduce(
    (sum, exercise) => sum + exercise.expected,
    0
  );

  const answeredTotal = active.reduce(
    (sum, exercise) => sum + exercise.answered,
    0
  );

  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const totals = {
    users: users.length,
    newUsers: users.filter((user) => {
      const date = toDate(user.signup_at);
      return date && date.getTime() >= monthAgo;
    }).length,
    groups: groups.length,
    groupsWithExercises: new Set(
      active
        .filter((exercise) => exercise.groupId)
        .map((exercise) => exercise.groupId)
    ).size,
    scenarios: scenarios.length,
    published: scenarios.filter(
      (scenario) => scenario.status === 'Published'
    ).length,
    drafts: scenarios.filter(
      (scenario) => scenario.status === 'Draft'
    ).length,
    courses: courses.length,
    activeExercises: active.length,
    inProgress: exercises.filter(
      (exercise) => exercise.status === EXERCISE_STATUS.inProgress
    ).length,
    completed: exercises.filter(
      (exercise) => exercise.status === EXERCISE_STATUS.completed
    ).length,
    notStarted: exercises.filter(
      (exercise) => exercise.status === EXERCISE_STATUS.notStarted
    ).length,
    participants: participantTotal.size,
    responses: answeredTotal,
    expected: expectedTotal,
    completion: expectedTotal
      ? Math.round((answeredTotal / expectedTotal) * 100)
      : 0,
    marked: exercises.reduce(
      (sum, exercise) => sum + exercise.marked,
      0
    ),
    unassignedScenarios: scenarios.filter(
      (scenario) => !courseByScenario.has(Number(scenario.Id))
    ).length,
  };

  const activity = [];

  responses.forEach((response) => {
    if (!isAnswered(response)) return;

    const when = response.submittedAt;
    if (!when) return;

    const user = userById.get(String(response.userId));
    const inject = injectById.get(Number(response.injectId));
    const scenario = scenarioById.get(Number(response.scenarioId));

    const course = response.courseId != null
      ? courseById.get(Number(response.courseId))
      : courseByScenario.get(Number(response.scenarioId));

    activity.push({
      id: `response-${response.Id}`,
      when,
      kind: 'response',
      name: user?.name || user?.username || 'A participant',
      text: `submitted a response to Inject ${inject?.sequence ?? '—'}${
        scenario ? ` — ${scenario.name}` : ''
      }`,
      href: course
        ? `/admin/marking/${course.Id}`
        : '/admin/reports',
    });
  });

  exercises.forEach((exercise) => {
    if (exercise.createdAt) {
      activity.push({
        id: `course-${exercise.courseId}`,
        when: exercise.createdAt,
        kind: 'course',
        name: exercise.scenarioName,
        text: `was scheduled as "${exercise.courseName}"`,
        href: `/admin/marking/${exercise.courseId}`,
      });
    }
  });

  scenarios.forEach((scenario) => {
    if (scenario.createdAtISO) {
      activity.push({
        id: `scenario-${scenario.Id}`,
        when: scenario.createdAtISO,
        kind: 'scenario',
        name: 'Scenario created',
        text: `${scenario.name} — ${scenario.crisisType}`,
        href: `/admin/scenarios/${scenario.Id}/builder`,
      });
    }
  });

  activity.sort(
    (a, b) =>
      (toDate(b.when)?.getTime() || 0) -
      (toDate(a.when)?.getTime() || 0)
  );

  return {
    exercises,
    totals,
    activity: activity.slice(0, 8),
    responsesAvailable,
    users,
    groups,
    courses,
    scenarios,
    injects,
    userById,
    groupById,
    scenarioById,
    injectsByScenario,
    courseByScenario,
    responses,
  };
}
