import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, login, logout, updateUser, PASSWORD_MIN_LENGTH } from '../../services/auth';
import { exercises, getExerciseState } from '../../data/exercises';
import './style.css';

/**
 * P07 — Profile.
 *
 * Participant account page: user info (P1), completed exercise history (P2),
 * change password (P3) and logout (P4).
 */
const Profile = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return null; // guarded by AuthGuard; nothing to render
  }

  const username = user.Name || user.UserName || 'Participant';
  const initials = username
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const completed = exercises
    .map((ex) => ({ ex, ...getExerciseState(ex) }))
    .filter((s) => s.status === 'Completed');

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // P3 — Change password: verify the current password by signing in with it,
  // then store the new hash. login() also refreshes the session for the same
  // user, which keeps the app authenticated afterwards.
  const handleChangePassword = async () => {
    setError('');
    setNotice('');

    if (!form.current) {
      setError('Please enter your current password');
      return;
    }
    if (form.next.length < PASSWORD_MIN_LENGTH) {
      setError(`New password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }
    if (form.next !== form.confirm) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      // Keep the session in the store it currently lives in ("Remember me").
      const remember = localStorage.getItem('token') !== null;
      await login({ identifier: user.Email || user.UserName, password: form.current, remember });
      await updateUser(user.Id, { password: form.next });
      setForm({ current: '', next: '', confirm: '' });
      setNotice('Password updated successfully.');
    } catch (e) {
      setError(e.message || 'Could not update the password');
    } finally {
      setSaving(false);
    }
  };

  // P4 — Logout
  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <>
      <div className="pd-page-head">
        <h1>My Profile</h1>
        <p>Your account details and exercise history</p>
      </div>

      <div className="profile-grid">
        {/* P1 — User info */}
        <div className="pd-card profile-user-card">
          <div className="profile-avatar">{initials || 'P'}</div>
          <h2>{username}</h2>
          <span className="profile-role">{user.Role || 'Participant'}</span>
          <div className="profile-fields">
            <div className="profile-field">
              <span className="profile-label">Username</span>
              <span>{user.UserName || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label">Email</span>
              <span>{user.Email || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label">Role</span>
              <span>{user.Role || 'Participant'}</span>
            </div>
          </div>
          <button type="button" className="profile-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className="profile-main-col">
          {/* P2 — Exercise history */}
          <div className="pd-card">
            <h3 className="profile-card-title">Exercise History</h3>
            {completed.length === 0 ? (
              <p className="profile-empty">No completed exercises yet.</p>
            ) : (
              <div className="profile-history">
                {completed.map(({ ex, session }) => (
                  <div key={ex.id} className="profile-history-item">
                    <div>
                      <div className="profile-history-title">{ex.title}</div>
                      <div className="profile-history-course">{ex.course}</div>
                    </div>
                    <span className="profile-history-date">
                      {session?.completedAt
                        ? new Date(session.completedAt).toLocaleDateString('en-US', {
                            dateStyle: 'medium',
                          })
                        : 'Completed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* P3 — Change password */}
          <div className="pd-card">
            <h3 className="profile-card-title">Change Password</h3>
            <div className="profile-form">
              <div className="profile-form-row">
                <label>
                  Current password
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={form.current}
                    onChange={set('current')}
                    disabled={saving}
                  />
                </label>
              </div>
              <div className="profile-form-cols">
                <label>
                  New password
                  <input
                    type="password"
                    placeholder={`Min ${PASSWORD_MIN_LENGTH} characters`}
                    value={form.next}
                    onChange={set('next')}
                    disabled={saving}
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={form.confirm}
                    onChange={set('confirm')}
                    onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                    disabled={saving}
                  />
                </label>
              </div>
              {error && <div className="profile-error">{error}</div>}
              {notice && <div className="profile-notice">{notice}</div>}
              <button
                type="button"
                className="profile-save-btn"
                onClick={handleChangePassword}
                disabled={saving}
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
