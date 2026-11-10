import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listUsers } from '../../services/auth';
import {
  createGroup,
  deleteGroup,
  listGroups,
  updateGroup,
} from '../../services/groups';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import './style.css';

/* ------------------------------- helpers --------------------------------- */

const emptyForm = { name: '', description: '' };

const memberCountLabel = (count) => `${count} member${count === 1 ? '' : 's'}`;

/* ------------------------------- component -------------------------------- */

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');

  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit' | 'delete', group? }
  const [form, setForm] = useState(emptyForm);
  const [memberIds, setMemberIds] = useState([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [groupRows, userRows] = await Promise.all([listGroups(), listUsers()]);
      setGroups(groupRows);
      setUsers(userRows);
    } catch (e) {
      setLoadError(e.message || 'Could not load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      [g.name, g.description].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [groups, search]);

  /**
   * Selectable rows are participants only, but a member who stopped being a
   * participant is still listed while checked so existing data is preserved.
   */
  const pickerUsers = useMemo(() => {
  const selected = new Set(memberIds);
  return users
    .filter((u) => u.role === 'participant' || selected.has(u.Id))
      .slice()
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [users, memberIds]);

  /* ------------------------------- actions -------------------------------- */

  const openCreate = () => {
    setForm(emptyForm);
    setMemberIds([]);
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (group) => {
    setForm({ name: group.name, description: group.description });
    setMemberIds(group.members);
    setFormError('');
    setModal({ mode: 'edit', group });
  };

  const openDelete = (group) => {
    setFormError('');
    setModal({ mode: 'delete', group });
  };

  const closeModal = () => {
    setModal(null);
    setFormError('');
  };

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleMember = (id) => {
    setMemberIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const handleSave = async () => {
    setFormError('');
    setSaving(true);
    const payload = { name: form.name, description: form.description, members: memberIds };
    try {
      if (modal.mode === 'create') {
        await createGroup(payload);
        setNotice(`Group "${payload.name.trim()}" created.`);
      } else {
        await updateGroup(modal.group.Id, payload);
        setNotice(`Group "${payload.name.trim()}" updated.`);
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
    const target = modal.group;
    setFormError('');
    setSaving(true);
    try {
      await deleteGroup(target.Id);
      setNotice(`Group "${target.name}" deleted.`);
      closeModal();
      await load();
    } catch (e) {
      setFormError(e.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------- render --------------------------------- */

  return (
    <div className="groups-page">
      <div className="groups-header">
        <div className="groups-title">
          <h1>Group Management</h1>
          <p>
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
            {filtered.length !== groups.length && ` · ${filtered.length} shown`}
          </p>
        </div>
        <button className="btn-add-group" onClick={openCreate}>
          <span>+</span> Add Group
        </button>
      </div>

      {notice && <div className="groups-notice">{notice}</div>}
      {loadError && (
        <div className="groups-error">
          {loadError}
          <button className="btn-secondary sm" onClick={load}>Retry</button>
        </div>
      )}

      <div className="groups-card">
        <div className="groups-toolbar">
          <input
            className="groups-search"
            placeholder="Search groups by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="btn-secondary sm" onClick={() => setSearch('')}>
              Clear search
            </button>
          )}
        </div>

        <div className="groups-table">
          <div className="groups-table-header">
            <span>Name</span>
            <span>Description</span>
            <span>Members</span>
            <span>Created</span>
            <span>Actions</span>
          </div>

          {loading && <div className="groups-state">Loading groups…</div>}

          {!loading && !filtered.length && (
            <div className="groups-state">
              {groups.length ? 'No groups match the current search.' : 'No groups yet — create the first group.'}
            </div>
          )}

          {!loading && filtered.map((g) => (
            <div className="groups-table-row" key={g.Id}>
              <span className="group-name">{g.name}</span>
              <span className="group-desc" title={g.description}>{g.description || '—'}</span>
              <span className="members-badge">{memberCountLabel(g.members.length)}</span>
              <span className="text-muted">{g.createdAt || '—'}</span>
              <div className="groups-actions">
                <button className="groups-btn-icon" onClick={() => openEdit(g)} title="Edit group">✎</button>
                <button className="groups-btn-icon danger" onClick={() => openDelete(g)} title="Delete group">🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && modal.mode === 'delete' && (
        <ConfirmDialog
          title="Delete Group?"
          message="Are you sure you want to delete this group?"
          details={[
            { label: 'Group Name', value: modal.group.name },
            { label: 'Members', value: memberCountLabel(modal.group.members.length) },
          ]}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          busy={saving}
          error={formError}
          onConfirm={handleDelete}
          onCancel={closeModal}
        />
      )}

      {modal && modal.mode !== 'delete' && (
        <Modal
          title={modal.mode === 'create' ? 'Add Group' : 'Edit Group'}
          size="md"
          busy={saving}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? 'Saving…'
                  : modal.mode === 'create'
                    ? 'Create Group'
                    : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-field span-2">
              <label>
                Group Name <span className="required">*</span>
              </label>
              <input
                value={form.name}
                onChange={setField('name')}
                placeholder="e.g. Regional Response Team"
                disabled={saving}
              />
            </div>
            <div className="form-field span-2">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={setField('description')}
                placeholder="Optional — what is this group for?"
                disabled={saving}
              />
            </div>
            <div className="form-field span-2">
              <label>Members</label>
              <span className="field-hint">
                Select the participants that belong to this group.
              </span>
              <div className="picker">
                {!pickerUsers.length && (
                  <div className="picker-empty">No participants available.</div>
                )}
                {pickerUsers.map((u) => (
                  <label className="picker-item" key={u.Id}>
                    <input
                      type="checkbox"
                      checked={memberIds.includes(u.Id)}
                      onChange={() => toggleMember(u.Id)}
                      disabled={saving}
                    />
                    <span>{u.name || u.username}</span>
                      <span className="picker-meta">
                        {u.email}
                        {u.role !== 'participant' ? ' · no longer a participant' : ''}
                      </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {formError && <div className="form-error">{formError}</div>}
        </Modal>
      )}
    </div>
  );
};

export default Groups;
