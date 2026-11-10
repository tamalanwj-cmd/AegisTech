import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import { loadExerciseContext } from '../../services/participantFlow';
import { getSession, totalTime } from '../../services/exerciseSession';
import {formatDuration,listResponses,isMarked,} from '../../services/responses';
import './style.css';

/**
 * P06 — Exercise Summary.
 *
 * Shown after the participant finishes the exercise: completion banner (S1),
 * exercise details (S2), the response history for every inject (S3) and a
 * back button to the dashboard (S4). The scenario/injects come from NocoDB
 * and the role from the administrator's enrolment.
 */
const ExerciseSummary = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const enrollmentId = searchParams.get('enrollmentId');
  const [userId, setUserId] = useState(null);

  const [phase, setPhase] = useState('loading'); // loading | ready | error | not-enrolled | not-found
  const [scenario, setScenario] = useState(null);
  const [enrolment, setEnrolment] = useState(null);
  const [injects, setInjects] = useState([]);
  const [session, setSession] = useState(null);
  const [gradingResponses, setGradingResponses] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const user = await getCurrentUser();

        if (!mounted) return;

        if (!user) {
          setLoadError('Could not retrieve your account. Please log in again.');
          setPhase('error');
          return;
        }

        setUserId(user.Id);
      } catch (error) {
        console.error('Failed to load user:', error);

        if (mounted) {
          setLoadError('Could not retrieve your account. Please log in again.');
          setPhase('error');
        }
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  const load = useCallback(async () => {
    setPhase('loading');
    setLoadError('');
    try {
      const ctx = await loadExerciseContext(id, userId, enrollmentId);
      if (!ctx.scenario) {
        setPhase('not-found');
        return;
      }
      if (!ctx.enrolment) {
        setPhase('not-enrolled');
        return;
      }
    setScenario(ctx.scenario);
    setEnrolment(ctx.enrolment);
    setInjects(ctx.injects);
    setSession(getSession(ctx.enrolment.enrollmentId));

    const savedMarks = await listResponses({
      scenarioId: id,
      userId,
    });

    const enrolmentMarks = savedMarks.filter(
      (response) =>
        Number(response.enrollmentId) ===
        Number(ctx.enrolment.enrollmentId)
    );

    setGradingResponses(enrolmentMarks);

    setPhase('ready');
    } catch (e) {
      setLoadError(e.message || 'Could not load the summary');
      setPhase('error');
    }
  }, [id, userId, enrollmentId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ------------------------------ early states ---------------------------- */

  if (phase === 'loading') {
    return <div className="pd-state">Loading summary…</div>;
  }

  if (phase === 'not-found') {
    return (
      <div className="pd-page-head">
        <Link to="/participant" className="pd-back-link">← Back to Dashboard</Link>
        <h1>Exercise not found</h1>
        <p>This scenario is no longer available.</p>
      </div>
    );
  }

  if (phase === 'not-enrolled') {
    return (
      <div className="pd-page-head">
        <Link to="/participant" className="pd-back-link">← Back to Dashboard</Link>
        <h1>Not enrolled</h1>
        <p>You are not enrolled in the course for this scenario.</p>
        <Link to="/participant" className="pd-back-link">Return to your courses →</Link>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="pd-page-head">
        <Link to="/participant" className="pd-back-link">← Back to Dashboard</Link>
        <h1>Could not load summary</h1>
        <div className="pd-error-banner">
          <span>{loadError}</span>
          <button type="button" className="pd-retry-btn" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No draft/submission recorded yet — invite the participant to start.
  if (!session) {
    return (
      <div className="pd-page-head">
        <Link to="/participant" className="pd-back-link">← Back to Dashboard</Link>
        <h1>Exercise Summary</h1>
        <p>{scenario.name} — {enrolment?.courseName}</p>
        <p>You have not started this exercise yet.</p>
        <Link to={`/participant/exercise/${id}?enrollmentId=${enrolment.enrollmentId}`} className="pd-back-link">
          Start the exercise →
        </Link>
      </div>
    );
  }

  const total = injects.length;
  const submittedCount = injects.filter((i) => session.submitted.includes(i.Id)).length;
  const completed = total > 0 && submittedCount === total;
  const progress = total > 0 ? Math.round((submittedCount / total) * 100) : 0;
  const role = enrolment?.role || '';

    const responseByInject = new Map(
    gradingResponses.map((response) => [Number(response.injectId), response])
  );

  const allMarked =
    completed &&
    total > 0 &&
    injects.every((inject) => isMarked(responseByInject.get(Number(inject.Id))));

  const totalMarks = injects.reduce(
    (sum, inject) => sum + Number(responseByInject.get(Number(inject.Id))?.marks || 0),
    0
  );

  const maximumMarks = total * 100;


  const completedStr = session.completedAt
    ? new Date(session.completedAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <>
      <div className="pd-page-head">
        <Link to="/participant" className="pd-back-link">← Back to Dashboard</Link>
        <h1>Exercise Summary</h1>
        <p>{scenario.name} — {enrolment?.courseName}</p>
      </div>

      {/* S1 — Completion banner */}
      <div className={`sum-banner ${completed ? 'sum-done' : 'sum-partial'}`}>
        <div className="sum-banner-icon">{completed ? '🎉' : '⏳'}</div>
        <div className="sum-banner-text">
          <h2>{completed ? 'Exercise Completed!' : 'Exercise In Progress'}</h2>
          <p>
            {completed
              ? 'All injects have been submitted. Well done.'
              : `You have submitted ${submittedCount} of ${total} injects. Return to the exercise to finish.`}
          </p>
        </div>
        <div className="sum-banner-progress">
          <span>{progress}%</span>
        </div>
      </div>

      {/* S2 — Summary info */}
      <div className="sum-info pd-card">
        <div className="sum-info-item">
          <span className="sum-info-label">Exercise</span>
          <span className="sum-info-value">{scenario.name}</span>
        </div>
        <div className="sum-info-item">
          <span className="sum-info-label">Course</span>
          <span className="sum-info-value">{enrolment?.courseName || '—'}</span>
        </div>
        <div className="sum-info-item">
          <span className="sum-info-label">Your Role</span>
          <span className="sum-info-value">{role || '—'}</span>
        </div>
        <div className="sum-info-item">
          <span className="sum-info-label">Injects Submitted</span>
          <span className="sum-info-value">{submittedCount} of {total}</span>
        </div>
        <div className="sum-info-item">
          <span className="sum-info-label">Time Taken</span>
          <span className="sum-info-value">{formatDuration(totalTime(session))}</span>
        </div>
        {completedStr && (
          <div className="sum-info-item">
            <span className="sum-info-label">Completed</span>
            <span className="sum-info-value">{completedStr}</span>
          </div>
        )}
      </div>

      {/* S3 — Response history */}
      <div className="pd-section-head sum-history-head">
        <h2>Response History</h2>
        <span>Your submitted answers to each event inject</span>
      </div>

      {completed && !allMarked && (
        <div className="sum-marking-pending">
          <strong>Awaiting Results</strong>
          <p>Your exercise has been completed. Your results will be available once your administrator finishes marking.</p>
        </div>
      )}  

      {total === 0 ? (
        <div className="pd-state">No injects have been added to this scenario yet.</div>
      ) : (
        <div className="sum-history">
          {injects.map((inject, i) => {
              const marking = responseByInject.get(Number(inject.Id));
              const isSubmitted = session.submitted.includes(inject.Id);

            return (
              <div key={inject.Id} className="sum-history-item pd-card">
                <div className="sum-history-top">
                  <span className="sum-history-index">Inject {i + 1}</span>
                  <div className="sum-history-badges">
                    <span className="ex-inject-time">Inject {inject.sequence}</span>
                    {session.timings?.[inject.Id] > 0 && (
                      <span className="ex-timer">
                        ⏱ {formatDuration(session.timings[inject.Id])}
                      </span>
                    )}
                    {isSubmitted ? (
                      <span className="pd-status pd-status-completed sum-status">Submitted ✓</span>
                    ) : (
                      <span className="pd-status pd-status-notstarted sum-status">Not Submitted</span>
                    )}
                  </div>
                </div>
                <h3 className="sum-history-title">{inject.title}</h3>
                <p className="sum-history-inject">{inject.description}</p>
                {inject.information && (
                  <p className="sum-history-inject sum-history-info">{inject.information}</p>
                )}
                <div className="sum-history-response">
                  <span className="sum-info-label">Your Response</span>
                  <p>{session.responses[inject.Id] || 'No response recorded.'}</p>
                </div>
                  {allMarked && marking && (
                    <div className="sum-marking-result">
                      <div className="sum-mark-row">
                        <span className="sum-info-label">Mark Given </span>
                        <strong>{marking.marks}/100</strong>
                      </div>

                      <div className="sum-feedback">
                        <span className="sum-info-label">Feedback Given</span>
                        <p>{marking.feedback || 'No feedback provided.'}</p>
                      </div>
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {allMarked && (
        <div className="sum-total-score pd-card">
          <span className="sum-info-label">Total Exercise Score</span>
          <strong>{totalMarks}/{maximumMarks}</strong>
        </div>
        )}

      {/* S4 — Back to dashboard */}
      <div className="sum-actions">
        <Link to="/participant" className="sum-back-btn">← Back to Dashboard</Link>
        {!completed && (
          <Link to={`/participant/exercise/${id}?enrollmentId=${enrolment.enrollmentId}`} className="sum-resume-btn">
            Resume Exercise →
          </Link>
        )}
      </div>
    </>
  );
};

export default ExerciseSummary;
