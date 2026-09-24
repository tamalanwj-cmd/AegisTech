import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { login } from '../../services/auth';
import './style.css';

/**
 * P02 / A01 — Portal login.
 *
 * One layout for both portals; the `portal` prop decides the title, badge and
 * the post-login destination (participant dashboard or admin dashboard).
 * Reached from the P01 portal selection page.
 */
const PORTALS = {
  participant: {
    title: 'Participant Login',
    welcome: 'Sign in to your participant account to access your exercises',
    badge: 'Participant Portal',
    redirectTo: '/participant',
    forgotLink: '/forgot-password?portal=participant',
    registerLink: '/register?portal=participant',
    demo: { username: '', password: '' },
  },
  admin: {
    title: 'Admin Login',
    welcome: 'Sign in to your administrator account to manage the platform',
    badge: 'Administrator Portal',
    redirectTo: '/admin',
    forgotLink: '/forgot-password?portal=admin',
    registerLink: '/register?portal=admin',
    demo: { username: 'admin', password: 'admin123' },
  },
};

const Login = ({ portal = 'participant' }) => {
  const meta = PORTALS[portal] || PORTALS.participant;
  const navigate = useNavigate();
  const location = useLocation();
  const resetDone = Boolean(location.state?.reset);

  const [username, setUsername] = useState(location.state?.email || meta.demo.username);
  const [password, setPassword] = useState(resetDone ? '' : meta.demo.password);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(
    resetDone ? 'Password updated. Please sign in with your new password.' : ''
  );
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setNotice('');

    if (!username.trim()) {
      setError('Please enter email');
      return;
    }
    if (!password.trim()) {
      setError('Please enter password');
      return;
    }

    setLoading(true);
    try {
      await login({ identifier: username, password, portal, remember });
      navigate(meta.redirectTo, { replace: true });
    } catch (e) {
      setError(e.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="header-section">
        <div className="logo-icon"></div>
        <h1>{meta.title}</h1>
        <p className="subtitle">{meta.welcome}</p>
      </div>

      <div className="login-card-inner">
        <div className="org-tag">{meta.badge}</div>

        <div className="form-group">
          <label>Email address <span className="required">*</span></label>
          <input
            type="text"
            placeholder="Enter email or username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Password <span className="required">*</span></label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            disabled={loading}
          />
        </div>

        <div className="form-options">
          <label className="remember-me">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={loading}
            />{' '}
            Remember me
          </label>
          <Link className="forgot-password" to={meta.forgotLink}>Forgot password?</Link>
        </div>

        {notice && <div className="hint-box">{notice}</div>}
        {error && <div className="login-error">{error}</div>}

        <button className="signin-btn" onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="login-card-extra">
          <Link to="/" className="btn-back-inline">← Back to portal selection</Link>
          <Link to={meta.registerLink} className="register-link-inline">
            Create Account
          </Link>
        </div>
      </div>

      <div className="footer-note">
        © {new Date().getFullYear()} Deakin University — Centre for Emergency Management
      </div>
    </div>
  );
};

export default Login;
