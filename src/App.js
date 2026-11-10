import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PortalSelector from './pages/PortalSelector';
import Login from './pages/Login';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import ParticipantLayout from './components/ParticipantLayout';
import ParticipantDashboard from './pages/ParticipantDashboard';
import ExercisePage from './pages/ExercisePage';
import ExerciseSummary from './pages/ExerciseSummary';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Courses from './pages/Courses';
import Scenarios from './pages/Scenarios';
import ScenarioBuilder from './pages/ScenarioBuilder';
import Marking from './pages/Marking';
import MarkingWorkspace from './pages/Marking/Workspace';
import Reports from './pages/Reports';
import { useEffect, useState } from 'react';
import { getCurrentUser } from './services/auth';

function HomeRedirect() {
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    let mounted = true;

    const redirect = async () => {
      try {
        const user = await getCurrentUser();

        if (!mounted) return;

        if (user?.Role === 'admin') {
          setDestination('/admin');
        } else if (user?.Role === 'participant') {
          setDestination('/participant');
        } else {
          setDestination('/portal');
        }
      } catch (error) {
        console.error('Failed to restore user session:', error);

        if (mounted) {
          setDestination('/portal');
        }
      }
    };

    redirect();

    return () => {
      mounted = false;
    };
  }, []);

  if (!destination) {
    return <div className="pd-state">Restoring your session...</div>;
  }

  return <Navigate to={destination} replace />;
}

function App() {
  return (
    <Routes>
      {/* Public — no authentication required (P01, P02, A01) */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/portal" element={<PortalSelector />} />
      <Route path="/participant/login" element={<Login portal="participant" />} />
      <Route path="/admin/login" element={<Login portal="admin" />} />

      {/* Participant portal — P03-P07.
          Participants never choose their own role: it is assigned by an
          administrator when they are enrolled in a course, so there is no
          role-selection step between the dashboard and an exercise. */}
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
        <Route path="exercise/:id" element={<ExercisePage />} />
        <Route path="exercise/:id/summary" element={<ExerciseSummary />} />
      </Route>

      {/* Administrator portal — A02+.
          Settings was removed from the navigation (redundant), so there is no
          /admin/settings route any more. */}
      <Route
        element={
          <AuthGuard role="admin">
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/scenarios" element={<Scenarios />} />
        <Route path="/admin/scenarios/:id/builder" element={<ScenarioBuilder />} />
        <Route path="/admin/courses" element={<Courses />} />
        <Route path="/admin/marking" element={<Marking />} />
        <Route path="/admin/marking/:courseId" element={<MarkingWorkspace />} />
        <Route path="/admin/reports" element={<Reports />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/groups" element={<Groups />} />
      </Route>

      {/* Anything else -> portal selection */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
