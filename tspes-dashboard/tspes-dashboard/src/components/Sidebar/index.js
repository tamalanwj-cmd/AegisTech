import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/auth';
import './style.css';

const menuItems = [
  { path: '/admin', label: 'Dashboard', icon: '🖥' },
  { path: '/admin/scenarios', label: 'Scenarios', icon: '📄' },
  { path: '/admin/reports', label: 'Reports', icon: '📶' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/courses', label: 'Courses', icon: '📋' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const role = (user?.Role || 'participant').toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">TS</div>
        <div className="sidebar-title">
          <h4>TSPES</h4>
          <p>{role}</p>
        </div>
      </div>
      <nav className="nav-list">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            className={({ isActive }) =>
              `nav-item${isActive ? ' active' : ''}`
            }
          >
            <span>{item.icon}</span> {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="nav-item" onClick={handleLogout}>
          <span>🚪</span> Logout
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
