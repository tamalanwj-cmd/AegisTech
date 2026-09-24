import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../../services/auth';
import '../../pages/Login/style.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Which portal the flow started from (passed through by ForgotPassword).
  const portal = location.state?.portal === 'admin' ? 'admin' : 'participant';
  const loginPath = portal === 'admin' ? '/admin/login' : '/participant/login';
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) return 'Please enter your email';
    if (!code.trim()) return 'Please enter the reset code';
    if (!password) return 'Please enter a new password';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPwd) return 'Passwords do not match';
    return '';
  };

  const handleSubmit = async () => {
    setError('');
    const errMsg = validate();
    if (errMsg) {
      setError(errMsg);
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ email, code, password });
      navigate(loginPath, { replace: true, state: { email, reset: true } });
    } catch (e) {
      setError(e.message || 'Could not reset the password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="header-section">
        <div className="logo-icon"></div>
        <h1>Set a new password</h1>
        <p className="subtitle">Enter the reset code and choose a new password</p>
      </div>

      <div className="login-card-inner" style={{ maxWidth: 380 }}>
        <div className="form-group">
          <label>Email address <span className="required">*</span></label>
          <input
            type="text"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Reset code <span className="required">*</span></label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>New password <span className="required">*</span></label>
          <input
            type="password"
            placeholder="Enter new password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Confirm new password <span className="required">*</span></label>
          <input
            type="password"
            placeholder="Re-enter new password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={loading}
          />
        </div>

        {error && <div className="login-error">{error}</div>}

        <button className="signin-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Updating...' : 'Reset password'}
        </button>

        <div className="login-card-extra">
          <Link to={`/forgot-password?portal=${portal}`} className="register-link-inline">Request a new code</Link>
          <Link to={loginPath} className="register-link-inline">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
