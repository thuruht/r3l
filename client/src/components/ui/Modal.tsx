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

/**
 * Reusable Modal Component
 * Standardizes modal structure and styling across the application
 *
 * @example
 * <Modal isOpen={isOpen} onClose={handleClose} title="Confirm Action">
 *   <p>Are you sure?</p>
 *   <Modal.Footer>
 *     <Button variant="secondary">Cancel</Button>
 *     <Button variant="primary">Confirm</Button>
 *   </Modal.Footer>
 * </Modal>
 */
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

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-modal">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`modal-panel ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {/* Header */}
          {title && (
            <div className="modal-header">
              <h2 id="modal-title">{title}</h2>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="btn-icon"
                  aria-label="Close modal"
                  title="Close"
                >
                  <IconX size={ICON_SIZES.xl} />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="modal-body">{children}</div>

          {/* Footer */}
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

/**
 * Modal Footer Component for consistent footer styling
 */
Modal.Footer = ({ children }: { children: ReactNode }) => (
  <div className="flex justify-end gap-3 p-4 border-t border-[var(--border-color)]">
    {children}
  </div>
);

export default Modal;
