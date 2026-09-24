import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../Login/style.css';
import './style.css';

/**
 * P01 — Portal Selection.
 *
 * Public landing page (no authentication, no sidebar). Visitors pick the
 * participant portal or the administrator portal; each button leads to the
 * matching login page (P02 / A01).
 */
const portals = [
  {
    id: 'participant',
    label: 'Participant Portal',
    desc: 'Access assigned exercises, review scenario injects and submit your responses.',
    btnText: 'Enter Participant Portal',
    iconClass: 'participant-icon',
  },
  {
    id: 'admin',
    label: 'Administrator Portal',
    desc: 'Manage users, courses and scenarios. Build and publish tabletop exercises.',
    btnText: 'Enter Administrator Portal',
    iconClass: 'admin-icon',
  },
];

const PortalSelector = () => {
  const navigate = useNavigate();

  return (
    <div className="login-page portal-page">
      <div className="header-section">
        <div className="logo-icon"></div>
        <h1>TSPES</h1>
        <p className="subtitle">Tabletop Scenario Planning and Education System</p>
        <p className="portal-desc">
          A training platform for designing and running tabletop exercises.
          Choose how you would like to sign in.
        </p>
      </div>

      <div className="portal-container">
        {portals.map((portal) => (
          <button
            key={portal.id}
            type="button"
            className="portal-card"
            onClick={() => navigate(`/${portal.id}/login`)}
          >
            <div className={`card-icon ${portal.iconClass}`}></div>
            <h2>{portal.label}</h2>
            <p>{portal.desc}</p>
            <span className="enter-btn">{portal.btnText}</span>
          </button>
        ))}
      </div>

      <div className="portal-footer">
        <Link className="register-link" to="/register">Create Account</Link>
        <p className="portal-footer-brand">
          © {new Date().getFullYear()} Deakin University — Centre for Emergency Management
        </p>
      </div>
    </div>
  );
};

export default PortalSelector;
