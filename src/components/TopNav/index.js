
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/auth';
import './style.css';

const SECTION_TITLES = {
  scenarios: 'Scenarios',
  courses: 'Courses',
  marking: 'Marking',
  reports: 'Reports',
  users: 'Users',
  groups: 'Groups',
};

export function breadcrumbTrail(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const trail = [{ label: 'Administrator Portal', to: '/admin' }];

  if (parts.length <= 1) {
    trail.push({ label: 'Dashboard' });
    return trail;
  }

  const section = parts[1];
  const title = SECTION_TITLES[section] || 'Dashboard';
  trail.push({
    label: title,
    to: parts.length > 2 ? `/admin/${section}` : undefined,
  });

  if (parts.length > 2) {
    if (section === 'scenarios' && parts[3] === 'builder') {
      trail.push({ label: 'Scenario Builder' });
    } else if (section === 'marking') {
      trail.push({ label: 'Mark Answers' });
    }
  }

  return trail;
}

const roleLabel = (role) => {
  const value = (role || 'participant').toLowerCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const TopNav = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
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

  const username = user?.Name || user?.UserName || 'User';
  const role = roleLabel(user?.Role);

  const initials = username
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const trail = breadcrumbTrail(location.pathname);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <button
          type="button"
          className="menu-toggle"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          ☰
        </button>

        <nav className="breadcrumb" aria-label="Breadcrumb">
          {trail.map((crumb, index) => {
            const isLast = index === trail.length - 1;

            return (
              <span key={`${crumb.label}-${index}`} className="crumb">
                {index > 0 && (
                  <span className="crumb-sep" aria-hidden="true">&gt;</span>
                )}

                {isLast || !crumb.to ? (
                  <strong aria-current={isLast ? 'page' : undefined}>
                    {crumb.label}
                  </strong>
                ) : (
                  <Link to={crumb.to}>{crumb.label}</Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="user-header-area">
        <Link
          to="/admin/marking"
          className="bell-icon"
          title="Marking queue"
          aria-label="Marking queue"
        >
          🔔
        </Link>

        <button
          type="button"
          className="user-dropdown"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="user-avatar-sm">{initials || 'U'}</div>
          <span>{username}</span>
          <span aria-hidden="true">{open ? '▲' : '▼'}</span>
        </button>
      </div>

      {open && (
        <div className="user-menu">
          <div className="user-menu-head">
            <strong>{username}</strong>
            <span className="user-menu-role">{role}</span>
            {user?.Email && (
              <span className="user-menu-email">{user.Email}</span>
            )}
          </div>

          <button className="user-menu-item" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default TopNav;
