import React from 'react';
import { NavLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import './style.css';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: '🖥' },
  { path: '/scenarios', label: 'Scenarios', icon: '📄' },
  { path: '/reports', label: 'Reports', icon: '📶' },
  { path: '/users', label: 'Users', icon: '👥' },
  { path: '/courses', label: 'Courses', icon: '📋' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
];

const footerItems = [
  { icon: '🔄', label: 'Switch Portal', action: 'portal' },
  { icon: '←', label: 'Collapse', action: 'collapse' },
];

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">TS</div>
        <div className="sidebar-title">
          <h4>TSPES</h4>
          <p>ADMIN</p>
        </div>
      </div>
      <nav className="nav-list">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
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
