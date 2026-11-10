
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const AuthGuard = ({ role, children }) => {
  const location = useLocation();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState(null);
  const [accountError, setAccountError] = useState('');

  // Restore the session and listen for authentication changes.
  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error('Session error:', error.message);
      }

      setSession(data?.session ?? null);
      setLoading(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Check account status immediately and every 30 seconds.
  useEffect(() => {
    if (!session?.user?.id) {
      setAccountStatus(null);
      setAccountError('');
      return undefined;
    }

    let mounted = true;
    let checking = false;

    const checkAccountStatus = async () => {
      if (checking) return;
      checking = true;

      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('status')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        if (!mounted) return;

        if (data?.status !== 'Active') {
          await supabase.auth.signOut();

          if (mounted) {
            setSession(null);
            setAccountStatus('Inactive');
          }

          return;
        }

        setAccountStatus('Active');
        setAccountError('');
      } catch (error) {
        if (mounted) {
          console.error('Account status check failed:', error);
          setAccountError(
            'Unable to verify your account status. Please try again.'
          );
        }
      } finally {
        checking = false;
      }
    };

    checkAccountStatus();

    const interval = setInterval(checkAccountStatus, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  if (loading || (session && !accountStatus && !accountError)) {
    return <div>Checking authentication...</div>;
  }

  if (!session) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (accountError) {
    return (
      <div className="pd-state">
        {accountError}
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (accountStatus !== 'Active') {
    return <Navigate to="/" replace />;
  }

  const userRole = session.user.app_metadata?.role;

  if (role === 'admin' && userRole !== 'admin') {
    return <Navigate to="/participant" replace />;
  }

  return children;
};

export default AuthGuard;
