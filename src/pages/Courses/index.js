import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createCourse, deleteCourse, listCourses, updateCourse } from '../../services/courses';
import { listScenarios } from '../../services/scenarios';
import { listGroups } from '../../services/groups';
import { listUsers } from '../../services/auth';
import { listInjects } from '../../services/injects';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import './style.css';

/* ------------------------------- helpers --------------------------------- */

const statusClass = (status) => String(status || 'Active').toLowerCase();

const emptyForm = () => ({
  name: '',
  description: '',
  scenarioId: '',
  groupId: '',
  status: 'Active',
  enrolments: [], // [{ userId, role }]
});

/* ------------------------------- component -------------------------------- */

const Courses = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  // 'create' | { mode: 'edit', course }
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [roleOptions, setRoleOptions] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [courseRows, scenarioRows, groupRows, userRows] = await Promise.all([
        listCourses(),
        listScenarios(),
        listGroups(),
        listUsers(),
      ]);
      setCourses(courseRows);
      setScenarios(scenarioRows);
      setGroups(groupRows);
      setUsers(userRows);
    } catch (e) {
      setLoadError(e.message || 'Could not load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const participants = useMemo(() => users.filter((u) => u.role === 'participant'), [users]);

  const userNameById = useMemo(
  () =>
    new Map(
      users.map((u) => [
        String(u.Id),
        u.name || u.username || `User #${u.Id}`,
      ])
    ),
    [users]
  );

  const scenarioById = useMemo(
    () => new Map(scenarios.map((s) => [Number(s.Id), s])),
    [scenarios]
  );

  /* ------------------------------- actions -------------------------------- */

  const openCreate = () => {
    setForm(emptyForm());
    setFormError('');
    setRoleOptions([]);
    setModal({ mode: 'create' });
  };

  const openEdit = (course) => {
    setForm({
      name: course.name,
      description: course.description,
      scenarioId: course.scenarioId ? String(course.scenarioId) : '',
      groupId: course.groupId ? String(course.groupId) : '',
      status: course.status || 'Active',
      enrolments: course.enrolments.map((e) => ({ userId: e.userId, role: e.role || '' })),
    });
    setFormError('');
    setRoleOptions([]);
    setModal({ mode: 'edit', course });
  };

  const closeModal = () => {
    setModal(null);
    setFormError('');
  };

  // "/admin/courses?new=1" (dashboard quick action) opens the create dialog.
  useEffect(() => {
    if (loading || loadError) return;
    if (searchParams.get('new') !== '1') return;
    setForm(emptyForm());
    setFormError('');
    setRoleOptions([]);
    setModal({ mode: 'create' });
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [loading, loadError, searchParams, setSearchParams]);

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  /** Enrolled participant roles come from the selected scenario's injects. */
  useEffect(() => {
    if (!modal) return undefined;
    const scenarioId = form.scenarioId;
    if (!scenarioId) {
      setRoleOptions([]);
      return undefined;
    }
    let cancelled = false;
    setRolesLoading(true);
    listInjects(scenarioId)
      .then((injects) => {
        if (cancelled) return;
        const roles = Array.from(
          new Set(injects.map((i) => i.assignedRole).filter(Boolean))
        );
        setRoleOptions(roles);
        if (roles.length) {
          // Keep already-chosen roles while they still exist on the scenario.
          setForm((prev) => {
            const next = prev.enrolments.map((e) =>
              roles.includes(e.role) ? e : { ...e, role: '' }
            );
            const changed = next.some((e, i) => e.role !== prev.enrolments[i].role);
            return changed ? { ...prev, enrolments: next } : prev;
          });
        }
      })
      .catch(() => {
        if (!cancelled) setRoleOptions([]);
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modal, form.scenarioId]);

  const isEnrolled = (userId) => form.enrolments.some((e) => e.userId === userId);

  const toggleParticipant = (userId) => {
    setForm((prev) => {
      const exists = prev.enrolments.some((e) => e.userId === userId);
      const enrolments = exists
        ? prev.enrolments.filter((e) => e.userId !== userId)
        : [...prev.enrolments, { userId, role: '' }];
      return { ...prev, enrolments };
    });
  };

  const changeGroup = (groupId) => {
    setForm((prev) => {
      let enrolments = prev.enrolments;
      if (groupId) {
        const group = groups.find((g) => String(g.Id) === String(groupId));
        if (group) {
          const existing = new Set(enrolments.map((e) => e.userId));
          const additions = group.members
            .map(String)
            .filter((id) => !existing.has(id))
            .map((id) => ({ userId: id, role: '' }));
          enrolments = [...enrolments, ...additions];
        }
      }
      return { ...prev, groupId, enrolments };
    });
  };

  const setRole = (userId, role) => {
    setForm((prev) => ({
      ...prev,
      enrolments: prev.enrolments.map((e) => (e.userId === userId ? { ...e, role } : e)),
    }));
  };

  const removeEnrolment = (userId) => {
    setForm((prev) => ({
      ...prev,
      enrolments: prev.enrolments.filter((e) => e.userId !== userId),
    }));
  };

  const handleSave = async () => {
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        scenarioId: form.scenarioId ? Number(form.scenarioId) : null,
        groupId: form.groupId ? Number(form.groupId) : null,
        status: form.status || 'Active',
        enrolments: form.enrolments.map((e) => ({ userId: e.userId, role: e.role })),
      };
      if (modal.mode === 'create') {
        await createCourse(payload);
        setNotice(`Course "${payload.name}" created.`);
      } else {
        await updateCourse(modal.course.Id, payload);
        setNotice(`Course "${payload.name}" updated.`);
      }
      closeModal();
      await load();
    } catch (e) {
      setFormError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const target = deleteTarget;
    setFormError('');
    setSaving(true);
    try {
      await deleteCourse(target.Id);
      setNotice(`Course "${target.name}" deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setFormError(e.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (course) => {
    setActionError('');
    setActionBusy(true);
    try {
      await updateCourse(course.Id, {
        name: course.name,
        description: course.description,
        enrolments: course.enrolments,
        groupId: course.groupId,
        scenarioId: course.scenarioId,
        status: 'Archived',
      });
      setNotice(`Course "${course.name}" archived.`);
      await load();
    } catch (e) {
      setActionError(e.message || 'Could not archive course');
    } finally {
      setActionBusy(false);
    }
  };

  /* ------------------------------- render --------------------------------- */

  return (
    <div className="courses-page">
      <div className="page-header">
        <div className="header-title">
          <h1>Course Management</h1>
          <p>Organise scenarios into structured learning courses</p>
        </div>
        <button className="create-course-btn" onClick={openCreate} disabled={loading}>
          Create Course
        </button>
      </div>

      {notice && <div className="notice-banner">{notice}</div>}
      {loadError && (
        <div className="error-banner">
          <span>{loadError}</span>
          <button className="btn-secondary sm" onClick={load}>Retry</button>
        </div>
      )}
      {actionError && <div className="error-banner"><span>{actionError}</span></div>}

      {loading && <div className="page-state">Loading courses…</div>}

      {!loading && !loadError && !courses.length && (
        <div className="page-state">No courses yet — create the first course.</div>
      )}

      {!loading && courses.length > 0 && (
        <div className="courses-grid">
          {courses.map((course) => {
            const scenario = course.scenarioId ? scenarioById.get(Number(course.scenarioId)) : null;
            const scenarioName = scenario ? scenario.name : '—';
            return (
              <div
                key={course.Id}
                className={`course-card${statusClass(course.status) === 'archived' ? ' archived' : ''}`}
              >
                <div className={`status-badge ${statusClass(course.status)}`}>{course.status}</div>
                <h2 className="course-title">{course.name}</h2>
                <p className="course-desc">{course.description || 'No description.'}</p>
                <div className="course-meta">
                  <div className="meta-item enrolled">
                    {course.enrolments.length} enrolled
                  </div>
                  <div className="meta-item scenario" title={scenarioName}>
                    {scenarioName}
                  </div>
                </div>
                <div className="card-actions">
                  <div className="left-actions">
                    <button
                      className="btn btn-edit"
                      onClick={() => openEdit(course)}
                      disabled={actionBusy}
                    >
                      Edit
                    </button>
                    {course.status !== 'Archived' && (
                      <button
                        className="btn btn-archive"
                        onClick={() => handleArchive(course)}
                        disabled={actionBusy}
                      >
                        Archive
                      </button>
                    )}
                  </div>
                  <button
                    className="btn btn-delete"
                    onClick={() => {
                      setFormError('');
                      setDeleteTarget(course);
                    }}
                    disabled={actionBusy}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Add Course' : 'Edit Course'}
          onClose={closeModal}
          size="lg"
          busy={saving}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal.mode === 'create' ? 'Create Course' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-field span-2">
              <label>
                Course Name <span className="required">*</span>
              </label>
              <input value={form.name} onChange={setField('name')} disabled={saving} />
            </div>

            <div className="form-field span-2">
              <label>Course Description</label>
              <textarea value={form.description} onChange={setField('description')} disabled={saving} />
            </div>

            <div className="form-field span-2">
              <label>Participants / Group</label>

              <div className="group-select-row">
                <select
                  value={form.groupId}
                  onChange={(e) => changeGroup(e.target.value)}
                  disabled={saving}
                >
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.Id} value={g.Id}>
                      {g.name} ({g.members.length} members)
                    </option>
                  ))}
                </select>
              </div>

              <div className="picker">
                {participants.length === 0 ? (
                  <div className="picker-empty">No participants available.</div>
                ) : (
                  participants.map((u) => (
                    <label className="picker-item" key={u.Id}>
                      <input
                        type="checkbox"
                        checked={isEnrolled(u.Id)}
                        onChange={() => toggleParticipant(u.Id)}
                        disabled={saving}
                      />
                      {u.name || u.username}
                      <span className="picker-meta">{u.email}</span>
                    </label>
                  ))
                )}
              </div>
              <span className="field-hint">
                Tick participants or pick a group, then assign the exercise role each will play.
              </span>

              {form.enrolments.length > 0 && (
                <div className="enrol-list">
                  {form.enrolments.map((e) => (
                    <div className="enrol-row" key={e.userId}>
                      <span className="enrol-name">
                        {userNameById.get(e.userId) || `User #${e.userId}`}
                      </span>
                      {roleOptions.length > 0 ? (
                        <select
                          value={e.role}
                          onChange={(ev) => setRole(e.userId, ev.target.value)}
                          disabled={saving}
                        >
                          <option value="">Select role…</option>
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="role-input"
                          value={e.role}
                          onChange={(ev) => setRole(e.userId, ev.target.value)}
                          placeholder="Role"
                          disabled={saving}
                        />
                      )}
                      <button
                        type="button"
                        className="btn-secondary sm enrol-remove"
                        onClick={() => removeEnrolment(e.userId)}
                        disabled={saving}
                        title="Remove participant"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {rolesLoading && <span className="field-hint">Loading roles from the scenario…</span>}
            </div>

            <div className="form-field span-2">
              <label>
                Scenario <span className="required">*</span>
              </label>
              <select value={form.scenarioId} onChange={setField('scenarioId')} disabled={saving}>
                <option value="">Select a scenario…</option>
                {scenarios.map((s) => (
                  <option key={s.Id} value={s.Id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && <div className="form-error">{formError}</div>}
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Course?"
          message="Are you sure you want to delete this course?"
          details={[
            { label: 'Course Name', value: deleteTarget.name },
            { label: 'Description', value: deleteTarget.description },
          ]}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          busy={saving}
          error={formError}
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteTarget(null);
            setFormError('');
          }}
        />
      )}
    </div>
  );
};

export default Courses;
