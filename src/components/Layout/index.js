import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopNav from '../TopNav';
import Sidebar from '../Sidebar';
import './style.css';

/**
 * Admin shell.
 *
 * On wide screens the sidebar is a fixed column. Below 900px it becomes a
 * drawer opened from the top bar, so the portal stays usable on a tablet or a
 * narrow browser window (Design change document: "mobile/tablet viewing
 * compatibility").
 */
const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Follow a link -> the drawer has done its job.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Escape closes the drawer, matching the dialogs.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <div className="main-wrap">
        <TopNav onMenuClick={() => setSidebarOpen(true)} />
        <main className="content-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
