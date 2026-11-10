import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadOverview, statusClass } from '../../services/overview';
import './style.css';

/**
 * Reports.
 *
 * Replaces the placeholder charts with a table built from the real scenarios and
 * courses: every exercise links straight to its marking workspace, and every
 * scenario links back to the builder that edits it. A scenario that has not been
 * scheduled into a course yet is listed separately so nothing goes missing.
 */

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const downloadCsv = (exercises) => {
  const header = [
    'Exercise',
    'Scenario',
    'Category',
    'Group',
    'Participants',
    'Injects',
    'Responses',
    'Expected responses',
    'Completion %',
    'Marked',
    'Status',
  ];
  const lines = [header.map(csvCell).join(',')];
  exercises.forEach((ex) => {
    lines.push(
      [
        ex.courseName,
        ex.scenarioName,
        ex.crisisType,
        ex.groupName || '—',
        ex.participants,
        ex.injectCount,
        ex.answered,
        ex.expected,
        ex.completion,
        ex.marked,
        ex.status,
      ]
        .map(csvCell)
        .join(',')
    );
  });

  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `tspes-report-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const Reports = () => {
  const [phase, setPhase] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const load = useCallback(async () => {
    setPhase('loading');
    setError('');
    try {
      setData(await loadOverview());
      setPhase('ready');
    } catch (e) {
      setError(e.message || 'Could not load reports');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    if (!data) return ['All'];
    return ['All', ...new Set(data.exercises.map((e) => e.crisisType).filter(Boolean))];
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.exercises.filter((ex) => {
      if (category !== 'All' && ex.crisisType !== category) return false;
      if (!q) return true;
      return [ex.courseName, ex.scenarioName, ex.groupName, ex.crisisType].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [data, search, category]);

  const unscheduled = useMemo(() => {
    if (!data) return [];
    return data.scenarios.filter((s) => !data.courseByScenario.has(Number(s.Id)));
  }, [data]);

  const totals = data?.totals;

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1>Reports</h1>
          <p>Live progress for every scenario and exercise on the platform</p>
        </div>
        <div className="reports-actions">
          <Link className="btn-secondary" to="/admin/marking">
            ✍ Open marking
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => rows.length && downloadCsv(rows)}
            disabled={!rows.length}
          >
            Export CSV
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      {phase === 'loading' && <div className="reports-state">Loading report data…</div>}

      {phase === 'error' && (
        <div className="reports-error">
          <span>{error}</span>
          <button type="button" className="btn-secondary sm" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {phase === 'ready' && data && (
        <>
          <div className="report-stats">
            <div className="report-stat">
              <span className="report-stat-label">EXERCISES COMPLETED</span>
              <span className="report-stat-value">{totals.completed}</span>
              <span className="report-stat-sub">of {totals.activeExercises} active exercises</span>
            </div>
            <div className="report-stat">
              <span className="report-stat-label">ACTIVE PARTICIPANTS</span>
              <span className="report-stat-value">{totals.participants}</span>
              <span className="report-stat-sub">across {totals.groups} groups</span>
            </div>
            <div className="report-stat">
              <span className="report-stat-label">AVG. COMPLETION</span>
              <span className="report-stat-value">{totals.completion}%</span>
              <span className="report-stat-sub">
                {totals.responses} of {totals.expected} responses
              </span>
            </div>
            <div className="report-stat">
              <span className="report-stat-label">RESPONSES MARKED</span>
              <span className="report-stat-value">{totals.marked}</span>
              <span className="report-stat-sub">of {totals.responses} submitted answers</span>
            </div>
          </div>

          {!data.responsesAvailable && (
            <div className="reports-warn">
              The responses table is missing, so progress is shown as zero. Run
              <code> npm run setup:nocodb </code>
              and reload.
            </div>
          )}

          <div className="report-card">
            <div className="report-card-head">
              <h2>Exercise completion</h2>
              <div className="report-filters">
                <input
                  type="search"
                  placeholder="Search exercise or scenario…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search exercises"
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Filter by crisis category"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All categories' : c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="reports-state">
                No exercises match the current filters.{' '}
                <Link to="/admin/courses?new=1">Create an exercise</Link> to start collecting
                responses.
              </div>
            ) : (
              <div className="report-table-scroll">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Exercise</th>
                      <th>Scenario</th>
                      <th>Category</th>
                      <th>Group</th>
                      <th>Participants</th>
                      <th>Responses</th>
                      <th>Completion</th>
                      <th>Status</th>
                      <th aria-label="Actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((ex) => (
                      <tr key={ex.courseId}>
                        <td>
                          <Link className="report-link" to={`/admin/marking/${ex.courseId}`}>
                            {ex.courseName}
                          </Link>
                          <div className="report-sub">
                            {ex.injectCount} inject{ex.injectCount === 1 ? '' : 's'}
                          </div>
                        </td>
                        <td>
                          {ex.scenarioId ? (
                            <Link
                              className="report-link muted"
                              to={`/admin/scenarios/${ex.scenarioId}/builder`}
                            >
                              {ex.scenarioName}
                            </Link>
                          ) : (
                            <span className="report-sub">Not linked</span>
                          )}
                        </td>
                        <td>
                          <span className={`report-category cat-${String(ex.crisisType)
                            .toLowerCase()
                            .replace(/\s+/g, '-')}`}>
                            {ex.crisisType}
                          </span>
                        </td>
                        <td>{ex.groupName || '—'}</td>
                        <td className="num">{ex.participants}</td>
                        <td className="num">
                          {ex.answered} / {ex.expected}
                        </td>
                        <td>
                          <div className="report-progress">
                            <div className="report-progress-track">
                              <div
                                className="report-progress-fill"
                                style={{ width: `${ex.completion}%` }}
                              ></div>
                            </div>
                            <span>{ex.completion}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`report-status ${statusClass(ex.status)}`}>
                            {ex.status}
                          </span>
                        </td>
                        <td>
                          <Link className="report-go" to={`/admin/marking/${ex.courseId}`}>
                            Mark →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="report-card">
            <div className="report-card-head">
              <h2>Scenarios not yet scheduled</h2>
              <span className="report-hint">
                {unscheduled.length} of {totals.scenarios} scenarios
              </span>
            </div>
            {unscheduled.length === 0 ? (
              <div className="reports-state">Every scenario is scheduled in at least one course.</div>
            ) : (
              <ul className="report-unscheduled">
                {unscheduled.map((s) => (
                  <li key={s.Id}>
                    <Link to={`/admin/scenarios/${s.Id}/builder`}>{s.name}</Link>
                    <span className={`report-category cat-${String(s.crisisType)
                      .toLowerCase()
                      .replace(/\s+/g, '-')}`}>
                      {s.crisisType}
                    </span>
                    <span className="report-status draft">{s.status}</span>
                    <span className="report-sub">
                      {s.objectives.length} objective{s.objectives.length === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
