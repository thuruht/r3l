import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { IconX, IconArrowsMove, IconBolt, IconRefresh, IconDeviceFloppy, IconEdit, IconFolderPlus, IconWallpaper, IconUsers, IconDotsVertical, IconEye, IconCode, IconCopy, IconDownload } from '@tabler/icons-react';
import { useWavesurfer } from '@wavesurfer/react';
import Timeline from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Plyr } from 'plyr-react';
import 'plyr-react/plyr.css';
import { useDraggable } from '../hooks/useDraggable';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';
import { ICON_SIZES } from '@/constants/iconSizes';
import CollectionsManager from './CollectionsManager';
import CodeEditor from './CodeEditor';
import { useCustomization } from '../context/CustomizationContext';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useCollections } from '../hooks/useCollections';
import UploadModal from './UploadModal';
import { SpreadsheetViewer } from './SpreadsheetViewer';
import { DocxViewer } from './DocxViewer';
import { ModelViewer } from './ModelViewer';
import { RichTextEditor } from './RichTextEditor';
import { MarkdownViewer } from './MarkdownViewer';
import { ZipViewer } from './ZipViewer';
import { EpubViewer } from './EpubViewer';

interface FilePreviewModalProps {
  fileId: string | null;
  onClose: () => void;
  currentUser?: any;
  filename: string;
  mimeType: string;
  onDownload: () => void;
}

const AudioWaveform: React.FC<{ src: string; mimeType: string }> = ({ src, mimeType }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    height: 100,
    waveColor: '#4a6652', // Muted olive from theme-verdant
    progressColor: '#26de81', // Standard Neon Green
    url: src,
    barWidth: 2,
    barGap: 3,
    barRadius: 4,
    plugins: useMemo(() => [Timeline.create({
        style: {
            color: '#7f8a96',
            fontSize: '10px'
        }
    })], []),
  });

  const onPlayPause = useCallback(() => {
    wavesurfer && wavesurfer.playPause();
  }, [wavesurfer]);

  const formatTime = (seconds: number) => 
    [seconds / 60, seconds % 60].map((v) => `0${Math.floor(v)}`.slice(-2)).join(':');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0' }}>
      <div ref={containerRef} style={{ minHeight: '120px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
         <button onClick={onPlayPause} style={{ 
            minWidth: '100px', 
            background: 'var(--bg-mist)', 
            border: '1px solid var(--accent-sym)', 
            color: 'var(--text-primary)', 
            borderRadius: '4px', 
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
         }}>
           {isPlaying ? 'Pause' : 'Play'}
         </button>
         <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
           {formatTime(currentTime)}
         </span>
      </div>
    </div>
  );
};

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ fileId, onClose, currentUser, filename, mimeType, onDownload }) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vitality, setVitality] = useState(0);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [boosted, setBoosted] = useState(false);
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showCollectionSelect, setShowCollectionSelect] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'sym' | 'me'>('me');
  const [showPreview, setShowPreview] = useState(false);
  const [showRemixUpload, setShowRemixUpload] = useState(false);
  const [remixParent, setRemixParent] = useState<{ id: number; filename: string; username: string } | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Use the hook from main branch instead of the hacky component usage
  const { addToCollection } = useCollections();

  // Collaboration State - Using useState for re-rendering CodeEditor (Fix from mobile-fixes branch)
  const [collabStatus, setCollabStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);

  const { theme_preferences, updateCustomization } = useCustomization();

  // Window Management
  const { pos, size, handleDragStart, handleResizeStart, isDragging } = useDraggable({
    initialX: window.innerWidth / 2 - 400,
    initialY: Math.max(65, window.innerHeight / 2 - 300),
    initialW: 800,
    initialH: 600
  });

  const isImage = mimeType.startsWith('image/');
  const isAudio = mimeType.startsWith('audio/');
  const isVideo = mimeType.startsWith('video/');
  const isPDF = mimeType === 'application/pdf' || !!filename.match(/\.pdf$/i);
  
  const isSpreadsheet = !!(filename.match(/\.(xlsx|xls|csv)$/i) || mimeType.match(/excel|spreadsheet|csv/));
  const isDocx = !!(filename.match(/\.(docx)$/i) || mimeType.match(/wordprocessingml/));
  const is3D = !!(filename.match(/\.(gltf|glb)$/i) || mimeType.match(/gltf/));
  const isRichText = !!filename.match(/\.(notes|tiptap)$/i);
  const isMarkdown = !!filename.match(/\.(md|markdown)$/i);
  const isEpub = !!filename.match(/\.(epub)$/i) || mimeType === 'application/epub+zip';
  
  const isZip = !isEpub && !isSpreadsheet && !isDocx && !!mimeType.match(/zip|compressed|archive/);
  const isText = !isRichText && !isMarkdown && !isSpreadsheet && !isDocx && (mimeType.startsWith('text/') || 
                 !!mimeType.match(/json|xml|javascript|typescript|python|x-sh/) ||
                 !!filename.match(/\.(txt|md|json|xml|html|css|js|jsx|ts|tsx|py|java|c|cpp|h|rs|go|rb|php|sh|bash|sql|yaml|yml|toml|ini|conf|log)$/i));
  const isHTML = mimeType === 'text/html' || filename.endsWith('.html');
  const isWebCode = isHTML || !!filename.match(/\.(html|css|js|jsx|ts|tsx)$/);

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
        setVitality(meta.vitality);
        setVisibility(meta.visibility);
        setOwnerId(meta.user_id);
        if (meta.is_boosted) setBoosted(true);

        // Fetch remix parent if applicable
        if (meta.remix_of) {
          fetch(`/api/files/${meta.remix_of}/metadata`)
            .then(r => r.ok ? r.json() : null)
            .then(async (parentMeta) => {
              if (!parentMeta) return;
              const ownerRes = await fetch(`/api/users/${parentMeta.user_id}`);
              const ownerData = ownerRes.ok ? await ownerRes.json() : null;
              setRemixParent({ id: meta.remix_of, filename: parentMeta.filename, username: ownerData?.user?.username || 'unknown' });
            })
            .catch(() => {});
        } else {
          setRemixParent(null);
        }

        // Fetch Content if text-based
        if (isText || isRichText || isMarkdown) {
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
  }, [fileId, filename, isText, isRichText, isMarkdown]);

  // Handle PDF separately to ensure auth via fetch
  useEffect(() => {
    if (isPDF && fileId) {
        fetch(`/api/files/${fileId}/content`)
            .then(res => {
                if (!res.ok) throw new Error('Auth failed or file not found');
                return res.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            })
            .catch(err => {
                console.error(err);
                setError('Could not load PDF content. Ensure you are logged in.');
            });

        return () => {
            setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
        };
    }
  }, [fileId, isPDF]);

  const handleBoost = async () => {
    try {
        const res = await fetch(`/api/files/${fileId}/vitality`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 1 })
        });
        if (res.ok) {
            const data = await res.json();
            setBoosted(true);
            setVitality(data.vitality || (vitality + 1));
            showToast('Signal boosted!', 'success');
        } else if (res.status === 409) {
            setBoosted(true);
            showToast('Already boosted this signal.', 'info');
        } else {
            showToast('Failed to boost signal.', 'error');
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

  const handleRemixSave = async () => {
      try {
          const blob = new Blob([editContent], { type: mimeType });
          const formData = new FormData();
          formData.append('file', blob, `remix-${filename}`);
          formData.append('visibility', 'me');
          if (fileId) formData.append('parent_id', fileId);

          const res = await fetch('/api/files', {
              method: 'POST',
              body: formData
          });

          if (res.ok) {
              showToast('Remix created!', 'success');
              setIsEditing(false);
          } else {
               showToast('Failed to create remix.', 'error');
          }
      } catch(e) {
          showToast('Error creating remix.', 'error');
      }
  };

  const handleCopy = async () => {
    try {
      if (content) {
        await navigator.clipboard.writeText(content);
        showToast('Content copied to clipboard', 'success');
      }
    } catch (err) {
      showToast('Failed to copy content', 'error');
    }
  };
  
  const handleVisibilityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newVis = e.target.value as 'public' | 'sym' | 'me';
      try {
          const res = await fetch(`/api/files/${fileId}/metadata`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ visibility: newVis })
          });
          if (res.ok) {
              setVisibility(newVis);
              showToast('Audience updated.', 'success');
          }
      } catch(err) {
          showToast('Failed to update audience.', 'error');
      }
  };

  const handleArchiveVote = async () => {
      if (!fileId) return;
      const key = `voted_${fileId}`;
      if (localStorage.getItem(key)) {
          showToast('You already voted recently.', 'error');
          return;
      }
      try {
          const res = await fetch(`/api/files/${fileId}/archive-vote`, { method: 'POST' });
          if (res.ok) {
              localStorage.setItem(key, 'true');
              showToast('Vote recorded.', 'success');
          } else {
               const err = await res.json();
               showToast(err.error || 'Vote failed', 'error');
          }
      } catch (e) {
          showToast('Vote failed', 'error');
      }
  };

  useEffect(() => {
    let currentProvider: WebsocketProvider | null = null;
    let currentDoc: Y.Doc | null = null;

    if (isEditing && (isText || isRichText)) {
       setCollabStatus('connecting');
       const doc = new Y.Doc();
       const wsUrl = window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${window.location.host}`;
       // Use fileId as roomname so y-websocket connects to /api/collab/fileId without a trailing slash
       const prov = new WebsocketProvider(`${wsUrl}/api/collab`, fileId.toString(), doc);

       const userColor = theme_preferences.node_primary_color || '#' + Math.floor(Math.random()*16777215).toString(16);
       prov.awareness.setLocalStateField('user', {
           name: currentUser?.username || 'Anonymous',
           color: userColor,
           id: currentUser?.id
       });

       prov.awareness.on('change', () => {
           const states = Array.from(prov.awareness.getStates().values());
           const users = states.map((s: any) => s.user).filter((u: any) => u);
           setConnectedUsers(users);
       });

       prov.on('status', (event: any) => {
         setCollabStatus(event.status);
       });

       const yText = doc.getText('codemirror');
       
       // Ensure content is seeded if the document is empty after sync
       prov.on('sync', (isSynced: boolean) => {
           if (isSynced && yText.toString() === '' && content && typeof content === 'string' && content.trim() !== '') {
               yText.insert(0, content);
           }
       });

       // Seed immediately for initial render if content exists
       if (content && typeof content === 'string' && content.trim() !== '' && yText.length === 0) {
           yText.insert(0, content);
       }

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
  }, [isEditing, isText, isRichText, fileId]);

  const isMobile = window.innerWidth < 768;

  const actionButtons = (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0 var(--spacing-xs)' }}>
            <IconEye size={ICON_SIZES.lg} color="var(--text-secondary)" />
            <select 
                value={visibility} 
                onChange={handleVisibilityChange}
                aria-label="Visibility"
                style={{
                    background: 'transparent', border: 'none', color: 'var(--text-primary)',
                    fontSize: '0.8rem', padding: 'var(--spacing-xs)', outline: 'none', cursor: 'pointer'
                }}
            >
                <option value="public">Public (Drift)</option>
                <option value="sym">Sym Only</option>
                <option value="me">3rd Space (Me Only)</option>
            </select>
        </div>
        <button onClick={handleRefresh} title="Keep Alive" aria-label="Keep Alive" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
            <IconRefresh size={ICON_SIZES.lg} className="chrome-icon" /> {isMobile && 'Keep Alive'}
        </button>
        <button onClick={handleBoost} disabled={boosted} aria-label="Boost Signal" style={{ background: 'transparent', border: 'none', color: boosted ? 'var(--accent-sym)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexShrink: 0, width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
            <IconBolt size={ICON_SIZES.lg} className="chrome-icon" /> {vitality} {isMobile && 'Boost'}
        </button>
        <button onClick={() => setShowCollectionSelect(true)} title="Add to Collection" aria-label="Add to Collection" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
            <IconFolderPlus size={ICON_SIZES.lg} className="chrome-icon" /> {isMobile && 'Add to Collection'}
        </button>
        <button onClick={onDownload} title="Download" aria-label="Download" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
            <IconDownload size={ICON_SIZES.lg} className="chrome-icon" /> {isMobile && 'Download'}
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
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}
            >
            <IconWallpaper size={ICON_SIZES.lg} /> {isMobile && 'Set Background'}
            </button>
        )}
        {(isText || isRichText) && !isEditing && (
            <>
                <button onClick={handleCopy} aria-label="Copy content" disabled={isText && content === null} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0', opacity: (isText && content === null) ? 0.5 : 1 }}>
                    <IconCopy size={ICON_SIZES.lg} /> {isMobile && 'Copy'}
                </button>
                <button onClick={() => setIsEditing(true)} aria-label="Edit" disabled={loading || (isText && content === null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0', opacity: (loading || (isText && content === null)) ? 0.5 : 1 }}>
                    <IconEdit size={ICON_SIZES.lg}/> {isMobile && 'Edit'}
                </button>
            </>
        )}
        {isWebCode && !isEditing && (
            <button onClick={() => setShowPreview(!showPreview)} aria-label="Preview" style={{ background: 'transparent', border: 'none', color: showPreview ? 'var(--accent-sym)' : 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
                <IconCode size={ICON_SIZES.lg}/> {isMobile && 'Preview'}
            </button>
        )}
        {isEditing && (
            <>
                <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: collabStatus === 'connected' ? 'var(--accent-sym)' : 'var(--text-secondary)', flexShrink: 0, padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
                    <IconUsers size={ICON_SIZES.sm} /> {collabStatus}
                </div>
                {currentUser?.id === ownerId ? (
                    <button onClick={handleSave} aria-label="Save" style={{ background: 'transparent', border: 'none', color: 'var(--accent-sym)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
                        <IconDeviceFloppy size={ICON_SIZES.lg}/> {isMobile && 'Save'}
                    </button>
                ) : (
                    <button onClick={handleRemixSave} aria-label="Save Remix" style={{ background: 'transparent', border: 'none', color: 'var(--accent-sym)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
                        <IconDeviceFloppy size={ICON_SIZES.lg}/> {isMobile && 'Save Copy'}
                    </button>
                )}
            </>
        )}
        {!isEditing && (
            <>
                <button onClick={() => (isText || isRichText) ? setIsEditing(true) : setShowRemixUpload(true)} title="Remix" aria-label="Remix" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
                    <IconFolderPlus size={ICON_SIZES.lg} style={{ transform: 'rotate(180deg)' }}/> {isMobile && 'Remix'}
                </button>
                <button onClick={handleArchiveVote} title="Vote to Archive" aria-label="Vote to Archive" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
                    <IconUsers size={ICON_SIZES.lg} /> {isMobile && 'Vote'}
                </button>
            </>
        )}
      </>
  );

  return (
    <AnimatePresence>
      {fileId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal)', pointerEvents: 'none' }}>
          <motion.div
            className="glass-panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'absolute',
              left: isMobile ? 0 : `${pos.x}px`,
              top: isMobile ? 'var(--header-height)' : `${pos.y}px`,
              width: isMobile ? '100%' : `${size.w}px`,
              height: isMobile ? 'calc(100% - var(--header-height))' : `${size.h}px`,
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
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <IconArrowsMove size={ICON_SIZES.md} opacity={0.5} style={{ flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{filename}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <div style={{ display: 'flex', marginRight: '10px' }}>
                {connectedUsers.map((u: any, i) => (
                    <div key={i} title={u.name} style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        backgroundColor: u.color, marginLeft: i > 0 ? '-8px' : 0,
                        border: '1px solid var(--drawer-bg)', zIndex: connectedUsers.length - i
                    }} />
                ))}
             </div>

             {!isMobile && (
                 <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                     {actionButtons}
                 </div>
             )}

             {isMobile && (
                 <div style={{ position: 'relative' }}>
                     <button
                        onClick={() => setShowMenu(!showMenu)}
                        aria-label="More options"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}
                     >
                         <IconDotsVertical size={ICON_SIZES.xl} />
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
            <button onClick={onClose} aria-label="Close preview" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, marginLeft: '5px' }}><IconX size={ICON_SIZES.xl} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: isPDF ? 'hidden' : 'auto', padding: isPDF ? 0 : '20px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
          {loading && <Skeleton height="100%" width="100%" />}
          {error && <div style={{ color: 'var(--accent-alert)', textAlign: 'center' }}>{error}</div>}
          {!loading && !error && (
             <>
          {remixParent && (
            <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', borderLeft: '2px solid var(--accent-sym)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Remixed from <span style={{ color: 'var(--accent-sym)' }}>{remixParent.filename}</span> by {remixParent.username}
            </div>
          )}
          {isImage && <img src={`/api/files/${fileId}/content`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt={filename} />}

               {isAudio && <AudioWaveform src={`/api/files/${fileId}/content`} mimeType={mimeType} />}

               {isVideo && (
                 <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: '900px' }}>
                        <Plyr
                            source={{
                                type: 'video',
                                sources: [{ src: `/api/files/${fileId}/content`, type: mimeType }]
                            }}
                            options={{
                                controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
                            }}
                        />
                    </div>
                 </div>
               )}

               {isPDF && pdfUrl && (
                 <iframe
                    src={pdfUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 'none', background: 'white', flex: 1 }}
                    title="PDF Viewer"
                 />
               )}
               {isPDF && !pdfUrl && !error && <Skeleton height="100%" width="100%" />}

               {isMarkdown && content && !isEditing && <MarkdownViewer content={content} />}

               {isEpub && <EpubViewer url={`/api/files/${fileId}/content`} />}

               {isSpreadsheet && <SpreadsheetViewer url={`/api/files/${fileId}/content`} />}
               
               {isDocx && <DocxViewer url={`/api/files/${fileId}/content`} />}
               
               {is3D && <ModelViewer url={`/api/files/${fileId}/content`} />}

               {isZip && <ZipViewer url={`/api/files/${fileId}/content`} />}

               {!isImage && !isAudio && !isVideo && !isPDF && !isText && !isZip && !isSpreadsheet && !isDocx && !is3D && !isRichText && !isMarkdown && !isEpub && (
                 <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                   <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📄</div>
                   <div>Binary file - use download button to save</div>
                   <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>{mimeType}</div>
                 </div>
               )}

               {isRichText && (
                   isEditing ? (
                       (ydoc && provider) ? (
                           <RichTextEditor 
                               ydoc={ydoc} 
                               provider={provider} 
                               currentUser={currentUser} 
                               themePreferences={theme_preferences} 
                           />
                       ) : <Skeleton height="100%" width="100%" />
                   ) : (
                       <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                           <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📝</div>
                           <div>Rich Text Note - Click Edit to view/collaborate</div>
                       </div>
                   )
               )}

               {isText && !isEditing && !showPreview && <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{content}</pre>}
               {isText && !isEditing && showPreview && isWebCode && (
                   <iframe
                       srcDoc={content || ''}
                       style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
                       sandbox="allow-scripts"
                       title="Code Preview"
                   />
               )}
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

        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px',
            cursor: 'nwse-resize', background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%)'
          }}
        />
          </motion.div>
      {showCollectionSelect && (
          <CollectionsManager mode="select" onClose={() => setShowCollectionSelect(false)} onSelect={async (cid) => { 
              const res = await addToCollection(cid, Number(fileId)); 
              if (res.success) {
                  showToast('Added to collection.', 'success');
              } else if (res.status === 409) {
                  showToast('Already in this collection.', 'info');
              } else {
                  showToast(res.error || 'Failed to add to collection.', 'error');
              }
              setShowCollectionSelect(false); 
          }} />
      )}
      {showRemixUpload && (
          <div style={{ pointerEvents: 'auto' }} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <UploadModal
                onClose={() => setShowRemixUpload(false)}
                onUploadComplete={() => { showToast('Remix uploaded', 'success'); setShowRemixUpload(false); }}
                parentId={fileId}
            />
          </div>
      )}
        </div>
      )}
    </AnimatePresence>
  );
};

export default FilePreviewModal;
