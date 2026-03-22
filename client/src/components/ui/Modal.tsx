import React, { ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  showCloseButton = true,
}) => {
  if (!isOpen) return null;

  const maxWidths = {
    sm: '400px',
    md: '600px',
    lg: '900px',
  };

  return (
    <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
    }}>
      {/* Overlay */}
      <div
        style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className="modal-panel"
        style={{
            width: '100%',
            maxWidth: maxWidths[size],
            position: 'relative',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="modal-header" style={{ flexShrink: 0 }}>
            {title && <h2 id="modal-title">{title}</h2>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="btn-icon"
                aria-label="Close modal"
                title="Close"
                style={{ marginLeft: 'auto' }}
              >
                <IconX size={ICON_SIZES.xl} className="chrome-icon" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
            {children}
        </div>

        {/* Footer */}
        {footer && <div className="modal-footer" style={{ flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  );
};

/**
 * Modal Footer Component for consistent footer styling
 */
Modal.Footer = ({ children }: { children: ReactNode }) => (
  <div className="modal-footer">
    {children}
  </div>
);

export default Modal;
