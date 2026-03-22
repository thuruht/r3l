import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  IconRadar2, IconLogout, IconMessage, IconInfoCircle, IconHelp, IconMenu2, IconX,
  IconChartCircles, IconList, IconFolder, IconPalette, IconDashboard, IconUsers, IconSettings
} from '@tabler/icons-react';
import { ICON_SIZES } from './constants/iconSizes';
import AssociationWeb from './components/AssociationWeb';
import NetworkList from './components/NetworkList';
import Inbox from './components/Inbox';
import GroupChat from './components/GroupChat';
import CommuniquePage from './components/CommuniquePage';
import About from './components/About';
import FAQ from './components/FAQ';
import PrivacyPolicy from './components/PrivacyPolicy';
import AdminDashboard from './components/AdminDashboard';
import VerifyEmail from './components/VerifyEmail';
import ResetPassword from './components/ResetPassword';
import CollectionsManager from './components/CollectionsManager';
import WorkspacesManager from './components/WorkspacesManager';
import FeedbackModal from './components/FeedbackModal';
import FilePreviewModal from './components/FilePreviewModal';
import { useOutsideClick } from './hooks/useOutsideClick';
import SettingsPage from './pages/SettingsPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CustomizationProvider } from './context/CustomizationContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { useNetworkData } from './hooks/useNetworkData';
import { SearchBar, RandomUserButton } from './components/UserDiscovery';
import AmbientBackground from './components/AmbientBackground';

import './styles/global.css';
import './styles/App.css';

interface User {
  id: number;
  username: string;
  avatar_url?: string;
}

function Main() {
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isGroupChatOpen, setIsGroupChatOpen] = useState(false);
  const [isFAQOpen, setIsFAQOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isWorkspacesOpen, setIsWorkspacesOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isDrifting, setIsDrifting] = useState(false);
  const [driftType, setDriftType] = useState<string>('');
  const [driftData, setDriftData] = useState<{ users: any[]; files: any[]; collections: any[] }>({ users: [], files: [], collections: [] });
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [driftHistory, setDriftHistory] = useState<Array<{ id: string; name: string; type: 'user' | 'file'; mime_type?: string; timestamp: number }>>([]);
  const [showDriftHistory, setShowDriftHistory] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResendVerify, setIsResendVerify] = useState(false);
  const [resendEmail, setResendEmail] = useState('');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regEmail, setRegEmail] = useState('');

  const wsRef = useRef<WebSocket | null>(null);

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshNetworkRef = useRef<() => void>(() => {});

  // Close menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMenuOpen]);

  // Global Escape key — close topmost open modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (previewFile) { setPreviewFile(null); return; }
      if (isSettingsOpen) { setIsSettingsOpen(false); return; }
      if (isInboxOpen) { setIsInboxOpen(false); return; }
      if (isGroupChatOpen) { setIsGroupChatOpen(false); return; }
      if (isCollectionsOpen) { setIsCollectionsOpen(false); return; }
      if (isWorkspacesOpen) { setIsWorkspacesOpen(false); return; }
      if (isAdminOpen) { setIsAdminOpen(false); return; }
      if (isFeedbackOpen) { setIsFeedbackOpen(false); return; }
      if (isFAQOpen) { setIsFAQOpen(false); return; }
      if (isAboutOpen) { setIsAboutOpen(false); return; }
      if (isMenuOpen) { setIsMenuOpen(false); return; }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [previewFile, isSettingsOpen, isInboxOpen, isGroupChatOpen, isCollectionsOpen, isWorkspacesOpen, isAdminOpen, isFeedbackOpen, isFAQOpen, isAboutOpen, isMenuOpen]);

  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchDrift = useCallback(async (type: string = '') => {
    try {
      const query = type ? `?type=${type}` : '';
      const res = await fetch(`/api/drift${query}`);
      if (res.ok) setDriftData(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Debounced reconnect — defined before useEffect so the dependency is stable
  const connectWebSocket = useCallback(() => {
    // Guard: don't stack connections
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/do-websocket`);
    wsRef.current = socket;

    socket.onopen = () => {
      setWs(socket);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'presence_sync') {
          setOnlineUserIds(new Set(msg.onlineUserIds));
        } else if (msg.type === 'presence_update') {
          setOnlineUserIds(prev => {
            const next = new Set(prev);
            if (msg.status === 'online') next.add(msg.userId);
            else next.delete(msg.userId);
            return next;
          });
        } else if (msg.type === 'new_notification') {
          if (msg.notificationType === 'system_alert') {
            showToast(`SYSTEM ALERT: ${msg.payload?.message}`, 'error');
          } else {
            showToast(`New Notification: ${msg.notificationType}`, 'info');
            setUnreadCount(prev => prev + 1);
            refreshNetworkRef.current();
          }
        } else if (msg.type === 'new_message') {
          showToast(`New Whisper from ${msg.sender_name || `user ${msg.sender_id}`}`, 'info');
          setUnreadCount(prev => prev + 1);
        } else if (msg.type === 'signal_artifact') {
          // Use ref to avoid stale closure over isDrifting
          fetchDrift();
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    socket.onclose = () => {
      setWs(null);
      wsRef.current = null;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(connectWebSocket, 3000);
    };

    socket.onerror = () => socket.close();
  }, [showToast, fetchDrift]);

  useEffect(() => {
    fetch('/api/users/me')
      .then(res => { if (res.ok) return res.json(); throw new Error('Unauthorized'); })
      .then(data => { setCurrentUser(data.user); setLoadingUser(false); connectWebSocket(); })
      .catch(() => setLoadingUser(false));

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  const toggleDrift = () => {
    const newState = !isDrifting;
    setIsDrifting(newState);
    if (newState) {
      fetchDrift(driftType);
      showToast('Drift Mode: Scanning frequency...', 'info');
      navigate('/');
    } else {
      showToast('Drift Mode: Disengaged.', 'info');
      setShowDriftHistory(false);
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();
      showToast(data.message || 'Verification email sent.', 'success');
      setIsResendVerify(false);
      setResendEmail('');
    } catch { showToast('Request failed', 'error'); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      showToast(data.message || 'Reset link sent if email exists.', 'success');
      setIsForgotPassword(false);
      setForgotEmail('');
    } catch { showToast('Request failed', 'error'); }
  };

  const cycleDriftType = (e: React.MouseEvent) => {
    e.stopPropagation();
    const types = ['', 'image', 'audio', 'text'];
    const nextType = types[(types.indexOf(driftType) + 1) % types.length];
    setDriftType(nextType);
    showToast(`Drift Filter: ${nextType || 'All'}`, 'info');
    if (isDrifting) fetchDrift(nextType);
  };

  const { nodes, links, collections, refresh: refreshNetwork, loading } = useNetworkData({
    currentUserId: currentUser?.id || null,
    meUsername: currentUser?.username,
    meAvatarUrl: currentUser?.avatar_url,
    isDrifting,
    driftData,
    onlineUserIds,
  });

  useEffect(() => { refreshNetworkRef.current = refreshNetwork; }, [refreshNetwork]);

  // Track drift encounters in session history
  useEffect(() => {
    if (!isDrifting) return;
    const now = Date.now();
    const newEntries: typeof driftHistory = [
      ...driftData.users.map(u => ({ id: `u-${u.id}`, name: u.username, type: 'user' as const, timestamp: now })),
      ...driftData.files.map(f => ({ id: `f-${f.id}`, name: f.filename, type: 'file' as const, mime_type: f.mime_type, timestamp: now })),
      ...driftData.collections.map(col => ({ id: `col-${col.id}`, name: col.name, type: 'file' as const, mime_type: 'collection', timestamp: now }))
    ];
    setDriftHistory(prev => {
      const existingIds = new Set(prev.map(e => e.id));
      const fresh = newEntries.filter(e => !existingIds.has(e.id));
      return [...fresh, ...prev].slice(0, 50); // cap at 50
    });
  }, [driftData, isDrifting]);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.reload();
  };

  const onNodeClick = (nodeId: string) => {
    if (nodeId.startsWith('file-')) {
      const node = nodes.find(n => n.id === nodeId);
      if (node?.data) setPreviewFile(node.data);
    } else if (nodeId.startsWith('col-')) {
      const node = nodes.find(n => n.id === nodeId);
      if (node?.data) showToast(`Collection: ${node.data.name} (${node.data.file_count ?? 0} files) by ${node.data.owner_username}`, 'info');
    } else if (nodeId === 'me' && currentUser) {
      navigate(`/communique/${currentUser.id}`);
    } else {
      navigate(`/communique/${nodeId}`);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) { setCurrentUser(data.user); connectWebSocket(); }
      else {
        showToast(data.error, 'error');
        if (data.needs_verification) setIsResendVerify(true);
      }
    } catch { showToast('Login failed', 'error'); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword, email: regEmail }),
      });
      const data = await res.json();
      if (res.ok) { showToast('Registration successful! Check your email.', 'success'); setIsRegistering(false); }
      else showToast(data.error, 'error');
    } catch { showToast('Registration failed', 'error'); }
  };

  const isAdmin = currentUser?.id === 1;

  if (loadingUser) {
    return (
      <div className="loading-container">
        <div className="radar-scan"></div>
        <div>Establishing Uplink...</div>
      </div>
    );
  }

  return (
    <>
      {!currentUser && !['/verify', '/reset-password'].includes(location.pathname) ? (
        <div className="login-container">
          <h1 className="glitch" data-text="REL F">REL F</h1>
          <p className="subtitle">R E L A T I O N A L &nbsp; E P H E M E R A L &nbsp; F I L E N E T</p>
          <div className="login-grid">
            <div className="info-card">
              <IconChartCircles size={ICON_SIZES['2xl']} color="var(--accent-alert)" />
              <h3>VITALITY</h3>
              <p>Data requires energy. Artifacts decay without attention. Boost signals to keep them alive, or let them fade.</p>
            </div>
            <div className="info-card">
              <IconRadar2 size={ICON_SIZES['2xl']} color="var(--accent-sym)" />
              <h3>THE DRIFT</h3>
              <p>Tune your radar to detect faint signals from the void. Discover artifacts and users floating in the digital ether.</p>
            </div>
            <div className="login-form-card">
              <h2>{isRegistering ? 'INITIALIZE NODE' : 'RESUME BROADCAST'}</h2>
              <form onSubmit={isRegistering ? handleRegister : handleLogin}>
                <input type="text" placeholder="Username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
                {isRegistering && (
                  <input type="email" placeholder="Email (for verification)" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
                )}
                <input type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                <button type="submit" className="primary-btn">
                  {isRegistering ? 'REGISTER' : 'LOGIN'} <IconMenu2 size={ICON_SIZES.md} style={{ transform: 'rotate(90deg)' }} />
                </button>
              </form>
              <button className="text-btn" onClick={() => setIsRegistering(!isRegistering)}>
                {isRegistering ? 'Already have a frequency? Login' : 'Need a frequency? Register'}
              </button>
              {!isRegistering && (
                <button className="text-btn" style={{ fontSize: '0.8em', opacity: 0.7, marginTop: '4px' }} onClick={() => setIsForgotPassword(!isForgotPassword)}>
                  Forgot password?
                </button>
              )}
              {isForgotPassword && (
                <form onSubmit={handleForgotPassword} style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input type="email" placeholder="Your email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                  <button type="submit" className="primary-btn" style={{ fontSize: '0.85em' }}>Send Reset Link</button>
                </form>
              )}
              {isResendVerify && (
                <form onSubmit={handleResendVerification} style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '0.8em', color: 'var(--accent-alert)', margin: 0 }}>Enter your email to resend the verification link:</p>
                  <input type="email" placeholder="Your email" value={resendEmail} onChange={e => setResendEmail(e.target.value)} required />
                  <button type="submit" className="primary-btn" style={{ fontSize: '0.85em' }}>Resend Verification</button>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header / Nav */}
          <div className="header glass-panel" style={{ background: 'var(--header-bg-transparent)' }}>
            <div className="header-content">
              <div className="header-left">
                <h2 className="header-logo" onClick={() => navigate('/')}>REL F <span className="header-logo-beta">BETA</span></h2>
                <div className="desktop-only" style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                  <SearchBar />
                  <RandomUserButton />
                </div>
              </div>
              {currentUser && (
                <div className="header-controls">
                  <div className="desktop-only" style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <div className="view-toggle">
                      <button onClick={() => { setViewMode('graph'); navigate('/'); }} className={viewMode === 'graph' ? 'active' : ''} title="Graph View">
                        <IconChartCircles size={ICON_SIZES.lg} aria-hidden="true" />
                      </button>
                      <button onClick={() => { setViewMode('list'); navigate('/'); }} className={viewMode === 'list' ? 'active' : ''} title="List View">
                        <IconList size={ICON_SIZES.lg} aria-hidden="true" />
                      </button>
                    </div>
                    <div className={`drift-controls ${isDrifting ? 'active' : ''}`}>
                      <button onClick={toggleDrift} title="Toggle Drift" aria-label="Toggle Drift Mode">
                        <IconRadar2 size={ICON_SIZES.xl} aria-hidden="true" />
                      </button>
                      <button onClick={cycleDriftType} title={`Filter: ${driftType || 'All'}`} className="drift-filter-btn">
                        {driftType ? driftType.toUpperCase() : 'ALL'}
                      </button>
                      {isDrifting && driftHistory.length > 0 && (
                        <button onClick={() => setShowDriftHistory(!showDriftHistory)} className="drift-filter-btn" title="Drift History" aria-label="Drift session history">
                          {driftHistory.length}
                        </button>
                      )}
                    </div>
                    <button onClick={() => { setIsInboxOpen(!isInboxOpen); setUnreadCount(0); }} className="nav-button" aria-label={`Inbox, ${unreadCount} unread`}>
                      Inbox
                      {unreadCount > 0 && <span className="unread-badge" aria-hidden="true"></span>}
                    </button>
                    <button onClick={() => setIsWorkspacesOpen(!isWorkspacesOpen)} className="nav-button" aria-label="Workspaces">
                      Workspaces
                    </button>
                    <button onClick={() => setIsGroupChatOpen(!isGroupChatOpen)} className="nav-button" aria-label="Groups">
                      Groups
                    </button>
                  </div>
                  {/* Mobile: inbox badge button */}
                  <button className="mobile-only nav-button" onClick={() => { setIsInboxOpen(!isInboxOpen); setUnreadCount(0); }} aria-label={`Inbox, ${unreadCount} unread`}>
                    <IconMessage size={ICON_SIZES.xl} aria-hidden="true" />
                    {unreadCount > 0 && <span className="unread-badge" aria-hidden="true"></span>}
                  </button>
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="nav-button" title="Menu" aria-label="Open menu" ref={menuRef as any}>
                    {isMenuOpen ? <IconX size={ICON_SIZES.xl} aria-hidden="true" /> : <IconMenu2 size={ICON_SIZES.xl} aria-hidden="true" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div ref={menuRef} className="glass-panel nav-dropdown">
              <div className="menu-mobile-section">
                <SearchBar />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="menu-label">View Mode:</span>
                  <div className="view-toggle">
                    <button onClick={() => { setViewMode('graph'); setIsMenuOpen(false); navigate('/'); }} className={viewMode === 'graph' ? 'active' : ''}>
                      <IconChartCircles size={ICON_SIZES.md} />
                    </button>
                    <button onClick={() => { setViewMode('list'); setIsMenuOpen(false); navigate('/'); }} className={viewMode === 'list' ? 'active' : ''}>
                      <IconList size={ICON_SIZES.md} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="menu-label">Drift:</span>
                  <button onClick={() => { toggleDrift(); setIsMenuOpen(false); }} className={isDrifting ? 'active' : ''} style={{ padding: 'var(--spacing-xs)' }}>
                    <IconRadar2 size={ICON_SIZES.lg} />
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="menu-label">Discover:</span>
                  <RandomUserButton />
                </div>
              </div>
              <button onClick={() => { setIsCollectionsOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <IconFolder size={ICON_SIZES.lg} /> Collections
              </button>
              <button onClick={() => { setIsWorkspacesOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <IconFolder size={ICON_SIZES.lg} /> Workspaces
              </button>
              <button onClick={() => { setIsGroupChatOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <IconUsers size={ICON_SIZES.lg} /> Groups
              </button>
              <button onClick={() => { setIsInboxOpen(true); setUnreadCount(0); setIsMenuOpen(false); }} className="menu-item">
                <IconMessage size={ICON_SIZES.lg} /> Inbox {unreadCount > 0 && <span style={{ fontSize: '0.7em', background: 'var(--accent-alert)', padding: '0 5px', borderRadius: '4px', color: '#000', marginLeft: '4px' }}>{unreadCount}</span>}
              </button>
              <button onClick={() => { toggleTheme(); setIsMenuOpen(false); }} className="menu-item">
                <IconPalette size={ICON_SIZES.lg} /> Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
              <button onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <IconSettings size={ICON_SIZES.lg} /> Settings
              </button>
              <button onClick={() => { setIsFAQOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <IconHelp size={ICON_SIZES.lg} /> Help
              </button>
              <button onClick={() => { setIsFeedbackOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <IconMessage size={ICON_SIZES.lg} /> Feedback
              </button>
              <button onClick={() => { setIsAboutOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <IconInfoCircle size={ICON_SIZES.lg} /> About
              </button>
              {isAdmin && (
                <button onClick={() => { setIsAdminOpen(true); setIsMenuOpen(false); }} className="menu-item admin">
                  <IconDashboard size={ICON_SIZES.lg} /> Admin
                </button>
              )}
              <div className="menu-divider"></div>
              <button onClick={handleLogout} className="menu-item">
                <IconLogout size={ICON_SIZES.lg} /> Logout
              </button>
            </div>
          )}

          {isFAQOpen && <FAQ onClose={() => setIsFAQOpen(false)} />}
          {isAboutOpen && <About onClose={() => setIsAboutOpen(false)} />}
          {isAdmin && isAdminOpen && <AdminDashboard onClose={() => setIsAdminOpen(false)} />}
          {isInboxOpen && <Inbox onClose={() => setIsInboxOpen(false)} onOpenCommunique={onNodeClick} />}
          {isGroupChatOpen && <GroupChat onClose={() => setIsGroupChatOpen(false)} currentUserId={currentUser?.id ?? 0} ws={ws} />}
          {isCollectionsOpen && <CollectionsManager onClose={() => setIsCollectionsOpen(false)} />}
          {isWorkspacesOpen && <WorkspacesManager onClose={() => setIsWorkspacesOpen(false)} />}
          {isFeedbackOpen && <FeedbackModal onClose={() => setIsFeedbackOpen(false)} />}
          {isSettingsOpen && currentUser && (
            <SettingsPage
              onClose={() => setIsSettingsOpen(false)}
              currentUser={currentUser}
              onUpdateUser={(u) => setCurrentUser(u)}
            />
          )}

          {/* Drift History Panel */}
          {showDriftHistory && isDrifting && (
            <div className="glass-panel" style={{
              position: 'fixed', top: '60px', left: '10px', width: '240px', maxHeight: '60vh',
              overflowY: 'auto', zIndex: 200, padding: '12px', borderRadius: '8px',
              border: '1px solid var(--border-color)', background: 'var(--drawer-bg)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Drift Session</span>
                <button onClick={() => { setDriftHistory([]); setShowDriftHistory(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}>Clear</button>
              </div>
              {driftHistory.map(entry => (
                <div key={entry.id}
                  role="button" tabIndex={0}
                  onClick={() => {
                    if (entry.type === 'user') navigate(`/communique/${entry.id.replace('u-', '')}`);
                    else {
                      const fileId = entry.id.replace('f-', '');
                      setPreviewFile({ id: fileId, filename: entry.name, mime_type: entry.mime_type || '' });
                    }
                    setShowDriftHistory(false);
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.click(); }}
                  style={{
                    padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', marginBottom: '4px',
                    background: 'rgba(255,255,255,0.03)', fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>{entry.type === 'user' ? '◉' : '◈'}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                </div>
              ))}
            </div>
          )}
          {previewFile && (
            <FilePreviewModal
              fileId={previewFile.id}
              filename={previewFile.filename}
              mimeType={previewFile.mime_type}
              onClose={() => setPreviewFile(null)}
              onDownload={() => {
                const link = document.createElement('a');
                link.href = `/api/files/${previewFile.id}/content`;
                link.download = previewFile.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            />
          )}

          <Routes>
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/" element={
              viewMode === 'graph' ? (
                <AssociationWeb
                  onNodeClick={onNodeClick}
                  nodes={nodes}
                  links={links}
                  collections={collections}
                  isDrifting={isDrifting}
                  onlineUserIds={onlineUserIds}
                />
              ) : (
                <NetworkList nodes={nodes} onNodeClick={onNodeClick} onFilePreview={(f) => setPreviewFile(f)} loading={loading} />
              )
            } />
            <Route path="/communique/:userId" element={<CommuniquePage />} />
          </Routes>
        </>
      )}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <CustomizationProvider>
        <ToastProvider>
          <AmbientBackground />
          <Main />
        </ToastProvider>
      </CustomizationProvider>
    </ThemeProvider>
  );
}

export default App;
