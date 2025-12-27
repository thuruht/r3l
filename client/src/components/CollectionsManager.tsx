import React, { useState, useEffect } from 'react';
import { IconX, IconFolderPlus, IconTrash, IconFolder, IconEye, IconCheck, IconArrowLeft, IconGripVertical, IconPencil, IconFile } from '@tabler/icons-react';
import { useCollections, Collection } from '../hooks/useCollections';
import { useToast } from '../context/ToastContext';
import FilePreviewModal from './FilePreviewModal';

interface CollectionsManagerProps {
  onClose: () => void;
  mode?: 'manage' | 'select'; // 'manage' = CRUD, 'select' = Pick a collection to add file to
  onSelect?: (collectionId: number) => void;
}

const CollectionsManager: React.FC<CollectionsManagerProps> = ({ onClose, mode = 'manage', onSelect }) => {
  const { collections, createCollection, deleteCollection, loading: loadingColls } = useCollections();
  const { showToast } = useToast();
  
  const [activeView, setActiveView] = useState<'list' | 'detail'>('list');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionFiles, setCollectionFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVisibility, setNewVisibility] = useState<'private' | 'public' | 'sym'>('private');

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
          if (activeView === 'detail') setActiveView('list');
          else onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, activeView]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    
    const success = await createCollection(newName, newDesc, newVisibility);
    if (success) {
      showToast('Collection created', 'success');
      setIsCreating(false);
      setNewName('');
      setNewDesc('');
    } else {
        showToast('Failed to create collection', 'error');
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this collection?')) {
          const success = await deleteCollection(id);
          if (success) showToast('Collection deleted', 'success');
          else showToast('Failed to delete', 'error');
      }
  };

  const openCollection = async (collection: Collection) => {
      setSelectedCollection(collection);
      setActiveView('detail');
      setLoadingFiles(true);
      try {
          const res = await fetch(`/api/collections/${collection.id}`);
          if (res.ok) {
              const data = await res.json();
              setCollectionFiles(data.files || []);
          } else {
              showToast('Failed to load files', 'error');
          }
      } catch (e) {
          console.error(e);
          showToast('Error loading collection', 'error');
      } finally {
          setLoadingFiles(false);
      }
  };

  // Simple Reordering (Move Up/Down)
  const moveFile = async (index: number, direction: 'up' | 'down') => {
      if (!selectedCollection) return;
      const newFiles = [...collectionFiles];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= newFiles.length) return;

      // Swap
      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      setCollectionFiles(newFiles);

      // Save order
      // We send the full new order
      const fileOrders = newFiles.map((f, i) => ({ file_id: f.id, order: i }));
      try {
          await fetch(`/api/collections/${selectedCollection.id}/reorder`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file_orders: fileOrders })
          });
      } catch (e) {
          showToast('Failed to save order', 'error');
      }
  };

  const removeFile = async (fileId: number) => {
      if (!selectedCollection) return;
      if (!confirm('Remove file from collection?')) return;

      try {
          const res = await fetch(`/api/collections/${selectedCollection.id}/files/${fileId}`, {
              method: 'DELETE'
          });
          if (res.ok) {
              setCollectionFiles(prev => prev.filter(f => f.id !== fileId));
              showToast('File removed', 'success');
          } else {
              showToast('Failed to remove file', 'error');
          }
      } catch (e) {
          showToast('Error removing file', 'error');
      }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="collections-modal-title">
      <div className="glass-panel" style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div className="modal-header-sticky" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 10px 20px', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeView === 'detail' && (
                  <button onClick={() => setActiveView('list')} style={{ background: 'transparent', border: 'none', padding: 0 }}>
                      <IconArrowLeft />
                  </button>
              )}
              <h2 id="collections-modal-title" style={{ margin: 0 }}>
                  {activeView === 'list' ? (mode === 'manage' ? 'My Collections' : 'Select Collection') : selectedCollection?.name}
              </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none' }} aria-label="Close">
            <IconX aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="collections-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 20px 20px 20px' }}>
            
            {/* VIEW: LIST */}
            {activeView === 'list' && (
                <>
                    {loadingColls && <p>Loading...</p>}
                    {!loadingColls && collections.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No collections found.</p>}

                    {collections.map(c => (
                        <div
                            key={c.id}
                            className="glass-panel"
                            style={{
                                padding: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                border: '1px solid transparent',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => {
                                if (mode === 'select' && onSelect) onSelect(c.id);
                                else openCollection(c);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-sym)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <IconFolder size={24} color="var(--accent-sym)" />
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{c.name}</div>
                                    <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                                        {c.file_count} items • {c.visibility}
                                    </div>
                                </div>
                            </div>
                            {mode === 'manage' && (
                                <button
                                    onClick={(e) => handleDelete(c.id, e)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-alert)', opacity: 0.7 }}
                                    title="Delete Collection"
                                    aria-label="Delete Collection"
                                >
                                    <IconTrash size={18} />
                                </button>
                            )}
                            {mode === 'select' && <IconCheck size={18} style={{ opacity: 0.5 }} />}
                        </div>
                    ))}
                </>
            )}

            {/* VIEW: DETAIL */}
            {activeView === 'detail' && (
                <>
                    {loadingFiles && <p>Loading files...</p>}
                    {!loadingFiles && collectionFiles.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>This collection is empty.</p>}

                    {collectionFiles.map((f, index) => (
                        <div key={f.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <button
                                    disabled={index === 0}
                                    onClick={() => moveFile(index, 'up')}
                                    aria-label="Move Up"
                                    style={{ background: 'none', border: 'none', padding: 0, opacity: index === 0 ? 0.2 : 0.7, cursor: index === 0 ? 'default' : 'pointer' }}
                                >▲</button>
                                <button
                                    disabled={index === collectionFiles.length - 1}
                                    onClick={() => moveFile(index, 'down')}
                                    aria-label="Move Down"
                                    style={{ background: 'none', border: 'none', padding: 0, opacity: index === collectionFiles.length - 1 ? 0.2 : 0.7, cursor: index === collectionFiles.length - 1 ? 'default' : 'pointer' }}
                                >▼</button>
                            </div>

                            <IconFile size={20} style={{ opacity: 0.7 }} />

                            <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {f.filename}
                            </div>

                            <button onClick={() => setPreviewFile(f)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }} title="View" aria-label="View file">
                                <IconEye size={18} />
                            </button>

                            {/* Edit/Remove Actions */}
                            <button onClick={() => removeFile(f.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-alert)' }} title="Remove" aria-label="Remove file">
                                <IconX size={18} />
                            </button>
                        </div>
                    ))}
                </>
            )}
        </div>

        {/* Footer (Create New in List Mode) */}
        {activeView === 'list' && mode === 'manage' && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', padding: '20px' }}>
                {!isCreating ? (
                    <button 
                        onClick={() => setIsCreating(true)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    >
                        <IconFolderPlus size={18} /> Create New Collection
                    </button>
                ) : (
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input 
                            type="text" 
                            placeholder="Collection Name"
                            value={newName} 
                            onChange={e => setNewName(e.target.value)}
                            autoFocus
                        />
                        <input 
                            type="text" 
                            placeholder="Description (Optional)" 
                            value={newDesc} 
                            onChange={e => setNewDesc(e.target.value)}
                        />
                        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                          <legend style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: '5px' }}>Visibility</legend>
                          <div style={{ display: 'flex', gap: '15px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                  <input type="radio" name="visibility" value="private" checked={newVisibility === 'private'} onChange={() => setNewVisibility('private')} /> Private
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                  <input type="radio" name="visibility" value="public" checked={newVisibility === 'public'} onChange={() => setNewVisibility('public')} /> Public
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                  <input type="radio" name="visibility" value="sym" checked={newVisibility === 'sym'} onChange={() => setNewVisibility('sym')} /> Sym Only
                              </label>
                          </div>
                        </fieldset>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <button onClick={handleCreate}>Create</button>
                            <button onClick={() => setIsCreating(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)' }}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {previewFile && (
          <FilePreviewModal
              fileId={previewFile.id}
              filename={previewFile.filename}
              mimeType={previewFile.mime_type}
              onClose={() => setPreviewFile(null)}
              onDownload={() => {
                  const link = document.createElement('a');
                  link.href = `/api/files/${previewFile.id}/content`;
                  link.download = previewFile.filename;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
              }}
          />
      )}
    </div>
  );
};

export default CollectionsManager;
