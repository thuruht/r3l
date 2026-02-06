import React, { useState, useEffect } from 'react';
import { IconArchive, IconX } from '@tabler/icons-react';
import { useToast } from '../context/ToastContext';
import Skeleton from './Skeleton';

interface ArchiveVoteProps {
  onClose: () => void;
}

const ArchiveVote: React.FC<ArchiveVoteProps> = ({ onClose }) => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchArchivedFiles();
  }, []);

  const fetchArchivedFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/files/community-archived');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay fade-in" onClick={onClose} style={{ zIndex: 4000 }}>
      <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-sym)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconArchive size={24} /> Community Archive
          </h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close"><IconX size={24} /></button>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <Skeleton height="80px" borderRadius="8px" />
            <Skeleton height="80px" borderRadius="8px" />
            <Skeleton height="80px" borderRadius="8px" />
          </div>
        )}
        
        {!loading && files.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <IconArchive size={64} stroke={1} style={{ opacity: 0.3 }} aria-hidden="true" />
            <div>
              <p style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold', color: 'var(--text-primary)' }}>No Artifacts Preserved</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.95em', opacity: 0.7 }}>The community archives are silent.</p>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: '10px' }}>
          {files.map(f => (
            <div key={f.id} style={{ padding: '15px', background: '#ffffff0a', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>{f.filename}</h4>
                  <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                    by {f.owner_name} • {f.archive_votes} votes
                  </div>
                </div>
                <div style={{ padding: '4px 12px', background: 'var(--accent-sym)', color: '#000000ff', borderRadius: '12px', fontSize: '0.8em', fontWeight: 'bold' }}>
                  ARCHIVED
                </div>
              </div>
              <a href={`/api/files/${f.id}/content`} download style={{ color: 'var(--accent-sym)', fontSize: '0.9em' }}>
                Download
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArchiveVote;
