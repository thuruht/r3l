import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  IconX, IconDownload, IconBolt, IconEdit, IconDeviceFloppy,
  IconRefresh, IconFolderPlus, IconArrowsMove, IconUsers
} from '@tabler/icons-react';
import { useToast } from '../context/ToastContext';
import CollectionsManager from './CollectionsManager';
import { useCollections } from '../hooks/useCollections';
import Skeleton from './Skeleton';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface FilePreviewModalProps {
  fileId: number;
  filename: string;
  mimeType: string;
  onClose: () => void;
  onDownload: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ fileId, filename, mimeType, onClose, onDownload }) => {
  // Workspace State: Initialize near center but allow movement
  const [pos, setPos] = useState({ x: Math.max(0, window.innerWidth / 2 - 400), y: 100 });
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Logic State
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boosted, setBoosted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [vitality, setVitality] = useState<number>(0);
  const [showCollectionSelect, setShowCollectionSelect] = useState(false);
  const [collabStatus, setCollabStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const { showToast } = useToast();
  const { addToCollection } = useCollections();

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const isImage = mimeType.startsWith('image/');
  const isAudio = mimeType.startsWith('audio/');
  const isVideo = mimeType.startsWith('video/');
  const isPDF = mimeType === 'application/pdf';
  const isText = mimeType.startsWith('text/') || mimeType === 'application/json' || filename.endsWith('.md') || filename.endsWith('.ts') || filename.endsWith('.js') || filename.endsWith('.tsx') || filename.endsWith('.jsx') || filename.endsWith('.css') || filename.endsWith('.html');

  // --- Drag & Resize Handlers ---
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    }
    if (isResizing) {
      setSize({ w: Math.max(400, e.clientX - pos.x), h: Math.max(300, e.clientY - pos.y) });
    }
  }, [isDragging, isResizing, pos]);

  useEffect(() => {
    const stopAction = () => { setIsDragging(false); setIsResizing(false); };
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopAction);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopAction);
    };
  }, [isDragging, isResizing, handleMouseMove]);

  // --- Data Fetching ---
  useEffect(() => {
    fetch(`/api/files/${fileId}/metadata`)
        .then(res => res.json())
        .then((data: any) => {
            if (data.vitality !== undefined) setVitality(data.vitality);
        })
        .catch(console.error);

    if (isText) {
      setLoading(true);
      fetch(`/api/files/${fileId}/content`)
        .then(res => {
            if (!res.ok) throw new Error('Failed to load content');
            return res.text();
        })
        .then(text => {
            setContent(text);
            setEditContent(text);
        })
        .catch(() => setError('Preview unavailable'))
        .finally(() => setLoading(false));
    }
  }, [fileId, isText]);

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
    if (isEditing && isText) {
       // Initialize Yjs
       setCollabStatus('connecting');
       const ydoc = new Y.Doc();
       const wsUrl = window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${window.location.host}`;

       // Note: In real production, authentication token should be passed here
       const provider = new WebsocketProvider(`${wsUrl}/api/collab`, String(fileId), ydoc);

       provider.on('status', (event: any) => {
         setCollabStatus(event.status); // 'connected' or 'disconnected'
       });

       const yText = ydoc.getText('codemirror'); // Standard Yjs text type name

       // Initial sync: set local content to Yjs doc if empty
       // Ensure we don't overwrite if data exists (naive check)
       if (editContent && yText.length === 0) {
           yText.insert(0, editContent);
       }

       // Observe changes from other peers
       yText.observe(event => {
           setEditContent(yText.toString());
       });

       ydocRef.current = ydoc;
       providerRef.current = provider;

    } else {
        // Cleanup
        if (providerRef.current) {
            providerRef.current.destroy();
            providerRef.current = null;
        }
        if (ydocRef.current) {
            ydocRef.current.destroy();
            ydocRef.current = null;
        }
        setCollabStatus('disconnected');
    }

    return () => {
        if (providerRef.current) providerRef.current.destroy();
        if (ydocRef.current) ydocRef.current.destroy();
    };
  }, [isEditing, isText, fileId]);

  // Handle local text changes to propagate to Yjs
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = e.target.value;
      setEditContent(newVal);

      if (ydocRef.current) {
          const yText = ydocRef.current.getText('codemirror');
          // Naive full replacement for "Bones" implementation
          // Proper Yjs implementation uses diffs, but this proves the connection
          if (yText.toString() !== newVal) {
             ydocRef.current.transact(() => {
                 yText.delete(0, yText.length);
                 yText.insert(0, newVal);
             });
          }
      }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, pointerEvents: 'none' }}>
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: `${size.w}px`,
          height: `${size.h}px`,
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
          userSelect: isDragging ? 'none' : 'auto',
          background: 'var(--drawer-bg)',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          backdropFilter: 'blur(15px)',
          border: '1px solid var(--border-color)'
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
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconArrowsMove size={16} opacity={0.5} />
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{filename}</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleRefresh} title="Keep Alive" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}><IconRefresh size={18} /></button>
            <button onClick={handleBoost} disabled={boosted} style={{ background: 'transparent', border: 'none', color: boosted ? 'var(--accent-sym)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IconBolt size={18} /> {vitality}
            </button>
            <button onClick={() => setShowCollectionSelect(true)} title="Add to Collection" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}><IconFolderPlus size={18} /></button>
            {isText && !isEditing && <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}><IconEdit size={18}/></button>}
            {isEditing && (
                <>
                    <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', color: collabStatus === 'connected' ? 'var(--accent-sym)' : 'var(--text-secondary)' }}>
                        <IconUsers size={14} /> {collabStatus}
                    </div>
                    <button onClick={handleSave} style={{ background: 'transparent', border: 'none', color: 'var(--accent-sym)' }}><IconDeviceFloppy size={18}/></button>
                </>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}><IconX size={20} /></button>
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
                   <textarea
                    value={editContent}
                    onChange={handleTextChange}
                    style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', color: 'inherit', resize: 'none', outline: 'none', fontFamily: 'monospace' }}
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
