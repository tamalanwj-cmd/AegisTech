import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { register } from '../../services/auth';
import '../../pages/Login/style.css';

/**
 * Sign-up is reachable from both portal cards on /login. The portal travels in
 * the query string (`/register?portal=admin`) and decides the role of the new
 * account: Administrator Portal -> admin, Participant Portal -> participant.
 */
const portalMeta = {
  admin: {
    role: 'admin',
    badge: 'Administrator Portal',
    subtitle: 'Register an administrator account for TSPES',
  },
  participant: {
    role: 'participant',
    badge: 'Participant Portal',
    subtitle: 'Register for a TSPES participant account',
  },
};

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portalId = String(searchParams.get('portal') || '').toLowerCase() === 'admin' ? 'admin' : 'participant';
  const portal = portalMeta[portalId];

  const [form, setForm] = useState({
    username: '',
    email: '',
    name: '',
    password: '',
    confirmPwd: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    if (!form.username.trim()) return 'Please enter username';
    if (!form.email.trim()) return 'Please enter email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Invalid email format';
    if (!form.name.trim()) return 'Please enter name';
    if (!form.password.trim()) return 'Please enter password';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== form.confirmPwd) return 'Passwords do not match';
    return '';
  };

  const handleRegister = async () => {
    setError('');
    const errMsg = validate();
    if (errMsg) {
      setError(errMsg);
      return;
    }

    setLoading(true);
    try {
      const { email } = await register({ ...form, portal: portalId });
      navigate(portalId === 'admin' ? '/admin/login' : '/participant/login', {
        replace: true,
        state: { email, portal: portalId },
      });
    } catch (e) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="header-section">
        <div className="logo-icon"></div>
        <h1>Create Account</h1>
        <p className="subtitle">{portal.subtitle}</p>
      </div>

      <div className="login-card-inner" style={{ maxWidth: 400 }}>
        <div className="org-tag">{portal.badge}</div>

        <div className="form-group">
          <label>Username <span className="required">*</span></label>
          <input
            type="text"
            placeholder="Enter username"
            value={form.username}
            onChange={set('username')}
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Email <span className="required">*</span></label>
          <input
            type="text"
            placeholder="Enter email"
            value={form.email}
            onChange={set('email')}
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Full Name <span className="required">*</span></label>
          <input
            type="text"
            placeholder="Enter your name"
            value={form.name}
            onChange={set('name')}
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Password <span className="required">*</span></label>
          <input
            type="password"
            placeholder="Enter password (min 6 chars)"
            value={form.password}
            onChange={set('password')}
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Confirm Password <span className="required">*</span></label>
          <input
            type="password"
            placeholder="Re-enter password"
            value={form.confirmPwd}
            onChange={set('confirmPwd')}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            disabled={loading}
          />
        </div>

        <div className="hint-box">
          This account will be created with the <strong>{portal.role}</strong> role.
        </div>

        {error && <div className="login-error">{error}</div>}
        <button className="signin-btn" onClick={handleRegister} disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
        <div className="login-card-extra">
          <Link
            to={portalId === 'admin' ? '/admin/login' : '/participant/login'}
            className="register-link-inline"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
