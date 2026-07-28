import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './style.css';

const portals = [
  {
    id: 'participant',
    label: 'Participant Portal',
    desc: 'Access assigned exercises, select roles and submit responses to scenario injects.',
    btnText: 'Enter as Participant',
    color: '#3B82F6',
    iconClass: 'participant-icon',
    welcome: 'Sign in to your Participant account',
    orgTag: 'Participant Portal',
  },
  {
    id: 'admin',
    label: 'Administrator Portal',
    desc: 'Manage users, groups, scenarios and exercises. Build and publish tabletop exercises.',
    btnText: 'Enter as Administrator',
    color: '#FBBF24',
    iconClass: 'admin-icon',
    welcome: 'Sign in to your Administrator account',
    orgTag: 'Administrator Portal',
  },
];

const NOOP = () => {};

const Login = () => {
  const navigate = useNavigate();
  const [selectedPortal, setSelectedPortal] = useState(null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setError('');

    if (!username.trim()) {
      setError('Please enter username');
      return;
    }
    if (!password.trim()) {
      setError('Please enter password');
      return;
    }

    // Check demo credentials
    if (username.trim() !== 'admin' || password !== 'admin123') {
      setError('Invalid credentials. Try admin / admin123');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const mockUser = {
        Name: 'Administrator',
        UserName: 'admin',
        isAdmin: selectedPortal?.id === 'admin',
      };
      localStorage.setItem('token', 'mock-token-tspes');
      localStorage.setItem('user', JSON.stringify(mockUser));
      navigate('/', { replace: true });
    }, 600);
  };

  const handleBack = () => {
    setSelectedPortal(null);
    setError('');
  };

  return (
    <div className="login-page">
      {!selectedPortal ? (
        <>
          <div className="header-section">
            <div className="logo-icon"></div>
            <h1>TSPES</h1>
            <p className="subtitle">Tabletop Scenario Planning and Education System</p>
            <p className="university">Deakin University — Centre for Emergency Management</p>
          </div>

          <div className="portal-container">
            {portals.map((portal) => (
              <div
                key={portal.id}
                className="portal-card"
                onClick={() => setSelectedPortal(portal)}
              >
                <div className={`card-icon ${portal.iconClass}`}></div>
                <h2>{portal.label}</h2>
                <p>{portal.desc}</p>
                <span className="enter-btn">{portal.btnText}</span>
              </div>
            ))}
          </div>

          <div className="footer-note">
            <Link className="register-link" to="/register">Create Account</Link>
            <span className="footer-sep">·</span>
            Secure platform — session expires after 8 hours of inactivity
          </div>
        </>
      ) : (
        <>
          <div className="header-section">
            <div className="logo-icon"></div>
            <h1>Welcome back</h1>
            <p className="subtitle">{selectedPortal.welcome}</p>
          </div>

          <div className="login-card-inner">
            <div className="org-tag">{selectedPortal.orgTag}</div>

<div className="form-group">
              <label>Email address <span className="required">*</span></label>
              <input
                type="text"
                placeholder="Enter email or username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
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
                <input type="checkbox" /> Remember me
              </label>
              <span className="forgot-password" onClick={NOOP}>Forgot password?</span>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button className="signin-btn" onClick={handleLogin} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in to Portal'}
            </button>

            <div className="login-card-extra">
              <button className="btn-back-inline" onClick={handleBack}>← Back to portal selection</button>
              <Link to="/register" className="register-link-inline">Create Account</Link>
            </div>
          </div>

          <div className="footer-note">
            Session data is encrypted and stored securely.
          </div>
        </>
      )}
    </div>
  );
};

export default Login;
