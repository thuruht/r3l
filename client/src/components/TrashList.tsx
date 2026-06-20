import React, { useState, useEffect } from 'react';
import { IconTrash, IconFile, IconRefresh } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';

interface TrashItem {
  id: number;
  filename: string;
  mime_type: string;
  size: number;
  deleted_at: string;
}

interface TrashListProps {
  onFileSelect: (fileId: number) => void;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const TrashList: React.FC<TrashListProps> = ({ onFileSelect }) => {
  const [files, setFiles] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrash();
  }, []);

  const fetchTrash = async () => {
    try {
      const res = await fetch('/api/files/trash');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const restoreFile = async (fileId: number) => {
    try {
      const res = await fetch(`/api/files/${fileId}/restore`, { method: 'POST' });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
      }
    } catch {
      // silent
    }
  };

  if (loading) {
    return <div style={{ padding: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>Loading trash...</div>;
  }

  if (files.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-md)', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.85rem' }}>
        <IconTrash size={ICON_SIZES.xl} style={{ opacity: 0.3, marginBottom: '8px' }} />
        <div>Trash is empty.</div>
        <div style={{ marginTop: '4px', fontSize: '0.75rem', opacity: 0.6 }}>Deleted files appear here for 24 hours.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>Trash ({files.length})</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Auto-deletes in 24h</span>
      </div>
      {files.map(f => (
        <button
          key={f.id}
          onClick={() => onFileSelect(f.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            fontSize: '0.85rem',
          }}
        >
          <IconFile size={ICON_SIZES.md} style={{ flexShrink: 0, opacity: 0.5 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{formatTimeAgo(f.deleted_at)}</div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); restoreFile(f.id); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-sym)', cursor: 'pointer', padding: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '2px' }}
            title="Restore file"
            aria-label={`Restore ${f.filename}`}
          >
            <IconRefresh size={ICON_SIZES.sm} />
            <span style={{ fontSize: '0.65rem' }}>Restore</span>
          </button>
        </button>
      ))}
    </div>
  );
};

export default TrashList;
