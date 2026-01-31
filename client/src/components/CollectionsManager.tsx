import React, { useState, useEffect } from 'react';
import { IconX, IconFolderPlus, IconTrash, IconFolder, IconFolderOff, IconFolderOpen, IconEye, IconCheck, IconArrowLeft, IconGripVertical, IconPencil, IconFile, IconDownload, IconDeviceFloppy, IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import { useCollections, Collection } from '../hooks/useCollections';
import { useToast } from '../context/ToastContext';
import FilePreviewModal from './FilePreviewModal';
import ConfirmModal from './ConfirmModal';
import Skeleton from './Skeleton';

interface CollectionsManagerProps {
  onClose: () => void;
  mode?: 'manage' | 'select'; // 'manage' = CRUD, 'select' = Pick a collection to add file to
  onSelect?: (collectionId: number) => void;
}

const CollectionsManager: React.FC<CollectionsManagerProps> = ({ onClose, mode = 'manage', onSelect }) => {
  const { collections, createCollection, deleteCollection, updateCollection, loading: loadingColls } = useCollections();
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

  // Editing State
  const [isEditingColl, setIsEditingColl] = useState(false);
  const [editName, setEditName] = useState('');
  const [editVisibility, setEditVisibility] = useState<'private' | 'public' | 'sym'>('private');

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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
      setConfirmState({
          isOpen: true,
          title: 'Delete Collection',
          message: 'Are you sure you want to delete this collection? This action cannot be undone.',
          onConfirm: async () => {
              const success = await deleteCollection(id);
              if (success) showToast('Collection deleted', 'success');
              else showToast('Failed to delete', 'error');
              setConfirmState(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const startEdit = (e: React.MouseEvent, collection: Collection) => {
      e.stopPropagation();
      setEditName(collection.name);
      setEditVisibility(collection.visibility as any);
      setIsEditingColl(true);
      setSelectedCollection(collection); // Use this to track which one is being edited in list view context if needed
  };

  const saveEdit = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectedCollection) return;
      const success = await updateCollection(selectedCollection.id, editName, selectedCollection.description, editVisibility);
      if (success) {
          showToast('Collection updated', 'success');
          setIsEditingColl(false);
          setSelectedCollection(null);
      } else {
          showToast('Failed to update', 'error');
      }
  };

  const cancelEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditingColl(false);
      setSelectedCollection(null);
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

  const downloadZip = async () => {
      if (!selectedCollection) return;
      showToast('Preparing ZIP...', 'info');
      try {
          const res = await fetch(`/api/collections/${selectedCollection.id}/zip`);
          if (res.ok) {
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${selectedCollection.name}.zip`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              showToast('Download started', 'success');
          } else {
              showToast('Failed to generate ZIP', 'error');
          }
      } catch(e) {
          showToast('Error downloading ZIP', 'error');
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

      setConfirmState({
          isOpen: true,
          title: 'Remove File',
          message: 'Remove this file from the collection? The original artifact will remain.',
          onConfirm: async () => {
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
            setConfirmState(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="collections-modal-title" style={{ zIndex: 3200, pointerEvents: 'auto' }}>
      <div className="glass-panel" style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div className="modal-header-sticky" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 10px 20px', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeView === 'detail' && (
                  <button onClick={() => setActiveView('list')} style={{ background: 'transparent', border: 'none', padding: 0 }} aria-label="Back to collections list">
                      <IconArrowLeft />
                  </button>
              )}
              <h2 id="collections-modal-title" style={{ margin: 0 }}>
                  {activeView === 'list' ? (mode === 'manage' ? 'My Collections' : 'Select Collection') : selectedCollection?.name}
              </h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {activeView === 'detail' && (
                <button onClick={downloadZip} title="Download as ZIP" aria-label="Download as ZIP" style={{ background: 'transparent', border: 'none' }}>
                    <IconDownload />
                </button>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none' }} aria-label="Close">
                <IconX aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="collections-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 20px 20px 20px' }}>
            
            {/* VIEW: LIST */}
            {activeView === 'list' && (
                <>
                    {loadingColls && (
                        <div style={{ padding: '10px' }}>
                            <Skeleton height="50px" marginBottom="10px" />
                            <Skeleton height="50px" marginBottom="10px" />
                            <Skeleton height="50px" />
                        </div>
                    )}
                    {!loadingColls && collections.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <IconFolderOff size={48} stroke={1} />
                            <p style={{ margin: 0, fontSize: '1.1em' }}>No Collections Manifested</p>
                            <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.7 }}>Gather your artifacts into new structures.</p>
                        </div>
                    )}

                    {collections.map(c => {
                        const isEditingThis = isEditingColl && selectedCollection?.id === c.id;

                        return (
                        <div
                            key={c.id}
                            className="glass-panel"
                            role="button"
                            tabIndex={isEditingThis ? -1 : 0}
                            style={{
                                padding: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: isEditingThis ? 'default' : 'pointer',
                                border: '1px solid transparent',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => {
                                if (isEditingThis) return;
                                if (mode === 'select' && onSelect) onSelect(c.id);
                                else openCollection(c);
                            }}
                            onKeyDown={(e) => {
                                if (isEditingThis) return;
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    if (mode === 'select' && onSelect) onSelect(c.id);
                                    else openCollection(c);
                                }
                            }}
                            onMouseEnter={(e) => !isEditingThis && (e.currentTarget.style.borderColor = 'var(--accent-sym)')}
                            onMouseLeave={(e) => !isEditingThis && (e.currentTarget.style.borderColor = 'transparent')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                                <IconFolder size={24} color="var(--accent-sym)" />
                                {isEditingThis ? (
                                    <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                                        <input
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            style={{ flex: 1, padding: '2px 5px' }}
                                        />
                                        <select
                                            value={editVisibility}
                                            onChange={e => setEditVisibility(e.target.value as any)}
                                            onClick={e => e.stopPropagation()}
                                            style={{ padding: '2px' }}
                                        >
                                            <option value="private">Private</option>
                                            <option value="public">Public</option>
                                            <option value="sym">Sym</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                                            {c.file_count} items • {c.visibility}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {mode === 'manage' && (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    {isEditingThis ? (
                                        <>
                                            <button onClick={saveEdit} aria-label="Save changes" style={{ color: 'var(--accent-sym)', background: 'transparent', border: 'none' }}><IconDeviceFloppy size={18} /></button>
                                            <button onClick={cancelEdit} aria-label="Cancel editing" style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none' }}><IconX size={18} /></button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={(e) => startEdit(e, c)}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', opacity: 0.7 }}
                                                title="Edit"
                                                aria-label="Edit Collection"
                                            >
                                                <IconPencil size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(c.id, e)}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--accent-alert)', opacity: 0.7 }}
                                                title="Delete Collection"
                                                aria-label="Delete Collection"
                                            >
                                                <IconTrash size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            {mode === 'select' && <IconCheck size={18} style={{ opacity: 0.5 }} />}
                        </div>
                    )})}
                </>
            )}

            {/* VIEW: DETAIL */}
            {activeView === 'detail' && (
                <>
                    {loadingFiles && (
                        <div style={{ padding: '10px' }}>
                            <Skeleton height="40px" marginBottom="8px" />
                            <Skeleton height="40px" marginBottom="8px" />
                            <Skeleton height="40px" />
                        </div>
                    )}
                    {!loadingFiles && collectionFiles.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <IconFolderOpen size={48} stroke={1} />
                            <p style={{ margin: 0, fontSize: '1.1em' }}>Empty Archive</p>
                            <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.7 }}>This vessel waits for your discoveries.</p>
                        </div>
                    )}

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
                                    title="Move Up"
                                    style={{ background: 'none', border: 'none', padding: 0, opacity: index === 0 ? 0.2 : 0.7, cursor: index === 0 ? 'default' : 'pointer', color: 'var(--text-primary)' }}
                                >
                                    <IconChevronUp size={16} />
                                </button>
                                <button
                                    disabled={index === collectionFiles.length - 1}
                                    onClick={() => moveFile(index, 'down')}
                                    aria-label="Move Down"
                                    title="Move Down"
                                    style={{ background: 'none', border: 'none', padding: 0, opacity: index === collectionFiles.length - 1 ? 0.2 : 0.7, cursor: index === collectionFiles.length - 1 ? 'default' : 'pointer', color: 'var(--text-primary)' }}
                                >
                                    <IconChevronDown size={16} />
                                </button>
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
                            aria-label="Collection Name"
                            value={newName} 
                            onChange={e => setNewName(e.target.value)}
                            autoFocus
                        />
                        <input 
                            type="text" 
                            placeholder="Description (Optional)" 
                            aria-label="Collection Description"
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

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
};

export default CollectionsManager;
