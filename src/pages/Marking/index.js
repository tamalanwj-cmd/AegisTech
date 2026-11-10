import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadOverview, statusClass } from '../../services/overview';
import './style.css';

/**
 * Marking — the administrator's grading queue.
 *
 * Courses (exercises) are grouped by crisis category so a marker can pick the
 * crisis type first and then open the exercise to mark, which matches the
 * requested flow: crisis category -> course -> marking workspace.
 */
const Marking = () => {
  const [phase, setPhase] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setPhase('loading');
    setError('');
    try {
      setData(await loadOverview());
      setPhase('ready');
    } catch (e) {
      setError(e.message || 'Could not load the marking queue');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    if (!data) return ['All'];
    const seen = new Set(data.exercises.map((ex) => ex.crisisType).filter(Boolean));
    return ['All', ...[...seen].sort((a, b) => a.localeCompare(b))];
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.exercises
      .filter((ex) => {
        if (category !== 'All' && ex.crisisType !== category) return false;
        if (!q) return true;
        return [ex.courseName, ex.scenarioName, ex.groupName].some((v) =>
          String(v || '').toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          a.crisisType.localeCompare(b.crisisType) || a.courseName.localeCompare(b.courseName)
      );
  }, [data, category, search]);

  return (
    <div className="marking-page">
      <div className="marking-header">
        <div>
          <h1>Marking</h1>
          <p>Review participant inject responses and record marks</p>
        </div>
        <Link className="btn-secondary" to="/admin/reports">
          📶 View reports
        </Link>
      </div>

      {phase === 'loading' && <div className="marking-state">Loading exercises…</div>}

      {phase === 'error' && (
        <div className="marking-error">
          <span>{error}</span>
          <button type="button" className="btn-secondary sm" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {phase === 'ready' && data && (
        <>
          {!data.responsesAvailable && (
            <div className="marking-warn">
              The responses table is missing, so there are no answers to mark yet. Run
              <code> npm run setup:nocodb </code>
              and reload.
            </div>
          )}

          <div className="marking-card">
            <div className="marking-filters">
              <input
                type="search"
                placeholder="Search exercises…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search exercises"
              />
              <div className="marking-tabs" role="tablist" aria-label="Filter by crisis category">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={category === c}
                    className={`marking-tab${category === c ? ' active' : ''}`}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="marking-state">
                No exercises match the current filters.{' '}
                <Link to="/admin/courses?new=1">Create an exercise</Link> to start marking.
              </div>
            ) : (
              <ul className="marking-list">
                {rows.map((ex) => {
                  const markReady = ex.answered > 0;
                  return (
                    <li key={ex.courseId}>
                      <Link className="marking-row" to={`/admin/marking/${ex.courseId}`}>
                        <div className="marking-row-main">
                          <span className="marking-row-title">{ex.courseName}</span>
                          <span className="marking-row-scenario">{ex.scenarioName}</span>
                          <span
                            className={`marking-category cat-${String(ex.crisisType)
                              .toLowerCase()
                              .replace(/\s+/g, '-')}`}
                          >
                            {ex.crisisType}
                          </span>
                        </div>
                        <div className="marking-row-meta">
                          <span>{ex.participants} participant{ex.participants === 1 ? '' : 's'}</span>
                          <span>{ex.answered} answer{ex.answered === 1 ? '' : 's'}</span>
                          <span>{ex.marked} marked</span>
                          <span className={`marking-status ${statusClass(ex.status)}`}>
                            {ex.status}
                          </span>
                          <span className={`marking-open${markReady ? '' : ' muted'}`}>Mark →</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Marking;
