import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import { exercises, getExerciseState } from '../../data/exercises';
import './style.css';

/**
 * P03 — Participant Dashboard.
 *
 * Welcome banner plus assigned exercise cards (title, course, status,
 * progress, due date, continue/start button). Status and progress combine the
 * static demo data with the local exercise session, so submitted responses
 * update the cards.
 */

const statusClass = {
  'In Progress': 'pd-status-progress',
  'Not Started': 'pd-status-notstarted',
  'Completed': 'pd-status-completed',
};

const ParticipantDashboard = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const username = user?.Name || user?.UserName || 'Participant';

  const states = exercises.map((ex) => ({ ex, ...getExerciseState(ex) }));
  const inProgress = states.filter((s) => s.status === 'In Progress').length;
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // D4 — Continue / Start. Not-started exercises go through role selection
  // (P04) first; in-progress ones resume the exercise (P05); completed ones
  // open the summary (P06).
  const openExercise = (ex, status) => {
    if (status === 'Completed') {
      navigate(`/participant/exercise/${ex.id}/summary`);
    } else if (status === 'In Progress') {
      navigate(`/participant/exercise/${ex.id}`);
    } else {
      navigate(`/participant/exercise/${ex.id}/roles`);
    }
  };

  return (
    <>
      {/* D2 — Welcome banner */}
      <div className="pd-welcome">
        <div>
          <h1>Welcome back, {username}</h1>
          <p>{dateStr} — you have {inProgress} exercise{inProgress === 1 ? '' : 's'} in progress</p>
        </div>
      </div>

      {/* D3 — Exercise cards */}
      <div className="pd-section-head">
        <h2>My Exercises</h2>
        <span>Assigned tabletop exercises and their progress</span>
      </div>

      <div className="pd-exercise-grid">
        {states.map(({ ex, status, progress }) => {
          const action =
            status === 'Completed' ? 'Review Summary' : status === 'In Progress' ? 'Continue' : 'Start';
          return (
            <div key={ex.id} className="pd-exercise-card">
              <div className="pd-exercise-top">
                <span className={`pd-status ${statusClass[status]}`}>{status}</span>
                {ex.due && <span className="pd-due">{ex.due}</span>}
              </div>
              <h3 className="pd-exercise-title">{ex.title}</h3>
              <p className="pd-exercise-course">{ex.course}</p>

              <div className="pd-progress pd-progress-card">
                <div className="pd-progress-bar">
                  <div className="pd-progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="pd-progress-label">{progress}%</span>
              </div>

              <button
                type="button"
                className="pd-continue-btn"
                onClick={() => openExercise(ex, status)}
              >
                {action}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default ParticipantDashboard;
