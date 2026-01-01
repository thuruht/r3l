import React, { useState, useEffect } from 'react';
import { IconX, IconArrowsMove, IconBolt, IconRefresh, IconDeviceFloppy, IconEdit, IconFolderPlus, IconWallpaper, IconUsers, IconDotsVertical, IconDownload } from '@tabler/icons-react';
import { useDraggable } from '../hooks/useDraggable';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';
import CollectionsManager from './CollectionsManager';
import CodeEditor from './CodeEditor';
import { useCustomization } from '../context/CustomizationContext';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useCollections } from '../hooks/useCollections';

interface FilePreviewModalProps {
  fileId: string | null;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ fileId, onClose }) => {
  const [content, setContent] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vitality, setVitality] = useState(0);
  const [boosted, setBoosted] = useState(false);
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showCollectionSelect, setShowCollectionSelect] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Use the hook from main branch instead of the hacky component usage
  const { addToCollection } = useCollections();

  // Collaboration State - Using useState for re-rendering CodeEditor (Fix from mobile-fixes branch)
  const [collabStatus, setCollabStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  const { theme_preferences, updateCustomization } = useCustomization();

  // Window Management
  const { pos, size, handleDragStart, handleResizeStart, isDragging } = useDraggable({
    initialX: window.innerWidth / 2 - 400,
    initialY: window.innerHeight / 2 - 300,
    initialW: 800,
    initialH: 600
  });

  useEffect(() => {
    if (!fileId) return;

    const fetchFile = async () => {
      setLoading(true);
      setError(null);
      setBoosted(false);
      try {
        // Fetch Metadata
        const metaRes = await fetch(`/api/files/${fileId}/metadata`);
        if (!metaRes.ok) throw new Error('Failed to load metadata');
        const meta = await metaRes.json();
        setMimeType(meta.mime_type);
        setFilename(meta.filename);
        setVitality(meta.vitality);

        // Fetch Content if text
        if (meta.mime_type.startsWith('text/') || meta.mime_type === 'application/json' || meta.mime_type.includes('javascript') || meta.mime_type.includes('typescript')) {
            const contentRes = await fetch(`/api/files/${fileId}/content`);
            if (contentRes.ok) {
                const text = await contentRes.text();
                setContent(text);
                setEditContent(text);
            }
        }
      } catch (err) {
        setError('Could not load artifact.');
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [fileId]);

  const isImage = mimeType.startsWith('image/');
  const isAudio = mimeType.startsWith('audio/');
  const isVideo = mimeType.startsWith('video/');
  const isPDF = mimeType === 'application/pdf';
  const isText = mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType.includes('xml') || mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('code');

  const handleBoost = async () => {
    try {
        const res = await fetch(`/api/files/${fileId}/vitality`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 1 })
        });
        if (res.ok) {
            setBoosted(true);
            setVitality(prev => prev + 1);
            showToast('Signal boosted!', 'success');
        }
    } catch(e) {
        showToast('Error boosting signal', 'error');
    }
  };

  const handleRefresh = async () => {
    try {
        const res = await fetch(`/api/files/${fileId}/refresh`, { method: 'POST' });
        if (res.ok) showToast('Expiration reset.', 'success');
    } catch(e) {
        showToast('Error refreshing artifact.', 'error');
    }
  };

  const handleSave = async () => {
      try {
          const res = await fetch(`/api/files/${fileId}/content`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: editContent })
          });
          if (res.ok) {
              setContent(editContent);
              setIsEditing(false);
              showToast('Changes saved.', 'success');
          }
      } catch(e) {
          showToast('Error saving changes.', 'error');
      }
  };

  // --- Collab Setup ---
  useEffect(() => {
    let currentProvider: WebsocketProvider | null = null;
    let currentDoc: Y.Doc | null = null;

    if (isEditing && isText) {
       // Initialize Yjs
       setCollabStatus('connecting');
       const doc = new Y.Doc();
       const wsUrl = window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${window.location.host}`;

       // Note: In real production, authentication token should be passed here
       const prov = new WebsocketProvider(`${wsUrl}/api/collab`, String(fileId), doc);

       prov.on('status', (event: any) => {
         setCollabStatus(event.status); // 'connected' or 'disconnected'
       });

       const yText = doc.getText('codemirror'); // Standard Yjs text type name

       // Initial sync: set local content to Yjs doc if empty
       // Ensure we don't overwrite if data exists (naive check)
       if (editContent && yText.length === 0) {
           yText.insert(0, editContent);
       }

       // Observe changes from other peers
       yText.observe(event => {
           setEditContent(yText.toString());
       });

       setYdoc(doc);
       setProvider(prov);
       currentProvider = prov;
       currentDoc = doc;

    } else {
        setCollabStatus('disconnected');
        setYdoc(null);
        setProvider(null);
    }

    return () => {
        if (currentProvider) currentProvider.destroy();
        if (currentDoc) currentDoc.destroy();
    };
  }, [isEditing, isText, fileId]);

  // Note: handleTextChange is no longer needed as CodeEditor handles it via Yjs extension or props

  const isMobile = window.innerWidth < 768;

  const handleDownload = () => {
      const link = document.createElement('a');
      link.href = `/api/files/${fileId}/content`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const actionButtons = (
      <>
        <button onClick={handleRefresh} title="Keep Alive" aria-label="Keep Alive" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', width: isMobile ? '100%' : 'auto', padding: isMobile ? '8px' : '0' }}>
            <IconRefresh size={18} /> {isMobile && 'Keep Alive'}
        </button>
        <button onClick={handleBoost} disabled={boosted} aria-label="Boost Signal" style={{ background: 'transparent', border: 'none', color: boosted ? 'var(--accent-sym)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, width: isMobile ? '100%' : 'auto', padding: isMobile ? '8px' : '0' }}>
            <IconBolt size={18} /> {vitality} {isMobile && 'Boost'}
        </button>
        <button onClick={() => setShowCollectionSelect(true)} title="Add to Collection" aria-label="Add to Collection" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', width: isMobile ? '100%' : 'auto', padding: isMobile ? '8px' : '0' }}>
            <IconFolderPlus size={18} /> {isMobile && 'Add to Collection'}
        </button>
        <button onClick={handleDownload} title="Download" aria-label="Download" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', width: isMobile ? '100%' : 'auto', padding: isMobile ? '8px' : '0' }}>
            <IconDownload size={18} /> {isMobile && 'Download'}
        </button>
        {(isImage || isVideo) && (
            <button
            onClick={() => {
                updateCustomization({
                    theme_preferences: {
                    ...theme_preferences,
                    backgroundUrl: `/api/files/${fileId}/content`,
                    backgroundType: isVideo ? 'video' : 'image'
                    }
                });
                showToast('Background updated', 'success');
            }}
            title="Set as Background"
            aria-label="Set as Background"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', width: isMobile ? '100%' : 'auto', padding: isMobile ? '8px' : '0' }}
            >
            <IconWallpaper size={18} /> {isMobile && 'Set Background'}
            </button>
        )}
        {isText && !isEditing && (
            <button onClick={() => setIsEditing(true)} aria-label="Edit" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', width: isMobile ? '100%' : 'auto', padding: isMobile ? '8px' : '0' }}>
                <IconEdit size={18}/> {isMobile && 'Edit'}
            </button>
        )}
        {isEditing && (
            <>
                <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', color: collabStatus === 'connected' ? 'var(--accent-sym)' : 'var(--text-secondary)', flexShrink: 0, padding: isMobile ? '8px' : '0' }}>
                    <IconUsers size={14} /> {collabStatus}
                </div>
                <button onClick={handleSave} aria-label="Save" style={{ background: 'transparent', border: 'none', color: 'var(--accent-sym)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', width: isMobile ? '100%' : 'auto', padding: isMobile ? '8px' : '0' }}>
                    <IconDeviceFloppy size={18}/> {isMobile && 'Save'}
                </button>
            </>
        )}
      </>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, pointerEvents: 'none' }}>
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          left: isMobile ? 0 : `${pos.x}px`,
          top: isMobile ? 0 : `${pos.y}px`,
          width: isMobile ? '100%' : `${size.w}px`,
          height: isMobile ? '100%' : `${size.h}px`,
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
          userSelect: isDragging ? 'none' : 'auto',
          background: 'var(--drawer-bg)',
          borderRadius: isMobile ? 0 : '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          backdropFilter: 'blur(15px)',
          border: isMobile ? 'none' : '1px solid var(--border-color)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Drag Handle */}
        <div
          onMouseDown={handleDragStart}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.05)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <IconArrowsMove size={16} opacity={0.5} style={{ flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{filename}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             {/* Desktop Controls */}
             {!isMobile && (
                 <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                     {actionButtons}
                 </div>
             )}

             {/* Mobile Menu Trigger */}
             {isMobile && (
                 <div style={{ position: 'relative' }}>
                     <button
                        onClick={() => setShowMenu(!showMenu)}
                        aria-label="More options"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}
                     >
                         <IconDotsVertical size={20} />
                     </button>
                     {showMenu && (
                         <div style={{
                             position: 'absolute',
                             top: '100%',
                             right: 0,
                             marginTop: '5px',
                             background: 'var(--modal-bg)',
                             border: '1px solid var(--border-color)',
                             borderRadius: '4px',
                             padding: '10px',
                             display: 'flex',
                             flexDirection: 'column',
                             gap: '8px',
                             zIndex: 3005,
                             minWidth: '150px',
                             backdropFilter: 'blur(10px)',
                             boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                         }}>
                             {actionButtons}
                         </div>
                     )}
                 </div>
             )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, marginLeft: '5px' }}><IconX size={20} /></button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.2)' }}>
          {loading && <Skeleton height="100%" width="100%" />}
          {error && <div style={{ color: 'var(--accent-alert)', textAlign: 'center' }}>{error}</div>}
          {!loading && !error && (
             <>
               {isImage && <img src={`/api/files/${fileId}/content`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="" />}

               {isAudio && (
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                   <audio controls style={{ width: '100%' }}>
                     <source src={`/api/files/${fileId}/content`} type={mimeType} />
                     Your browser does not support the audio element.
                   </audio>
                 </div>
               )}

               {isVideo && (
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                   <video controls style={{ maxWidth: '100%', maxHeight: '100%' }}>
                     <source src={`/api/files/${fileId}/content`} type={mimeType} />
                     Your browser does not support the video element.
                   </video>
                 </div>
               )}

               {isPDF && (
                 <iframe
                    src={`/api/files/${fileId}/content`}
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    title="PDF Viewer"
                 />
               )}

               {isText && !isEditing && <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{content}</pre>}
               {isText && isEditing && (
                   <CodeEditor
                     content={editContent}
                     onChange={(val) => setEditContent(val)}
                     filename={filename}
                     ydoc={ydoc}
                     provider={provider}
                   />
               )}
             </>
          )}
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px',
            cursor: 'nwse-resize', background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%)'
          }}
        />
      </div>
      {showCollectionSelect && (
          <CollectionsManager mode="select" onClose={() => setShowCollectionSelect(false)} onSelect={(cid) => { addToCollection(cid, fileId); setShowCollectionSelect(false); }} />
      )}
    </div>
  );
};

export default FilePreviewModal;
