import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './style.css';

const noop = (e) => { if (e) e.preventDefault(); };

const breadcrumbMap = {
  '/': { parent: 'Administrator Portal', current: 'Dashboard' },
  '/scenarios': { parent: 'Administrator Portal', current: 'Scenarios' },
  '/reports': { parent: 'Administrator Portal', current: 'Reports' },
  '/users': { parent: 'Administrator Portal', current: 'Users' },
  '/courses': { parent: 'Administrator Portal', current: 'Courses' },
  '/settings': { parent: 'Administrator Portal', current: 'Settings' },
};

const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const username = user?.Name || user?.UserName || 'Admin';
  const initials = username
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const breadcrumb = breadcrumbMap[location.pathname] || { parent: 'Administrator Portal', current: '' };

  return (
    <div className="top-bar">
      <div className="breadcrumb">
        {breadcrumb.parent} &gt; <strong>{breadcrumb.current}</strong>
      </div>
      <div className="user-header-area">
        <div className="bell-icon" onClick={noop}>🔔</div>
        <div className="user-dropdown" onClick={noop}>
          <div className="user-avatar-sm">{initials || 'A'}</div>
          <span>{username}</span>
          <span>▼</span>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
