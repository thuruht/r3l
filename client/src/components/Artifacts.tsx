// Artifacts.tsx

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { IconDownload, IconTrash, IconShare, IconUpload, IconFile, IconBolt, IconEye, IconArrowsShuffle, IconLoader2, IconCheck, IconDotsVertical } from '@tabler/icons-react';
import FilePreviewModal from './FilePreviewModal';
import Skeleton from './Skeleton';
import ConfirmModal from './ConfirmModal';
import UploadModal from './UploadModal'; // Added
import { useToast } from '../context/ToastContext';
import { ICON_SIZES } from '@/constants/iconSizes';

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
  expires_at?: string;
  remix_of?: number | null;
  visibility?: string;
  burn_on_read?: number;
  is_boosted?: boolean;
}

const Artifacts: React.FC<ArtifactsProps> = ({ userId, isOwner }) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false); // Added
  
  const [secondaryOpenId, setSecondaryOpenId] = useState<number | null>(null);
  const [mutuals, setMutuals] = useState<any[]>([]);
  const [sharingFileId, setSharingFileId] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState<number | null>(null);
  const [boostingIds, setBoostingIds] = useState<Set<number>>(new Set());
  const [pendingDropFiles, setPendingDropFiles] = useState<File[] | null>(null);

  const getExpiryLabel = (expires_at?: string): { label: string; urgent: boolean } | null => {
    if (!expires_at) return null;
    const hoursLeft = (new Date(expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft <= 0) return { label: 'Expired', urgent: true };
    if (hoursLeft < 1) return { label: '<1h', urgent: true };
    if (hoursLeft < 24) return { label: `${Math.floor(hoursLeft)}h`, urgent: true };
    if (hoursLeft < 48) return { label: `${Math.floor(hoursLeft)}h`, urgent: false };
    return null; // > 48h: don't show
  };
  
  const listRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast(); // Added

  useEffect(() => {
    fetchFiles(true);
  }, [userId]);

  useEffect(() => {
    if (files.length > 0 && listRef.current) {
      gsap.fromTo(listRef.current.children, 
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, [files]);

  const fetchFiles = async (reset = false) => {
    if (reset) {
        setLoading(true);
        setOffset(0);
    } else {
        setLoadingMore(true);
    }

    try {
      const currentOffset = reset ? 0 : offset + LIMIT;
      let url = `/api/files?limit=${LIMIT}&offset=${currentOffset}`;
      if (!isOwner && userId) {
          url = `/api/files/users/${userId}?limit=${LIMIT}&offset=${currentOffset}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (reset) {
            setFiles(data.files || []);
        } else {
            setFiles(prev => [...prev, ...(data.files || [])]);
            setOffset(currentOffset);
        }
        setTotal(data.total || 0);
      } else {
        if (reset) setFiles([]);
      }
    } catch (err) {
      console.error("Failed to load files", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setPendingDropFiles(Array.from(e.dataTransfer.files));
      setShowUploadModal(true);
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
            showToast('File shared.', 'success');
            setSharingFileId(null);
        } else {
            const err = await res.json();
            showToast(err.error || 'Failed to share', 'error');
        }
    } catch(e) {
        showToast('Error sharing file', 'error');
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('visibility', 'me'); 


    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchFiles(); // Refresh list
        showToast('File uploaded successfully!', 'success');
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
      e.target.value = ''
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
        showToast('File dissolved.', 'success');
      } else {
        showToast('Failed to dissolve file', 'error');
      }
    } catch (err) {
      showToast('Error dissolving file', 'error');
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
                return { ...f, vitality: data.vitality || (f.vitality + 1), is_boosted: true };
            }
            return f;
        }));
        showToast('TTL extended.', 'success');
      } else if (res.status === 409) {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, is_boosted: true } : f));
        showToast('Already boosted this file.', 'info');
      } else {
        showToast('Failed to boost TTL.', 'error');
      }
    } catch (e) {
      console.error("Error boosting", e);
      showToast('Error boosting TTL.', 'error');
    } finally {
      setBoostingIds(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  const handleRemix = async (file: FileData) => {
    try {
      const res = await fetch(`/api/files/${file.id}/remix`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Remix created: ${data.filename}`, 'success');
        fetchFiles();
      } else {
        showToast(data.error || 'Failed to remix', 'error');
      }
    } catch {
      showToast('Error creating remix', 'error');
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
    <div style={{ marginTop: '20px' }}>
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', marginBottom: '10px' }}>
        <h5 style={{ color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconFile size={ICON_SIZES.md} className="chrome-icon" /> Files {total > 0 && `(${total})`}
        </h5>
      </div>

      {error && <div style={{ color: 'var(--accent-alert)', fontSize: '0.8em', marginBottom: '8px' }}>{error}</div>}

      <div className="file-list" ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {loading && (
          <>
            <Skeleton height="48px" />
            <Skeleton height="48px" />
            <Skeleton height="48px" />
          </>
        )}

        {!loading && files.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary)', fontSize: '0.85em' }}>
            <IconFile size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
            {isOwner ? (
              <>
                <div>No files yet.</div>
                <button onClick={() => setShowUploadModal(true)} style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <IconUpload size={ICON_SIZES.sm} /> Upload your first file
                </button>
              </>
            ) : (
              <div>No public files yet.</div>
            )}
          </div>
        )}

        {!loading && files.map(file => {
          const expiry = getExpiryLabel(file.expires_at);
          const isSecOpen = secondaryOpenId === file.id;
          return (
            <React.Fragment key={file.id}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--hover-bg)',
                padding: '8px 10px',
                borderRadius: '4px',
                fontSize: '0.875em',
                gap: '8px',
              }}>
                {/* Left: name + meta */}
                <button
                  onClick={() => setPreviewFile(file)}
                  style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                  aria-label={`Preview ${file.filename}`}
                >
                  <div style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                    {file.remix_of && <span title="Remix" style={{ flexShrink: 0, fontSize: '0.7em', color: 'var(--accent-sym)', border: '1px solid var(--accent-sym)', borderRadius: '3px', padding: '0 3px' }}>RMX</span>}
                    {file.burn_on_read ? <span title="FLARE: burns after first view" style={{ flexShrink: 0, fontSize: '0.7em', color: 'var(--accent-alert)', border: '1px solid var(--accent-alert)', borderRadius: '3px', padding: '0 3px' }}>FLARE</span> : null}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.filename}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                    {expiry && <span style={{ fontSize: '0.75em', color: expiry.urgent ? 'var(--accent-alert)' : 'var(--text-secondary)' }}>{expiry.urgent ? '!' : ''} {expiry.label}</span>}
                    <span style={{ fontSize: '0.75em', color: 'var(--text-secondary)' }}>{formatSize(file.size)}</span>
                  </div>
                </button>

                {/* Right: primary actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  {/* TTL */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-ttl)' }} onClick={e => e.stopPropagation()}>
                    <IconBolt size={ICON_SIZES.sm} aria-hidden="true" />
                    <span
                      style={{ fontSize: '0.75em', minWidth: '32px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
                      aria-label={`${file.vitality || 0} hours TTL remaining`}
                      title="This file's lifespan — boost to extend it"
                    >{file.vitality || 0}h TTL</span>
                    <button
                      onClick={() => handleBoost(file.id)}
                      disabled={boostingIds.has(file.id) || file.is_boosted}
                      style={{
                        padding: '4px 6px',
                        background: 'transparent',
                        border: `1px solid ${file.is_boosted ? 'var(--accent-sym)' : 'var(--accent-ttl)'}`,
                        color: file.is_boosted ? 'var(--accent-sym)' : 'var(--accent-ttl)',
                        borderRadius: '4px',
                        fontSize: '0.8em',
                        cursor: (boostingIds.has(file.id) || file.is_boosted) ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '28px',
                        minHeight: '28px',
                        opacity: file.is_boosted ? 0.6 : 1,
                      }}
                      title={file.is_boosted ? 'Already boosted' : 'BOOST TTL'}
                      aria-label={file.is_boosted ? 'Already boosted' : 'BOOST TTL'}
                    >
                      {boostingIds.has(file.id) ? <IconLoader2 size={12} className="icon-spin" /> : file.is_boosted ? <IconCheck size={12} /> : '+'}
                    </button>
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }} style={{ padding: '6px', display: 'flex', alignItems: 'center', minWidth: '32px', minHeight: '32px' }} title="Preview" aria-label="Preview file">
                    <IconEye size={ICON_SIZES.sm} aria-hidden="true" className="chrome-icon" />
                  </button>

                  <button onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.filename); }} style={{ padding: '6px', display: 'flex', alignItems: 'center', minWidth: '32px', minHeight: '32px' }} title="Download" aria-label={`Download ${file.filename}`}>
                    <IconDownload size={ICON_SIZES.sm} aria-hidden="true" className="chrome-icon" />
                  </button>

                  {/* More actions toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setSecondaryOpenId(isSecOpen ? null : file.id); if (!isSecOpen) { setSharingFileId(null); } }}
                    style={{ padding: '6px', display: 'flex', alignItems: 'center', minWidth: '32px', minHeight: '32px', color: isSecOpen ? 'var(--accent-sym)' : undefined }}
                    title="More actions"
                    aria-label="More actions"
                    aria-expanded={isSecOpen}
                  >
                    <IconDotsVertical size={ICON_SIZES.sm} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Secondary actions panel */}
              {isSecOpen && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '4px', padding: '6px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => { handleRemix(file); setSecondaryOpenId(null); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8em', padding: '4px 8px' }} title="Remix">
                    <IconArrowsShuffle size={ICON_SIZES.sm} /> Remix
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={() => {
                          if (sharingFileId === file.id) { setSharingFileId(null); }
                          else { setSharingFileId(file.id); fetchMutuals(); }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8em', padding: '4px 8px' }}
                        title="Share"
                      >
                        <IconShare size={ICON_SIZES.sm} /> Share
                      </button>
                      <button
                        onClick={() => { setConfirmDeleteFileId(file.id); setSecondaryOpenId(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8em', padding: '4px 8px', color: 'var(--accent-alert)', borderColor: 'var(--accent-alert)' }}
                        title="Delete"
                      >
                        <IconTrash size={ICON_SIZES.sm} /> Delete
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Share picker (opens within secondary panel) */}
              {sharingFileId === file.id && (
                <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', fontSize: '0.8em' }} onClick={e => e.stopPropagation()}>
                  <div style={{ marginBottom: '5px', color: 'var(--text-secondary)' }}>Share with a connection:</div>
                  {mutuals.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)' }}>No sym connections found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {mutuals.map(u => (
                        <button key={u.id} onClick={() => handleShare(file.id, u.id)} style={{ fontSize: '0.9em', padding: '4px 8px' }}>
                          {u.username}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Load more */}
      {!loading && files.length < total && (
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          <button onClick={() => fetchFiles(false)} disabled={loadingMore} style={{ fontSize: '0.8em' }}>
            {loadingMore ? <IconLoader2 size={ICON_SIZES.sm} className="icon-spin" /> : `Load more (${total - files.length} remaining)`}
          </button>
        </div>
      )}

      {isOwner && files.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <button onClick={() => setShowUploadModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85em' }}>
            <IconUpload size={ICON_SIZES.sm} className="chrome-icon" /> Upload File
          </button>
        </div>
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => { setShowUploadModal(false); setPendingDropFiles(null); }}
          onUploadComplete={() => { fetchFiles(true); setPendingDropFiles(null); }}
          initialFiles={pendingDropFiles ?? undefined}
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
        title="Dissolve File"
        message="Are you sure you want to permanently dissolve this file? This action cannot be undone."
        confirmText="Dissolve"
      />
    </div>
  );
};

export default Artifacts;
