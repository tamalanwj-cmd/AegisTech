import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
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

/** Roles the admin may assign; legacy roles keep rendering in the table only. */
const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator' },
  { value: 'participant', label: 'Participant' },
];

const USERNAME_RE = /^[A-Za-z0-9._-]{3,32}$/;

const roleLabel = (role) => String(role || '').charAt(0).toUpperCase() + String(role || '').slice(1);
const roleClass = (role) => `role-${String(role || 'participant').toLowerCase()}`;
const statusClass = (status) =>
  String(status || '').toLowerCase() === 'inactive' ? 'status-inactive' : 'status-active';

/** Map a stored role onto the two values the select offers. */
const selectableRole = (role) => (String(role || '').toLowerCase() === 'admin' ? 'admin' : 'participant');

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

const emptyCreateForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'participant',
  status: 'Active',
};

/* ------------------------------- component -------------------------------- */

const Users = () => {
  const [me, setMe] = useState(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [dialog, setDialog] = useState(null); // { mode: 'create' | 'edit' | 'delete', user? }
  const [form, setForm] = useState(emptyCreateForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
  let active = true;

  getCurrentUser()
    .then((user) => {
      if (active) setMe(user);
    })
    .catch((error) => {
      console.error('Failed to retrieve current user:', error);
    })
    .finally(() => {
      if (active) setCurrentUserLoading(false);
    });

      return () => {
        active = false;
      };
    }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setUsers(await listUsers());
    } catch (e) {
      setLoadError(e.message || 'Could not load users from Supabase');
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

  const isMe = (u) => String(u.Id) === String(me?.Id);

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
    setForm(emptyCreateForm);
    setFormError('');
    setDialog({ mode: 'create' });
  };

  const openEdit = (user) => {
    setForm({
      username: user.username,
      email: user.email,
      role: selectableRole(user.role),
      status: user.status,
    });
    setFormError('');
    setDialog({ mode: 'edit', user });
  };

  const openDelete = (user) => {
    setFormError('');
    setDialog({ mode: 'delete', user });
  };

  const closeDialog = () => {
    setDialog(null);
    setFormError('');
  };

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validateCreate = () => {
    const username = form.username.trim();
    if (!USERNAME_RE.test(username)) {
      return 'Username must be 3-32 characters: letters, numbers, . _ -';
    }
    if (!form.email.trim()) return 'Please enter an email address';
    if (form.password.length < PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return '';
  };

  const handleSave = async () => {
    if (!dialog) return;
    setFormError('');
    setSaving(true);
    try {
      if (currentUserLoading || !me) {
          throw new Error('Unable to verify your account. Please refresh and try again.');
        }

      if (dialog.mode === 'create') {
        const error = validateCreate();
        if (error) throw new Error(error);
        const username = form.username.trim();
        // createUser requires a name; the spec has no Full Name field.
        await createUser({
          username,
          email: form.email.trim(),
          name: username,
          password: form.password,
          role: form.role,
          status: form.status,
        });
        setNotice(`Account "${username}" created.`);
      } else {
        const target = dialog.user;
        if (isMe(target) && form.role !== 'admin') {
          throw new Error('You cannot remove your own administrator role');
        }
        const username = form.username.trim();
        await updateUser(target.Id, {
          username,
          email: form.email.trim(),
          role: form.role,
          status: form.status,
        });
        setNotice(`Account "${username}" updated.`);
      }
      closeDialog();
      await load();
    } catch (e) {
      setFormError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const target = dialog?.user;
    if (!target) return;
    setFormError('');
    setSaving(true);
    try {
      if (currentUserLoading || !me) {
        throw new Error('Unable to verify your account. Please refresh and try again.');
      }

      if (isMe(target)) throw new Error('You cannot delete the account you are signed in with');
      if (target.role === 'admin' && target.status === 'Active' && adminCount <= 1) {
        throw new Error('This is the last active administrator — create another admin first');
      }
      await deleteUser(target.Id);
      setNotice(`Account "${target.username}" deleted.`);
      closeDialog();
      await load();
    } catch (e) {
      setFormError(e.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------- render --------------------------------- */

  const submitOnEnter = (e) => e.key === 'Enter' && handleSave();

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
                <button className="btn-delete" onClick={() => openDelete(u)} title="Delete account">🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {dialog?.mode === 'create' && (
        <Modal
          title="Add User"
          onClose={closeDialog}
          busy={saving}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={closeDialog} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Add User'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-field">
              <label>Username <span className="required">*</span></label>
              <input value={form.username} onChange={setField('username')} disabled={saving} autoFocus />
            </div>
            <div className="form-field">
              <label>Email <span className="required">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={setField('email')}
                disabled={saving}
              />
            </div>
            <div className="form-field">
              <label>Password <span className="required">*</span></label>
              <input
                type="password"
                value={form.password}
                onChange={setField('password')}
                placeholder={`Min ${PASSWORD_MIN_LENGTH} characters`}
                disabled={saving}
              />
            </div>
            <div className="form-field">
              <label>Confirm Password <span className="required">*</span></label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={setField('confirmPassword')}
                disabled={saving}
                onKeyDown={submitOnEnter}
              />
            </div>
            <div className="form-field">
              <label>Role</label>
              <select value={form.role} onChange={setField('role')} disabled={saving}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
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
          </div>
          {formError && <div className="form-error">{formError}</div>}
        </Modal>
      )}

      {dialog?.mode === 'edit' && (
        <Modal
          title="Edit User"
          onClose={closeDialog}
          busy={saving}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={closeDialog} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-field">
              <label>Username <span className="required">*</span></label>
              <input value={form.username} onChange={setField('username')} disabled={saving} autoFocus />
            </div>
            <div className="form-field">
              <label>Email <span className="required">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={setField('email')}
                disabled={saving}
              />
            </div>
            <div className="form-field">
              <label>Role</label>
              <select value={form.role} onChange={setField('role')} disabled={saving}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
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
          </div>
          {formError && <div className="form-error">{formError}</div>}
        </Modal>
      )}

      {dialog?.mode === 'delete' && (
        <ConfirmDialog
          title="Delete User?"
          message="Are you sure you want to delete this user? This action cannot be undone."
          details={[
            { label: 'Username', value: dialog.user.username },
            { label: 'Email', value: dialog.user.email },
          ]}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          busy={saving}
          error={formError}
          onConfirm={handleDelete}
          onCancel={closeDialog}
        />
      )}
    </div>
  );
};

export default Users;
