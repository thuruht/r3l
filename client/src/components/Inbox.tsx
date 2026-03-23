// Inbox.tsx

import React, { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { IconX, IconCheck, IconChecklist, IconTrash, IconMessage, IconBell, IconArrowLeft, IconSend, IconUser, IconMoodSmile, IconMessageOff, IconUserOff, IconBellOff, IconFile, IconBolt, IconPlugConnected } from '@tabler/icons-react';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';
import { ICON_SIZES } from '@/constants/iconSizes';

import { useOutsideClick } from '../hooks/useOutsideClick';

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
  is_encrypted?: number;
  decryption_failed?: boolean;
}

const Inbox: React.FC<InboxProps> = ({ onClose, onOpenCommunique }) => {
  const [items, setItems] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [connections, setConnections] = useState<any[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const panelRef = useRef<HTMLDivElement>(null);

  useOutsideClick(panelRef, onClose);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [notifRes, msgRes, relRes] = await Promise.all([
        fetch('/api/notifications'),
        fetch('/api/messages/conversations'),
        fetch('/api/relationships')
      ]);

      const notifData = await notifRes.json();
      const msgData = await msgRes.json();
      const relData = await relRes.json();

      const mutualIds = new Set((relData.mutual || []).map((c: any) => c.user_id));
      setConnections(relData.mutual || []);

      const notifications = (notifData.notifications || []).map((n: any) => ({
        ...n,
        feedType: 'notification',
        timestamp: new Date(n.created_at).getTime(),
        payload: typeof n.payload === 'string' ? JSON.parse(n.payload) : n.payload
      }));

      const conversations = (msgData.conversations || []).map((c: any) => ({
        ...c,
        feedType: mutualIds.has(c.partner_id) ? 'whisper' : 'request',
        timestamp: new Date(c.last_message_at).getTime(),
      }));

      // Merge and sort
      const merged = [...notifications, ...conversations].sort((a, b) => b.timestamp - a.timestamp);
      setItems(merged);
    } catch (err) {
      console.error(notifRes, msgRes, relRes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
      // Mark as read
      fetch(`/api/messages/${activeConversationId}/read`, { method: 'PUT' })
        .then(() => fetchAll()); 
    }
  }, [activeConversationId, fetchAll]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
                } catch {
                  return { ...msg, content: '[Encrypted — key unavailable]', decryption_failed: true };
                }
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
      let payload: any = { receiver_id: activeConversationId, content: newMessage };
      
      const storedKeys = localStorage.getItem('relf_keys');
      if (storedKeys) {
        try {
          const { encryptMessageForUser, b64ToBytes, bytesToB64 } = await import('../utils/crypto');
          const partnerKey = await fetch(`/api/users/${activeConversationId}`).then(r => r.json()).then(d => d.user?.public_key);
          if (partnerKey) {
            const { encryptedContent, encryptedKey } = await encryptMessageForUser(newMessage, partnerKey);
            const combined = b64ToBytes(encryptedContent);
            const iv = bytesToB64(combined.slice(0, 12).buffer);
            
            payload = { 
                receiver_id: activeConversationId, 
                content: encryptedContent, 
                encrypt: true, 
                encrypted_key: encryptedKey,
                iv: iv 
            };
          }
        } catch (e) {
            console.error("Encryption failed:", e);
        }
      }
      
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const optimistic: Message = {
          id: Date.now(),
          sender_id: -1, // sentinel
          receiver_id: activeConversationId,
          content: newMessage,
          created_at: new Date().toISOString(),
          is_encrypted: payload.encrypted_key ? 1 : 0,
        };
        setMessages(prev => [...prev, optimistic]);
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
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PUT' });
      if (res.ok) {
        fetchAll();
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
              fetchAll();
          }
      } catch (e) {
          showToast('Error removing notification.', 'error');
      }
  };

  const renderNotifIcon = (type: string) => {
      switch(type) {
          case 'sym_request': return <IconPlugConnected size={18} color="var(--accent-sym)" />;
          case 'sym_accepted': return <IconCheck size={18} color="var(--accent-sym)" />;
          case 'file_shared': return <IconFile size={18} color="var(--accent-sym)" />;
          case 'system_alert': return <IconBolt size={18} color="var(--accent-alert)" />;
          default: return <IconBell size={18} color="var(--text-secondary)" />;
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
      case 'sym_request': return <>{actorLink} requests a signal connection.{n.payload?.file_id && <span style={{ marginLeft: '6px', fontSize: '0.8em', color: 'var(--accent-sym)', opacity: 0.8 }}>📎 artifact attached</span>}</>;
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
                      padding: '0 20px', borderRadius: '4px',
                      opacity: Math.abs(offsetX) / 100
                  }}
              >
                 {offsetX > 0 && <IconCheck size={ICON_SIZES.xl} color="var(--accent-sym)" />}
                 {offsetX < 0 && <IconTrash size={ICON_SIZES.xl} color="var(--accent-alert)" />}
              </div>
              <div 
                role="button" tabIndex={0}
                style={{ 
                    padding: '12px', 
                    background: n.is_read ? 'transparent' : 'rgba(255,255,255,0.03)',
                    borderLeft: n.is_read ? '2px solid transparent' : '2px solid var(--accent-sym)',
                    fontSize: '0.9em', borderRadius: '4px',
                    transform: `translateX(${offsetX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.3s ease',
                    position: 'relative',
                    display: 'flex', gap: '12px', alignItems: 'center'
                }} 
                onClick={() => !n.is_read && markAsRead(n.id)}
            >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--drawer-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {renderNotifIcon(n.type)}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '5px' }}>{renderMessage(n)}</div>
                    <div style={{ fontSize: '0.7em', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{new Date(n.created_at).toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
          </div>
      );
  };

  return (
    <div ref={panelRef} className="inbox-overlay fade-in" style={{
      position: 'fixed', top: 'var(--header-height)', right: '10px', width: 'min(360px, 95vw)',
      background: 'var(--drawer-bg)', border: '1px solid var(--border-color)',
      backdropFilter: 'blur(10px)', padding: '0', borderRadius: '8px',
      zIndex: 'var(--z-modal)', height: 'calc(100vh - var(--header-height) - 20px)', maxHeight: '800px', display: 'flex', flexDirection: 'column',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    }}>

      {/* Header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '10px 15px', alignItems: 'center', justifyContent: 'space-between' }}>
        {activeConversationId === null ? (
            <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconMessage size={20} /> {"< mail >"}
            </span>
        ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => setActiveConversationId(null)} style={{ background: 'transparent', border: 'none', padding: 0 }} aria-label="Back">
                    <IconArrowLeft size={ICON_SIZES.lg} />
                </button>
                <span style={{ fontWeight: 'bold' }}>
                    {items.find(i => i.partner_id === activeConversationId)?.partner_name || 'Chat'}
                </span>
            </div>
        )}
        <div style={{ display: 'flex', gap: '5px' }}>
            {activeConversationId === null && (
                <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', padding: '4px' }} title="Mark all read" aria-label="Mark all read">
                    <IconChecklist size={ICON_SIZES.lg} aria-hidden="true" />
                </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', padding: '4px' }} title="Close" aria-label="Close">
                <IconX size={ICON_SIZES.lg} aria-hidden="true" />
            </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', position: 'relative' }}>
        
        {activeConversationId === null ? (
            <div role="feed" aria-label="Mail Stream">
                {loading && <div style={{ padding: '10px' }}><Skeleton height="20px" width="100%" marginBottom="10px" /></div>}
                
                {!loading && items.length === 0 && (
                    <div role="status" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <IconBellOff size={ICON_SIZES['2xl']} stroke={1} style={{ opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '1.1em' }}>Silence...</p>
                        <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.7 }}>The mail stream is empty.</p>
                    </div>
                )}

                {items.map(item => {
                    if (item.feedType === 'notification') {
                        return <SwipeableNotificationItem key={`n-${item.id}`} n={item} />;
                    } else {
                        const isReq = item.feedType === 'request';
                        return (
                            <div key={`c-${item.partner_id}`}
                                role="button" tabIndex={0}
                                onClick={() => setActiveConversationId(item.partner_id)}
                                style={{
                                    padding: '12px', borderBottom: '1px solid #ffffff11', cursor: 'pointer',
                                    background: item.unread_count > 0 ? 'rgba(var(--accent-sym-rgb), 0.1)' : 'transparent',
                                    display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', borderRadius: '4px'
                                }}
                            >
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--drawer-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {isReq ? <IconUser size={18} color="var(--accent-alert)" /> : <IconMessage size={18} color="var(--accent-sym)" />}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '0.95em' }}>{item.partner_name}</span>
                                        <span style={{ fontSize: '0.75em', color: '#666' }}>{new Date(item.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <div style={{ fontSize: '0.85em', color: item.unread_count > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.last_message_snippet}
                                    </div>
                                    {isReq && <div style={{ fontSize: '0.7rem', color: 'var(--accent-alert)' }}>A-Sym Signal</div>}
                                </div>
                                {item.unread_count > 0 && (
                                    <div style={{ background: isReq ? 'var(--accent-alert)' : 'var(--accent-sym)', color: 'black', fontSize: '0.7em', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                                        {item.unread_count}
                                    </div>
                                )}
                            </div>
                        );
                    }
                })}
            </div>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '10px' }}>
                    {chatLoading && <div>Loading history...</div>}
                    {messages.map(m => {
                        const isMe = m.sender_id !== activeConversationId;
                        return (
                            <div key={m.id} style={{
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: '80%',
                            }}>
                                <div style={{
                                    background: isMe ? 'var(--accent-sym)' : '#ffffff22',
                                    color: isMe ? 'black' : 'var(--text-primary)',
                                    padding: '8px 12px',
                                    borderRadius: '12px',
                                    fontSize: '0.9em',
                                    wordBreak: 'break-word',
                                    opacity: m.decryption_failed ? 0.6 : 1,
                                    fontStyle: m.decryption_failed ? 'italic' : 'normal',
                                }}>
                                    {m.content}
                                </div>
                                {m.is_encrypted === 1 && (
                                    <div style={{ fontSize: '0.65em', color: m.decryption_failed ? 'var(--accent-alert)' : '#888', textAlign: isMe ? 'right' : 'left', marginTop: '2px' }}>
                                        {m.decryption_failed ? '⚠ decryption failed' : '🔒 encrypted'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div ref={chatBottomRef} />
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', gap: '10px', position: 'relative' }}>
                    {showEmoji && (
                        <Suspense fallback={<div>...</div>}>
                            <div style={{ position: 'absolute', bottom: '60px', right: '10px', zIndex: 'var(--z-dropdown)' }}>
                                <EmojiPicker onEmojiClick={(e) => { setNewMessage(prev => prev + e.emoji); setShowEmoji(false); }} theme="dark" />
                            </div>
                        </Suspense>
                    )}
                    <button onClick={() => setShowEmoji(!showEmoji)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <IconMoodSmile size={ICON_SIZES.xl} />
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
                        <IconSend size={ICON_SIZES.xl} />
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Inbox;
