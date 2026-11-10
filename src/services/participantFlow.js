
/**
 * Shared loader for the participant exercise flow (P05/P06).
 *
 * Resolves the scenario, its ordered injects and the specific enrolment
 * selected by the participant.
 */
import { listScenarios } from './scenarios';
import { listInjects } from './injects';
import { listMyEnrolments } from './enrolments';

export async function loadExerciseContext(
  scenarioId,
  userId,
  enrollmentId
) {
  const id = Number(scenarioId);
  const enrolmentId = Number(enrollmentId);

  const [scenarios, enrolments, injects] = await Promise.all([
    listScenarios(),
    listMyEnrolments(userId),
    listInjects(id),
  ]);

  const scenario = scenarios.find((s) => s.Id === id) || null;

  const enrolment =
    enrolments.find(
      (e) =>
        Number(e.enrollmentId) === enrolmentId &&
        Number(e.scenarioId) === id
    ) || null;

  return {
    scenario,
    enrolment,
    injects: scenario && enrolment ? injects : [],
  };

}
