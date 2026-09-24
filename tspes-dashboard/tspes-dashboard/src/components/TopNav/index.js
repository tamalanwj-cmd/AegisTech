import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/auth';
import './style.css';

const breadcrumbMap = {
  '/admin': { parent: 'Administrator Portal', current: 'Dashboard' },
  '/admin/scenarios': { parent: 'Administrator Portal', current: 'Scenarios' },
  '/admin/reports': { parent: 'Administrator Portal', current: 'Reports' },
  '/admin/users': { parent: 'Administrator Portal', current: 'Users' },
  '/admin/courses': { parent: 'Administrator Portal', current: 'Courses' },
  '/admin/settings': { parent: 'Administrator Portal', current: 'Settings' },
};

const roleLabel = (role) => {
  const value = (role || 'participant').toLowerCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const user = getCurrentUser();
  const username = user?.Name || user?.UserName || 'User';
  const role = roleLabel(user?.Role);
  const initials = username
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const breadcrumb = breadcrumbMap[location.pathname] || { parent: 'Administrator Portal', current: '' };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="top-bar">
      <div className="breadcrumb">
        {breadcrumb.parent} &gt; <strong>{breadcrumb.current}</strong>
      </div>
      <div className="user-header-area">
        <div className="bell-icon">🔔</div>
        <div className="user-dropdown" onClick={() => setOpen((v) => !v)}>
          <div className="user-avatar-sm">{initials || 'U'}</div>
          <span>{username}</span>
          <span>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="user-menu">
          <div className="user-menu-head">
            <strong>{username}</strong>
            <span className="user-menu-role">{role}</span>
            {user?.Email && <span className="user-menu-email">{user.Email}</span>}
          </div>
          <button className="user-menu-item" onClick={handleLogout}>Logout</button>
        </div>
      )}
    </div>
  );
};

export default TopNav;
