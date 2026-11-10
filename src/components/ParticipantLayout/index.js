
import React, { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/auth';
import './style.css';

const notifications = [
  { id: 1, text: 'New exercise assigned: CM Beta — Infrastructure Exercise', time: '2 hours ago' },
  { id: 2, text: 'Reminder: ER Alpha is due 15 Oct 2025', time: '1 day ago' },
  { id: 3, text: 'Your response to Inject 2 was saved', time: '3 days ago' },
];

const ParticipantLayout = () => {
  const navigate = useNavigate();

  const [openMenu, setOpenMenu] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (mounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  const username = user?.Name || user?.UserName || 'Participant';

  const initials = username
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="pd-page">
      <header className="pd-navbar">
        <Link to="/participant" className="pd-navbar-brand" aria-label="TSPES participant dashboard">
          <div className="pd-logo">TS</div>
          <div className="pd-navbar-title">
            <h4>TSPES</h4>
            <p>Participant Portal</p>
          </div>
        </Link>

        <div className="pd-navbar-right">
          <div className="pd-bell-wrap">
            <button
              type="button"
              className="pd-bell"
              onClick={() => setOpenMenu((v) => (v === 'bell' ? null : 'bell'))}
              aria-label="Notifications"
            >
              🔔
              <span className="pd-bell-badge">{notifications.length}</span>
            </button>

            {openMenu === 'bell' && (
              <div className="pd-dropdown pd-notifications">
                <div className="pd-dropdown-head">Notifications</div>
                {notifications.map((n) => (
                  <div key={n.id} className="pd-notification-item">
                    <div className="pd-notification-text">{n.text}</div>
                    <div className="pd-notification-time">{n.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pd-user-wrap">
            <button
              type="button"
              className="pd-user"
              onClick={() => setOpenMenu((v) => (v === 'user' ? null : 'user'))}
            >
              <div className="pd-avatar">{initials || 'P'}</div>
              <span>{username}</span>
              <span className="pd-caret">{openMenu === 'user' ? '▲' : '▼'}</span>
            </button>

            {openMenu === 'user' && (
              <div className="pd-dropdown pd-user-menu">
                <div className="pd-dropdown-head">
                  <strong>{username}</strong>
                  <span className="pd-user-role">{user?.Role || 'Participant'}</span>
                  {user?.Email && (
                    <span className="pd-user-email">{user.Email}</span>
                  )}
                </div>

                <button
                  type="button"
                  className="pd-menu-item"
                  onClick={() => {
                    setOpenMenu(null);
                    navigate('/participant/profile');
                  }}
                >
                  Profile
                </button>

                <button
                  type="button"
                  className="pd-menu-item"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="pd-content">
        <Outlet />
      </main>
    </div>
  );
};

export default ParticipantLayout;
