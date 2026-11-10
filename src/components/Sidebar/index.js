
import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/auth';
import './style.css';

const menuItems = [
  { path: '/admin', label: 'Dashboard', icon: '🖥', end: true },
  { path: '/admin/scenarios', label: 'Scenarios', icon: '📄' },
  { path: '/admin/courses', label: 'Courses', icon: '📋' },
  { path: '/admin/marking', label: 'Marking', icon: '✍' },
  { path: '/admin/reports', label: 'Reports', icon: '📶' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/groups', label: 'Groups', icon: '🧩' },
];

const Sidebar = ({ open = false, onNavigate }) => {
  const navigate = useNavigate();
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

  const role = (user?.Role || 'admin').toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <aside className={`sidebar${open ? ' sidebar-open' : ''}`} id="admin-sidebar">
      <div className="sidebar-header">
        <NavLink
          to="/admin"
          className="sidebar-brand"
          onClick={onNavigate}
          aria-label="TSPES dashboard"
        >
          <div className="sidebar-logo">TS</div>
          <div className="sidebar-title">
            <h4>TSPES</h4>
            <p>{role}</p>
          </div>
        </NavLink>

        <button
          type="button"
          className="sidebar-close"
          onClick={onNavigate}
          aria-label="Close navigation"
        >
          ✕
        </button>
      </div>

      <nav className="nav-list" aria-label="Administrator sections">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={onNavigate}
          >
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="nav-item nav-item-button"
          onClick={handleLogout}
        >
          <span aria-hidden="true">🚪</span> Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
