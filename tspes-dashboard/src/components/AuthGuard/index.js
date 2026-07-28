import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Whitelist routes (no auth required)
const whiteList = ['/login', '/register'];

const AuthGuard = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');

  // In whitelist -> allow direct access
  if (whiteList.includes(location.pathname)) {
    return children;
  }

  // No token -> redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Has token -> allow
  return children;
};

export default AuthGuard;
