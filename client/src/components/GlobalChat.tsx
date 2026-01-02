import React, { useState, useEffect, useRef } from 'react';
import { IconSend, IconUsers, IconDoorExit, IconHash } from '@tabler/icons-react';
import { useToast } from '../context/ToastContext';

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
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ width: '200px', borderRight: '1px solid var(--border-color)', padding: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Rooms</h3>
        {ROOMS.map(r => (
          <button
            key={r.name}
            onClick={() => setRoom(r.name)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px',
              marginBottom: '5px',
              background: room === r.name ? 'var(--accent-sym)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <IconHash size={16} style={{ marginRight: '5px' }} />
            {r.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>#{room}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
            <IconUsers size={20} />
            {online.length}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                <strong style={{ color: 'var(--accent-sym)' }}>{msg.username}</strong>
                <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ color: 'var(--text-primary)' }}>{msg.content}</div>
            </div>
          ))}
          {typing.size > 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9em', fontStyle: 'italic' }}>
              {Array.from(typing).join(', ')} {typing.size === 1 ? 'is' : 'are'} typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={input}
            onChange={e => handleTyping(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={`Message #${room}`}
            style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
          />
          <button onClick={sendMessage} disabled={!input.trim()} style={{ padding: '10px 20px' }}>
            <IconSend size={20} />
          </button>
        </div>
      </div>

      <div style={{ width: '200px', borderLeft: '1px solid var(--border-color)', padding: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Online ({online.length})</h3>
        {online.map(u => (
          <div key={u.userId} style={{ padding: '5px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981ff' }} />
            {u.username}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalChat;
