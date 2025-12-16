// App.tsx

import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { IconRadar2, IconHelp, IconList, IconChartCircles } from '@tabler/icons-react';
import AssociationWeb from './components/AssociationWeb';
import NetworkList from './components/NetworkList';
import CommuniquePage from './components/CommuniquePage';
import Inbox from './components/Inbox';
import FAQ from './components/FAQ';
import { ToastProvider, useToast } from './context/ToastContext';
import { useNetworkData } from './hooks/useNetworkData';
import './styles/global.css';

interface User {
  id: number;
  username: string;
  avatar_url?: string;
}

function Main() {
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isFAQOpen, setIsFAQOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrifting, setIsDrifting] = useState(false);
  const [driftData, setDriftData] = useState<{ users: any[], files: any[] }>({ users: [], files: [] });
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const { nodes, links, refresh: refreshNetwork } = useNetworkData({
    currentUserId: currentUser?.id || null,
    isDrifting,
    driftData
  });

  // Setup WebSocket for real-time notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    // Use current host, upgrade to wss:// if https://
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/do-websocket`;

    let ws: WebSocket;
    let reconnectTimer: any;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        // Optionally send auth or init message if needed (though we rely on cookie)
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_notification') {
            showToast(`New signal: ${data.notificationType}`, 'info');
            setUnreadCount(prev => prev + 1);
            refreshNetwork();
          }
        } catch (e) {
          console.error("WS message parse error", e);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error", err);
        ws.close();
      };
    };

    connect();

    // Initial fetch of unread count
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          const unread = data.notifications.filter((n: any) => n.is_read === 0).length;
          setUnreadCount(unread);
        }
      } catch (e) {
        console.error("Bg fetch error", e);
      }
    };
    fetchUnread();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [isAuthenticated, refreshNetwork, showToast]);

  useEffect(() => {
    // Check if user is already logged in (e.g., via existing cookie)
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isDrifting) {
      const fetchDriftData = async () => {
        try {
          const response = await fetch('/api/drift');
          if (response.ok) {
            const data = await response.json();
            setDriftData(data);
            showToast('Drift radar active. Scanning...', 'info');
          } else {
            const err: { error?: string } = await response.json();
            showToast(err.error || 'Drift failed', 'error');
            setIsDrifting(false);
          }
        } catch (error) {
          console.error('Failed to fetch drift data:', error);
          showToast('Drift signal lost', 'error');
          setIsDrifting(false);
        }
      };
      fetchDriftData();
    } else {
      setDriftData({ users: [], files: [] }); // Clear data when not drifting
    }
  }, [isDrifting]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        showToast(`Welcome back, ${data.user.username}`, 'success');
      } else {
        const errorData = await response.json();
        setAuthError(errorData.error || 'Login failed');
        showToast(errorData.error || 'Login failed', 'error');
      }
    } catch (error) {
      setAuthError('Network error during login');
      showToast('Network error during login', 'error');
      console.error('Login error:', error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      });
      if (response.ok) {
        showToast('Registration successful! Please log in.', 'success');
        setIsRegistering(false); // Switch to login form
        setAuthError(null);
      } else {
        const errorData = await response.json();
        setAuthError(errorData.error || 'Registration failed');
        showToast(errorData.error || 'Registration failed', 'error');
      }
    } catch (error) {
      setAuthError('Network error during registration');
      showToast('Network error during registration', 'error');
      console.error('Register error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setCurrentUser(null);
      showToast('Logged out', 'info');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const onNodeClick = (userId: string) => {
    navigate(`/communique/${userId}`);
  };

  const toggleDrift = () => {
    setIsDrifting(!isDrifting);
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <h1>Welcome to Rel F</h1>
        <h2>{isRegistering ? 'Register' : 'Login'}</h2>
        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {isRegistering && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
          {authError && <p style={{ color: 'red' }}>{authError}</p>}
          <button type="submit">{isRegistering ? 'Register' : 'Login'}</button>
        </form>
        <button onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </div>
    );
  }

  // Hide UI overlays if on Communique page?
  const isCommuniquePage = location.pathname.startsWith('/communique');

  return (
    <>
      {/* UI Overlay for global controls (Visible everywhere or just on home? Let's keep it visible for navigation) */}
      {!isCommuniquePage && (
        <div className="overlay-ui">
            <h1>Rel F</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            System Date: {new Date().toLocaleDateString()}
            </p>
            {currentUser && (
            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '10px' }}>Logged in as: {currentUser.username}</span>
                <button onClick={() => setViewMode(viewMode === 'graph' ? 'list' : 'graph')} title="Toggle View" style={{ marginRight: '10px' }}>
                {viewMode === 'graph' ? <IconList size={18} /> : <IconChartCircles size={18} />}
                </button>
                <button onClick={toggleDrift} title="Toggle Drift" className={isDrifting ? 'active' : ''} style={{ marginRight: '10px' }}>
                <IconRadar2 size={18} />
                </button>
                <button onClick={() => { setIsInboxOpen(!isInboxOpen); setUnreadCount(0); }} style={{ marginRight: '10px', position: 'relative' }}>
                Inbox
                {unreadCount > 0 && (
                    <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: 'var(--accent-alert)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                    }}>
                    {unreadCount}
                    </span>
                )}
                </button>
                <button onClick={() => setIsFAQOpen(true)} title="Help" style={{ marginRight: '10px', padding: '5px 10px' }}>
                <IconHelp size={18} />
                </button>
                <button onClick={handleLogout}>Logout</button>
            </div>
            )}
        </div>
      )}

      {isFAQOpen && <FAQ onClose={() => setIsFAQOpen(false)} />}
      {isInboxOpen && <Inbox onClose={() => setIsInboxOpen(false)} onOpenCommunique={onNodeClick} />}

      <Routes>
        <Route path="/" element={
          viewMode === 'graph' ? (
            <AssociationWeb
              onNodeClick={onNodeClick}
              nodes={nodes}
              links={links}
              isDrifting={isDrifting}
            />
          ) : (
            <NetworkList
              nodes={nodes}
              onNodeClick={onNodeClick}
              />
          )
        } />
        <Route path="/communique/:userId" element={<CommuniquePage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <Main />
    </ToastProvider>
  );
}

export default App;