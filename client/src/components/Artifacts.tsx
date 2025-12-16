import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { IconDownload, IconTrash, IconShare, IconUpload, IconFile, IconBolt, IconEye } from '@tabler/icons-react';
import FilePreviewModal from './FilePreviewModal';
import Skeleton from './Skeleton';

interface ArtifactsProps {
  userId: string;
  isOwner: boolean;
}

interface FileData {
  id: number;
  filename: string;
  size: number;
  mime_type: string;
  created_at: string;
  r2_key: string;
  vitality: number;
}

const Artifacts: React.FC<ArtifactsProps> = ({ userId, isOwner }) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [sharingFileId, setSharingFileId] = useState<number | null>(null);
  const [mutuals, setMutuals] = useState<any[]>([]);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFiles();
  }, [userId]);

  useEffect(() => {
    if (files.length > 0 && listRef.current) {
      gsap.fromTo(listRef.current.children, 
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, [files]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      let url = '/api/files';
      if (!isOwner && userId) {
          url = `/api/users/${userId}/files`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error("Failed to load artifacts", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMutuals = async () => {
    try {
        const res = await fetch('/api/relationships');
        if (res.ok) {
            const data = await res.json();
            // ... (rest of mutuals logic simplified or assumed available, 
            // for brevity in this replace, preserving logic)
            // Actually I need to keep the full logic or it breaks.
            // Let's assume fetching users is needed as per original.
             // Re-implementing logic:
             // Note: The original code fetched /api/d1/users which I deleted. 
             // I should rely on the enriched relationship data now!
             // `data.mutual` now contains username/avatar_url directly.
             const enrichedMutuals = data.mutual.map((m: any) => ({
                 id: m.user_id,
                 username: m.username,
                 avatar_url: m.avatar_url
             }));
             setMutuals(enrichedMutuals);
        }
    } catch(e) {
        console.error("Failed to fetch mutuals", e);
    }
  }

  const handleShare = async (fileId: number, targetUserId: number) => {
    try {
        const res = await fetch(`/api/files/${fileId}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_user_id: targetUserId })
        });
        if (res.ok) {
            alert('Artifact shared.');
            setSharingFileId(null);
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to share');
        }
    } catch(e) {
        alert('Error sharing file');
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('visibility', 'private'); // Default to private for now

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchFiles(); // Refresh list
      } else {
        const err = await res.json();
        setError(err.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed');
    }
    finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm('Dissolve this artifact?')) return;

    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
      } else {
        alert('Failed to delete');
      }
    } catch (err) {
      alert('Error deleting file');
    }
  };

  const handleBoost = async (fileId: number) => {
    try {
      const res = await fetch(`/api/files/${fileId}/vitality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1 })
      });
      
      if (res.ok) {
        const data = await res.json();
        setFiles(prev => prev.map(f => {
            if (f.id === fileId) {
                return { ...f, vitality: data.new_vitality || (f.vitality + 1) };
            }
            return f;
        }));
      } else {
        console.error("Failed to boost");
      }
    } catch (e) {
      console.error("Error boosting", e);
    }
  };

  const handleDownload = (fileId: number, filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/files/${fileId}/content`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="artifacts-container" style={{ marginTop: '20px' }}>
      <h5 style={{ color: 'var(--text-secondary)', borderBottom: '1px solid #333', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <IconFile size={16} /> Artifacts {files.length > 0 && `(${files.length})`}
      </h5>

      {error && <div style={{ color: 'var(--accent-alert)', fontSize: '0.8em' }}>{error}</div>}

      <div className="file-list" ref={listRef} style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading && (
            <>
                <Skeleton height="40px" />
                <Skeleton height="40px" />
                <Skeleton height="40px" />
            </>
        )}
        
        {!loading && files.length === 0 && (
          <div style={{ color: '#666', fontSize: '0.8em', fontStyle: 'italic' }}>
            No artifacts found.
          </div>
        )}

        {!loading && files.map(file => (
          <React.Fragment key={file.id}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: '#ffffff0d',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '0.9em',
            cursor: 'pointer'
          }} onClick={() => setPreviewFile(file)}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
              <div style={{ color: 'var(--text-primary)' }}>{file.filename}</div>
              <div style={{ color: '#888', fontSize: '0.8em' }}>{formatSize(file.size)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '5px', gap: '2px', color: '#ffeb3b' }} title="Vitality" onClick={e => e.stopPropagation()}>
                 <IconBolt size={14} />
                 <span style={{ fontSize: '0.8em' }}>{file.vitality || 0}</span>
                 <button 
                   onClick={() => handleBoost(file.id)} 
                   style={{ 
                     padding: '0 4px', 
                     background: 'transparent', 
                     border: '1px solid #ffeb3b', 
                     color: '#ffeb3b', 
                     borderRadius: '4px',
                     fontSize: '0.7em',
                     cursor: 'pointer',
                     marginLeft: '4px'
                   }}
                   title="Boost Signal"
                 >
                   +
                 </button>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }}
                style={{ fontSize: '0.7em', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Preview"
              >
                <IconEye size={14} />
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.filename); }}
                style={{ fontSize: '0.7em', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Download"
              >
                <IconDownload size={14} />
              </button>
              {isOwner && (
                <>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (sharingFileId === file.id) {
                            setSharingFileId(null);
                        } else {
                            setSharingFileId(file.id);
                            fetchMutuals();
                        }
                    }}
                    style={{ fontSize: '0.7em', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title="Share"
                >
                    <IconShare size={14} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                  style={{ fontSize: '0.7em', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--accent-alert)', borderColor: 'var(--accent-alert)' }}
                  title="Delete"
                >
                  <IconTrash size={14} />
                </button>
                </>
              )}
            </div>
          </div>
          {sharingFileId === file.id && (
              <div style={{ padding: '5px', background: '#ffffff11', fontSize: '0.8em' }} onClick={e => e.stopPropagation()}>
                  <div style={{ marginBottom: '5px' }}>Share with:</div>
                  {mutuals.length === 0 ? (
                      <div>No connections found.</div>
                  ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {mutuals.map(u => (
                              <button key={u.id} onClick={() => handleShare(file.id, u.id)} style={{ fontSize: '0.9em' }}>
                                  {u.username}
                              </button>
                          ))}
                      </div>
                  )}
              </div>
          )}
          </React.Fragment>
        ))}
      </div>

      {isOwner && (
        <div style={{ marginTop: '15px' }}>
          <label 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px', 
              border: '1px dashed var(--accent-sym)', 
              color: 'var(--accent-sym)',
              cursor: 'pointer',
              fontSize: '0.8em',
              borderRadius: '4px',
              opacity: uploading ? 0.5 : 1
            }}
          >
            {uploading ? 'Uploading...' : <><IconUpload size={14} /> Upload Artifact</>}
            <input 
              type="file" 
              onChange={handleUpload} 
              style={{ display: 'none' }} 
              disabled={uploading}
            />
          </label>
        </div>
      )}

      {previewFile && (
        <FilePreviewModal
            fileId={previewFile.id}
            filename={previewFile.filename}
            mimeType={previewFile.mime_type}
            onClose={() => setPreviewFile(null)}
            onDownload={() => handleDownload(previewFile.id, previewFile.filename)}
        />
      )}
    </div>
  );
};

export default Artifacts;
