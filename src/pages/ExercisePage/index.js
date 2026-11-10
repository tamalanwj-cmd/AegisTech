import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import { loadExerciseContext } from '../../services/participantFlow';
import { getSession, saveSession } from '../../services/exerciseSession';
import { formatDuration, submitResponse } from '../../services/responses';
import './style.css';

/**
 * P05 — Exercise page.
 *
 * Main page where the participant works through the tabletop exercise:
 * scenario intro and objectives on the left, the current event inject with the
 * response box on the right, prev/next, save draft, submit and a progress bar.
 * Submitting the last inject leads to the summary (P06).
 *
 * Two behaviours were added by the design change document:
 *  - a per-inject count-up timer, stored with the answer so an administrator
 *    can see how long it took while marking;
 *  - the answer is written to the responses table (not only localStorage), so
 *    administrators can read and mark it.
 *
 * The scenario and its injects come from NocoDB; the participant's role comes
 * from the administrator's enrolment — there is no role picker.
 */
const ExercisePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const enrollmentId = searchParams.get('enrollmentId');
  const [userId, setUserId] = useState(null);

  const [phase, setPhase] = useState('loading'); // loading | ready | error | not-enrolled | not-found
  const [scenario, setScenario] = useState(null);
  const [enrolment, setEnrolment] = useState(null);
  const [injects, setInjects] = useState([]);
  const [loadError, setLoadError] = useState('');

  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [syncError, setSyncError] = useState('');
  const feedbackTimer = useRef(null);

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

  // Count-up timer: when the current inject was opened, and a ticking clock so
  // the displayed seconds update once a second.
  const startedAtRef = useRef(Date.now());
  const [now, setNow] = useState(Date.now());

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

      // The assigned role is stored in the session so drafts keep it too.
      const assignedRole = ctx.enrolment.role || '';
      const existing = getSession(ctx.enrolment.enrollmentId);
      const nextSession = existing
        ? { ...existing, roleId: assignedRole }
        : { roleId: assignedRole, responses: {}, submitted: [], timings: {} };
      saveSession(ctx.enrolment.enrollmentId, nextSession);

      // Open on the first inject that has not been submitted yet.
      const firstOpen = ctx.injects.findIndex((i) => !nextSession.submitted.includes(i.Id));

      startedAtRef.current = Date.now();
      setScenario(ctx.scenario);
      setEnrolment(ctx.enrolment);
      setInjects(ctx.injects);
      setSession(nextSession);
      setIndex(firstOpen === -1 ? 0 : firstOpen);
      setPhase('ready');
    } catch (e) {
      setLoadError(e.message || 'Could not load the exercise');
      setPhase('error');
    }
  }, [id, userId, enrollmentId]);

  useEffect(() => {
    if (userId) {
      load();
    }
  }, [userId, load]);

  useEffect(() => () => window.clearTimeout(feedbackTimer.current), []);

  // Tick once a second while the exercise is on screen.
  useEffect(() => {
    if (phase !== 'ready') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const flash = (msg) => {
    setFeedback(msg);
    window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(''), 2500);
  };

  const setResponse = (injectId, value) => {
    setSession((prev) => ({ ...prev, responses: { ...prev.responses, [injectId]: value } }));
  };

  /** Seconds spent on the inject that is currently open (since it was opened). */
  const secondsThisVisit = () => Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));

  /** Add the elapsed time to the session's timings and restart the counter. */
  const bankTime = (baseSession, injectId) => {
    const seconds = secondsThisVisit();
    startedAtRef.current = Date.now();
    const timings = { ...(baseSession.timings || {}) };
    if (injectId) timings[injectId] = (timings[injectId] || 0) + seconds;
    return { ...baseSession, timings };
  };

  // Save draft: persist locally (a draft is not visible to administrators).
  const handleSaveDraft = () => {
    const inject = injects[index];
    const next = bankTime(session, inject?.Id);
    saveSession(enrolment.enrollmentId, next);
    setSession(next);
    flash('Draft saved');
  };

  /**
   * Submit: store the response locally, write it to the responses table with
   * the time spent, then advance to the next inject or finish at the summary.
   */
const handleSubmit = async (inject) => {
  const isLast = index === injects.length - 1;
  const next = bankTime(session, inject.Id);

  next.responses = {
    ...next.responses,
    [inject.Id]: next.responses[inject.Id] || '',
  };

    next.submitted = next.submitted.includes(inject.Id)
      ? next.submitted
      : [...next.submitted, inject.Id];

    if (isLast) next.completedAt = new Date().toISOString();

    try {
      setSyncError('');

      await submitResponse({
        enrollmentId: enrolment.enrollmentId,
        injectId: inject.Id,
        answer: next.responses[inject.Id],
        timeSpentSeconds: next.timings[inject.Id] || 0,
      });

      saveSession(enrolment.enrollmentId, next);
      setSession(next);

      if (isLast) {
        navigate(`/participant/exercise/${id}/summary?enrollmentId=${enrolment.enrollmentId}`);
      } else {
        setIndex(index + 1);
        flash('Response submitted');
      }
    } catch (e) {
      console.error('Submission failed:', e);
      setSyncError(
        e.message ||
          'Your answer could not be submitted. Please try again.'
      );
    }
  };

  /* ------------------------------ early states ---------------------------- */

  if (phase === 'loading') {
    return <div className="pd-state">Loading exercise…</div>;
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
        <h1>Could not load exercise</h1>
        <div className="pd-error-banner">
          <span>{loadError}</span>
          <button type="button" className="pd-retry-btn" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const total = injects.length;

  if (total === 0) {
    return (
      <div className="pd-page-head">
        <Link to="/participant" className="pd-back-link">← Back to Dashboard</Link>
        <h1>{scenario.name}</h1>
        <p>This scenario has no injects yet. Please check back later.</p>
      </div>
    );
  }

  const inject = injects[index];
  const submittedCount = injects.filter((i) => session.submitted.includes(i.Id)).length;
  const isSubmitted = session.submitted.includes(inject.Id);
  const isLast = index === total - 1;
  const allSubmitted = submittedCount === total;
  const progress = Math.round((submittedCount / total) * 100);

  // Live count-up: time already banked for this inject plus this visit.
  const bankedSeconds = session.timings?.[inject.Id] || 0;
  const liveSeconds =
    bankedSeconds + Math.max(0, Math.floor((now - startedAtRef.current) / 1000));

  const objectives = scenario.objectives || [];

  return (
    <>
      <div className="pd-page-head">
        <Link to="/participant" className="pd-back-link">← Back to Dashboard</Link>
        <h1>{scenario.name}</h1>
        <p>
          {enrolment?.courseName}
          {enrolment?.role && <> — playing as <strong>{enrolment.role}</strong></>}
        </p>
      </div>

      {/* E9 — Progress */}
      <div className="ex-progress-strip pd-card">
        <div className="ex-progress-info">
          <span>Inject {index + 1} of {total}</span>
          <span className="ex-progress-submitted">{submittedCount} of {total} submitted</span>
        </div>
        <div className="pd-progress">
          <div className="pd-progress-bar">
            <div className="pd-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="pd-progress-label">{progress}%</span>
        </div>
        {allSubmitted && (
          <Link to={`/participant/exercise/${id}/summary?enrollmentId=${enrolment.enrollmentId}`} className="ex-view-summary">
            View Summary →
          </Link>
        )}
      </div>

      {syncError && (
        <div className="ex-sync-warning">
          <span>{syncError}</span>
          <button type="button" className="ex-sync-dismiss" onClick={() => setSyncError('')}>
            Dismiss
          </button>
        </div>
      )}

      <div className="ex-layout">
        {/* E1/E2 — Scenario intro and objectives */}
        <aside className="ex-sidebar">
          <div className="pd-card ex-intro-card">
            <h3>Scenario Introduction</h3>
            <p>{scenario.description}</p>
          </div>

          {/* Objectives are optional: the card is only rendered when the scenario
              actually has some, so an empty placeholder never shows up. */}
          {objectives.length > 0 && (
            <div className="pd-card ex-objectives-card">
              <h3>Learning Objectives</h3>
              <ul>
                {objectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* E3/E4 — Current inject and response */}
        <section className="ex-main pd-card">
          <div className="ex-inject-head">
            <span className="ex-inject-time">Inject {inject.sequence}</span>
            <div className="ex-inject-badges">
              <span className="ex-timer" title="Time spent on this inject">
                ⏱ {formatDuration(liveSeconds)}
              </span>
              {isSubmitted && <span className="pd-status pd-status-completed">Submitted ✓</span>}
            </div>
          </div>
          <h2 className="ex-inject-title">{inject.title}</h2>
          <div className="ex-inject-body">
            <p>{inject.description}</p>
            {inject.information && <p className="ex-inject-info">{inject.information}</p>}
          </div>

          <label className="ex-response-label" htmlFor="ex-response">
            Your response <span className="ex-required">*</span>
          </label>
          <textarea
            id="ex-response"
            className="ex-response"
            placeholder="Describe the actions you would take in your role..."
            value={session.responses[inject.Id] || ''}
            onChange={(e) => setResponse(inject.Id, e.target.value)}
            rows={8}
          />

          {feedback && <div className="ex-feedback">{feedback}</div>}

          {/* E5/E6/E7/E8 — Controls */}
          <div className="ex-controls">
            <button
              type="button"
              className="ex-btn ex-btn-secondary"
              onClick={() => {
                const next = bankTime(session, inject.Id);
                saveSession(enrolment.enrollmentId, next);
                setSession(next);
                setIndex(Math.max(0, index - 1));
                setFeedback('');
              }}
              disabled={index === 0}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="ex-btn ex-btn-ghost"
              onClick={() => {
                const next = bankTime(session, inject.Id);
                saveSession(enrolment.enrollmentId, next);
                setSession(next);
                setIndex(Math.min(total - 1, index + 1));
                setFeedback('');
              }}
              disabled={isLast}
            >
              Next →
            </button>

            <span className="ex-controls-spacer"></span>

            <button type="button" className="ex-btn ex-btn-secondary" onClick={handleSaveDraft}>
              Save Draft
            </button>
            <button
              type="button"
              className="ex-btn ex-btn-primary"
              onClick={() => handleSubmit(inject)}
            >
              {isLast ? 'Submit & Finish' : 'Submit Response'}
            </button>
          </div>
        </section>
      </div>
    </>
  );
};

export default ExercisePage;
