import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { IconX, IconCheck, IconChecklist } from '@tabler/icons-react'; // Added IconChecklist
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext'; // Added

interface InboxProps {
  onClose: () => void;
  onOpenCommunique: (userId: string) => void;
}

interface Notification {
  id: number;
  type: 'sym_request' | 'sym_accepted' | 'file_shared' | 'system_alert';
  actor_name?: string;
  actor_id?: number;
  payload: string;
  is_read: number;
  created_at: string;
}

const Inbox: React.FC<InboxProps> = ({ onClose, onOpenCommunique }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast(); // Added

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (notifications.length > 0 && listRef.current) {
        gsap.fromTo(listRef.current.children,
            { opacity: 0, x: 20 },
            { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
        );
    }
  }, [notifications]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        showToast('All notifications marked as read.', 'success');
      } else {
        showToast('Failed to mark all as read.', 'error');
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
      case 'file_shared': return <>{actorLink} shared an artifact.</>;
      case 'system_alert': return 'System Alert';
      default: return 'New signal received.';
    }
  };

  return (
    <div className="inbox-overlay fade-in" style={{
      position: 'absolute', top: '60px', right: '20px', width: '300px',
      background: '#000000dd', border: '1px solid var(--border-color)', 
      backdropFilter: 'blur(10px)', padding: '15px', borderRadius: '8px',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Inbox</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', padding: '4px', display: 'flex' }} title="Mark all as read">
                <IconChecklist size={18} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                <IconX size={18} />
            </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '10px' }}>
            <Skeleton height="20px" width="90%" marginBottom="10px" />
            <Skeleton height="20px" width="80%" marginBottom="10px" />
            <Skeleton height="20px" width="95%" marginBottom="10px" />
        </div>
      )}

      <div ref={listRef} style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {notifications.length === 0 && !loading && (
          <div style={{ padding: '10px', textAlign: 'center', color: '#444', fontSize: '0.8em' }}>Silence...</div>
        )}
        
        {!loading && notifications.map(n => (
          <div key={n.id} style={{ 
            padding: '10px', 
            marginBottom: '8px', 
            background: n.is_read ? 'transparent' : '#ffffff08',
            borderLeft: n.is_read ? '2px solid transparent' : '2px solid var(--accent-sym)',
            fontSize: '0.9em',
            borderRadius: '0 4px 4px 0'
          }} onClick={() => !n.is_read && markAsRead(n.id)}>
            <div style={{ color: 'var(--text-primary)', marginBottom: '5px' }}>
              {renderMessage(n)}
            </div>
            <div style={{ fontSize: '0.7em', color: '#666' }}>
              {new Date(n.created_at).toLocaleTimeString()}
            </div>
            
            {n.type === 'sym_request' && (
              <div style={{ marginTop: '5px', display: 'flex', gap: '5px' }}>
                <button onClick={(e) => { e.stopPropagation(); handleAction(n, 'accept'); }} style={{ fontSize: '0.7em', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <IconCheck size={12} /> Accept
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleAction(n, 'decline'); }} style={{ fontSize: '0.7em', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', background: '#330000', borderColor: 'var(--accent-alert)', color: 'var(--accent-alert)' }}>
                    <IconX size={12} /> Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Inbox;
