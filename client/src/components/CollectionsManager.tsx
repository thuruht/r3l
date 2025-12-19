import React, { useState } from 'react';
import { IconX, IconFolderPlus, IconTrash, IconFolder, IconEye, IconCheck } from '@tabler/icons-react';
import { useCollections, Collection } from '../hooks/useCollections';
import { useToast } from '../context/ToastContext';

interface CollectionsManagerProps {
  onClose: () => void;
  mode?: 'manage' | 'select'; // 'manage' = CRUD, 'select' = Pick a collection to add file to
  onSelect?: (collectionId: number) => void;
}

const CollectionsManager: React.FC<CollectionsManagerProps> = ({ onClose, mode = 'manage', onSelect }) => {
  const { collections, createCollection, deleteCollection, loading } = useCollections();
  const { showToast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVisibility, setNewVisibility] = useState<'private' | 'public' | 'sym'>('private');

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

  return (
    <div className="modal-overlay">
      <div className="glass-panel" style={{ width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>{mode === 'manage' ? 'My Collections' : 'Select Collection'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none' }}>
            <IconX />
          </button>
        </div>

        <div className="collections-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loading && <p>Loading...</p>}
            {!loading && collections.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No collections found.</p>}
            
            {collections.map(c => (
                <div 
                    key={c.id} 
                    className="glass-panel" 
                    style={{ 
                        padding: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: mode === 'select' ? 'pointer' : 'default',
                        border: mode === 'select' ? '1px solid transparent' : undefined
                    }}
                    onClick={() => mode === 'select' && onSelect && onSelect(c.id)}
                    onMouseEnter={(e) => {
                        if (mode === 'select') e.currentTarget.style.borderColor = 'var(--accent-sym)';
                    }}
                    onMouseLeave={(e) => {
                        if (mode === 'select') e.currentTarget.style.borderColor = 'transparent';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <IconFolder size={20} color="var(--accent-sym)" />
                        <div>
                            <div style={{ fontWeight: 'bold' }}>{c.name}</div>
                            <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                                {c.file_count} items • {c.visibility}
                            </div>
                        </div>
                    </div>
                    {mode === 'manage' && (
                        <button 
                            onClick={(e) => handleDelete(c.id, e)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-alert)' }}
                            title="Delete Collection"
                        >
                            <IconTrash size={16} />
                        </button>
                    )}
                     {mode === 'select' && (
                        <IconCheck size={16} style={{ opacity: 0.5 }} />
                    )}
                </div>
            ))}
        </div>

        {mode === 'manage' && (
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
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
                        <div style={{ display: 'flex', gap: '10px' }}>
                             <label>
                                 <input 
                                    type="radio" 
                                    name="visibility" 
                                    value="private" 
                                    checked={newVisibility === 'private'}
                                    onChange={() => setNewVisibility('private')}
                                 /> Private
                             </label>
                             <label>
                                 <input 
                                    type="radio" 
                                    name="visibility" 
                                    value="public" 
                                    checked={newVisibility === 'public'}
                                    onChange={() => setNewVisibility('public')}
                                 /> Public
                             </label>
                             <label>
                                 <input 
                                    type="radio" 
                                    name="visibility" 
                                    value="sym" 
                                    checked={newVisibility === 'sym'}
                                    onChange={() => setNewVisibility('sym')}
                                 /> Sym Only
                             </label>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <button onClick={handleCreate}>Create</button>
                            <button onClick={() => setIsCreating(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)' }}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default CollectionsManager;
