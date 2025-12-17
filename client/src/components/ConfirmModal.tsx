import React, { useEffect, useRef } from 'react';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the cancel button by default for safety
      cancelButtonRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="confirm-overlay fade-in"
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: '#000000dd', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center',
        backdropFilter: 'blur(10px)'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div
        ref={modalRef}
        style={{
          width: '400px', maxWidth: '90%',
          background: 'var(--bg-mist)', border: '1px solid var(--border-color)', borderRadius: '8px',
          padding: '25px', position: 'relative', boxShadow: '0 0 30px #000'
        }}
        onClick={e => e.stopPropagation()}
      >
        
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute', top: '15px', right: '15px',
            background: 'transparent', border: 'none', padding: '5px'
          }}
        >
          <IconX size={18} />
        </button>

        <h4
          id="confirm-modal-title"
          style={{ margin: '0 0 15px 0', color: 'var(--accent-alert)', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <IconAlertTriangle size={24} /> {title}
        </h4>
        <p
          id="confirm-modal-desc"
          style={{ color: 'var(--text-primary)', marginBottom: '25px' }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{ background: 'var(--accent-alert)', borderColor: 'var(--accent-alert)', color: 'white' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
