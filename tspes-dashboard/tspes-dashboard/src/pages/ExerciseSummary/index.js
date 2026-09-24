import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getExercise } from '../../data/exercises';
import { getSession } from '../../services/exerciseSession';
import './style.css';

/**
 * P06 — Exercise Summary.
 *
 * Shown after the participant finishes the exercise: completion banner (S1),
 * exercise details (S2), the response history for every inject (S3) and a
 * back button to the dashboard (S4).
 */
const ExerciseSummary = () => {
  const { id } = useParams();
  const exercise = getExercise(id);

  // Unknown exercise or nothing submitted yet -> back to the dashboard.
  if (!exercise) {
    return <Navigate to="/participant" replace />;
  }
  const session = getSession(exercise.id);
  if (!session) {
    return <Navigate to={`/participant/exercise/${id}/roles`} replace />;
  }

  const injects = exercise.injects;
  const submittedCount = injects.filter((i) => session.submitted.includes(i.id)).length;
  const total = injects.length;
  const completed = submittedCount === total;
  const progress = total > 0 ? Math.round((submittedCount / total) * 100) : 0;
  const role = exercise.roles.find((r) => r.id === session.roleId);

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
        <p>{exercise.title} — {exercise.course}</p>
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
          <span className="sum-info-value">{exercise.title}</span>
        </div>
        <div className="sum-info-item">
          <span className="sum-info-label">Course</span>
          <span className="sum-info-value">{exercise.course}</span>
        </div>
        <div className="sum-info-item">
          <span className="sum-info-label">Your Role</span>
          <span className="sum-info-value">{role ? role.name : '—'}</span>
        </div>
        <div className="sum-info-item">
          <span className="sum-info-label">Injects Submitted</span>
          <span className="sum-info-value">{submittedCount} of {total}</span>
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

      <div className="sum-history">
        {injects.map((inject, i) => {
          const isSubmitted = session.submitted.includes(inject.id);
          return (
            <div key={inject.id} className="sum-history-item pd-card">
              <div className="sum-history-top">
                <span className="sum-history-index">Inject {i + 1}</span>
                <div>
                  <span className="ex-inject-time">{inject.time}</span>
                  {isSubmitted ? (
                    <span className="pd-status pd-status-completed sum-status">Submitted ✓</span>
                  ) : (
                    <span className="pd-status pd-status-notstarted sum-status">Not Submitted</span>
                  )}
                </div>
              </div>
              <h3 className="sum-history-title">{inject.title}</h3>
              <p className="sum-history-inject">{inject.body}</p>
              <div className="sum-history-response">
                <span className="sum-info-label">Your Response</span>
                <p>{session.responses[inject.id] || 'No response recorded.'}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* S4 — Back to dashboard */}
      <div className="sum-actions">
        <Link to="/participant" className="sum-back-btn">← Back to Dashboard</Link>
        {!completed && (
          <Link to={`/participant/exercise/${id}`} className="sum-resume-btn">
            Resume Exercise →
          </Link>
        )}
      </div>
    </>
  );
};

export default ExerciseSummary;
