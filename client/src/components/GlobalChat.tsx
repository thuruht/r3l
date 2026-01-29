import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { IconSend, IconUsers, IconDoorExit, IconHash, IconMoodSmile, IconBroadcast } from '@tabler/icons-react';
import { useToast } from '../context/ToastContext';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

const ROOMS = [
  { name: 'global', label: 'Global', category: 'public' },
  { name: 'tech', label: 'Tech', category: 'public' },
  { name: 'art', label: 'Art', category: 'public' },
  { name: 'music', label: 'Music', category: 'public' },
];

interface Message {
  userId: number;
  username: string;
  content: string;
  timestamp: number;
}

const GlobalChat: React.FC = () => {
  const [room, setRoom] = useState('global');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [online, setOnline] = useState<{ userId: number; username: string }[]>([]);
  const [typing, setTyping] = useState<Set<string>>(new Set());
  const [showEmoji, setShowEmoji] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    connectRoom(room);
    return () => wsRef.current?.close();
  }, [room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connectRoom = (roomName: string) => {
    wsRef.current?.close();
    setMessages([]);
    setOnline([]);
    setTyping(new Set());

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/chat/${roomName}`);

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
      
      if (data.type === 'online') {
        setOnline(data.users);
      } else if (data.type === 'history') {
        setMessages(data.messages);
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, data]);
      } else if (data.type === 'join') {
        setOnline(prev => [...prev, { userId: data.userId, username: data.username }]);
        showToast(`${data.username} joined`, 'info');
      } else if (data.type === 'leave') {
        setOnline(prev => prev.filter(u => u.userId !== data.userId));
        setTyping(prev => { const next = new Set(prev); next.delete(data.username); return next; });
      } else if (data.type === 'typing') {
        setTyping(prev => {
          const next = new Set(prev);
          data.typing ? next.add(data.username) : next.delete(data.username);
          return next;
        });
      }
      } catch (err) {
        console.error('WebSocket parse error:', err, e.data);
      }
    };

    ws.onerror = () => showToast('Connection error', 'error');
    wsRef.current = ws;
  };

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'message', content: input }));
    setInput('');
    wsRef.current.send(JSON.stringify({ type: 'typing', typing: false }));
  };

  const handleTyping = (value: string) => {
    setInput(value);
    if (!wsRef.current) return;

    clearTimeout(typingTimeoutRef.current);
    wsRef.current.send(JSON.stringify({ type: 'typing', typing: true }));
    typingTimeoutRef.current = setTimeout(() => {
      wsRef.current?.send(JSON.stringify({ type: 'typing', typing: false }));
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', width: '100vw', background: 'var(--bg-color)', flexDirection: window.innerWidth < 768 ? 'column' : 'row', position: 'fixed', top: '60px', left: 0, zIndex: 900, overflow: 'hidden' }}>
      <div style={{ width: window.innerWidth < 768 ? '100%' : '200px', borderRight: window.innerWidth < 768 ? 'none' : '1px solid var(--border-color)', borderBottom: window.innerWidth < 768 ? '1px solid var(--border-color)' : 'none', padding: '20px', overflowX: window.innerWidth < 768 ? 'auto' : 'visible', display: 'flex', flexDirection: window.innerWidth < 768 ? 'row' : 'column', gap: '10px' }}>
        {window.innerWidth >= 768 && <h3 style={{ marginBottom: '15px' }}>Rooms</h3>}
        {ROOMS.map(r => (
          <button
            key={r.name}
            onClick={() => setRoom(r.name)}
            aria-pressed={room === r.name}
            aria-label={`Join ${r.label} room`}
            style={{
              width: window.innerWidth < 768 ? 'auto' : '100%',
              textAlign: 'left',
              padding: '10px',
              marginBottom: window.innerWidth < 768 ? '0' : '5px',
              background: room === r.name ? 'var(--accent-sym)' : 'var(--bg-secondary)',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <IconHash size={16} style={{ marginRight: '5px' }} />
            {r.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'var(--text-primary)' }}>#{room}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
            <IconUsers size={20} />
            {online.length}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {messages.length === 0 && (
             <div style={{
               display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
               height: '100%', color: 'var(--text-secondary)', textAlign: 'center', opacity: 0.7
             }}>
               <IconBroadcast size={48} stroke={1} style={{ marginBottom: '10px' }} />
               <p style={{ margin: 0, fontSize: '1.1em' }}>Frequency Silent</p>
               <p style={{ margin: 0, fontSize: '0.9em' }}>Be the first to transmit.</p>
             </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <strong style={{ color: 'var(--accent-sym)' }}>{msg.username}</strong>
                <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>{msg.content}</div>
            </div>
          ))}
          {typing.size > 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9em', fontStyle: 'italic' }}>
              {Array.from(typing).join(', ')} {typing.size === 1 ? 'is' : 'are'} typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', position: 'relative', background: 'var(--bg-color)' }}>
          {showEmoji && (
            <Suspense fallback={<div>Loading...</div>}>
              <div style={{ position: 'absolute', bottom: '60px', right: '20px', zIndex: 1001 }}>
                <EmojiPicker onEmojiClick={(e) => { setInput(prev => prev + e.emoji); setShowEmoji(false); }} theme="dark" />
              </div>
            </Suspense>
          )}
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            aria-label="Open emoji picker"
            style={{ padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
          >
            <IconMoodSmile size={20} color="var(--text-primary)" />
          </button>
          <input
            type="text"
            value={input}
            onChange={e => handleTyping(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={`Message #${room}`}
            aria-label={`Message #${room}`}
            style={{
              flex: 1,
              padding: '10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              outline: 'none',
              boxShadow: isFocused ? 'var(--glow-sym)' : 'none',
              transition: 'box-shadow 0.2s'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            aria-label="Send message"
            style={{ padding: '10px 20px' }}
          >
            <IconSend size={20} />
          </button>
        </div>
      </div>

      {window.innerWidth >= 1024 && (
        <div style={{ width: '200px', borderLeft: '1px solid var(--border-color)', padding: '20px', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>Online ({online.length})</h3>
          {online.map(u => (
            <div key={u.userId} style={{ padding: '5px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981ff' }} />
              {u.username}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalChat;
