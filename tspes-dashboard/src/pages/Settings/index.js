import React from 'react';
import './style.css';

const noop = (e) => { if (e) e.preventDefault(); };

const Settings = () => {
  return (
    <div className="settings-page">
      <div className="page-title">
        <h1>Settings</h1>
        <p>Platform configuration, permissions and organisation preferences</p>
      </div>

      <div className="grid-wrap">
        <div className="left-col">
          {/* Organisation Settings */}
          <div className="card">
            <h3>Organisation Settings</h3>
            <div className="form-item">
              <label>Organisation Name</label>
              <input className="form-input" type="text" defaultValue="Deakin University — Centre for Emergency Management" readOnly />
            </div>
            <div className="form-item">
              <label>Administrator Email</label>
              <input className="form-input" type="text" defaultValue="tspes-admin@deakin.edu.au" readOnly />
            </div>
            <div className="form-item">
              <label>Timezone</label>
              <select className="form-select">
                <option>Australia/Melbourne (AEST, UTC+10)</option>
              </select>
            </div>
            <div className="form-item">
              <label>Organisation Logo</label>
              <div className="upload-box" onClick={noop}>
                <div className="icon-text">🗎</div>
                <span>Click to upload logo <a href="/" onClick={(e) => e.preventDefault()}>or drag and drop</a></span>
                <div className="upload-desc">PNG, SVG — up to 2MB · Recommended: 200×80px</div>
              </div>
            </div>
            <button className="btn-save-org" onClick={noop}>
              <span>🗎</span> Save Organisation Settings
            </button>
          </div>

          {/* User Permissions */}
          <div className="card">
            <h3>User Permissions</h3>
            <div className="toggle-row">
              <div className="toggle-text-wrap">
                <h4>Allow self-registration</h4>
                <p>Users can register without an admin invitation</p>
              </div>
              <label className="toggle">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <div className="toggle-text-wrap">
                <h4>Require email verification</h4>
                <p>New accounts must verify email before access</p>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <div className="toggle-text-wrap">
                <h4>Allow observer mode</h4>
                <p>Participants can join exercises as read-only observers</p>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <div className="toggle-text-wrap">
                <h4>Restrict exercise access</h4>
                <p>Participants only see exercises they are assigned to</p>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <div className="toggle-text-wrap">
                <h4>Allow response editing</h4>
                <p>Participants can edit submitted responses before deadline</p>
              </div>
              <label className="toggle">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="right-col">
          {/* Notification Preferences */}
          <div className="sidebar-card">
            <h3>Notification Preferences</h3>
            <div className="toggle-row" style={{ padding: '8px 0', borderBottom: 'none' }}>
              <div className="toggle-text-wrap">
                <h4 style={{ fontSize: 15, marginBottom: 0 }}>New user registered</h4>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-row" style={{ padding: '8px 0', borderBottom: 'none' }}>
              <div className="toggle-text-wrap">
                <h4 style={{ fontSize: 15, marginBottom: 0 }}>Exercise completed</h4>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-row" style={{ padding: '8px 0', borderBottom: 'none' }}>
              <div className="toggle-text-wrap">
                <h4 style={{ fontSize: 15, marginBottom: 0 }}>Response submitted</h4>
              </div>
              <label className="toggle">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-row" style={{ padding: '8px 0', borderBottom: 'none' }}>
              <div className="toggle-text-wrap">
                <h4 style={{ fontSize: 15, marginBottom: 0 }}>System alerts</h4>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Platform Information */}
          <div className="sidebar-card">
            <h3>Platform Information</h3>
            <div className="info-line">
              <span className="info-label">Version</span>
              <span>TSPES v2.4.1</span>
            </div>
            <div className="info-line">
              <span className="info-label">Environment</span>
              <span><span className="badge-prod">Production</span></span>
            </div>
            <div className="info-line">
              <span className="info-label">Last backup</span>
              <span>2 Jul 2025, 02:00 AEST</span>
            </div>
            <div className="info-line">
              <span className="info-label">Data region</span>
              <span>ap-southeast-2 (Sydney)</span>
            </div>
            <div className="info-line">
              <span className="info-label">Uptime</span>
              <span>99.94% (30 days)</span>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="sidebar-card">
            <h3>Danger Zone</h3>
            <p className="danger-desc">These actions are irreversible. Exercise extreme caution.</p>
            <button className="btn-danger-full" onClick={noop}>Archive All Inactive Users</button>
            <button className="btn-danger-outline" onClick={noop}>Reset Platform Data</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
