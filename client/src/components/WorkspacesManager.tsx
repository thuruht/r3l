// client/src/components/WorkspacesManager.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { IconFolderPlus, IconTrash, IconUserPlus, IconFilePlus, IconArrowLeft, IconChevronRight, IconUsers, IconFile } from '@tabler/icons-react';
import Modal from './ui/Modal';
import { useToast } from '../context/ToastContext';
import { ICON_SIZES } from '../constants/iconSizes';
import Skeleton from './Skeleton';

interface Workspace {
  id: number;
  name: string;
  description: string;
  role: string;
  created_at: string;
}

interface WorkspaceFile {
  id: number;
  filename: string;
  mime_type: string;
}

interface WorkspaceMember {
  user_id: number;
  username: string;
  role: string;
}

interface UserFile {
  id: number;
  filename: string;
}

interface WorkspacesManagerProps {
  onClose: () => void;
}

const WorkspacesManager: React.FC<WorkspacesManagerProps> = ({ onClose }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'members'>('files');
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [inviteUsername, setInviteUsername] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch (e) {
      showToast('Failed to load workspaces', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaceDetails = async (id: number) => {
    try {
      const [filesRes, membersRes] = await Promise.all([
        fetch(`/api/workspaces/${id}/files`),
        fetch(`/api/workspaces/${id}/members`)
      ]);
      if (filesRes.ok) {
        const data = await filesRes.json();
        setWorkspaceFiles(data.files || []);
      }
      if (membersRes.ok) {
        const data = await membersRes.json();
        setWorkspaceMembers(data.members || []);
      }
    } catch (e) {
      showToast('Failed to load workspace details', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc })
      });
      if (res.ok) {
        showToast('Workspace established.', 'success');
        setNewName('');
        setNewDesc('');
        setIsCreating(false);
        fetchWorkspaces();
      }
    } catch (e) {
      showToast('Creation failed.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Dissolve this workspace? Files will be unlinked but not deleted.')) return;
    try {
      const res = await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Workspace dissolved.', 'success');
        fetchWorkspaces();
        if (activeWorkspace?.id === id) setActiveWorkspace(null);
      }
    } catch (e) {
      showToast('Failed to delete.', 'error');
    }
  };

  const selectWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws);
    setIsAddingFile(false);
    setIsInviting(false);
    fetchWorkspaceDetails(ws.id);
  };

  const fetchUserFiles = useCallback(async () => {
    const res = await fetch('/api/files');
    if (res.ok) {
      const data = await res.json();
      setUserFiles((data.files || []).map((f: any) => ({ id: f.id, filename: f.filename })));
    }
  }, []);

  const handleAddFile = async (file_id: number) => {
    if (!activeWorkspace) return;
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id })
      });
      if (res.ok) {
        showToast('Artifact added to workspace.', 'success');
        setIsAddingFile(false);
        fetchWorkspaceDetails(activeWorkspace.id);
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to add artifact', 'error');
      }
    } catch { showToast('Error adding artifact', 'error'); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !inviteUsername.trim()) return;
    try {
      // Resolve username → user_id
      const searchRes = await fetch(`/api/users/search?q=${encodeURIComponent(inviteUsername)}`);
      const searchData = await searchRes.json();
      const match = (searchData.users || []).find((u: any) => u.username.toLowerCase() === inviteUsername.toLowerCase());
      if (!match) { showToast('User not found.', 'error'); return; }

      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: match.id })
      });
      if (res.ok) {
        showToast(`${match.username} invited.`, 'success');
        setInviteUsername('');
        setIsInviting(false);
        fetchWorkspaceDetails(activeWorkspace.id);
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to invite', 'error');
      }
    } catch { showToast('Error inviting collaborator', 'error'); }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Collaborative Workspaces">
      <div style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        {!activeWorkspace ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>Shared creative environments</span>
              <button onClick={() => setIsCreating(!isCreating)} className="primary-btn" style={{ padding: '5px 10px', fontSize: '0.8em' }}>
                <IconFolderPlus size={ICON_SIZES.sm} /> {isCreating ? 'CANCEL' : 'NEW'}
              </button>
            </div>

            {isCreating && (
              <form onSubmit={handleCreate} className="glass-panel" style={{ padding: '15px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Workspace Name" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  required 
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '8px', borderRadius: '4px' }}
                />
                <textarea 
                  placeholder="Purpose (optional)" 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '8px', borderRadius: '4px', minHeight: '60px' }}
                />
                <button type="submit" className="primary-btn">INITIALIZE</button>
              </form>
            )}

            <div className="workspace-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loading ? <Skeleton count={3} height="60px" /> : workspaces.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>No active workspaces.</div>
              ) : workspaces.map(ws => (
                <div 
                  key={ws.id} 
                  onClick={() => selectWorkspace(ws)}
                  className="glass-panel" 
                  style={{ padding: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent-sym)' }}>{ws.name}</div>
                    <div style={{ fontSize: '0.8em', color: '#888' }}>{ws.description || 'No description'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.7em', padding: '2px 6px', background: '#ffffff11', borderRadius: '10px', color: '#aaa' }}>{ws.role.toUpperCase()}</span>
                    <IconChevronRight size={ICON_SIZES.md} color="#555" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => setActiveWorkspace(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                <IconArrowLeft size={ICON_SIZES.md} color="var(--text-secondary)" />
              </button>
              <h3 style={{ margin: 0, color: 'var(--accent-sym)' }}>{activeWorkspace.name}</h3>
              {activeWorkspace.role === 'admin' && (
                <button onClick={() => handleDelete(activeWorkspace.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent-alert)', cursor: 'pointer' }}>
                  <IconTrash size={ICON_SIZES.sm} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
              <button 
                onClick={() => setActiveTab('files')}
                style={{ padding: '8px 15px', background: 'none', border: 'none', borderBottom: activeTab === 'files' ? '2px solid var(--accent-sym)' : 'none', color: activeTab === 'files' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Artifacts ({workspaceFiles.length})
              </button>
              <button 
                onClick={() => setActiveTab('members')}
                style={{ padding: '8px 15px', background: 'none', border: 'none', borderBottom: activeTab === 'members' ? '2px solid var(--accent-sym)' : 'none', color: activeTab === 'members' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Members ({workspaceMembers.length})
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {activeTab === 'files' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {workspaceFiles.map(file => (
                    <div key={file.id} className="glass-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em' }}>
                      <IconFile size={ICON_SIZES.sm} color="var(--accent-sym)" />
                      <span>{file.filename}</span>
                    </div>
                  ))}
                  {isAddingFile ? (
                    <div className="glass-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>Select an artifact to add:</div>
                      {userFiles.length === 0 ? (
                        <div style={{ fontSize: '0.8em', color: '#666' }}>No artifacts available.</div>
                      ) : (
                        userFiles
                          .filter(f => !workspaceFiles.some(wf => wf.id === f.id))
                          .map(f => (
                            <button key={f.id} className="text-btn" style={{ textAlign: 'left', fontSize: '0.85em' }} onClick={() => handleAddFile(f.id)}>
                              {f.filename}
                            </button>
                          ))
                      )}
                      <button className="text-btn" style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }} onClick={() => setIsAddingFile(false)}>CANCEL</button>
                    </div>
                  ) : (
                    <button className="text-btn" style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px' }}
                      onClick={() => { setIsAddingFile(true); fetchUserFiles(); }}>
                      <IconFilePlus size={ICON_SIZES.sm} /> ADD ARTIFACT
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {workspaceMembers.map(member => (
                    <div key={member.user_id} className="glass-panel" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9em' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <IconUsers size={ICON_SIZES.sm} />
                        <span>{member.username}</span>
                      </div>
                      <span style={{ fontSize: '0.7em', color: '#888' }}>{member.role.toUpperCase()}</span>
                    </div>
                  ))}
                  {activeWorkspace.role === 'admin' && (
                    isInviting ? (
                      <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Username"
                          value={inviteUsername}
                          onChange={e => setInviteUsername(e.target.value)}
                          required
                          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '6px 8px', borderRadius: '4px', fontSize: '0.85em' }}
                        />
                        <button type="submit" className="primary-btn" style={{ padding: '5px 10px', fontSize: '0.8em' }}>INVITE</button>
                        <button type="button" className="text-btn" style={{ fontSize: '0.8em' }} onClick={() => setIsInviting(false)}>✕</button>
                      </form>
                    ) : (
                      <button className="text-btn" style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px' }}
                        onClick={() => setIsInviting(true)}>
                        <IconUserPlus size={ICON_SIZES.sm} /> INVITE COLLABORATOR
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default WorkspacesManager;
