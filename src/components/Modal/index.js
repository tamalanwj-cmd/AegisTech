import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './style.css';

/**
 * Shared dialog shell used by every popup in the admin portal.
 *
 * Rendered into document.body so a dialog is never clipped by a card's overflow
 * or stacking context. Escape and overlay clicks close it unless `busy` is set
 * (i.e. a save/delete is in flight).
 */
const Modal = ({
  title,
  icon,
  onClose,
  children,
  footer,
  size = 'md',
  busy = false,
}) => {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, busy]);

  return createPortal(
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div
        className={`modal-card modal-${size}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>
            {icon && <span className={`modal-icon${icon.danger ? ' danger' : ''}`}>{icon.text}</span>}
            {title}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
