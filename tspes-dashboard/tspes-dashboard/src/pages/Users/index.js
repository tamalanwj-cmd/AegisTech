import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PASSWORD_MIN_LENGTH,
  ROLES,
  STATUSES,
  createUser,
  deleteUser,
  getCurrentUser,
  listUsers,
  updateUser,
} from '../../services/auth';
import './style.css';

/* ------------------------------- helpers --------------------------------- */

const ROLE_TABS = ['All', ...ROLES.map((r) => r.charAt(0).toUpperCase() + r.slice(1))];

const roleLabel = (role) => String(role || '').charAt(0).toUpperCase() + String(role || '').slice(1);
const roleClass = (role) => `role-${String(role || 'participant').toLowerCase()}`;
const statusClass = (status) =>
  String(status || '').toLowerCase() === 'inactive' ? 'status-inactive' : 'status-active';

const initialsOf = (user) => {
  const source = (user.name || user.username || user.email || '?').trim();
  return source
    .split(/[\s._@-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
};

/** NocoDB returns "2026-09-14 03:22:13+00:00"; make that parseable everywhere. */
const formatDate = (value) => {
  if (!value) return '—';
  const iso = String(value).includes('T') ? value : String(value).replace(' ', 'T');
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const emptyForm = { username: '', email: '', name: '', password: '', role: 'participant', status: 'Active' };

/* ------------------------------- component -------------------------------- */

const Users = () => {
  const me = getCurrentUser();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit' | 'delete', user? }
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setUsers(await listUsers());
    } catch (e) {
      setLoadError(e.message || 'Could not load users from NocoDB');
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

  const isMe = (u) => Number(u.Id) === Number(me?.Id);

  const adminCount = useMemo(
    () => users.filter((u) => u.role === 'admin' && u.status === 'Active').length,
    [users]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (activeTab !== 'All' && roleLabel(u.role) !== activeTab) return false;
      if (statusFilter !== 'All' && u.status !== statusFilter) return false;
      if (!q) return true;
      return [u.name, u.username, u.email].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [users, search, activeTab, statusFilter]);

  /* ------------------------------- actions -------------------------------- */

  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (user) => {
    setForm({
      username: user.username,
      email: user.email,
      name: user.name,
      password: '',
      role: user.role,
      status: user.status,
    });
    setFormError('');
    setModal({ mode: 'edit', user });
  };

  const closeModal = () => {
    setModal(null);
    setFormError('');
  };

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setFormError('');
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await createUser(form);
        setNotice(`Account "${form.username}" created as ${form.role}.`);
      } else {
        const target = modal.user;
        if (isMe(target) && form.role !== 'admin') {
          throw new Error('You cannot remove your own administrator role');
        }
        await updateUser(target.Id, {
          username: form.username,
          email: form.email,
          name: form.name,
          role: form.role,
          status: form.status,
          password: form.password || undefined,
        });
        setNotice(`Account "${form.username}" updated.`);
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
    const target = modal.user;
    setFormError('');
    setSaving(true);
    try {
      if (isMe(target)) throw new Error('You cannot delete the account you are signed in with');
      if (target.role === 'admin' && target.status === 'Active' && adminCount <= 1) {
        throw new Error('This is the last active administrator — create another admin first');
      }
      await deleteUser(target.Id);
      setNotice(`Account "${target.username}" deleted.`);
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
    <div className="users-page">
      <div className="page-header">
        <div className="page-title">
          <h1>User Management</h1>
          <p>
            {users.length} registered {users.length === 1 ? 'user' : 'users'}
            {filtered.length !== users.length && ` · ${filtered.length} shown`}
          </p>
        </div>
        <button className="btn-add-user" onClick={openCreate}>
          <span>+</span> Add User
        </button>
      </div>

      {notice && <div className="notice-banner">{notice}</div>}
      {loadError && (
        <div className="error-banner">
          {loadError}
          <button className="btn-secondary sm" onClick={load}>Retry</button>
        </div>
      )}

      <div className="container-card">
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search name, username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="filter-tab-group">
            {ROLE_TABS.map((tab) => (
              <div
                key={tab}
                className={`filter-tab${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>

          <select
            className="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {(search || activeTab !== 'All' || statusFilter !== 'All') && (
            <button
              className="btn-secondary sm"
              onClick={() => {
                setSearch('');
                setActiveTab('All');
                setStatusFilter('All');
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="table-wrap">
          <div className="table-header-row">
            <span>User</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>

          {loading && <div className="table-state">Loading users…</div>}

          {!loading && !filtered.length && (
            <div className="table-state">
              {users.length ? 'No users match the current filters.' : 'No users yet — add the first account.'}
            </div>
          )}

          {!loading && filtered.map((u) => (
            <div className="table-row" key={u.Id}>
              <div className="user-name-cell">
                <div className="user-avatar">{initialsOf(u)}</div>
                <div className="user-name-text">
                  <span>{u.name}</span>
                  <span className="user-handle">@{u.username}{isMe(u) ? ' · you' : ''}</span>
                </div>
              </div>
              <span className="text-muted">{u.email}</span>
              <span className={`role-badge ${roleClass(u.role)}`}>{roleLabel(u.role)}</span>
              <span className={`status-badge ${statusClass(u.status)}`}>{u.status}</span>
              <span className="text-muted" title={u.last_login ? `Last login: ${u.last_login}` : 'Never signed in'}>
                {formatDate(u.signup_at)}
              </span>
              <div className="action-buttons">
                <button className="btn-edit" onClick={() => openEdit(u)} title="Edit account">✎</button>
                <button className="btn-delete" onClick={() => { setFormError(''); setModal({ mode: 'delete', user: u }); }} title="Delete account">🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={saving ? undefined : closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>
                {modal.mode === 'create' && 'Add User'}
                {modal.mode === 'edit' && `Edit ${modal.user.name}`}
                {modal.mode === 'delete' && 'Delete User'}
              </h2>
              <button className="modal-close" onClick={closeModal} disabled={saving}>✕</button>
            </div>

            {modal.mode === 'delete' ? (
              <div className="modal-body">
                <p className="delete-question">
                  Delete <strong>{modal.user.name}</strong> ({modal.user.email})?
                </p>
                <p className="delete-hint">This removes the account from NocoDB. It cannot be undone.</p>
                {formError && <div className="form-error">{formError}</div>}
              </div>
            ) : (
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label>Username <span className="required">*</span></label>
                    <input value={form.username} onChange={setField('username')} disabled={saving} />
                  </div>
                  <div className="form-field">
                    <label>Full Name <span className="required">*</span></label>
                    <input value={form.name} onChange={setField('name')} disabled={saving} />
                  </div>
                  <div className="form-field span-2">
                    <label>Email <span className="required">*</span></label>
                    <input value={form.email} onChange={setField('email')} disabled={saving} />
                  </div>
                  <div className="form-field">
                    <label>Role</label>
                    <select value={form.role} onChange={setField('role')} disabled={saving}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{roleLabel(r)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Status</label>
                    <select value={form.status} onChange={setField('status')} disabled={saving}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field span-2">
                    <label>
                      {modal.mode === 'create' ? 'Password' : 'New password (leave blank to keep current)'}
                      {modal.mode === 'create' && <span className="required"> *</span>}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={setField('password')}
                      placeholder={`Min ${PASSWORD_MIN_LENGTH} characters`}
                      disabled={saving}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                  </div>
                </div>
                {formError && <div className="form-error">{formError}</div>}
              </div>
            )}

            <div className="modal-foot">
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              {modal.mode === 'delete' ? (
                <button className="btn-danger" onClick={handleDelete} disabled={saving}>
                  {saving ? 'Deleting...' : 'Delete account'}
                </button>
              ) : (
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : modal.mode === 'create' ? 'Create account' : 'Save changes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
