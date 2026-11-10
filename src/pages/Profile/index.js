
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/auth';
import { listMyEnrolments } from '../../services/enrolments';
import { getSession } from '../../services/exerciseSession';
import './style.css';

const Profile = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [userError, setUserError] = useState('');

  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);

  const userId = user?.Id;

  // Retrieve the authenticated Supabase user.
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (!mounted) return;

        if (!currentUser) {
          setUserError('Could not retrieve your account. Please log in again.');
          setLoadingHistory(false);
          return;
        }

        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load profile:', error);

        if (mounted) {
          setUserError('Could not retrieve your account. Please log in again.');
          setLoadingHistory(false);
        }
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  // Load exercise history after the user is available.
  const loadHistory = useCallback(async () => {
    if (!userId) return;

    setLoadingHistory(true);
    setHistoryError('');

    try {
      const enrolments = await listMyEnrolments(userId);

      setHistory(
        enrolments
          .map((enrolment) => ({
            ...enrolment,
            session: getSession(enrolment.scenarioId),
          }))
          .filter((entry) => entry.session && entry.session.completedAt)
      );
    } catch (error) {
      setHistoryError(
        error.message || 'Could not load your exercise history'
      );
    } finally {
      setLoadingHistory(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId, loadHistory]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (userError) {
    return (
      <div className="pd-page-head">
        <h1>My Profile</h1>
        <p>{userError}</p>
      </div>
    );
  }

  if (!user) {
    return <div className="pd-state">Loading profile…</div>;
  }

  const username = user.Name || 'Participant';

  const initials = username
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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

          <span className="profile-role">
            {user.Role || 'Participant'}
          </span>

          <div className="profile-fields">
            <div className="profile-field">
              <span className="profile-label">Name</span>
              <span>{username}</span>
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

          <button
            type="button"
            className="profile-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>

        <div className="profile-main-col">
          {/* P2 — Exercise history */}
          <div className="pd-card">
            <h3 className="profile-card-title">Exercise History</h3>

            {loadingHistory ? (
              <p className="profile-empty">Loading exercise history…</p>
            ) : historyError ? (
              <p className="profile-empty">{historyError}</p>
            ) : history.length === 0 ? (
              <p className="profile-empty">
                No completed exercises yet.
              </p>
            ) : (
              <div className="profile-history">
                {history.map((entry) => (
                  <div
                    key={entry.courseId}
                    className="profile-history-item"
                  >
                    <div>
                      <div className="profile-history-title">
                        {entry.scenarioName}
                      </div>

                      <div className="profile-history-course">
                        {entry.courseName}
                        {entry.role ? ` — ${entry.role}` : ''}
                      </div>
                    </div>

                    <span className="profile-history-date">
                      {new Date(
                        entry.session.completedAt
                      ).toLocaleDateString('en-US', {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Password management is handled by administrators. */}
          <div className="pd-card">
            <h3 className="profile-card-title">
              Account Security
            </h3>
            <p className="profile-empty">
              Password changes and account management are handled by
              your administrator. Please contact your administrator
              if you need assistance.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
