// Artifacts.tsx

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { IconDownload, IconTrash, IconShare, IconUpload, IconFile, IconBolt, IconEye, IconArrowsShuffle, IconX, IconLoader2 } from '@tabler/icons-react';
import FilePreviewModal from './FilePreviewModal';
import Skeleton from './Skeleton';
import ConfirmModal from './ConfirmModal';
import UploadModal from './UploadModal'; // Added
import { useToast } from '../context/ToastContext';

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false); // Added
  
  const [sharingFileId, setSharingFileId] = useState<number | null>(null);
  const [mutuals, setMutuals] = useState<any[]>([]);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [remixTarget, setRemixTarget] = useState<FileData | null>(null);
  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState<number | null>(null); // Added
  const [boostingIds, setBoostingIds] = useState<Set<number>>(new Set());
  
  const listRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast(); // Added

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

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const fetchMutuals = async () => {
    try {
        const res = await fetch('/api/relationships');
        if (res.ok) {
            const data = await res.json();
             const enrichedMutuals = data.mutual.map((m: any) => ({
                 id: m.user_id,
                 username: m.username,
                 avatar_url: m.avatar_url
             }));
             setMutuals(enrichedMutuals);
        }
    } catch(e) {
        console.error("Failed to fetch mutuals", e);
        showToast('Failed to load mutual connections.', 'error');
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
            showToast('Artifact shared.', 'success');
            setSharingFileId(null);
        } else {
            const err = await res.json();
            showToast(err.error || 'Failed to share', 'error');
        }
    } catch(e) {
        showToast('Error sharing artifact', 'error');
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('visibility', 'private'); // 'private' in DB schema
    if (remixTarget) {
      formData.append('parent_id', remixTarget.id.toString());
    }

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchFiles(); // Refresh list
        showToast('Artifact uploaded successfully!', 'success');
      } else {
        const err = await res.json();
        setError(err.error || 'Upload failed');
        showToast(err.error || 'Upload failed', 'error');
      }
    } catch (err) {
      setError('Upload failed');
      showToast('Upload failed', 'error');
    }
    finally {
      setUploading(false);
      setRemixTarget(null);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (confirmDeleteFileId === null) return;

    try {
      const res = await fetch(`/api/files/${confirmDeleteFileId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== confirmDeleteFileId));
        showToast('Artifact dissolved.', 'success');
      } else {
        showToast('Failed to dissolve artifact', 'error');
      }
    } catch (err) {
      showToast('Error dissolving artifact', 'error');
    } finally {
        setConfirmDeleteFileId(null);
    }
  };

  const handleBoost = async (fileId: number) => {
    setBoostingIds(prev => new Set(prev).add(fileId));
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
    } finally {
      setBoostingIds(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
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
            <div
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px', outline: 'none' }}
              role="button"
              tabIndex={0}
              aria-label={`Preview ${file.filename}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setPreviewFile(file);
                }
              }}
              onClick={(e) => e.stopPropagation()} /* Prevent double firing if clicking directly on text */
              onClickCapture={() => setPreviewFile(file)} /* Handle click explicitly */
            >
              <div style={{ color: 'var(--text-primary)' }}>{file.filename}</div>
              <div style={{ color: '#888', fontSize: '0.8em' }}>{formatSize(file.size)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '5px', gap: '2px', color: '#ffeb3b' }} title="Vitality" onClick={e => e.stopPropagation()}>
                 <IconBolt size={14} aria-hidden="true" />
                 <span style={{ fontSize: '0.8em' }} aria-label={`${file.vitality || 0} vitality`}>{file.vitality || 0}</span>
                 <button 
                   onClick={() => handleBoost(file.id)} 
                   disabled={boostingIds.has(file.id)}
                   style={{ 
                     padding: '0 4px', 
                     background: 'transparent', 
                     border: '1px solid #ffeb3b', 
                     color: '#ffeb3b', 
                     borderRadius: '4px',
                     fontSize: '0.7em',
                     cursor: boostingIds.has(file.id) ? 'wait' : 'pointer',
                     marginLeft: '4px',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     minWidth: '20px'
                   }}
                   title="Boost Signal"
                   aria-label="Boost Signal"
                 >
                   {boostingIds.has(file.id) ? <IconLoader2 size={12} className="icon-spin" /> : "+"}
                 </button>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }}
                style={{ fontSize: '0.7em', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Preview"
                aria-label="Preview file"
              >
                <IconEye size={14} aria-hidden="true" />
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.filename); }}
                style={{ fontSize: '0.7em', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Download"
                aria-label={`Download ${file.filename}`}
              >
                <IconDownload size={14} aria-hidden="true" />
              </button>
              
              <button
                onClick={(e) => { e.stopPropagation(); setRemixTarget(file); }}
                style={{ fontSize: '0.7em', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Remix this artifact"
                aria-label="Remix this artifact"
              >
                <IconArrowsShuffle size={14} />
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
                    aria-label="Share file"
                >
                    <IconShare size={14} aria-hidden="true" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteFileId(file.id); }}
                  style={{ fontSize: '0.7em', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--accent-alert)', borderColor: 'var(--accent-alert)' }}
                  title="Delete"
                  aria-label="Delete file"
                >
                  <IconTrash size={14} aria-hidden="true" />
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
          {remixTarget && (
            <div style={{ marginBottom: '10px', fontSize: '0.85em', color: 'var(--accent-sym)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Remixing: <strong>{remixTarget.filename}</strong></span>
              <button onClick={() => setRemixTarget(null)} style={{ padding: '2px 6px', fontSize: '0.8em' }}><IconX size={12} /> Cancel</button>
            </div>
          )}

          <button onClick={() => setShowUploadModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <IconUpload size={16} /> Upload Artifacts
          </button>
        </div>
      )}

      {showUploadModal && (
        <UploadModal 
            onClose={() => setShowUploadModal(false)}
            onUploadComplete={fetchFiles}
            parentId={remixTarget?.id}
        />
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
      <ConfirmModal
        isOpen={confirmDeleteFileId !== null}
        onClose={() => setConfirmDeleteFileId(null)}
        onConfirm={handleDelete}
        title="Dissolve Artifact"
        message="Are you sure you want to permanently dissolve this artifact? This action cannot be undone."
        confirmText="Dissolve"
      />
    </div>
  );
};

export default Artifacts;
