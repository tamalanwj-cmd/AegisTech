import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getExercise } from '../../data/exercises';
import { getSession, updateSession } from '../../services/exerciseSession';
import './style.css';

/**
 * P04 — Role Selection.
 *
 * Shows the roles available in the exercise with their responsibilities.
 * The participant picks one (R1/R2) and confirms it (R3) before entering the
 * exercise (P05). Back returns to the dashboard (R4).
 */
const RoleSelection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const exercise = getExercise(id);

  // Returning to this page keeps the previously chosen role selected.
  const [selectedRole, setSelectedRole] = useState(() => getSession(id)?.roleId || null);

  // Unknown exercise id -> back to the dashboard.
  if (!exercise) {
    return <Navigate to="/participant" replace />;
  }

  const handleConfirm = () => {
    if (!selectedRole) return;
    updateSession(id, { roleId: selectedRole });
    navigate(`/participant/exercise/${id}`);
  };

  return (
    <>
      <div className="pd-page-head">
        <Link to="/participant" className="pd-back-link">← Back to Dashboard</Link>
        <h1>Choose your role</h1>
        <p>{exercise.title} — {exercise.course}</p>
      </div>

      {/* R1/R2 — Role cards with descriptions */}
      <div className="role-grid">
        {exercise.roles.map((role) => (
          <button
            key={role.id}
            type="button"
            className={`role-card${selectedRole === role.id ? ' selected' : ''}`}
            onClick={() => setSelectedRole(role.id)}
          >
            <div className="role-check" aria-hidden="true">
              {selectedRole === role.id ? '✓' : ''}
            </div>
            <h3>{role.name}</h3>
            <p>{role.desc}</p>
            <span className="role-select-hint">
              {selectedRole === role.id ? 'Selected' : 'Click to select'}
            </span>
          </button>
        ))}
      </div>

      {/* R3 — Confirm selection */}
      <div className="role-confirm-bar">
        <span>
          {selectedRole
            ? `You will play as ${exercise.roles.find((r) => r.id === selectedRole)?.name}`
            : 'Select a role to continue'}
        </span>
        <button
          type="button"
          className="role-confirm-btn"
          onClick={handleConfirm}
          disabled={!selectedRole}
        >
          Confirm Role →
        </button>
      </div>
    </>
  );
};

export default RoleSelection;
