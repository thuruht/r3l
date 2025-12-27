import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  IconX, IconDownload, IconBolt, IconEdit, IconDeviceFloppy,
  IconRefresh, IconFolderPlus, IconArrowsMove
} from '@tabler/icons-react';
import { useToast } from '../context/ToastContext';
import CollectionsManager from './CollectionsManager';
import { useCollections } from '../hooks/useCollections';
import Skeleton from './Skeleton';

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

  const { showToast } = useToast();
  const { addToCollection } = useCollections();

  const isImage = mimeType.startsWith('image/');
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
            {isEditing && <button onClick={handleSave} style={{ background: 'transparent', border: 'none', color: 'var(--accent-sym)' }}><IconDeviceFloppy size={18}/></button>}
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
               {isText && !isEditing && <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{content}</pre>}
               {isText && isEditing && (
                   <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
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
