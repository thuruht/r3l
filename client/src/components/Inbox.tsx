// Inbox.tsx

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { IconX, IconCheck, IconChecklist, IconTrash, IconMessage, IconBell, IconArrowLeft, IconSend, IconUser, IconMoodSmile, IconMessageOff, IconUserOff, IconBellOff } from '@tabler/icons-react';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

interface InboxProps {
  onClose: () => void;
  onOpenCommunique: (userId: string) => void;
}

interface Notification {
  id: number;
  type: 'sym_request' | 'sym_accepted' | 'file_shared' | 'system_alert';
  actor_name?: string;
  actor_id?: number;
  payload: any;
  is_read: number;
  created_at: string;
}

interface Conversation {
  partner_id: number;
  partner_name: string;
  partner_avatar?: string;
  last_message_at: string;
  last_message_snippet: string;
  unread_count: number;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
}

const Inbox: React.FC<InboxProps> = ({ onClose, onOpenCommunique }) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'messages' | 'requests'>('alerts');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [connections, setConnections] = useState<any[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  
  const listRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (activeTab === 'alerts') {
      fetchNotifications();
      fetchConnections();
    } else {
      fetchConversations();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
      // Mark as read
      fetch(`/api/messages/${activeConversationId}/read`, { method: 'PUT' })
        .then(() => fetchConversations()); // Refresh unread counts
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const parsed = (data.notifications || []).map((n: any) => ({
          ...n,
          payload: typeof n.payload === 'string' ? JSON.parse(n.payload) : n.payload
        }));
        setNotifications(parsed);
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
      } catch (e) { console.error(e); }
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messages/conversations');
      if (res.ok) {
        const data = await res.json();
        const allConvos = data.conversations || [];

        // Filter out requests (assuming we had a way to distinguish,
        // e.g. via connection status or explicit is_request flag in conversation projection.
        // For now, let's assume we filter by connection status if available,
        // or check if we have a mutual connection.
        // Since `api/messages/conversations` doesn't explicitly return `is_request`,
        // we might need to rely on the filtering client side if we fetch connections.

        // Better approach: Let's assume the conversations endpoint returns minimal info.
        // We'll separate based on whether they are in `connections` (mutuals).

        // Fetch connections first if empty
        let currentConnections = connections;
        if (currentConnections.length === 0) {
             const relRes = await fetch('/api/relationships');
             const relData = await relRes.json();
             currentConnections = relData.mutual || [];
             setConnections(currentConnections);
        }

        const mutualIds = new Set(currentConnections.map(c => c.user_id));

        const regConvos: Conversation[] = [];
        const reqConvos: Conversation[] = [];

        allConvos.forEach((c: Conversation) => {
            if (mutualIds.has(c.partner_id)) {
                regConvos.push(c);
            } else {
                reqConvos.push(c);
            }
        });

        setConversations(regConvos);
        setRequests(reqConvos);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (partnerId: number) => {
    setChatLoading(true);
    try {
      const res = await fetch(`/api/messages/${partnerId}`);
      if (res.ok) {
        const data = await res.json();
        const storedKeys = localStorage.getItem('relf_keys');
        if (storedKeys) {
          try {
            const { decryptMessageWithKey, importPrivateKey } = await import('../utils/crypto');
            const keys = JSON.parse(storedKeys);
            const privateKey = await importPrivateKey(keys.privateKey);
            const decrypted = await Promise.all(data.messages.map(async (msg: any) => {
              if (msg.is_encrypted && msg.encrypted_key) {
                try {
                  const content = await decryptMessageWithKey(msg.content, msg.encrypted_key, privateKey);
                  return { ...msg, content };
                } catch { return msg; }
              }
              return msg;
            }));
            setMessages(decrypted);
            return;
          } catch {}
        }
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversationId) return;
    try {
      const partner = conversations.find(c => c.partner_id === activeConversationId);
      let payload: any = { receiver_id: activeConversationId, content: newMessage };
      
      const storedKeys = localStorage.getItem('relf_keys');
      if (storedKeys && partner) {
        try {
          const { encryptMessageForUser } = await import('../utils/crypto');
          const partnerKey = await fetch(`/api/users/${activeConversationId}`).then(r => r.json()).then(d => d.user?.public_key);
          if (partnerKey) {
            const { encryptedContent, encryptedKey } = await encryptMessageForUser(newMessage, partnerKey);
            payload = { receiver_id: activeConversationId, content: encryptedContent, encrypt: true, encrypted_key: encryptedKey };
          }
        } catch {}
      }
      
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { ...data.data, content: newMessage }]);
        setNewMessage('');
      } else {
        showToast('Failed to send', 'error');
      }
    } catch (err) {
      showToast('Error sending message', 'error');
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        showToast('All alerts marked as read.', 'success');
      }
    } catch (err) {
      showToast('Error marking all as read.', 'error');
    }
  };

  const handleAction = async (notif: Notification, action: 'accept' | 'decline') => {
    if (notif.type === 'sym_request' && notif.actor_id) {
        const endpoint = action === 'accept' 
            ? '/api/relationships/accept-sym-request' 
            : '/api/relationships/decline-sym-request';
            
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_user_id: notif.actor_id })
        });
        if (res.ok) {
           showToast(action === 'accept' ? 'Connection established.' : 'Request declined.', 'success');
           markAsRead(notif.id);
           fetchConnections();
        } else {
           const err = await res.json();
           showToast(err.error || `Failed to ${action}`, 'error');
        }
      } catch (err) {
        showToast('Error processing request', 'error');
      }
    }
  };

  const handleDelete = async (id: number) => {
      try {
          const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
          if (res.ok) {
              setNotifications(prev => prev.filter(n => n.id !== id));
          }
      } catch (e) {
          showToast('Error removing notification.', 'error');
      }
  };

  const renderMessage = (n: Notification) => {
    const actorLink = n.actor_id ? (
        <span 
            style={{ 
                cursor: 'pointer', 
                color: 'var(--accent-sym)',
                textDecoration: 'underline',
                marginRight: '4px'
            }}
            onClick={(e) => {
                e.stopPropagation();
                onOpenCommunique(n.actor_id!.toString());
            }}
        >
            {n.actor_name || 'Unknown'}
        </span>
    ) : <span>{n.actor_name || 'Unknown'} </span>;

    switch (n.type) {
      case 'sym_request': return <>{actorLink} requests a signal connection.</>;
      case 'sym_accepted': return <>Connection established with {actorLink}.</>;
      case 'file_shared': {
        const filename = n.payload?.filename || 'an artifact';
        return <>{actorLink} shared {filename}.</>;
      }
      case 'system_alert': return <>{n.payload?.message || 'System Alert'}</>;
      default: return 'New signal received.';
    }
  };

  const SwipeableNotificationItem = ({ n }: { n: Notification }) => {
      const [offsetX, setOffsetX] = useState(0);
      const [startX, setStartX] = useState(0);
      const [isSwiping, setIsSwiping] = useState(false);

      const handleTouchStart = (e: React.TouchEvent) => {
          setStartX(e.touches[0].clientX);
          setIsSwiping(true);
      };

      const handleTouchMove = (e: React.TouchEvent) => {
          if (!isSwiping) return;
          const currentX = e.touches[0].clientX;
          const diff = currentX - startX;
          // Clamp
          if (diff > 100) setOffsetX(100);
          else if (diff < -100) setOffsetX(-100);
          else setOffsetX(diff);
      };

              const handleTouchEnd = () => {
          setIsSwiping(false);
          const threshold = Math.min(80, window.innerWidth * 0.2);
          if (offsetX > threshold) {
              if (n.type === 'sym_request') handleAction(n, 'accept');
              else if (!n.is_read) markAsRead(n.id);
          } else if (offsetX < -threshold) {
              if (n.type === 'sym_request') handleAction(n, 'decline');
              else handleDelete(n.id);
          }
          setOffsetX(0);
      };

      const bg = offsetX > 30 ? 'rgba(0, 255, 0, 0.1)' : (offsetX < -30 ? 'rgba(255, 0, 0, 0.1)' : 'transparent');
      
      return (
          <div 
              style={{ overflow: 'hidden', position: 'relative', marginBottom: '8px' }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
          >
              <div 
                  className="notification-bg"
                  style={{
                      position: 'absolute', inset: 0,
                      background: bg,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0 20px', borderRadius: '0 4px 4px 0',
                      opacity: Math.abs(offsetX) / 100
                  }}
              >
                 {offsetX > 0 && <IconCheck size={20} color="var(--accent-sym)" />}
                 {offsetX < 0 && <IconTrash size={20} color="var(--accent-alert)" />}
              </div>
              <div 
                role="button" tabIndex={0}
                style={{ 
                    padding: '10px', 
                    background: n.is_read ? 'transparent' : 'rgba(255,255,255,0.03)',
                    borderLeft: n.is_read ? '2px solid transparent' : '2px solid var(--accent-sym)',
                    fontSize: '0.9em', borderRadius: '0 4px 4px 0',
                    transform: `translateX(${offsetX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.3s ease',
                    position: 'relative'
                }} 
                onClick={() => !n.is_read && markAsRead(n.id)}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !n.is_read) {
                        e.preventDefault();
                        markAsRead(n.id);
                    }
                }}
            >
                <div style={{ marginBottom: '5px' }}>{renderMessage(n)}</div>
                <div style={{ fontSize: '0.7em', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{new Date(n.created_at).toLocaleTimeString()}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }} style={{ background: 'none', border: 'none', color: '#666' }} aria-label="Delete">
                        <IconTrash size={12} />
                    </button>
                </div>
                {n.type === 'sym_request' && (
                    <div style={{ marginTop: '5px', display: 'flex', gap: '5px' }}>
                        <button onClick={(e) => { e.stopPropagation(); handleAction(n, 'accept'); }} style={{ fontSize: '0.7em', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IconCheck size={12} /> Accept
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleAction(n, 'decline'); }} style={{ fontSize: '0.7em', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-alert)', borderColor: 'var(--accent-alert)' }}>
                            <IconX size={12} /> Decline
                        </button>
                    </div>
                )}
            </div>
          </div>
      );
  };

  // --- Render Logic ---

  return (
    <div className="inbox-overlay fade-in" style={{
      position: 'fixed', top: '60px', right: '10px', width: 'min(360px, 95vw)',
      background: 'var(--drawer-bg)', border: '1px solid var(--border-color)', 
      backdropFilter: 'blur(10px)', padding: '0', borderRadius: '8px',
      zIndex: 'var(--z-dropdown)', height: '70vh', maxHeight: '600px', display: 'flex', flexDirection: 'column',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    }}>
      {/* Header / Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '10px 15px', alignItems: 'center', justifyContent: 'space-between' }}>
        {activeConversationId === null ? (
            <div style={{ display: 'flex', gap: '15px' }} role="tablist" aria-label="Inbox views">
                <button 
                    id="tab-alerts"
                    role="tab"
                    aria-selected={activeTab === 'alerts'}
                    aria-controls="panel-alerts"
                    onClick={() => setActiveTab('alerts')}
                    style={{ 
                        background: 'transparent', border: 'none', 
                        color: activeTab === 'alerts' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: activeTab === 'alerts' ? 'bold' : 'normal',
                        borderBottom: activeTab === 'alerts' ? '2px solid var(--accent-sym)' : '2px solid transparent',
                        paddingBottom: '5px',
                        display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                >
                    <IconBell size={16} aria-hidden="true" /> Alerts
                </button>
                <button 
                    id="tab-messages"
                    role="tab"
                    aria-selected={activeTab === 'messages'}
                    aria-controls="panel-messages"
                    onClick={() => setActiveTab('messages')}
                    style={{ 
                        background: 'transparent', border: 'none', 
                        color: activeTab === 'messages' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: activeTab === 'messages' ? 'bold' : 'normal',
                        borderBottom: activeTab === 'messages' ? '2px solid var(--accent-sym)' : '2px solid transparent',
                        paddingBottom: '5px',
                        display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                >
                    <IconMessage size={16} aria-hidden="true" /> Signals
                </button>
                <button
                    id="tab-requests"
                    role="tab"
                    aria-selected={activeTab === 'requests'}
                    aria-controls="panel-requests"
                    onClick={() => setActiveTab('requests')}
                    style={{
                        background: 'transparent', border: 'none',
                        color: activeTab === 'requests' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: activeTab === 'requests' ? 'bold' : 'normal',
                        borderBottom: activeTab === 'requests' ? '2px solid var(--accent-sym)' : '2px solid transparent',
                        paddingBottom: '5px',
                        display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                >
                    <IconUser size={16} aria-hidden="true" /> Reqs
                    {requests.length > 0 && <span style={{fontSize: '0.7em', background: 'var(--accent-alert)', padding: '0 4px', borderRadius: '4px', color: 'black'}}>{requests.length}</span>}
                </button>
            </div>
        ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => setActiveConversationId(null)} style={{ background: 'transparent', border: 'none', padding: 0 }} aria-label="Back">
                    <IconArrowLeft size={18} />
                </button>
                <span style={{ fontWeight: 'bold' }}>
                    {conversations.find(c => c.partner_id === activeConversationId)?.partner_name || 'Chat'}
                </span>
            </div>
        )}
        <div style={{ display: 'flex', gap: '5px' }}>
            {activeTab === 'alerts' && activeConversationId === null && (
                <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', padding: '4px' }} title="Mark all read" aria-label="Mark all read">
                    <IconChecklist size={18} aria-hidden="true" />
                </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', padding: '4px' }} title="Close" aria-label="Close">
                <IconX size={18} aria-hidden="true" />
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', position: 'relative' }}>
        
        {/* === ALERTS TAB === */}
        {activeTab === 'alerts' && (
            <div id="panel-alerts" role="tabpanel" aria-labelledby="tab-alerts">
                {loading && <div style={{ padding: '10px' }}><Skeleton height="20px" width="100%" marginBottom="10px" /></div>}
                
                {!loading && notifications.length === 0 && (
                    <div role="status" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <IconBellOff size={48} stroke={1} style={{ opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '1.1em' }}>Silence...</p>
                        <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.7 }}>No signals detected on this frequency.</p>
                    </div>
                )}

                {notifications.map(n => (
                    <SwipeableNotificationItem key={n.id} n={n} />
                ))}

                {/* Sym Links Footer */}
                <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                    <h5 style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)', fontSize: '0.85em' }}>Sym Links</h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {connections.map(c => (
                            <div key={c.user_id} 
                                style={{
                                    padding: '4px 8px', borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                                    fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: c.avatar_url ? `url(${c.avatar_url}) center/cover` : '#333' }}></div>
                                <span style={{ fontWeight: 'bold' }}>{c.username}</span>
                                <div style={{ height: '15px', width: '1px', background: 'var(--border-color)', margin: '0 2px' }}></div>
                                <button
                                    onClick={() => onOpenCommunique(c.user_id.toString())}
                                    style={{ background: 'none', border: 'none', padding: '0', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                    title="View Profile"
                                    aria-label={`View profile of ${c.username}`}
                                >
                                    <IconUser size={14} />
                                </button>
                                <button 
                                    onClick={() => { setActiveTab('messages'); setActiveConversationId(c.user_id); }}
                                    style={{ background: 'none', border: 'none', padding: '0', color: 'var(--accent-sym)', cursor: 'pointer' }}
                                    title="Whisper"
                                    aria-label={`Whisper to ${c.username}`}
                                >
                                    <IconMessage size={14} />
                                </button>
                            </div>
                        ))}
                        {connections.length === 0 && <span style={{ color: '#555', fontSize: '0.8em' }}>No connections yet.</span>}
                    </div>
                </div>
            </div>
        )}

        {/* === MESSAGES TAB (List) === */}
        {activeTab === 'messages' && activeConversationId === null && (
            <div id="panel-messages" role="tabpanel" aria-labelledby="tab-messages">
                {loading && <div style={{ padding: '10px' }}>Loading signals...</div>}
                {!loading && conversations.length === 0 && (
                    <div role="status" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <IconMessageOff size={48} stroke={1} style={{ opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '1.1em' }}>No Active Channels</p>
                        <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.7 }}>Initiate a whisper from your Sym Links.</p>
                    </div>
                )}
                {conversations.map(c => (
                    <div key={c.partner_id}
                        role="button" tabIndex={0}
                        onClick={() => setActiveConversationId(c.partner_id)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setActiveConversationId(c.partner_id);
                            }
                        }}
                        style={{
                            padding: '12px', borderBottom: '1px solid #ffffff11', cursor: 'pointer',
                            background: c.unread_count > 0 ? 'rgba(var(--accent-sym-rgb), 0.1)' : 'transparent',
                            display: 'flex', alignItems: 'center', gap: '10px'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: c.partner_avatar ? `url(${c.partner_avatar}) center/cover` : '#333', flexShrink: 0 }}></div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '0.95em' }}>{c.partner_name}</span>
                                <span style={{ fontSize: '0.75em', color: '#666' }}>{new Date(c.last_message_at).toLocaleDateString()}</span>
                            </div>
                            <div style={{ fontSize: '0.85em', color: c.unread_count > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.last_message_snippet}
                            </div>
                        </div>
                        {c.unread_count > 0 && (
                            <div style={{ background: 'var(--accent-sym)', color: 'black', fontSize: '0.7em', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                                {c.unread_count}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* === REQUESTS TAB (List) === */}
        {activeTab === 'requests' && activeConversationId === null && (
            <div id="panel-requests" role="tabpanel" aria-labelledby="tab-requests">
                {loading && <div style={{ padding: '10px' }}>Loading requests...</div>}
                {!loading && requests.length === 0 && (
                    <div role="status" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <IconUserOff size={48} stroke={1} style={{ opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '1.1em' }}>No Signal Requests</p>
                        <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.7 }}>The void is quiet.</p>
                    </div>
                )}
                {requests.map(c => (
                    <div key={c.partner_id}
                        role="button" tabIndex={0}
                        onClick={() => setActiveConversationId(c.partner_id)}
                        style={{
                            padding: '12px', borderBottom: '1px solid #ffffff11', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px'
                        }}
                    >
                         <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: c.partner_avatar ? `url(${c.partner_avatar}) center/cover` : '#333', flexShrink: 0 }}></div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '0.95em' }}>{c.partner_name}</span>
                                <span style={{ fontSize: '0.75em', color: '#666' }}>{new Date(c.last_message_at).toLocaleDateString()}</span>
                            </div>
                             <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                                {c.last_message_snippet}
                            </div>
                            <div style={{ fontSize: '0.7em', color: 'var(--accent-alert)', marginTop: '2px' }}>
                                Non-Sym Connection
                            </div>
                        </div>
                         {c.unread_count > 0 && (
                            <div style={{ background: 'var(--accent-alert)', color: 'black', fontSize: '0.7em', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                                {c.unread_count}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* === CHAT THREAD === */}
        {(activeTab === 'messages' || activeTab === 'requests') && activeConversationId !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '10px' }}>
                    {chatLoading && <div>Loading history...</div>}
                    {messages.map(m => {
                        const isMe = m.sender_id !== activeConversationId;
                        return (
                            <div key={m.id} style={{ 
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: '80%',
                                background: isMe ? 'var(--accent-sym)' : '#ffffff22',
                                color: isMe ? 'black' : 'var(--text-primary)',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                fontSize: '0.9em',
                                wordBreak: 'break-word'
                            }}>
                                {m.content}
                            </div>
                        );
                    })}
                    <div ref={chatBottomRef} />
                </div>
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
                    <div style={{
                        flex: 1,
                        background: '#00000044',
                        border: `1px solid ${isInputFocused ? 'var(--accent-sym)' : 'var(--border-color)'}`,
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 15px',
                        boxShadow: isInputFocused ? 'var(--glow-sym)' : 'none',
                        transition: 'all 0.2s'
                    }}>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            placeholder="Whisper..."
                            aria-label="Type a message"
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                padding: '8px 0',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <button onClick={sendMessage} disabled={!newMessage.trim()} aria-label="Send message" style={{ background: 'transparent', border: 'none', color: newMessage.trim() ? 'var(--accent-sym)' : '#555' }}>
                        <IconSend size={20} />
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Inbox;
