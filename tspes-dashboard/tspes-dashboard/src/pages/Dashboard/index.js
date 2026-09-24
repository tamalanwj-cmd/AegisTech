import React from 'react';
import { useNavigate } from 'react-router-dom';
import './style.css';

const noop = (e) => { if (e) e.preventDefault(); };

const dateStr = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const exerciseData = [
  {
    title: 'ER Alpha — Pandemic Surge Exercise',
    date: '2 Jul 2025',
    group: 'Emergency Response',
    status: 'In Progress',
    statusClass: 'status-progress',
    completion: 67,
  },
  {
    title: 'CM Beta — Infrastructure Exercise',
    date: '',
    group: 'Crisis Management',
    status: 'Scheduled',
    statusClass: 'status-notstarted',
    completion: 0,
  },
];

const stats = [
  { label: 'TOTAL USERS', value: '47', desc: '+3 this month', icon: '👥', iconClass: 'icon-blue' },
  { label: 'ACTIVE GROUPS', value: '4', desc: '3 with active exercises', icon: '👥', iconClass: 'icon-green' },
  { label: 'SCENARIOS', value: '4', desc: '3 published, 1 draft', icon: '📄', iconClass: 'icon-purple' },
  { label: 'RUNNING EXERCISES', value: '2', desc: '1 in progress, 1 active', icon: '▶', iconClass: 'icon-orange' },
];

const barData = [
  { label: 'Feb', height: 12 },
  { label: 'Mar', height: 22 },
  { label: 'Apr', height: 14 },
  { label: 'May', height: 32 },
  { label: 'Jun', height: 20 },
  { label: 'Jul', height: 38 },
];

const maxBar = Math.max(...barData.map((b) => b.height));
const chartHeight = 200;

const actions = [
  { icon: '+', label: 'Create New Exercise' },
  { icon: '📄', label: 'Build Scenario' },
  { icon: '👥', label: 'Manage Users' },
  { icon: '👥', label: 'Manage Groups' },
  { icon: '📶', label: 'View Reports' },
  { icon: '⚙', label: 'Settings' },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Administration Dashboard</h1>
        <p>{dateStr} — Platform overview and activity</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-info">
              <h4>{s.label}</h4>
              <div className="num">{s.value}</div>
              <div className="desc">{s.desc}</div>
            </div>
            <div className={`stat-icon ${s.iconClass}`}>{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="main-grid">
        <div className="left-column">
          {/* Activity Trend Chart */}
          <div className="card">
            <div className="card-head">
              <h3>Activity Trend — Last 6 Months</h3>
            </div>
            <div className="chart-wrap">
              <div className="chart-y-axis">
                <span>36</span>
                <span>27</span>
                <span>18</span>
                <span>9</span>
                <span>0</span>
              </div>
              <div className="chart-bars-container">
                {barData.map((b, i) => (
                  <div className="bar-group" key={i}>
                    <div
                      className="bar"
                      style={{ height: `${(b.height / maxBar) * chartHeight}px` }}
                    ></div>
                    <div className="bar-label">{b.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Exercise Overview */}
          <div className="card">
            <div className="card-head">
              <h3>Exercise Overview</h3>
              <span className="view-all" onClick={() => navigate('/admin/scenarios')}>View all →</span>
            </div>
            <div className="exercise-table-header">
              <span>Exercise</span>
              <span>Group</span>
              <span>Status</span>
              <span>Completion</span>
            </div>
            {exerciseData.map((ex, i) => (
              <div className="exercise-row" key={i}>
                <div>
                  <div className="exercise-title">{ex.title}</div>
                  {ex.date && <div className="exercise-date">{ex.date}</div>}
                </div>
                <div className="group-text">{ex.group}</div>
                <div>
                  <span className={`status-badge-- ${ex.statusClass}`}>{ex.status}</span>
                </div>
                <div className="progress-wrap">
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${ex.completion}%` }}></div>
                  </div>
                  <span>{ex.completion}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="right-column">
          {/* Quick Actions */}
          <div className="card">
            <div className="card-head">
              <h3>Quick Actions</h3>
            </div>
            <div className="action-list">
              {actions.map((a, i) => (
                <div className="action-item" key={i} onClick={noop}>
                  <div className="action-icon">{a.icon}</div>
                  <span>{a.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-head">
              <h3>Recent Activity</h3>
            </div>
            <div className="activity-item">
              <div className="activity-name">Dr. Sarah Mitchell</div>
              <div className="activity-desc">submitted response for Inject 2</div>
              <div className="activity-time">3 min ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
