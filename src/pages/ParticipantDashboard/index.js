
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import { listMyEnrolments } from '../../services/enrolments';
import { getSession } from '../../services/exerciseSession';
import { loadExerciseContext } from '../../services/participantFlow';
import {
  listResponses,
  isMarked,
  isAnswered,
} from '../../services/responses';
import './style.css';

const statusClass = {
  'In Progress': 'pd-status-progress',
  'Not Started': 'pd-status-notstarted',
  'Completed': 'pd-status-completed',
};

const ParticipantDashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [enrolments, setEnrolments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [resultsByScenario, setResultsByScenario] = useState({});
  const [statusByEnrollment, setStatusByEnrollment] = useState({});

  const userId = user?.Id;
  const username = user?.Name || user?.UserName || 'Participant';

  // Load the authenticated Supabase user.
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (mounted) {
          if (currentUser) {
            setUser(currentUser);
          } else {
            setLoadError(
              'Could not retrieve your account. Please log in again.'
            );
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to load participant:', error);

        if (mounted) {
          setLoadError(
            'Could not retrieve your account. Please log in again.'
          );
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  // Load enrolments, exercise progress and assessment results.
  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setLoadError('');

    try {
      const myEnrolments = await listMyEnrolments(userId);

      setEnrolments(myEnrolments);

      const results = {};
      const resultsStatus = {};

      await Promise.all(
        myEnrolments.map(async (enrolment) => {
          try {
            // Retrieve the scenario and its injects.
            const context = await loadExerciseContext(
              enrolment.scenarioId,
              userId,
              enrolment.enrollmentId
            );

            const injects = context.injects || [];

            // Retrieve responses from Supabase.
            const responses = await listResponses({
              scenarioId: enrolment.scenarioId,
              courseId: enrolment.courseId,
              userId,
            });

            // Keep only responses belonging to this enrolment.
            const enrolmentResponses = responses.filter(
              (response) =>
                Number(response.enrollmentId) ===
                Number(enrolment.enrollmentId)
            );

            // Match each response to its corresponding inject.
            const responseByInject = new Map(
              enrolmentResponses.map((response) => [
                Number(response.injectId),
                response,
              ])
            );

            // Retrieve local exercise progress.
            const session = getSession(enrolment.enrollmentId);

            const submittedIds = new Set(
              (session?.submitted || []).map(Number)
            );

            // Determine whether all injects have been answered.
            const allAnswered =
              injects.length > 0 &&
              injects.every((inject) =>
                isAnswered(
                  responseByInject.get(Number(inject.Id))
                )
              );

            // Determine whether at least one inject has been answered.
            const hasAnswered = injects.some((inject) =>
              isAnswered(
                responseByInject.get(Number(inject.Id))
              )
            );

            // Determine whether every inject has been marked.
            const allMarked =
              allAnswered &&
              injects.every((inject) =>
                isMarked(
                  responseByInject.get(Number(inject.Id))
                )
              );

            // Determine the participant's exercise status.
            resultsStatus[enrolment.enrollmentId] = allAnswered
              ? 'Completed'
              : hasAnswered || submittedIds.size > 0
              ? 'In Progress'
              : 'Not Started';

            // Calculate the total exercise score.
            if (allMarked) {
              results[enrolment.enrollmentId] = {
                totalMarks: injects.reduce(
                  (sum, inject) =>
                    sum +
                    Number(
                      responseByInject.get(Number(inject.Id))
                        ?.marks || 0
                    ),
                  0
                ),
                maximumMarks: injects.length * 100,
              };
            }
          } catch (error) {
            console.error(
              `Could not load results for scenario ${enrolment.scenarioId}:`,
              error
            );
          }
        })
      );

      setResultsByScenario(results);
      setStatusByEnrollment(resultsStatus);

    } catch (error) {
      console.error('Failed to load participant dashboard:', error);
      setLoadError(error.message || 'Could not load your courses');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load enrolments only after the authenticated user is available.
  useEffect(() => {
    if (userId) {
      load();
    }
  }, [userId, load]);

  // Apply the retrieved exercise status to each enrolment.
  const cards = enrolments.map((enrolment) => ({
    ...enrolment,
    status:
      statusByEnrollment[enrolment.enrollmentId] || 'Not Started',
  }));

  // Count courses that have not been completed.
  const assignedCourses = cards.filter(
    (card) => card.status !== 'Completed'
  ).length;

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Navigate to the exercise or its completed summary.
  const openExercise = (card) => {
    if (card.status === 'Completed') {
      navigate(
        `/participant/exercise/${card.scenarioId}/summary?enrollmentId=${card.enrollmentId}`
      );
    } else {
      navigate(
        `/participant/exercise/${card.scenarioId}?enrollmentId=${card.enrollmentId}`
      );
    }
  };

  return (
    <>
      <div className="pd-welcome">
        <div>
          <h1>Welcome back, {username}</h1>
          <p>
            {dateStr} — you have {assignedCourses} assigned course
            {assignedCourses === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="pd-section-head">
        <h2>My Courses</h2>
        <span>
          Your enrolled tabletop exercises and the role you have been assigned
        </span>
      </div>

      {loading && (
        <div className="pd-state">
          Loading your courses…
        </div>
      )}

      {!loading && loadError && (
        <div className="pd-error-banner">
          <span>{loadError}</span>
          <button
            type="button"
            className="pd-retry-btn"
            onClick={load}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !loadError && cards.length === 0 && (
        <div className="pd-state">
          You have not been enrolled in any course yet. Contact your
          administrator.
        </div>
      )}

      {!loading && !loadError && cards.length > 0 && (
        <div className="pd-exercise-grid">
          {cards.map((card) => {
            const action =
              card.status === 'Completed'
                ? 'Review Summary'
                : card.status === 'In Progress'
                ? 'Continue'
                : 'Start';

            return (
              <div
                key={card.enrollmentId}
                className="pd-exercise-card"
              >
                <div className="pd-exercise-top">
                  <span
                    className={`pd-status ${statusClass[card.status]}`}
                  >
                    {card.status}
                  </span>

                  <span
                    className={`pd-role-badge${
                      card.role ? '' : ' pd-role-unassigned'
                    }`}
                  >
                    {card.role
                      ? `Role: ${card.role}`
                      : 'Role: Not assigned'}
                  </span>
                </div>

                <h3 className="pd-exercise-title">
                  {card.scenarioName}
                </h3>

                <p className="pd-exercise-course">
                  {card.courseName}
                </p>

                <p className="pd-exercise-crisis">
                  {card.crisisType}
                </p>

                {resultsByScenario[card.enrollmentId] && (
                  <div className="pd-exercise-score">
                    <span>Exercise Score</span>
                    <strong>
                      {resultsByScenario[card.enrollmentId].totalMarks}/
                      {resultsByScenario[card.enrollmentId].maximumMarks}
                    </strong>
                  </div>
                )}

                <button
                  type="button"
                  className="pd-continue-btn"
                  onClick={() => openExercise(card)}
                >
                  {action}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default ParticipantDashboard;
