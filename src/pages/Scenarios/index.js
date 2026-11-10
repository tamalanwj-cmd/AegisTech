import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  SCENARIO_STATUSES,
  createScenario,
  deleteScenario,
  listScenarios,
  updateScenario,
} from '../../services/scenarios';
import {
  listScenarioRoles,
  createScenarioRole,
  deleteScenarioRole,
} from '../../services/scenarioRoles';
import { createCourse, linkScenarioToCourse, listCourses } from '../../services/courses';
import { createCategory, listCategories } from '../../services/categories';
import { listInjects } from '../../services/injects';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import './style.css';

/* ------------------------------- helpers --------------------------------- */

/** crisisType -> CSS class fragment, e.g. "Public Health" -> "public-health". */
const slug = (value) => String(value || 'other').toLowerCase().replace(/\s+/g, '-');
const statusSlug = (value) => String(value || 'draft').toLowerCase();

const splitObjectives = (value) =>
  String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const emptyForm = (category) => ({
  name: '',
  description: '',
  objectives: '',
  roleNames: [],
  // Course: pick an existing one, or type a new course name.
  courseId: '',
  createCourse: false,
  newCourseName: '',
  // Crisis category: pick an existing one, or type a new category name.
  crisisType: category || 'Other',
  createCategory: false,
  newCategory: '',
  status: 'Draft',
});

/* ------------------------------- component -------------------------------- */

const Scenarios = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [scenarios, setScenarios] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [injectCounts, setInjectCounts] = useState(() => new Map());

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [menuOpenId, setMenuOpenId] = useState(null);

  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', scenario? }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // "+ Category" dialog
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [scenarioRows, courseRows, injectRows, categoryRows] = await Promise.all([
        listScenarios(),
        listCourses(),
        // One pass over every inject gives the per-scenario count without a
        // request per row.
        listInjects(),
        listCategories(),
      ]);
      const counts = new Map();
      injectRows.forEach((inject) => {
        const key = Number(inject.scenarioId);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      setScenarios(scenarioRows);
      setCourses(courseRows);
      setCategories(categoryRows);
      setInjectCounts(counts);
    } catch (e) {
      setLoadError(e.message || 'Could not load scenarios');
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

  // Close the per-row actions menu on outside click or Escape.
  useEffect(() => {
    if (menuOpenId === null) return undefined;
    const close = () => setMenuOpenId(null);
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpenId(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpenId]);

  const courseById = useMemo(
    () => new Map(courses.map((c) => [Number(c.Id), c])),
    [courses]
  );

  /**
   * The name of the course that runs a scenario. `course_id` is the direct link;
   * courses that point back at the scenario through `scenario_id` are the
   * fallback, so a course created from this dialog shows up immediately.
   */
  const courseNameFor = useCallback(
    (scenario) => {
      if (scenario.courseId) {
        const direct = courseById.get(Number(scenario.courseId));
        if (direct) return direct.name;
      }
      const linked = courses.find((c) => Number(c.scenarioId) === Number(scenario.Id));
      return linked ? linked.name : null;
    },
    [courseById, courses]
  );

  const tabs = useMemo(() => ['All', ...categories], [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scenarios.filter((s) => {
      if (activeTab !== 'All' && s.crisisType !== activeTab) return false;
      if (!q) return true;
      return [s.name, s.description, s.crisisType].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [scenarios, search, activeTab]);

  /* ------------------------------- actions -------------------------------- */

  const openCreate = useCallback(() => {
    setForm(emptyForm(categories[0] || 'Other'));
    setFormError('');
    setModal({ mode: 'create' });
  }, [categories]);

  // "/admin/scenarios?new=1" (dashboard / reports shortcuts) opens the dialog.
  useEffect(() => {
    if (loading) return;
    if (searchParams.get('new') !== '1') return;
    openCreate();
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [loading, searchParams, setSearchParams, openCreate]);

  const openEdit = async (scenario) => {
    setFormError('');

    setForm({
      name: scenario.name,
      description: scenario.description,
      objectives: (scenario.objectives || []).join('\n'),
      roleNames: [],
      courseId: scenario.courseId ? String(scenario.courseId) : '',
      createCourse: false,
      newCourseName: '',
      crisisType: scenario.crisisType || 'Other',
      createCategory: false,
      newCategory: '',
      status: scenario.status || 'Draft',
    });

    setModal({ mode: 'edit', scenario });

    try {
      const roles = await listScenarioRoles(scenario.Id);

      setForm((prev) => ({
        ...prev,
        roleNames: roles.map((role) => role.name),
      }));
    } catch (e) {
      setFormError(e.message || 'Could not load scenario roles');
    }
  };

  const openDelete = (scenario) => {
    setFormError('');
    setDeleteTarget(scenario);
  };

  const closeModal = () => {
    setModal(null);
    setFormError('');
  };

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const addRole = () => {
  setForm((prev) => ({
    ...prev,
    roleNames: [...prev.roleNames, ''],
  }));
};

  const updateRoleName = (index, value) => {
    setForm((prev) => ({
      ...prev,
      roleNames: prev.roleNames.map((role, i) =>
        i === index ? value : role
      ),
    }));
  };

  const removeRole = (index) => {
    setForm((prev) => ({
      ...prev,
      roleNames: prev.roleNames.filter((_, i) => i !== index),
    }));
  };

  const toggleField = (field) => () =>
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));

  const openCategoryDialog = () => {
    setCategoryName('');
    setCategoryError('');
    setCategoryDialog(true);
  };

  const closeCategoryDialog = () => {
    setCategoryDialog(false);
    setCategoryError('');
  };

  const handleCreateCategory = async () => {
    setCategoryError('');
    setCategorySaving(true);
    try {
      const created = await createCategory(categoryName);
      const next = await listCategories();
      setCategories(next);
      setNotice(`Category "${created.name}" created.`);
      setCategoryDialog(false);
      // Keep the dialog the administrator is filling in pointed at the new value.
      setForm((prev) => ({ ...prev, crisisType: created.name, newCategory: '' }));
    } catch (e) {
      setCategoryError(e.message || 'Could not create the category');
    } finally {
      setCategorySaving(false);
    }
  };

  const validate = () => {
    if (!form.name.trim()) return 'Please enter a scenario name';
    if (form.createCategory && !form.newCategory.trim()) return 'Please enter the new category name';
    if (form.createCourse && !form.newCourseName.trim()) return 'Please enter the new course name';
    const roleNames = form.roleNames
    .map((name) => name.trim())
    .filter(Boolean);

    if (new Set(roleNames.map((name) => name.toLowerCase())).size !== roleNames.length) {
      return 'Scenario role names must be unique.';
    }
    return '';
  };

  /**
   * Persist the dialog: optionally create the category and/or the course, then
   * keep the scenario -> course link consistent. Returns the scenario id.
   */
  const persist = async () => {
    const crisisType = form.createCategory ? form.newCategory.trim() : form.crisisType;
    if (form.createCategory) {
      // Throws a readable error when the categories table is missing.
      await createCategory(crisisType);
    }

    const payload = {
      name: form.name.trim(),
      description: form.description,
      objectives: splitObjectives(form.objectives),
      crisisType,
      status: form.status,
      // A course created below is linked once we know the scenario id.
      courseId: form.createCourse ? null : form.courseId ? Number(form.courseId) : null,
    };

    let scenarioId;
    if (modal.mode === 'create') {
      const created = await createScenario(payload);
      scenarioId = created?.Id ?? created?.id ?? null;
    } else {
      scenarioId = modal.scenario.Id;
      await updateScenario(scenarioId, payload);
    }
    if (!scenarioId) return null;

    // Synchronise the scenario's role list.
    const existingRoles = await listScenarioRoles(scenarioId);

    const desiredNames = form.roleNames
      .map((name) => name.trim())
      .filter(Boolean);

    const normalisedNames = desiredNames.map((name) => name.toLowerCase());

    if (new Set(normalisedNames).size !== normalisedNames.length) {
      throw new Error('Scenario role names must be unique.');
    }

    const desiredSet = new Set(normalisedNames);

    for (const role of existingRoles) {
      if (!desiredSet.has(role.name.trim().toLowerCase())) {
        await deleteScenarioRole(role.Id);
      }
    }

    const existingSet = new Set(
      existingRoles.map((role) => role.name.trim().toLowerCase())
    );

    for (const name of desiredNames) {
      if (!existingSet.has(name.toLowerCase())) {
        await createScenarioRole(scenarioId, name);
      }
    }

    if (form.createCourse) {
      const createdCourse = await createCourse({
        name: form.newCourseName.trim(),
        description: '',
        enrolments: [],
        groupId: null,
        scenarioId,
        status: 'Active',
      });
      const courseId = createdCourse?.Id ?? null;
      if (courseId) {
        await updateScenario(scenarioId, { ...payload, courseId });
      }
      await linkScenarioToCourse(scenarioId, courseId);
    } else if (form.courseId) {
      await linkScenarioToCourse(scenarioId, Number(form.courseId));
    } else {
      // "No course" — unlink any course that still points at this scenario.
      await linkScenarioToCourse(scenarioId, null);
    }

    if (form.createCategory) setCategories(await listCategories());
    return scenarioId;
  };

  const handleSave = async () => {
    if (!modal) return;
    const invalid = validate();
    if (invalid) {
      setFormError(invalid);
      return;
    }
    setFormError('');
    setSaving(true);
    const isCreate = modal.mode === 'create';
    try {
      const name = form.name.trim();
      await persist();
      setNotice(`Scenario "${name}" ${isCreate ? 'created' : 'updated'}.`);
      closeModal();
      await load();
    } catch (e) {
      setFormError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  /**
   * "Open Scenario Builder" needs a saved scenario id: create the scenario
   * first (when adding one), then navigate to its builder.
   */
  const handleSaveAndOpenBuilder = async () => {
    if (!modal) return;
    const invalid = validate();
    if (invalid) {
      setFormError(invalid);
      return;
    }
    setFormError('');
    setSaving(true);
    const isCreate = modal.mode === 'create';
    try {
      const name = form.name.trim();
      const scenarioId = await persist();
      closeModal();
      await load();
      if (!scenarioId) {
        setNotice(`Scenario "${name}" saved — open the builder from the row menu.`);
        return;
      }
      setNotice(`Scenario "${name}" ${isCreate ? 'created' : 'updated'}.`);
      navigate(`/admin/scenarios/${scenarioId}/builder`);
    } catch (e) {
      setFormError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const target = deleteTarget;
    if (!target) return;
    setFormError('');
    setSaving(true);
    try {
      await deleteScenario(target.Id);
      setNotice(`Scenario "${target.name}" deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setFormError(e.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------- render --------------------------------- */

  return (
    <div className="scenarios-page">
      <div className="page-header">
        <div className="header-title">
          <h1>Scenario Management</h1>
          <p>Create, edit and publish tabletop exercise scenarios</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn-new-category"
            onClick={openCategoryDialog}
            disabled={loading || saving}
          >
            + Category
          </button>
          <button
            type="button"
            className="btn-new-scenario"
            onClick={openCreate}
            disabled={loading || saving}
          >
            New Scenario
          </button>
        </div>
      </div>

      {notice && <div className="notice-banner">{notice}</div>}
      {loadError && (
        <div className="error-banner">
          <span>{loadError}</span>
          <button className="btn-secondary sm" onClick={load}>Retry</button>
        </div>
      )}

      <div className="table-container">
        <div className="filter-bar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search scenarios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab-btn${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="page-state">Loading scenarios…</div>}

        {!loading && !scenarios.length && (
          <div className="page-state">No scenarios yet — create the first scenario.</div>
        )}

        {!loading && scenarios.length > 0 && (
          <div className="table-scroll">
            <table className="scenario-table">
              <thead>
                <tr>
                  <th>Title &amp; Description</th>
                  <th>Category</th>
                  <th>Injects</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((scenario) => {
                  const count = injectCounts.get(Number(scenario.Id)) || 0;
                  const courseName = courseNameFor(scenario);
                  const linkedCourse =
                    (scenario.courseId && courseById.get(Number(scenario.courseId))) ||
                    courses.find((c) => Number(c.scenarioId) === Number(scenario.Id)) ||
                    null;
                  const menuOpen = menuOpenId === scenario.Id;
                  return (
                    <tr key={scenario.Id}>
                      <td>
                        <div className="scenario-title">{scenario.name}</div>
                        <div className="scenario-desc">{scenario.description || 'No description.'}</div>
                        <div className="scenario-meta">Course: {courseName || '—'}</div>
                        <div className="scenario-meta">
                          {scenario.objectives.length} learning objective
                          {scenario.objectives.length === 1 ? '' : 's'}
                        </div>
                      </td>
                      <td>
                        <span className={`category-tag ${slug(scenario.crisisType)}`}>
                          {scenario.crisisType}
                        </span>
                      </td>
                      <td className="table-cell-center">{count}</td>
                      <td>
                        <span className={`status-tag ${statusSlug(scenario.status)}`}>
                          {scenario.status}
                        </span>
                      </td>
                      <td className="table-cell-date">{scenario.createdAt}</td>
                      <td className="table-cell-actions">
                        <div className="row-menu" onMouseDown={(e) => e.stopPropagation()}>
                          <button
                            className="action-btn"
                            onClick={() => setMenuOpenId(menuOpen ? null : scenario.Id)}
                            disabled={saving}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                          >
                            ···
                          </button>
                          {menuOpen && (
                            <div className="row-menu-dropdown" role="menu">
                              <button
                                type="button"
                                className="row-menu-item"
                                role="menuitem"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  openEdit(scenario);
                                }}
                                disabled={saving}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="row-menu-item"
                                role="menuitem"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  navigate(`/admin/scenarios/${scenario.Id}/builder`);
                                }}
                                disabled={saving}
                              >
                                Open Scenario Builder
                              </button>
                              {linkedCourse && (
                                <button
                                  type="button"
                                  className="row-menu-item"
                                  role="menuitem"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    navigate(`/admin/marking/${linkedCourse.Id}`);
                                  }}
                                  disabled={saving}
                                >
                                  Mark Answers
                                </button>
                              )}
                              <button
                                type="button"
                                className="row-menu-item danger"
                                role="menuitem"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  openDelete(scenario);
                                }}
                                disabled={saving}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td colSpan={6} className="table-empty">
                      No scenarios match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------------------- scenario dialog ---------------------------- */}
      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Add Scenario' : 'Edit Scenario'}
          onClose={closeModal}
          size="lg"
          busy={saving}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSaveAndOpenBuilder}
                disabled={saving}
              >
                Open Scenario Builder
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal.mode === 'create' ? 'Create Scenario' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-field span-2">
              <label>
                Scenario Name <span className="required">*</span>
              </label>
              <input value={form.name} onChange={setField('name')} disabled={saving} autoFocus />
            </div>

            <div className="form-field span-2">
              <label>Description</label>
              <textarea value={form.description} onChange={setField('description')} disabled={saving} />
            </div>

            <div className="form-field span-2">
              <label>Learning Objectives</label>
              <textarea
                value={form.objectives}
                onChange={setField('objectives')}
                placeholder="One objective per line. Leave empty to hide the objectives card on the participant page."
                rows={3}
                disabled={saving}
              />
              <span className="field-hint">
                Shown to participants before they start. Empty objectives are not displayed.
              </span>
            </div>

            {/* ---------------------------- scenario roles ---------------------------- */}
            <div className="form-field span-2">
              <div className="field-label-row">
                <label>Scenario Roles</label>
                <button
                  type="button"
                  className="link-btn"
                  onClick={addRole}
                  disabled={saving}
                >
                  + Add Role
                </button>
              </div>

              {form.roleNames.length === 0 && (
                <span className="field-hint">
                  No roles defined yet. Add roles such as Incident Commander,
                  Operations Lead, or Communications Officer.
                </span>
              )}

              {form.roleNames.map((role, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <input
                    value={role}
                    onChange={(e) => updateRoleName(index, e.target.value)}
                    placeholder={`Role ${index + 1}`}
                    disabled={saving}
                  />

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => removeRole(index)}
                    disabled={saving}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <span className="field-hint">
                These roles belong to this scenario. They will be available
                when configuring injects and assigning course participants.
              </span>
            </div>

            {/* ------------------------------ course ------------------------------ */}
            <div className="form-field">
              <div className="field-label-row">
                <label>Course</label>
                <button
                  type="button"
                  className="link-btn"
                  onClick={toggleField('createCourse')}
                  disabled={saving}
                >
                  {form.createCourse ? 'Choose existing' : '+ New course'}
                </button>
              </div>
              {form.createCourse ? (
                <input
                  value={form.newCourseName}
                  onChange={setField('newCourseName')}
                  placeholder="New course name"
                  disabled={saving}
                  autoFocus
                />
              ) : (
                <select
                  value={form.courseId}
                  onChange={setField('courseId')}
                  disabled={saving}
                >
                  <option value="">No course</option>
                  {courses.map((c) => (
                    <option key={c.Id} value={c.Id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="field-hint">
                {form.createCourse
                  ? 'A new course is created and linked as soon as the scenario is saved.'
                  : 'Leave empty when this scenario is not scheduled yet.'}
              </span>
            </div>

            {/* ----------------------------- category ----------------------------- */}
            <div className="form-field">
              <div className="field-label-row">
                <label>Crisis Type</label>
                <button
                  type="button"
                  className="link-btn"
                  onClick={toggleField('createCategory')}
                  disabled={saving}
                >
                  {form.createCategory ? 'Choose existing' : '+ New category'}
                </button>
              </div>
              {form.createCategory ? (
                <input
                  value={form.newCategory}
                  onChange={setField('newCategory')}
                  placeholder="New category name"
                  disabled={saving}
                />
              ) : (
                <select
                  value={form.crisisType}
                  onChange={setField('crisisType')}
                  disabled={saving}
                >
                  {categories.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              )}
              <span className="field-hint">
                {form.createCategory
                  ? 'Added to the category list for every scenario.'
                  : 'The crisis category this scenario belongs to.'}
              </span>
            </div>

            <div className="form-field">
              <label>Scenario Status</label>
              <select value={form.status} onChange={setField('status')} disabled={saving}>
                {SCENARIO_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && <div className="form-error">{formError}</div>}
        </Modal>
      )}

      {/* ----------------------------- category dialog ---------------------------- */}
      {categoryDialog && (
        <Modal
          title="Add Category"
          onClose={closeCategoryDialog}
          size="sm"
          busy={categorySaving}
          footer={
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeCategoryDialog}
                disabled={categorySaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateCategory}
                disabled={categorySaving}
              >
                {categorySaving ? 'Creating…' : 'Create Category'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-field span-2">
              <label>
                Category Name <span className="required">*</span>
              </label>
              <input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Cyber Incident"
                disabled={categorySaving}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <span className="field-hint">
                Categories group scenarios by crisis type and are shared by every administrator.
              </span>
            </div>
          </div>
          {categoryError && <div className="form-error">{categoryError}</div>}
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Scenario?"
          message="Are you sure you want to delete this scenario?"
          details={[
            { label: 'Scenario Name', value: deleteTarget.name },
            {
              label: 'Course',
              value: courseNameFor(deleteTarget) || '—',
            },
            { label: 'Crisis Type', value: deleteTarget.crisisType },
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

export default Scenarios;
