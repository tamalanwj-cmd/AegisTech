import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { courseParticipants, loadOverview, statusClass } from '../../services/overview';
import { MARKS_MAX, formatDuration, isAnswered, saveMark } from '../../services/responses';
import { getCurrentUser } from '../../services/auth';
import './style.css';

/**
 * Marking workspace for one exercise.
 *
 * Layout follows the requested design: participant tabs along the top, an inject
 * selector, then the rubric on the left and the participant's answer on the
 * right with the mark, the time they took and a comment box, navigation at the
 * bottom. Marks are written to the responses table, so they survive a reload and
 * show up in the reports.
 */
const MarkingWorkspace = () => {
  const { courseId } = useParams();
  const [me, setMe] = useState(null);

  const [phase, setPhase] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const [participantIndex, setParticipantIndex] = useState(0);
  const [injectIndex, setInjectIndex] = useState(0);

  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (mounted) {
          setMe(currentUser);
        }
      } catch (error) {
        console.error('Failed to load administrator:', error);
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  const load = useCallback(async () => {
    setPhase('loading');
    setError('');
    try {
      setData(await loadOverview());
      setPhase('ready');
    } catch (e) {
      setError(e.message || 'Could not load this exercise');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const course = useMemo(
    () => (data ? data.courses.find((c) => Number(c.Id) === Number(courseId)) || null : null),
    [data, courseId]
  );

  const scenario = useMemo(() => {
    if (!data || !course || !course.scenarioId) return null;
    return data.scenarioById.get(Number(course.scenarioId)) || null;
  }, [data, course]);

  const participants = useMemo(() => {
    if (!data || !course) return [];
    const group = course.groupId ? data.groupById.get(Number(course.groupId)) : null;
    return courseParticipants(course, group, data.userById, data.users);
  }, [data, course]);

  const injects = useMemo(() => {
    if (!data || !scenario) return [];
    return (data.injectsByScenario.get(scenario.Id) || []).slice();
  }, [data, scenario]);

  const responseMap = useMemo(() => {
    const map = new Map();
    (data?.responses || []).forEach((r) => map.set(`${r.enrollmentId}:${r.injectId}`, r));
    return map;
  }, [data]);

  // Keep the selection inside the loaded lists (deleting a participant or an
  // inject must not leave the page pointing at nothing).
  useEffect(() => {
    if (participants.length && participantIndex > participants.length - 1) {
      setParticipantIndex(participants.length - 1);
    }
  }, [participants.length, participantIndex]);

  useEffect(() => {
    if (injects.length && injectIndex > injects.length - 1) {
      setInjectIndex(injects.length - 1);
    }
  }, [injects.length, injectIndex]);

  const participant = participants[participantIndex] || null;
  const inject = injects[injectIndex] || null;
  const response =
    participant && inject ? responseMap.get(`${participant.enrollmentId}:${inject.Id}`) || null : null;

  // Load the saved mark/comment whenever the selection changes.
  useEffect(() => {
    setMarks(response && response.marks !== null ? String(response.marks) : '');
    setFeedback(response?.feedback || '');
    setFormError('');
    setNotice('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantIndex, injectIndex, response?.Id]);

  const markedCount = useMemo(
    () =>
      (data?.responses || []).filter(
        (r) => r.marks !== null && r.scenarioId === scenario?.Id
      ).length,
    [data, scenario]
  );
  const totalCells = participants.length * injects.length;

  const handleSave = async () => {
    if (!participant || !inject || !course || !scenario || !me) {
        setFormError('Administrator account is still loading. Please try again.');
        return;
      }
    setSaving(true);
    setFormError('');
    try {
      const saved = await saveMark({
          enrollmentId: participant.enrollmentId,
          injectId: inject.Id,
          marks,
          feedback,
          markedBy: me?.Id,
        });
      setData((prev) => {
        if (!prev) return prev;
        const rest = prev.responses.filter(
          (r) => !(r.userId === saved.userId && r.injectId === saved.injectId)
        );
        return { ...prev, responses: [...rest, saved] };
      });
      setNotice(`Mark saved for ${participant.name}`);
    } catch (e) {
      setFormError(e.message || 'Could not save this mark');
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ early states ---------------------------- */

  if (phase === 'loading') {
    return <div className="marking-state">Loading marking workspace…</div>;
  }

  if (phase === 'error') {
    return (
      <div className="mark-page">
        <Link to="/admin/marking" className="back-link">← Back to marking</Link>
        <div className="marking-error">
          <span>{error}</span>
          <button type="button" className="btn-secondary sm" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mark-page">
        <Link to="/admin/marking" className="back-link">← Back to marking</Link>
        <div className="marking-state">
          This exercise no longer exists. <Link to="/admin/marking">Return to the marking queue</Link>.
        </div>
      </div>
    );
  }

  if (!participants.length) {
    return (
      <div className="mark-page">
        <Link to="/admin/marking" className="back-link">← Back to marking</Link>
        <div className="marking-state">
          No participants are enrolled in this exercise yet. Assign participants from the{' '}
          <Link to="/admin/courses">Courses</Link> page.
        </div>
      </div>
    );
  }

  if (!injects.length) {
    return (
      <div className="mark-page">
        <Link to="/admin/marking" className="back-link">← Back to marking</Link>
        <div className="marking-state">
          This scenario has no injects yet. Add them from the{' '}
          {scenario ? (
            <Link to={`/admin/scenarios/${scenario.Id}/builder`}>scenario builder</Link>
          ) : (
            'scenario builder'
          )}
          .
        </div>
      </div>
    );
  }

  const answered = isAnswered(response);
  const prevParticipant = participantIndex > 0;
  const nextParticipant = participantIndex < participants.length - 1;

  return (
    <div className="mark-page">
      <Link to="/admin/marking" className="back-link">← Back to marking</Link>

      <div className="mark-head">
        <div>
          <h1>Mark Answers</h1>
          <p>
            {course.name}
            {scenario && <> — {scenario.name}</>}
          </p>
        </div>
        <div className="mark-badges">
          {scenario && (
            <span
              className={`marking-category cat-${String(scenario.crisisType)
                .toLowerCase()
                .replace(/\s+/g, '-')}`}
            >
              {scenario.crisisType}
            </span>
          )}
          <span className={`marking-status ${statusClass(course.status)}`}>{course.status}</span>
        </div>
      </div>

      {/* Participant tabs */}
      <div className="mark-participants" role="tablist" aria-label="Participants">
        {participants.map((p, index) => {
          const anyMarked = injects.some((inj) => {
            const r = responseMap.get(`${p.enrollmentId}:${inj.Id}`);
            return r && r.marks !== null;
          });
          return (
            <button
              key={p.userId}
              type="button"
              role="tab"
              aria-selected={index === participantIndex}
              className={`mark-participant${index === participantIndex ? ' active' : ''}`}
              onClick={() => {
                setParticipantIndex(index);
                setInjectIndex(0);
              }}
            >
              <span className="mark-participant-name">{p.name}</span>
              <span className="mark-participant-role">{p.role || 'No role'}</span>
              {anyMarked && <span className="mark-participant-dot" title="Has marks">●</span>}
            </button>
          );
        })}
      </div>

      <div className="mark-toolbar">
        <label className="mark-inject-select">
          <span>Inject</span>
          <select
            value={injectIndex}
            onChange={(e) => setInjectIndex(Number(e.target.value))}
            disabled={saving}
          >
            {injects.map((inj, index) => (
              <option key={inj.Id} value={index}>
                Inject {inj.sequence} — {inj.title}
              </option>
            ))}
          </select>
        </label>
        <span className="mark-progress">
          {markedCount} of {totalCells} answers marked
        </span>
      </div>

      {notice && <div className="mark-notice">{notice}</div>}
      {formError && <div className="mark-error">{formError}</div>}
      {!answered && (
        <div className="mark-hint">
          {participant.name} has not submitted an answer for this inject yet. You can still record a
          mark and a comment.
        </div>
      )}

      <div className="mark-grid">
        {/* Rubric */}
        <section className="mark-panel">
          <div className="mark-panel-head">
            <h2>Rubrics</h2>
            {inject.assignedRole && (
              <span className="mark-role">Target role: {inject.assignedRole}</span>
            )}
          </div>
          <div className="mark-panel-body">
            {inject.rubric ? (
              <pre className="mark-rubric">{inject.rubric}</pre>
            ) : (
              <p className="mark-empty">
                No rubric recorded for this inject. Add one in the{' '}
                {scenario ? (
                  <Link to={`/admin/scenarios/${scenario.Id}/builder`}>scenario builder</Link>
                ) : (
                  'scenario builder'
                )}{' '}
                so every marker scores consistently.
              </p>
            )}
            {inject.description && (
              <div className="mark-inject-brief">
                <h3>Inject {inject.sequence}</h3>
                <p>{inject.description}</p>
                {inject.information && <p className="mark-inject-info">{inject.information}</p>}
              </div>
            )}
          </div>
        </section>

        {/* Answer + mark */}
        <section className="mark-panel">
          <div className="mark-panel-head">
            <h2>{participant.name}&rsquo;s answer</h2>
            <span className="mark-time">
              Time taken: {response ? formatDuration(response.timeSpentSeconds) : '—'}
            </span>
          </div>

          <div className="mark-panel-body">
            <div className={`mark-answer${answered ? '' : ' empty'}`}>
              {answered ? response.answer : 'No answer submitted.'}
            </div>

            <div className="mark-score-row">
              <label className="mark-score">
                <span>Marks given</span>
                <div className="mark-score-input">
                  <input
                    type="number"
                    min="0"
                    max={MARKS_MAX}
                    step="1"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    placeholder="—"
                    disabled={saving}
                  />
                  <span className="mark-score-max">/ {MARKS_MAX}</span>
                </div>
              </label>
              {response?.markedAt && (
                <span className="mark-saved-at">
                  Last saved {new Date(response.markedAt).toLocaleString()}
                </span>
              )}
            </div>

            <label className="mark-feedback">
              <span>Comments / feedback for this answer</span>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What was strong, what was missing, how it maps to the rubric…"
                rows={5}
                disabled={saving}
              />
            </label>

            <div className="mark-actions">
              <div className="mark-nav">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setParticipantIndex((i) => Math.max(0, i - 1))}
                  disabled={!prevParticipant || saving}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setParticipantIndex((i) => Math.min(participants.length - 1, i + 1))
                  }
                  disabled={!nextParticipant || saving}
                >
                  Next →
                </button>
              </div>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MarkingWorkspace;
