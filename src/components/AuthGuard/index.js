
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const AuthGuard = ({ role, children }) => {
  const location = useLocation();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (mounted) {
        if (error) {
          console.error('Session error:', error.message);
        }

        setSession(data?.session ?? null);
        setLoading(false);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div>Checking authentication...</div>;
  }

  if (!session) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  const userRole = session.user.app_metadata?.role;

  if (role === 'admin' && userRole !== 'admin') {
    return <Navigate to="/participant" replace />;
  }

  return children;
};

export default AuthGuard;
