import React from 'react';
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
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay fade-in" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: '#000000dd', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(10px)'
    }} onClick={onClose}>
      <div style={{
        width: '400px', maxWidth: '90%',
        background: 'var(--bg-mist)', border: '1px solid var(--border-color)', borderRadius: '8px',
        padding: '25px', position: 'relative', boxShadow: '0 0 30px #000'
      }} onClick={e => e.stopPropagation()}>
        
        <button onClick={onClose} style={{
          position: 'absolute', top: '15px', right: '15px',
          background: 'transparent', border: 'none', padding: '5px'
        }}>
          <IconX size={18} />
        </button>

        <h4 style={{ margin: '0 0 15px 0', color: 'var(--accent-alert)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IconAlertTriangle size={24} /> {title}
        </h4>
        <p style={{ color: 'var(--text-primary)', marginBottom: '25px' }}>{message}</p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
            {cancelText}
          </button>
          <button onClick={onConfirm} style={{ background: 'var(--accent-alert)', borderColor: 'var(--accent-alert)', color: 'white' }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
