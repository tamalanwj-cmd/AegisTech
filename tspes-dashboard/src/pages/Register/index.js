import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../../pages/Login/style.css';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    name: '',
    password: '',
    confirmPwd: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

  const handleRegister = () => {
    setError('');
    const errMsg = validate();
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setLoading(true);

    // Simulated registration — bypass API
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 600);
  };

  return (
    <div className="login-page">
      <div className="header-section">
        <div className="logo-icon"></div>
        <h1>Create Account</h1>
        <p className="subtitle">Register for a TSPES account</p>
      </div>

      <div className="login-card-inner" style={{ maxWidth: 400 }}>
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
            type={showPwd ? 'text' : 'password'}
            placeholder="Enter password (min 6 chars)"
            value={form.password}
            onChange={set('password')}
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Confirm Password <span className="required">*</span></label>
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter password"
            value={form.confirmPwd}
            onChange={set('confirmPwd')}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            disabled={loading}
          />
        </div>
        {error && <div className="login-error">{error}</div>}
        <button className="signin-btn" onClick={handleRegister} disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
        <div className="login-card-extra">
          <Link to="/login" className="register-link-inline">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
