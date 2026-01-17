import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { IconX, IconPlus, IconSend, IconUsers, IconArrowLeft, IconTrash, IconCrown, IconFile, IconShare, IconEdit, IconMoodSmile } from '@tabler/icons-react';
import { useToast } from '../context/ToastContext';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

interface GroupChatProps {
  onClose: () => void;
  currentUserId: number;
}

interface Group {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
  member_count: number;
  last_message_at?: string;
  last_message_snippet?: string;
  unread_count: number;
}

interface GroupMessage {
  id: number;
  group_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
}

interface Member {
  user_id: number;
  username: string;
  avatar_url?: string;
  role: 'admin' | 'member';
}

const GroupChat: React.FC<GroupChatProps> = ({ onClose, currentUserId }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groupFiles, setGroupFiles] = useState<any[]>([]);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [showFileShare, setShowFileShare] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchGroups();
    fetchConnections();
  }, []);

  useEffect(() => {
    if (activeGroupId) {
      fetchGroupMessages(activeGroupId);
      fetchGroupMembers(activeGroupId);
      fetchGroupFiles(activeGroupId);
    }
  }, [activeGroupId]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/relationships');
      if (res.ok) {
        const data = await res.json();
        setConnections(data.mutual || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGroupMessages = async (groupId: number) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroupMembers = async (groupId: number) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroupFiles = async (groupId: number) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/files`);
      if (res.ok) {
        const data = await res.json();
        setGroupFiles(data.files || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setUserFiles(data.files || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const shareFile = async (fileId: number) => {
    if (!activeGroupId) return;

    try {
      const res = await fetch(`/api/groups/${activeGroupId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId, can_edit: true })
      });

      if (res.ok) {
        showToast('File shared with group', 'success');
        setShowFileShare(false);
        fetchGroupFiles(activeGroupId);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to share file', 'error');
      }
    } catch (err) {
      showToast('Error sharing file', 'error');
    }
  };

  const removeGroupFile = async (fileId: number) => {
    if (!activeGroupId) return;

    try {
      const res = await fetch(`/api/groups/${activeGroupId}/files/${fileId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('File removed', 'success');
        fetchGroupFiles(activeGroupId);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to remove file', 'error');
      }
    } catch (err) {
      showToast('Error removing file', 'error');
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) {
      showToast('Group name and at least one member required', 'error');
      return;
    }

    try {
      // Use create-sym-group for all groups as per requirements
      const res = await fetch('/api/groups/create-sym-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, member_ids: selectedMembers })
      });

      if (res.ok) {
        const data = await res.json();
        showToast('Sym Group created', 'success');
        setShowCreateModal(false);
        setNewGroupName('');
        setSelectedMembers([]);
        fetchGroups();
        setActiveGroupId(data.group.id);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create group', 'error');
      }
    } catch (err) {
      showToast('Error creating group', 'error');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeGroupId) return;

    try {
      const res = await fetch(`/api/groups/${activeGroupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      } else {
        showToast('Failed to send', 'error');
      }
    } catch (err) {
      showToast('Error sending message', 'error');
    }
  };

  const addMember = async (userId: number) => {
    if (!activeGroupId) return;

    try {
      const res = await fetch(`/api/groups/${activeGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });

      if (res.ok) {
        showToast('Member added', 'success');
        fetchGroupMembers(activeGroupId);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add member', 'error');
      }
    } catch (err) {
      showToast('Error adding member', 'error');
    }
  };

  const removeMember = async (userId: number) => {
    if (!activeGroupId) return;

    try {
      const res = await fetch(`/api/groups/${activeGroupId}/members/${userId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('Member removed', 'success');
        fetchGroupMembers(activeGroupId);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to remove member', 'error');
      }
    } catch (err) {
      showToast('Error removing member', 'error');
    }
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const isAdmin = members.find(m => m.user_id === currentUserId)?.role === 'admin';

  return (
    <div className="inbox-overlay fade-in" style={{
      position: 'fixed', top: '60px', right: '10px', width: 'min(360px, 95vw)',
      background: 'var(--drawer-bg)', border: '1px solid var(--border-color)',
      backdropFilter: 'blur(10px)', padding: '0', borderRadius: '8px',
      zIndex: 'var(--z-dropdown)', height: '70vh', maxHeight: '600px', display: 'flex', flexDirection: 'column',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '10px 15px', alignItems: 'center', justifyContent: 'space-between' }}>
        {activeGroupId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => setActiveGroupId(null)} style={{ background: 'transparent', border: 'none', padding: 0 }} aria-label="Back">
              <IconArrowLeft size={18} />
            </button>
            <span style={{ fontWeight: 'bold' }}>{activeGroup?.name || 'Group'}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconUsers size={18} />
            <span style={{ fontWeight: 'bold' }}>Groups</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '5px' }}>
          {!activeGroupId && (
            <button onClick={() => setShowCreateModal(true)} style={{ background: 'none', border: 'none', padding: '4px' }} title="Create Group" aria-label="Create Group">
              <IconPlus size={18} />
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', padding: '4px' }} title="Close" aria-label="Close">
            <IconX size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', position: 'relative' }}>
        {/* Group List */}
        {!activeGroupId && !showCreateModal && (
          <>
            {loading && <div style={{ padding: '10px' }}>Loading groups...</div>}
            {!loading && groups.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                No groups yet. Create one to start.
              </div>
            )}
            {groups.map(g => (
              <div key={g.id}
                role="button" tabIndex={0}
                onClick={() => setActiveGroupId(g.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveGroupId(g.id);
                  }
                }}
                style={{
                  padding: '12px', borderBottom: '1px solid #ffffff11', cursor: 'pointer',
                  background: g.unread_count > 0 ? 'rgba(var(--accent-sym-rgb), 0.1)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: '10px'
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-sym)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconUsers size={18} color="#000" />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.95em' }}>{g.name}</span>
                    <span style={{ fontSize: '0.75em', color: '#666' }}>{g.member_count} members</span>
                  </div>
                  {g.last_message_snippet && (
                    <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {g.last_message_snippet}
                    </div>
                  )}
                </div>
                {g.unread_count > 0 && (
                  <div style={{ background: 'var(--accent-sym)', color: 'black', fontSize: '0.7em', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                    {g.unread_count}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Create Group Modal */}
        {showCreateModal && (
          <div style={{ padding: '10px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Create Group</h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              style={{ width: '100%', marginBottom: '15px', padding: '8px', background: '#00000044', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white' }}
            />
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: 'var(--text-secondary)' }}>Select Members (Sym Only)</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {connections.length === 0 && <div style={{ color: '#666', fontSize: '0.85em' }}>No Sym connections available.</div>}
                {connections.map(c => (
                  <label key={c.user_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(c.user_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMembers(prev => [...prev, c.user_id]);
                        } else {
                          setSelectedMembers(prev => prev.filter(id => id !== c.user_id));
                        }
                      }}
                    />
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: c.avatar_url ? `url(${c.avatar_url}) center/cover` : '#333' }}></div>
                    <span>{c.username}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={createGroup} style={{ flex: 1 }}>Create</button>
              <button onClick={() => { setShowCreateModal(false); setNewGroupName(''); setSelectedMembers([]); }} style={{ flex: 1, background: 'transparent', color: 'var(--text-secondary)' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Group Chat */}
        {activeGroupId && !showCreateModal && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Members Section */}
            <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>Members ({members.length})</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {members.map(m => (
                  <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', background: '#ffffff0d', borderRadius: '12px', fontSize: '0.85em' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: m.avatar_url ? `url(${m.avatar_url}) center/cover` : '#333333ff' }}></div>
                    <span>{m.username}</span>
                    {m.role === 'admin' && <IconCrown size={12} color="#10b981ff" />}
                    {isAdmin && m.user_id !== currentUserId && (
                      <button onClick={() => removeMember(m.user_id)} style={{ background: 'none', border: 'none', padding: 0, color: '#ef4444ff', cursor: 'pointer' }} aria-label="Remove member">
                        <IconTrash size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {groupFiles.length > 0 && (
              <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>Shared Files ({groupFiles.length})</span>
                  {isAdmin && (
                    <button onClick={() => { fetchUserFiles(); setShowFileShare(true); }} style={{ background: 'none', border: 'none', padding: 0, color: '#10b981ff', cursor: 'pointer' }} aria-label="Share file">
                      <IconShare size={14} />
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '100px', overflowY: 'auto' }}>
                  {groupFiles.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px', background: '#ffffff05', borderRadius: '4px', fontSize: '0.8em' }}>
                      <IconFile size={12} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</span>
                      {f.can_edit && <IconEdit size={12} color="#10b981ff" />}
                      {isAdmin && (
                        <button onClick={() => removeGroupFile(f.id)} style={{ background: 'none', border: 'none', padding: 0, color: '#ef4444ff', cursor: 'pointer' }}>
                          <IconTrash size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '10px' }}>
              {messages.map(m => {
                const isMe = m.sender_id === currentUserId;
                return (
                  <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                    {!isMe && (
                      <div style={{ fontSize: '0.75em', color: 'var(--text-secondary)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: m.sender_avatar ? `url(${m.sender_avatar}) center/cover` : '#333' }}></div>
                        {m.sender_name}
                      </div>
                    )}
                    <div style={{
                      background: isMe ? 'var(--accent-sym)' : '#ffffff22',
                      color: isMe ? 'black' : 'var(--text-primary)',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      fontSize: '0.9em',
                      wordBreak: 'break-word'
                    }}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', gap: '10px', position: 'relative' }}>
              {showEmoji && (
                <Suspense fallback={<div>...</div>}>
                  <div style={{ position: 'absolute', bottom: '60px', right: '10px', zIndex: 1000 }}>
                    <EmojiPicker onEmojiClick={(e) => { setNewMessage(prev => prev + e.emoji); setShowEmoji(false); }} theme="dark" />
                  </div>
                </Suspense>
              )}
              <button onClick={() => setShowEmoji(!showEmoji)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <IconMoodSmile size={20} />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Message..."
                aria-label="Type a message"
                style={{
                  flex: 1, background: '#00000044', border: '1px solid var(--border-color)',
                  borderRadius: '20px', padding: '8px 15px', color: 'white'
                }}
              />
              <button onClick={sendMessage} disabled={!newMessage.trim()} aria-label="Send message" style={{ background: 'transparent', border: 'none', color: newMessage.trim() ? 'var(--accent-sym)' : '#555' }}>
                <IconSend size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showFileShare && activeGroupId && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--drawer-bg)', padding: '10px', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0 }}>Share File</h4>
            <button onClick={() => setShowFileShare(false)} style={{ background: 'none', border: 'none', padding: 0 }} aria-label="Close">
              <IconX size={18} />
            </button>
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {userFiles.map(f => (
              <div key={f.id} onClick={() => shareFile(f.id)} style={{ padding: '10px', background: '#ffffff05', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconFile size={16} />
                <span style={{ flex: 1 }}>{f.filename}</span>
              </div>
            ))}
            {userFiles.length === 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>No files to share</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChat;
