import React, { useEffect } from 'react';
import { IconX, IconFolder, IconCheck, IconFolderOff } from '@tabler/icons-react';
import { useCollections, Collection } from '../hooks/useCollections';
import { useToast } from '../context/ToastContext';

interface CollectionSelectModalProps {
  onClose: () => void;
  onSelect: (collectionId: number) => void;
}

const CollectionSelectModal: React.FC<CollectionSelectModalProps> = ({ onClose, onSelect }) => {
  const { collections, loading, error } = useCollections();
  const { showToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  return (
    <div
      className="modal-overlay fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.8)',
        zIndex: 4000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(5px)'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-select-title"
    >
      <div
        className="glass-panel"
        style={{
          width: '500px',
          maxWidth: '95vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header-sticky"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            margin: 0,
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--drawer-bg)'
          }}
        >
          <h2 id="collection-select-title" style={{ margin: 0, fontSize: '1.2rem' }}>
            Select Collection
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', padding: 0 }}
          >
            <IconX size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading && <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading collections...</p>}

          {!loading && collections.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <IconFolderOff size={48} stroke={1} />
              <p style={{ margin: 0, fontSize: '1.1em' }}>No Collections Found</p>
              <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.7 }}>Create a collection first to add items to it.</p>
            </div>
          )}

          {!loading && collections.map((c: Collection) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              className="glass-panel"
              style={{
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                border: '1px solid transparent',
                transition: 'all 0.2s',
                borderRadius: '4px'
              }}
              onClick={() => onSelect(c.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(c.id);
                }
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-sym)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-sym)';
                e.currentTarget.style.boxShadow = 'var(--glow-sym)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <IconFolder size={24} color="var(--accent-sym)" />
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{c.name}</div>
                  <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                    {c.file_count} items • {c.visibility}
                  </div>
                </div>
              </div>
              <IconCheck size={18} style={{ opacity: 0.5, color: 'var(--text-secondary)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollectionSelectModal;
