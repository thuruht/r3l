import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import CommentsSection from './CommentsSection';

const CommentsPage: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [fileMeta, setFileMeta] = useState<{ filename: string; username: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fileId) return;
    (async () => {
      try {
        const [metaRes, authRes] = await Promise.all([
          fetch(`/api/files/${fileId}/metadata`),
          fetch('/api/me'),
        ]);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          setFileMeta({ filename: meta.filename, username: meta.owner_username || 'Unknown' });
        }
        if (authRes.ok) {
          const auth = await authRes.json();
          if (auth.user) setCurrentUser(auth.user);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId]);

  return (
    <div style={{
      maxWidth: '720px', margin: '0 auto', padding: '24px 16px',
      minHeight: '100vh', color: 'var(--text-primary)',
    }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'var(--accent-sym)', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← Back to R3L:F
        </Link>
        {!currentUser && (
          <Link to="/" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Sign in to reply
          </Link>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading...</div>
      ) : fileMeta ? (
        <>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '4px' }}>{fileMeta.filename}</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            by {fileMeta.username}
          </p>
          <CommentsSection
            fileId={fileId!}
            currentUser={currentUser}
            fileOwnerId={0}
          />
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--accent-alert)' }}>File not found.</p>
          <button onClick={() => navigate('/')} style={{ marginTop: '16px' }}>Return Home</button>
        </div>
      )}
    </div>
  );
};

export default CommentsPage;
