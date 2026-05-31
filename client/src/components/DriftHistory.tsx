import React, { useState, useEffect } from 'react';
import { IconHistory, IconFile } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';

interface HistoryItem {
  file_id: number;
  filename: string;
  mime_type: string;
  timestamp: number;
}

interface DriftHistoryProps {
  onFileSelect: (fileId: number) => void;
}

const DriftHistory: React.FC<DriftHistoryProps> = ({ onFileSelect }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    } finally {
      setLoading(false);
    }
  };

  const getIconForMime = (mime: string) => {
    if (!mime) return '📄';
    if (mime.startsWith('image/')) return '🖼️';
    if (mime.startsWith('video/')) return '🎬';
    if (mime.startsWith('audio/')) return '🎵';
    if (mime === 'application/pdf') return '📑';
    if (mime.startsWith('text/') || mime.includes('json') || mime.includes('javascript')) return '💻';
    return '📄';
  };

  if (loading) {
    return <div style={{ padding: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>Loading history...</div>;
  }

  if (history.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-md)', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
        <IconHistory size={48} style={{ opacity: 0.5, marginBottom: '10px' }} />
        <p>No drift history yet.</p>
        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Artifacts you view will appear here.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-md)' }}>
      <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <IconHistory size={ICON_SIZES.md} /> Recently Drifted
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {history.map((item) => (
          <div
            key={item.file_id}
            onClick={() => onFileSelect(item.file_id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          >
            <div style={{ fontSize: '24px' }}>{getIconForMime(item.mime_type)}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold' }}>
                {item.filename}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {new Date(item.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DriftHistory;
