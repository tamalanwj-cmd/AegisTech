import React from 'react';
import Modal from '../Modal';

/**
 * Confirmation dialog (#3, #6, #9, #12, #15 in the popup spec).
 *
 * `details` takes a list of { label, value } rows, matching the summary box the
 * design shows above the buttons (e.g. Username / Email on delete user).
 */
const ConfirmDialog = ({
  title,
  message,
  details,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  busy = false,
  error = '',
  onConfirm,
  onCancel,
}) => (
  <Modal
    title={title}
    size="sm"
    busy={busy}
    onClose={onCancel}
    icon={{ text: '!', danger }}
    footer={
      <>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </>
    }
  >
    <p className="confirm-msg">{message}</p>

    {details?.length > 0 && (
      <dl className="confirm-details">
        {details.map((row) => (
          <div className="confirm-detail-row" key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value || '—'}</dd>
          </div>
        ))}
      </dl>
    )}

    {error && <div className="form-error">{error}</div>}
  </Modal>
);

export default ConfirmDialog;
