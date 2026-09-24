import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { requestPasswordReset } from '../../services/auth';
import '../../pages/Login/style.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Remember which portal the user came from so "back" returns there.
  const portal = searchParams.get('portal') === 'admin' ? 'admin' : 'participant';
  const loginPath = portal === 'admin' ? '/admin/login' : '/participant/login';

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setNotice('');
    setDemoCode('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      if (!result.found) {
        // Neutral message: do not reveal whether the account exists.
        setNotice('If an account exists for that email, a reset code has been generated.');
        return;
      }
      setNotice('Reset code generated. Use it on the next screen to set a new password.');
      setDemoCode(result.code);
    } catch (e) {
      setError(e.message || 'Could not start the password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="header-section">
        <div className="logo-icon"></div>
        <h1>Reset your password</h1>
        <p className="subtitle">Enter the email address linked to your account</p>
      </div>

      <div className="login-card-inner" style={{ maxWidth: 380 }}>
        <div className="form-group">
          <label>Email address <span className="required">*</span></label>
          <input
            type="text"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={loading}
          />
        </div>

        {error && <div className="login-error">{error}</div>}
        {notice && <div className="hint-box">{notice}</div>}
        {demoCode && (
          <div className="hint-box">
            Demo mode — no email service is configured, so your code is shown here:
            <br />
            <code>{demoCode}</code>
          </div>
        )}

        <button className="signin-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Generating code...' : 'Send reset code'}
        </button>

        {demoCode && (
          <button
            className="signin-btn"
            style={{ marginTop: 10, background: '#334155' }}
            onClick={() => navigate('/reset-password', { state: { email, portal } })}
          >
            Continue to reset password →
          </button>
        )}

        <div className="login-card-extra">
          <Link to={loginPath} className="register-link-inline">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
