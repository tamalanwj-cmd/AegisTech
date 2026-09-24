import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser, getToken } from '../../services/auth';

/**
 * Route guard. Requires a signed-in session; pass role="admin" to restrict
 * the subtree to administrator accounts (A02+ pages).
 */
const AuthGuard = ({ role, children }) => {
  const location = useLocation();
  const token = getToken();
  const user = getCurrentUser();

  // No session -> back to the P01 portal selection page
  if (!token || !user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Non-admins have no business in the administrator portal
  if (role === 'admin' && !user.isAdmin) {
    return <Navigate to="/participant" replace />;
  }

  return children;
};

export default AuthGuard;
