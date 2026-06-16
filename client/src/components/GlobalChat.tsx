import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import * as TablerIcons from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';
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

interface GlobalChatProps {
  onClose: () => void;
}

const GlobalChat: React.FC<GlobalChatProps> = ({ onClose }) => {
  const [room, setRoom] = useState('global');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<{userId: number, username: string}[]>([]);
  const [online, setOnline] = useState<{ userId: number; username: string }[]>([]);
  const [typing, setTyping] = useState<Set<string>>(new Set());
  const [showEmoji, setShowEmoji] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--bg-color)', overflow: 'hidden' }}>
      {/* Compact room tabs + online count header */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', flexShrink: 0, gap: '2px', padding: '4px' }}>
        {ROOMS.map(r => (
          <button
            key={r.name}
            onClick={() => setRoom(r.name)}
            aria-pressed={room === r.name}
            style={{
              padding: '6px 10px',
              background: room === r.name ? 'var(--accent-sym)' : 'transparent',
              border: room === r.name ? '1px solid var(--accent-sym)' : '1px solid transparent',
              borderRadius: '4px',
              color: room === r.name ? '#000' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '0.8rem',
              fontWeight: room === r.name ? '700' : 'normal',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <TablerIcons.IconHash size={12} />
            {r.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '4px', flexShrink: 0 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <TablerIcons.IconUsers size={12} />{online.length}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.7 }}>
            <TablerIcons.IconBroadcast size={ICON_SIZES['2xl']} stroke={1} />
            <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '0.9em' }}>Frequency Silent</p>
            <p style={{ fontSize: '0.8em' }}>Be the first to broadcast.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--accent-sym)', fontSize: '0.85em' }}>{msg.username}</strong>
              <span style={{ fontSize: '0.72em', color: 'var(--text-secondary)' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div style={{ color: 'var(--text-primary)', wordBreak: 'break-word', fontSize: '0.9em', marginTop: '2px' }}>{msg.content}</div>
          </div>
        ))}
        {typing.size > 0 && (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8em', fontStyle: 'italic' }}>
            {Array.from(typing).join(', ')} {typing.size === 1 ? 'is' : 'are'} typing…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '8px',
        paddingBottom: 'calc(8px + var(--safe-area-bottom))',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        gap: '6px',
        position: 'relative',
        background: 'var(--bg-color)',
        flexShrink: 0,
      }}>
        {showEmoji && (
          <Suspense fallback={null}>
            <div style={{ position: 'absolute', bottom: '56px', right: '8px', zIndex: 'var(--z-dropdown)' }}>
              <EmojiPicker onEmojiClick={(e) => { setInput(prev => prev + e.emoji); setShowEmoji(false); }} theme="dark" />
            </div>
          </Suspense>
        )}
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          aria-label="Toggle emoji picker"
          title="Add Emoji"
          style={{ padding: '8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}
        >
          <TablerIcons.IconMoodSmile size={ICON_SIZES.lg} color="var(--text-primary)" />
        </button>
        <input
          type="text"
          value={input}
          onChange={e => handleTyping(e.target.value)}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder={`#${room}`}
          style={{
            flex: 1,
            padding: '8px 10px',
            background: 'var(--bg-mist)',
            border: `1px solid ${isInputFocused ? 'var(--accent-sym)' : 'var(--border-color)'}`,
            borderRadius: '4px',
            color: 'var(--text-primary)',
            outline: 'none',
            fontSize: '0.875rem',
            minWidth: 0,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          aria-label="Send message"
          title="Send"
          style={{ padding: '8px 12px', cursor: input.trim() ? 'pointer' : 'not-allowed', opacity: input.trim() ? 1 : 0.5, flexShrink: 0 }}
        >
          <TablerIcons.IconSend size={ICON_SIZES.lg} />
        </button>
      </div>
    </div>
  );
};

export default GlobalChat;
