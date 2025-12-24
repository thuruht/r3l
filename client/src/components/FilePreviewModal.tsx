import React, { useEffect, useState, useRef } from 'react';
import { IconX, IconDownload, IconBolt, IconEdit, IconDeviceFloppy, IconRefresh, IconFolderPlus } from '@tabler/icons-react';
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

  const modalRef = useRef<HTMLDivElement>(null);
  const isImage = mimeType.startsWith('image/');
  const isText = mimeType.startsWith('text/') || mimeType === 'application/json' || filename.endsWith('.md') || filename.endsWith('.ts') || filename.endsWith('.js');

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
        } else {
            showToast('Failed to boost', 'error');
        }
    } catch(e) {
        showToast('Error boosting signal', 'error');
    }
  };

  const handleAddToCollection = async (collectionId: number) => {
      const success = await addToCollection(collectionId, fileId);
      if (success) {
          showToast('Added to collection', 'success');
          setShowCollectionSelect(false);
      } else {
          showToast('Failed to add to collection (might already be there)', 'error');
      }
  };

  // Focus trap and Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    // Initial focus
    if (modalRef.current) {
        modalRef.current.focus();
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    // Fetch Metadata (Vitality)
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
        .catch(e => setError('Preview unavailable'))
        .finally(() => setLoading(false));
    }
  }, [fileId, isText]);

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
          } else {
              showToast('Failed to save changes.', 'error');
          }
      } catch(e) {
          showToast('Error saving changes.', 'error');
      }
  };

  const handleRefresh = async () => {
    try {
        const res = await fetch(`/api/files/${fileId}/refresh`, { method: 'POST' });
        if (res.ok) {
            showToast('Expiration reset to 7 days.', 'success');
        } else {
            showToast('Failed to refresh.', 'error');
        }
    } catch(e) {
        showToast('Error refreshing artifact.', 'error');
    }
  };

  return (
    <div
      className="preview-overlay fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-preview-title"
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: '#000000ee', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center',
        backdropFilter: 'blur(10px)'
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        style={{
          width: '80%', height: '80%', maxWidth: '1000px', maxHeight: '800px',
          background: 'var(--bg-mist)', border: '1px solid var(--border-color)', borderRadius: '8px',
          padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative', outline: 'none'
        }}
        onClick={e => e.stopPropagation()}
      >
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
          <h3 id="file-preview-title" style={{ margin: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {filename}
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleRefresh} title="Keep Alive (Reset Expiration)" aria-label="Keep Alive (Reset Expiration)">
               <IconRefresh size={18} />
            </button>
            <button onClick={handleBoost} title="Boost Signal" aria-label={`Boost Signal (Current vitality: ${vitality})`} disabled={boosted} style={{ color: boosted ? 'var(--accent-sym)' : 'inherit', borderColor: boosted ? 'var(--accent-sym)' : 'var(--border-color)', display: 'flex', alignItems: 'center', gap: '5px' }}>
               <IconBolt size={18} />
               <span>{vitality}</span>
            </button>
            
            <button onClick={() => setShowCollectionSelect(true)} title="Add to Collection" aria-label="Add to Collection">
                <IconFolderPlus size={18} />
            </button>

            {isText && !isEditing && (
                <button onClick={() => setIsEditing(true)} title="Edit" aria-label="Edit file">
                    <IconEdit size={18} />
                </button>
            )}
            {isText && isEditing && (
                <>
                    <button onClick={handleSave} title="Save Changes" aria-label="Save changes" style={{ color: 'var(--accent-sym)', borderColor: 'var(--accent-sym)' }}>
                        <IconDeviceFloppy size={18} />
                    </button>
                    <button onClick={() => { setIsEditing(false); setEditContent(content || ''); }} title="Cancel Edit" aria-label="Cancel edit">
                        <IconX size={18} />
                    </button>
                </>
            )}

            <button onClick={onDownload} title="Download Original" aria-label="Download Original">
               <IconDownload size={18} />
            </button>
            <button onClick={onClose} title="Close" aria-label="Close preview">
               <IconX size={18} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#00000066', borderRadius: '4px', position: 'relative' }}>
          {loading && (
            <div style={{ width: '80%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Skeleton height="20px" width="100%" />
                <Skeleton height="20px" width="90%" />
                <Skeleton height="20px" width="95%" />
                <Skeleton height="20px" width="80%" />
            </div>
          )}
          {error && <div style={{ color: 'var(--accent-alert)' }}>{error}</div>}
          
          {!loading && !error && (
             <>
               {isImage && (
                 <img 
                   src={`/api/files/${fileId}/content`} 
                   alt={`Preview of ${filename}`}
                   style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                 />
               )}
               {isText && content && !isEditing && (
                 <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    width: '100%', 
                    height: '100%', 
                    margin: 0, 
                    padding: '20px', 
                    textAlign: 'left', 
                    fontFamily: 'monospace', 
                    fontSize: '0.9em', 
                    color: '#f8f8f2',
                    overflow: 'auto'
                 }}>
                    {content}
                 </pre>
               )}
               {isText && isEditing && (
                   <textarea
                       value={editContent}
                       onChange={(e) => setEditContent(e.target.value)}
                       aria-label="Edit file content"
                       style={{
                           width: '100%',
                           height: '100%',
                           background: 'transparent',
                           color: '#f8f8f2',
                           border: 'none',
                           padding: '20px',
                           fontFamily: 'monospace',
                           fontSize: '0.9em',
                           resize: 'none'
                       }}
                   />
               )}
               {!isImage && !isText && (
                   <div style={{ textAlign: 'center' }}>
                       <p>Preview not available for this file type.</p>
                       <button onClick={onDownload} style={{ marginTop: '10px' }}>
                           <IconDownload size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }}/>
                           Download to View
                       </button>
                   </div>
               )}
             </>
          )}
        </div>

        {showCollectionSelect && (
            <CollectionsManager 
                mode="select" 
                onClose={() => setShowCollectionSelect(false)} 
                onSelect={handleAddToCollection} 
            />
        )}

      </div>
    </div>
  );
};

export default FilePreviewModal;
