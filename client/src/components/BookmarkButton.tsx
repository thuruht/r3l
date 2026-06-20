import React, { useState, useEffect } from 'react';
import { IconBookmark, IconBookmarkFilled } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';
import { useToast } from '../context/ToastContext';

interface BookmarkButtonProps {
  fileId: string | number;
  isMobile?: boolean;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ fileId, isMobile }) => {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/bookmarks/check/${fileId}`);
        if (res.ok) {
          const data = await res.json();
          setBookmarked(data.bookmarked);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId]);

  const toggle = async () => {
    try {
      const res = await fetch(`/api/bookmarks/${fileId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(data.bookmarked);
        showToast(data.bookmarked ? 'Bookmarked' : 'Removed bookmark', 'info');
      }
    } catch {
      showToast('Error toggling bookmark', 'error');
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
      style={{
        background: 'transparent',
        border: 'none',
        color: bookmarked ? 'var(--accent-sym)' : 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)',
        flexShrink: 0,
        width: isMobile ? '100%' : 'auto',
        padding: isMobile ? 'var(--spacing-sm)' : '0',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {bookmarked ? (
        <IconBookmarkFilled size={ICON_SIZES.lg} className="chrome-icon" />
      ) : (
        <IconBookmark size={ICON_SIZES.lg} className="chrome-icon" />
      )}
      {isMobile && (bookmarked ? 'Bookmarked' : 'Bookmark')}
    </button>
  );
};

export default BookmarkButton;
