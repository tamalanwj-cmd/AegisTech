import React, { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getExercise } from '../../data/exercises';
import { getSession, saveSession } from '../../services/exerciseSession';
import './style.css';

/**
 * P05 — Exercise page.
 *
 * Main page where the participant works through the tabletop exercise:
 * scenario intro (E1) and objectives (E2) on the left, the current event
 * inject (E3) with the response box (E4) on the right, prev/next (E5/E6),
 * save draft (E7), submit (E8) and a progress bar (E9). Submitting the last
 * inject leads to the summary (P06).
 */
const ExercisePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const exercise = getExercise(id);

  const [session, setSession] = useState(() => (exercise ? getSession(exercise.id) : null));
  const [feedback, setFeedback] = useState('');
  const feedbackTimer = useRef(null);

  // Open on the first inject that has not been submitted yet.
  const [index, setIndex] = useState(() => {
    if (!exercise || !session) return 0;
    const firstOpen = exercise.injects.findIndex((i) => !session.submitted.includes(i.id));
    return firstOpen === -1 ? 0 : firstOpen;
  });

  // Unknown exercise, or no role picked yet -> through role selection (P04).
  if (!exercise) {
    return <Navigate to="/participant" replace />;
  }
  if (!session || !session.roleId) {
    return <Navigate to={`/participant/exercise/${id}/roles`} replace />;
  }

  const injects = exercise.injects;
  const total = injects.length;

  const inject = injects[index];
  const submittedCount = injects.filter((i) => session.submitted.includes(i.id)).length;
  const isSubmitted = session.submitted.includes(inject.id);
  const isLast = index === total - 1;
  const allSubmitted = submittedCount === total;
  const role = exercise.roles.find((r) => r.id === session.roleId);

  const flash = (msg) => {
    setFeedback(msg);
    window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(''), 2500);
  };

  const setResponse = (value) => {
    setSession((prev) => ({ ...prev, responses: { ...prev.responses, [inject.id]: value } }));
  };

  // E7 — Save draft: persist the current responses without submitting.
  const handleSaveDraft = () => {
    saveSession(exercise.id, session);
    flash('Draft saved');
  };

  // E8 — Submit: store the response, mark the inject submitted, then advance
  // to the next inject or finish at the summary (P06).
  const handleSubmit = () => {
    const next = {
      ...session,
      responses: { ...session.responses, [inject.id]: session.responses[inject.id] || '' },
      submitted: session.submitted.includes(inject.id)
        ? session.submitted
        : [...session.submitted, inject.id],
    };
    if (isLast) {
      next.completedAt = new Date().toISOString();
    }
    saveSession(exercise.id, next);
    setSession(next);

    if (isLast) {
      navigate(`/participant/exercise/${id}/summary`);
    } else {
      setIndex(index + 1);
      flash('Response submitted');
    }
  };

  return (
    <>
      <div className="pd-page-head">
        <Link to="/participant" className="pd-back-link">← Back to Dashboard</Link>
        <h1>{exercise.title}</h1>
        <p>
          {exercise.course}
          {role && <> — playing as <strong>{role.name}</strong></>}
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
            <div
              className="pd-progress-fill"
              style={{ width: `${Math.round((submittedCount / total) * 100)}%` }}
            ></div>
          </div>
          <span className="pd-progress-label">{Math.round((submittedCount / total) * 100)}%</span>
        </div>
        {allSubmitted && (
          <Link to={`/participant/exercise/${id}/summary`} className="ex-view-summary">
            View Summary →
          </Link>
        )}
      </div>

      <div className="ex-layout">
        {/* E1/E2 — Scenario intro and objectives */}
        <aside className="ex-sidebar">
          <div className="pd-card ex-intro-card">
            <h3>Scenario Introduction</h3>
            <p>{exercise.intro}</p>
          </div>
          <div className="pd-card ex-objectives-card">
            <h3>Learning Objectives</h3>
            <ul>
              {exercise.objectives.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>
        </aside>

        {/* E3/E4 — Current inject and response */}
        <section className="ex-main pd-card">
          <div className="ex-inject-head">
            <span className="ex-inject-time">{inject.time}</span>
            {isSubmitted && <span className="pd-status pd-status-completed">Submitted ✓</span>}
          </div>
          <h2 className="ex-inject-title">{inject.title}</h2>
          <p className="ex-inject-body">{inject.body}</p>

          <label className="ex-response-label" htmlFor="ex-response">
            Your response <span className="ex-required">*</span>
          </label>
          <textarea
            id="ex-response"
            className="ex-response"
            placeholder="Describe the actions you would take in your role..."
            value={session.responses[inject.id] || ''}
            onChange={(e) => setResponse(e.target.value)}
            rows={8}
          />

          {feedback && <div className="ex-feedback">{feedback}</div>}

          {/* E5/E6/E7/E8 — Controls */}
          <div className="ex-controls">
            <button
              type="button"
              className="ex-btn ex-btn-secondary"
              onClick={() => setIndex(Math.max(0, index - 1))}
              disabled={index === 0}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="ex-btn ex-btn-ghost"
              onClick={() => setIndex(Math.min(total - 1, index + 1))}
              disabled={isLast}
            >
              Next →
            </button>

            <span className="ex-controls-spacer"></span>

            <button type="button" className="ex-btn ex-btn-secondary" onClick={handleSaveDraft}>
              Save Draft
            </button>
            <button type="button" className="ex-btn ex-btn-primary" onClick={handleSubmit}>
              {isLast ? 'Submit & Finish' : 'Submit Response'}
            </button>
          </div>
        </section>
      </div>
    </>
  );
};

export default ExercisePage;
