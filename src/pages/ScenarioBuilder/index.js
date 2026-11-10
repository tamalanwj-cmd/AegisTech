import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listScenarios } from '../../services/scenarios';
import {
  createInject,
  deleteInject,
  listInjects,
  updateInject,
} from '../../services/injects';
import {
  listInjectRubrics,
  saveInjectRubrics

} from '../../services/injectRubrics';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { listScenarioRoles } from '../../services/scenarioRoles';
import './style.css';

/* ------------------------------- helpers --------------------------------- */

/** crisisType -> CSS class fragment, e.g. "Public Health" -> "public-health". */
const slug = (value) => String(value || 'other').toLowerCase().replace(/\s+/g, '-');
const statusSlug = (value) => String(value || 'draft').toLowerCase();

const emptyForm = () => ({
  title: '',
  description: '',
  information: '',
  sequence: '',
  roleRubrics: {},
});

/* ------------------------------- component -------------------------------- */

const ScenarioBuilder = () => {
  const { id } = useParams();
  const scenarioId = Number(id);

  const [scenario, setScenario] = useState(null);
  const [injects, setInjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [notFound, setNotFound] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  const [modal, setModal] = useState(null); // { mode: 'create' } | { mode: 'edit', inject }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [scenarioRows, injectRows, roleRows] = await Promise.all([
        listScenarios(),
        listInjects(scenarioId),
        listScenarioRoles(scenarioId),
      ]);
      const found = scenarioRows.find((s) => Number(s.Id) === scenarioId) || null;
      setScenario(found);
      setNotFound(!found);
      setInjects(found ? injectRows : []);
      setRoles(found ? roleRows : []);
    } catch (e) {
      setLoadError(e.message || 'Could not load the scenario');
    } finally {
      setLoading(false);
    }
  }, [scenarioId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const nextSequence = useMemo(
    () => injects.reduce((max, inject) => Math.max(max, Number(inject.sequence) || 0), 0) + 1,
    [injects]
  );
  

  /* ------------------------------- actions -------------------------------- */

  const openCreate = () => {
    setForm({ ...emptyForm(), sequence: String(nextSequence) });
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = async (inject) => {
    setFormError('');

    try {
      const existingRubrics = await listInjectRubrics(inject.Id);

      const roleRubrics = {};
      existingRubrics.forEach((item) => {
        roleRubrics[item.scenarioRoleId] = item.rubric;
      });

      setForm({
        title: inject.title,
        description: inject.description,
        information: inject.information,
        sequence: String(inject.sequence ?? ''),
        roleRubrics,
      });

      setModal({ mode: 'edit', inject });
    } catch (e) {
      setFormError(e.message || 'Could not load existing rubrics');
    }
  };

  const openDelete = (inject) => {
    setFormError('');
    setDeleteTarget(inject);
  };

  const closeModal = () => {
    setModal(null);
    setFormError('');
  };

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const buildPayload = () => ({
  title: form.title.trim(),
  description: form.description,
  information: form.information,
  sequence: form.sequence === '' ? 0 : Number(form.sequence),
  });

  const handleSave = async () => {
    if (!modal) return;

    setFormError('');

    if (!form.title.trim()) {
      setFormError('Please enter an Inject title.');
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload();
      let injectId;

      if (modal.mode === 'create') {
        const createdInject = await createInject({
          scenarioId,
          ...payload,
        });

        injectId = createdInject.Id;
      } else {
        injectId = modal.inject.Id;

        await updateInject(injectId, payload);
      }

      await saveInjectRubrics(injectId, form.roleRubrics);

      setNotice(
        `Inject "${payload.title}" ${
          modal.mode === 'create' ? 'added' : 'updated'
        }.`
      );

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
    if (!target) return;
    setFormError('');
    setSaving(true);
    try {
      await deleteInject(target.Id);
      setNotice(`Inject "${target.title}" deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setFormError(e.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------- render --------------------------------- */

  const backLink = (
    <Link className="back-link" to="/admin/scenarios">← Back to scenarios</Link>
  );

  if (loading) {
    return (
      <div className="builder-page">
        {backLink}
        <div className="page-state">Loading scenario…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="builder-page">
        {backLink}
        <div className="error-banner">
          <span>{loadError}</span>
          <button className="btn-secondary sm" onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  if (notFound || !scenario) {
    return (
      <div className="builder-page">
        {backLink}
        <div className="not-found">
          <h1>Scenario not found</h1>
          <p>The scenario you are looking for does not exist or has been deleted.</p>
          <Link className="btn-primary" to="/admin/scenarios">Back to scenarios</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="builder-page">
      {backLink}

      <div className="builder-header">
        <div className="builder-title">
          <h1>{scenario.name}</h1>
          <div className="builder-badges">
            <span className={`category-tag ${slug(scenario.crisisType)}`}>{scenario.crisisType}</span>
            <span className={`status-tag ${statusSlug(scenario.status)}`}>{scenario.status}</span>
          </div>
        </div>
        <button className="btn-add-inject" onClick={openCreate} disabled={saving}>
          Add Inject
        </button>
      </div>

      {notice && <div className="notice-banner">{notice}</div>}

      {injects.length === 0 ? (
        <div className="page-state">No injects yet — add the first inject.</div>
      ) : (
        <div className="inject-list">
          {injects.map((inject) => (
            <div className="inject-card" key={inject.Id}>
              <div className="inject-seq">{inject.sequence}</div>
              <div className="inject-main">
                <h3 className="inject-title">{inject.title}</h3>
                {inject.description && <p className="inject-desc">{inject.description}</p>}
                {inject.information && (
                  <p className="inject-info">
                    <span className="inject-info-label">Information:</span> {inject.information}
                  </p>
                )}

              </div>
              <div className="inject-actions">
                <button
                  type="button"
                  className="inject-btn"
                  onClick={() => openEdit(inject)}
                  disabled={saving}
                  title="Edit inject"
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="inject-btn danger"
                  onClick={() => openDelete(inject)}
                  disabled={saving}
                  title="Delete inject"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Add Inject' : 'Edit Inject'}
          onClose={closeModal}
          size="md"
          busy={saving}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal.mode === 'create' ? 'Add Inject' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-field span-2">
              <label>
                Inject Title <span className="required">*</span>
              </label>
              <input value={form.title} onChange={setField('title')} disabled={saving} autoFocus />
            </div>

            <div className="form-field span-2">
              <label>Inject Description</label>
              <textarea
                value={form.description}
                onChange={setField('description')}
                disabled={saving}
              />
            </div>

            <div className="form-field span-2">
              <label>Inject Information</label>
              <textarea
                value={form.information}
                onChange={setField('information')}
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label>Time / Sequence</label>
              <input
                type="number"
                value={form.sequence}
                onChange={setField('sequence')}
                disabled={saving}
              />
            </div>

              {roles.map((role) => (
                <div className="form-field span-2" key={role.Id}>
                  <label>
                    Marking Rubric — {role.name}
                  </label>

                  <textarea
                    value={form.roleRubrics[role.Id] || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        roleRubrics: {
                          ...prev.roleRubrics,
                          [role.Id]: e.target.value,
                        },
                      }))
                    }
                    placeholder={`Enter marking criteria for ${role.name}...`}
                    rows={4}
                    disabled={saving}
                  />
                  <span className="field-hint">
                    Assessment criteria specifically for {role.name}.
                  </span>
                </div>
              ))}
              <span className="field-hint">
                Shown in the marking workspace so every marker scores the same answer the same way.
              </span>
            </div>

          {formError && <div className="form-error">{formError}</div>}
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Inject?"
          message="Are you sure you want to delete this inject?"
          details={[
            { label: 'Inject Title', value: deleteTarget.title },
            { label: 'Sequence', value: String(deleteTarget.sequence) },
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

export default ScenarioBuilder;
