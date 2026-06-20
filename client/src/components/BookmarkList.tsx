import React, { useState, useEffect } from 'react';
import { IconBookmark, IconFile, IconTrash } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';

interface BookmarkItem {
  id: number;
  file_id: number;
  filename: string;
  mime_type: string;
  owner_username: string;
  size: number;
  created_at: string;
}

interface BookmarkListProps {
  onFileSelect: (fileId: number) => void;
}

const BookmarkList: React.FC<BookmarkListProps> = ({ onFileSelect }) => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const res = await fetch('/api/bookmarks');
      if (res.ok) {
        const data = await res.json();
        setBookmarks(data.bookmarks || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (fileId: number) => {
    try {
      const res = await fetch(`/api/bookmarks/${fileId}`, { method: 'POST' });
      if (res.ok) {
        setBookmarks(prev => prev.filter(b => b.file_id !== fileId));
      }
    } catch {
      // silent
    }
  };

  if (loading) {
    return <div style={{ padding: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>Loading bookmarks...</div>;
  }

  if (bookmarks.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-md)', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.85rem' }}>
        <IconBookmark size={ICON_SIZES.xl} style={{ opacity: 0.3, marginBottom: '8px' }} />
        <div>No bookmarks yet.</div>
        <div style={{ marginTop: '4px', fontSize: '0.75rem', opacity: 0.6 }}>Bookmark files to save them here.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        Bookmarks ({bookmarks.length})
      </div>
      {bookmarks.map(b => (
        <button
          key={b.id}
          onClick={() => onFileSelect(b.file_id)}
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
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.filename}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{b.owner_username}</div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); removeBookmark(b.file_id); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
            title="Remove bookmark"
            aria-label={`Remove bookmark for ${b.filename}`}
          >
            <IconTrash size={ICON_SIZES.sm} />
          </button>
        </button>
      ))}
    </div>
  );
};

export default BookmarkList;
