import React, { useState, useRef } from 'react';
import { IconUpload, IconX, IconFile, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { useToast } from '../context/ToastContext';

interface UploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
  parentId?: number; // For remixing
}

interface FileUploadState {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUploadComplete, parentId }) => {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const newUploads: FileUploadState[] = Array.from(newFiles).map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      progress: 0,
      status: 'pending'
    }));
    setFiles(prev => [...prev, ...newUploads]);
  };

  const uploadFile = async (upload: FileUploadState) => {
    setFiles(prev => prev.map(f => f.id === upload.id ? { ...f, status: 'uploading' } : f));

    const formData = new FormData();
    formData.append('file', upload.file);
    formData.append('visibility', 'me'); // Default to private ('me')
    if (parentId) formData.append('parent_id', parentId.toString());

    try {
      // Simulate progress since fetch doesn't support it natively easily
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
            if (f.id === upload.id && f.status === 'uploading') {
                const newProg = Math.min(f.progress + 10, 90);
                return { ...f, progress: newProg };
            }
            return f;
        }));
      }, 200);

      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (res.ok) {
        setFiles(prev => prev.map(f => f.id === upload.id ? { ...f, status: 'success', progress: 100 } : f));
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
    } catch (e: any) {
        setFiles(prev => prev.map(f => f.id === upload.id ? { ...f, status: 'error', error: e.message } : f));
    }
  };

  const startUploads = () => {
    files.forEach(f => {
      if (f.status === 'pending') uploadFile(f);
    });
  };

  const allDone = files.length > 0 && files.every(f => f.status === 'success' || f.status === 'error');

  return (
    <div className="preview-overlay fade-in" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(5px)'
    }} onClick={onClose}>
      <div className="glass-panel" style={{
        width: '500px', maxWidth: '90%', padding: '20px', borderRadius: '8px',
        display: 'flex', flexDirection: 'column', gap: '15px'
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Upload Artifacts</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 0 }}><IconX /></button>
        </div>

        <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { 
                e.preventDefault(); 
                setIsDragOver(false); 
                handleFiles(e.dataTransfer.files); 
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
                border: `2px dashed ${isDragOver ? 'var(--accent-sym)' : 'var(--border-color)'}`,
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragOver ? 'rgba(38, 222, 129, 0.1)' : 'transparent',
                transition: 'all 0.2s'
            }}
        >
            <IconUpload size={48} color="var(--text-secondary)" />
            <p style={{ color: 'var(--text-secondary)' }}>Drag & Drop files here or click to select</p>
            <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        </div>

        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {files.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px' }}>
                    <IconFile size={20} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.9em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.file.name}</div>
                        <div style={{ height: '4px', background: '#333', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${f.progress}%`, height: '100%', background: f.status === 'error' ? 'var(--accent-alert)' : 'var(--accent-sym)', transition: 'width 0.2s' }}></div>
                        </div>
                    </div>
                    {f.status === 'success' && <IconCheck size={16} color="var(--accent-sym)" />}
                    {f.status === 'error' && <IconAlertCircle size={16} color="var(--accent-alert)" title={f.error} />}
                </div>
            ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {allDone ? (
                <button onClick={() => { onUploadComplete(); onClose(); }}>Done</button>
            ) : (
                <button onClick={startUploads} disabled={files.length === 0 || files.some(f => f.status === 'uploading')}>
                    {files.some(f => f.status === 'uploading') ? 'Uploading...' : 'Start Upload'}
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default UploadModal;
