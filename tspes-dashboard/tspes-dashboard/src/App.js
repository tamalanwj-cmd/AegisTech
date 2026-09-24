import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PortalSelector from './pages/PortalSelector';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import ParticipantLayout from './components/ParticipantLayout';
import ParticipantDashboard from './pages/ParticipantDashboard';
import RoleSelection from './pages/RoleSelection';
import ExercisePage from './pages/ExercisePage';
import ExerciseSummary from './pages/ExerciseSummary';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Courses from './pages/Courses';
import Scenarios from './pages/Scenarios';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      {/* Public — no authentication required (P01, P02, A01) */}
      <Route path="/" element={<PortalSelector />} />
      <Route path="/participant/login" element={<Login portal="participant" />} />
      <Route path="/admin/login" element={<Login portal="admin" />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Participant portal — P03-P07 */}
      <Route
        path="/participant"
        element={
          <AuthGuard>
            <ParticipantLayout />
          </AuthGuard>
        }
      >
        <Route index element={<ParticipantDashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="exercise/:id/roles" element={<RoleSelection />} />
        <Route path="exercise/:id" element={<ExercisePage />} />
        <Route path="exercise/:id/summary" element={<ExerciseSummary />} />
      </Route>

      {/* Administrator portal — A02+ */}
      <Route
        element={
          <AuthGuard role="admin">
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/scenarios" element={<Scenarios />} />
        <Route path="/admin/reports" element={<Reports />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/courses" element={<Courses />} />
        <Route path="/admin/settings" element={<Settings />} />
      </Route>

      {/* Anything else -> portal selection */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
