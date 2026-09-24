import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from '../TopNav';
import Sidebar from '../Sidebar';
import './style.css';

const Layout = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrap">
        <TopNav />
        <main className="content-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
