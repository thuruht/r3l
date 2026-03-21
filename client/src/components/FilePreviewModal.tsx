import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IconX, IconArrowsMove, IconBolt, IconRefresh, IconDeviceFloppy, IconEdit, IconFolderPlus, IconWallpaper, IconUsers, IconDotsVertical, IconDownload, IconEye, IconCode, IconCopy } from '@tabler/icons-react';
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

interface FilePreviewModalProps {
  fileId: string | null;
  onClose: () => void;
  currentUser?: any;
  filename: string;
  mimeType: string;
  onDownload: () => void;
}

const AudioWaveform: React.FC<{ src: string; mimeType: string }> = ({ src, mimeType }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const alpha = 0.4 + (dataArray[i] / 255) * 0.6;
        ctx.fillStyle = `rgba(100, 220, 180, ${alpha})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    render();
  }, []);

  const initAudio = useCallback(() => {
    if (ctxRef.current || !audioRef.current) return;
    const audioCtx = new AudioContext();
    ctxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    const source = audioCtx.createMediaElementSource(audioRef.current);
    sourceRef.current = source;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    draw();
  }, [draw]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ctxRef.current?.close();
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px 0' }}>
      <canvas ref={canvasRef} width={600} height={120}
        style={{ width: '100%', height: '120px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)' }}
      />
      <audio ref={audioRef} controls style={{ width: '100%' }}
        onPlay={initAudio}
        onPause={() => cancelAnimationFrame(animFrameRef.current)}
      >
        <source src={src} type={mimeType} />
      </audio>
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
    initialY: Math.max(0, window.innerHeight / 2 - 300),
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
        setVitality(meta.vitality);
        setVisibility(meta.visibility);
        setOwnerId(meta.user_id);

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
        const textTypes = [
          'text/', 'application/json', 'application/xml', 'application/javascript',
          'application/typescript', 'application/x-sh', 'application/x-python'
        ];
        const isTextFile = textTypes.some(t => meta.mime_type.includes(t)) || 
                          filename.match(/\.(txt|md|json|xml|html|css|js|jsx|ts|tsx|py|java|c|cpp|h|rs|go|rb|php|sh|bash|sql|yaml|yml|toml|ini|conf|log)$/i);
        
        if (isTextFile) {
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
  }, [fileId, filename]);

  const isImage = mimeType.startsWith('image/');
  const isAudio = mimeType.startsWith('audio/');
  const isVideo = mimeType.startsWith('video/');
  const isPDF = mimeType === 'application/pdf';
  const isZip = mimeType.match(/zip|compressed|archive/);
  const isText = mimeType.startsWith('text/') || 
                 mimeType.match(/json|xml|javascript|typescript|python|x-sh/) ||
                 filename.match(/\.(txt|md|json|xml|html|css|js|jsx|ts|tsx|py|java|c|cpp|h|rs|go|rb|php|sh|bash|sql|yaml|yml|toml|ini|conf|log)$/i);
  const isHTML = mimeType === 'text/html' || filename.endsWith('.html');
  const isWebCode = isHTML || filename.match(/\.(html|css|js|jsx|ts|tsx)$/);

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

  // Remix Logic (Text/Code) - Save as NEW file
  const handleRemixSave = async () => {
      try {
          // Create new file with content
          const blob = new Blob([editContent], { type: mimeType });
          const formData = new FormData();
          formData.append('file', blob, `remix-${filename}`);
          formData.append('visibility', 'private'); // Default to private
          if (fileId) formData.append('parent_id', fileId);

          const res = await fetch('/api/files', {
              method: 'POST',
              body: formData
          });

          if (res.ok) {
              showToast('Remix created!', 'success');
              setIsEditing(false); // Exit edit mode
              // Ideally navigate to new file or just close
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
       const prov = new WebsocketProvider(`${wsUrl}/api/collab/${fileId}`, '', doc);

       // Set Awareness
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
         setCollabStatus(event.status); // 'connected' or 'disconnected'
       });

       const yText = doc.getText('codemirror'); // Standard Yjs text type name

       // Initial sync: set local content to Yjs doc if empty
       // Ensure we don't overwrite if data exists (naive check)
       if (editContent && yText.length === 0) {
           yText.insert(0, editContent);
       }
       
       // Force sync just in case
       if (yText.toString() === '' && editContent !== '') {
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
  }, [isEditing, isText, fileId]); // Removed editContent from dep array to avoid loops, handled inside

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
            <IconRefresh size={ICON_SIZES.lg} /> {isMobile && 'Keep Alive'}
        </button>
        <button onClick={handleBoost} disabled={boosted} aria-label="Boost Signal" style={{ background: 'transparent', border: 'none', color: boosted ? 'var(--accent-sym)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexShrink: 0, width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
            <IconBolt size={ICON_SIZES.lg} /> {vitality} {isMobile && 'Boost'}
        </button>
        <button onClick={() => setShowCollectionSelect(true)} title="Add to Collection" aria-label="Add to Collection" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
            <IconFolderPlus size={ICON_SIZES.lg} /> {isMobile && 'Add to Collection'}
        </button>
        <button onClick={onDownload} title="Download" aria-label="Download" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
            <IconDownload size={ICON_SIZES.lg} /> {isMobile && 'Download'}
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
        {isText && !isEditing && (
            <>
                <button onClick={handleCopy} aria-label="Copy content" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
                    <IconCopy size={ICON_SIZES.lg} /> {isMobile && 'Copy'}
                </button>
                <button onClick={() => setIsEditing(true)} aria-label="Edit" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
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
                {/* Check if user is owner to determine if it's Save or Remix Save */}
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
                <button onClick={() => isText ? setIsEditing(true) : setShowRemixUpload(true)} title="Remix" aria-label="Remix" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: isMobile ? '100%' : 'auto', padding: isMobile ? 'var(--spacing-sm)' : '0' }}>
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
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <IconArrowsMove size={ICON_SIZES.md} opacity={0.5} style={{ flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{filename}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             {/* Presence Avatars */}
             <div style={{ display: 'flex', marginRight: '10px' }}>
                {connectedUsers.map((u: any, i) => (
                    <div key={i} title={u.name} style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        backgroundColor: u.color, marginLeft: i > 0 ? '-8px' : 0,
                        border: '1px solid var(--drawer-bg)', zIndex: connectedUsers.length - i
                    }} />
                ))}
             </div>

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

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'rgba(0,0,0,0.2)' }}>
          {loading && <Skeleton height="100%" width="100%" />}
          {error && <div style={{ color: 'var(--accent-alert)', textAlign: 'center' }}>{error}</div>}
          {!loading && !error && (
             <>
        {/* Remix Lineage */}
          {remixParent && (
            <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', borderLeft: '2px solid var(--accent-sym)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Remixed from <span style={{ color: 'var(--accent-sym)' }}>{remixParent.filename}</span> by {remixParent.username}
            </div>
          )}
          {isImage && <img src={`/api/files/${fileId}/content`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt={filename} />}

               {isAudio && <AudioWaveform src={`/api/files/${fileId}/content`} mimeType={mimeType} />}

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

               {isZip && (
                 <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                   <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📦</div>
                   <div>Archive file - use download button to save</div>
                 </div>
               )}

               {!isImage && !isAudio && !isVideo && !isPDF && !isText && !isZip && (
                 <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                   <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📄</div>
                   <div>Binary file - use download button to save</div>
                   <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>{mimeType}</div>
                 </div>
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
      {showRemixUpload && (
          <UploadModal
            onClose={() => setShowRemixUpload(false)}
            onUploadComplete={() => { showToast('Remix uploaded', 'success'); setShowRemixUpload(false); }}
            parentId={fileId}
          />
      )}
    </div>
  );
};

export default FilePreviewModal;