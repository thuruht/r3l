import React, { useEffect, useState } from 'react';
import { IconX, IconDownload, IconBolt } from '@tabler/icons-react';
import { useToast } from '../context/ToastContext';

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
  const { showToast } = useToast();

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
            showToast('Signal boosted!', 'success');
        } else {
            showToast('Failed to boost', 'error');
        }
    } catch(e) {
        showToast('Error boosting signal', 'error');
    }
  };

  useEffect(() => {
    if (isText) {
      setLoading(true);
      fetch(`/api/files/${fileId}/content`)
        .then(res => {
            if (!res.ok) throw new Error('Failed to load content');
            return res.text();
        })
        .then(text => setContent(text))
        .catch(e => setError('Preview unavailable'))
        .finally(() => setLoading(false));
    }
  }, [fileId, isText]);

  return (
    <div className="preview-overlay fade-in" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: '#000000ee', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(10px)'
    }} onClick={onClose}>
      <div style={{
        width: '80%', height: '80%', maxWidth: '1000px', maxHeight: '800px',
        background: 'var(--bg-mist)', border: '1px solid var(--border-color)', borderRadius: '8px',
        padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {filename}
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleBoost} title="Boost Signal" disabled={boosted} style={{ color: boosted ? 'var(--accent-sym)' : 'inherit', borderColor: boosted ? 'var(--accent-sym)' : 'var(--border-color)' }}>
               <IconBolt size={18} />
            </button>
            <button onClick={onDownload} title="Download Original">
               <IconDownload size={18} />
            </button>
            <button onClick={onClose} title="Close">
               <IconX size={18} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#00000066', borderRadius: '4px' }}>
          {loading && <div>Loading preview...</div>}
          {error && <div style={{ color: 'var(--accent-alert)' }}>{error}</div>}
          
          {!loading && !error && (
             <>
               {isImage && (
                 <img 
                   src={`/api/files/${fileId}/content`} 
                   alt={filename} 
                   style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                 />
               )}
               {isText && content && (
                 <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    width: '100%', 
                    height: '100%', 
                    margin: 0, 
                    padding: '20px', 
                    textAlign: 'left', 
                    fontFamily: 'monospace', 
                    fontSize: '0.9em', 
                    color: '#f8f8f2' 
                 }}>
                    {content}
                 </pre>
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

      </div>
    </div>
  );
};

export default FilePreviewModal;
