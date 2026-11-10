import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadOverview, statusClass } from '../../services/overview';
import { formatRelative } from '../../services/resource';
import './style.css';

/**
 * Administration dashboard.
 *
 * Every figure is derived from NocoDB (see services/overview.js): the stat
 * cards, the exercise overview and the activity feed all describe the real
 * scenarios and courses, and each quick action navigates to the page that does
 * the work. The unused "Activity Trend" bar chart was removed.
 */

const quickActions = [
  { icon: '+', label: 'Create New Exercise', to: '/admin/courses?new=1' },
  { icon: '📄', label: 'Build Scenario', to: '/admin/scenarios?new=1' },
  { icon: '✍', label: 'Mark Answers', to: '/admin/marking' },
  { icon: '👥', label: 'Manage Users', to: '/admin/users' },
  { icon: '🧩', label: 'Manage Groups', to: '/admin/groups' },
  { icon: '📶', label: 'View Reports', to: '/admin/reports' },
];

const MAX_ROWS = 5;

const Dashboard = () => {
  const [phase, setPhase] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setPhase('loading');
    setError('');
    try {
      setData(await loadOverview());
      setPhase('ready');
    } catch (e) {
      setError(e.message || 'Could not load the dashboard');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totals = data?.totals;
  const stats = totals
    ? [
        {
          label: 'TOTAL USERS',
          value: String(totals.users),
          desc: totals.newUsers ? `+${totals.newUsers} this month` : 'No new accounts this month',
          icon: '👥',
          iconClass: 'icon-blue',
          to: '/admin/users',
        },
        {
          label: 'ACTIVE GROUPS',
          value: String(totals.groups),
          desc: `${totals.groupsWithExercises} with active exercises`,
          icon: '🧩',
          iconClass: 'icon-green',
          to: '/admin/groups',
        },
        {
          label: 'SCENARIOS',
          value: String(totals.scenarios),
          desc: `${totals.published} published, ${totals.drafts} draft`,
          icon: '📄',
          iconClass: 'icon-purple',
          to: '/admin/scenarios',
        },
        {
          label: 'RUNNING EXERCISES',
          value: String(totals.inProgress),
          desc: `${totals.completed} completed, ${totals.notStarted} not started`,
          icon: '▶',
          iconClass: 'icon-orange',
          to: '/admin/reports',
        },
      ]
    : [];

  const exercises = data ? data.exercises.slice(0, MAX_ROWS) : [];

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Administration Dashboard</h1>
        <p>{dateStr} — Platform overview and activity</p>
      </div>

      {phase === 'loading' && <div className="page-state">Loading dashboard…</div>}

      {phase === 'error' && (
        <div className="error-banner">
          <span>{error}</span>
          <button type="button" className="btn-secondary sm" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {phase === 'ready' && data && (
        <>
          {!data.responsesAvailable && (
            <div className="notice-banner notice-warn">
              Responses cannot be read yet, so progress shows as zero. Run
              <code> npm run setup:nocodb </code>
              to create the responses table, then reload.
            </div>
          )}

          <div className="stats-row">
            {stats.map((s) => (
              <Link className="stat-card" key={s.label} to={s.to}>
                <div className="stat-info">
                  <h4>{s.label}</h4>
                  <div className="num">{s.value}</div>
                  <div className="desc">{s.desc}</div>
                </div>
                <div className={`stat-icon ${s.iconClass}`} aria-hidden="true">
                  {s.icon}
                </div>
              </Link>
            ))}
          </div>

          <div className="main-grid">
            <div className="left-column">
              <div className="card">
                <div className="card-head">
                  <h3>Exercise Overview</h3>
                  <Link className="view-all" to="/admin/reports">
                    View all →
                  </Link>
                </div>

                {exercises.length === 0 ? (
                  <div className="card-empty">
                    No exercises yet. <Link to="/admin/courses?new=1">Create the first one</Link> to
                    see participant progress here.
                  </div>
                ) : (
                  <>
                    <div className="exercise-table-header">
                      <span>Exercise</span>
                      <span>Scenario</span>
                      <span>Status</span>
                      <span>Completion</span>
                    </div>
                    {exercises.map((ex) => (
                      <Link
                        className="exercise-row"
                        key={ex.courseId}
                        to={`/admin/marking/${ex.courseId}`}
                        title="Open the marking workspace"
                      >
                        <div className="exercise-cell-main">
                          <div className="exercise-title">{ex.courseName}</div>
                          <div className="exercise-date">
                            {ex.injectCount} inject{ex.injectCount === 1 ? '' : 's'}
                            {ex.groupName ? ` · ${ex.groupName}` : ''}
                          </div>
                        </div>
                        <div className="group-text">{ex.scenarioName}</div>
                        <div>
                          <span className={`status-badge ${statusClass(ex.status)}`}>
                            {ex.status}
                          </span>
                        </div>
                        <div className="progress-wrap">
                          <div className="progress-bar-bg">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${ex.completion}%` }}
                            ></div>
                          </div>
                          <span>{ex.completion}%</span>
                        </div>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="right-column">
              <div className="card">
                <div className="card-head">
                  <h3>Quick Actions</h3>
                </div>
                <div className="action-list">
                  {quickActions.map((a) => (
                    <Link className="action-item" key={a.label} to={a.to}>
                      <div className="action-icon" aria-hidden="true">
                        {a.icon}
                      </div>
                      <span>{a.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <h3>Recent Activity</h3>
                </div>
                {data.activity.length === 0 ? (
                  <div className="card-empty">
                    No activity yet — participant submissions and new scenarios appear here.
                  </div>
                ) : (
                  <div className="activity-list">
                    {data.activity.map((item) => (
                      <Link className="activity-item" key={item.id} to={item.href}>
                        <div className="activity-name">{item.name}</div>
                        <div className="activity-desc">{item.text}</div>
                        <div className="activity-time">{formatRelative(item.when)}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
