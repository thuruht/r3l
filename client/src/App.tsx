import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import * as TablerIcons from '@tabler/icons-react';
import { ICON_SIZES } from './constants/iconSizes';
import AssociationWeb from './components/AssociationWeb';
import NetworkList from './components/NetworkList';
import Inbox from './components/Inbox';
import Sidebar from './components/Sidebar';
import { useSidebar } from './hooks/useSidebar';
import CommuniquePage from './components/CommuniquePage';
import VerifyEmail from './components/VerifyEmail';
import ResetPassword from './components/ResetPassword';
import FilePreviewModal from './components/FilePreviewModal';
import LandingPage from './components/LandingPage';
import DriftHistory from './components/DriftHistory';
import SettingsPage from './pages/SettingsPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Lazy-loaded heavy components
const GroupChat = React.lazy(() => import('./components/GroupChat'));
const About = React.lazy(() => import('./components/About'));
const FAQ = React.lazy(() => import('./components/FAQ'));
const PrivacyPolicy = React.lazy(() => import('./components/PrivacyPolicy'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const CollectionsManager = React.lazy(() => import('./components/CollectionsManager'));
const WorkspacesManager = React.lazy(() => import('./components/WorkspacesManager'));
const FeedbackModal = React.lazy(() => import('./components/FeedbackModal'));
const GlobalChat = React.lazy(() => import('./components/GlobalChat'));
const ArchiveVote = React.lazy(() => import('./components/ArchiveVote'));
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
  role?: string;
}

function Main() {
  const { isOpen: isSidebarOpen, activeTab: sidebarTab, openTab, close: closeSidebar } = useSidebar();
  const [isWorkspacesOpen, setIsWorkspacesOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isFAQOpen, setIsFAQOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isDrifting, setIsDrifting] = useState(false);
  const [driftType, setDriftType] = useState<string>('');
  const [driftData, setDriftData] = useState<{ users: any[]; files: any[]; collections: any[] }>({ users: [], files: [], collections: [] });
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [groupUnreadCount, setGroupUnreadCount] = useState(0);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [driftHistory, setDriftHistory] = useState<Array<{ id: string; name: string; type: 'user' | 'file'; mime_type?: string; timestamp: number }>>([]);
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
  const sidebarTabRef = useRef(sidebarTab);
  const fetchDriftRef = useRef<() => void>(() => {});
  const connectWebSocketRef = useRef<() => void>(() => {});

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
      if (isSidebarOpen) { closeSidebar(); return; }
      if (isArchiveOpen) { setIsArchiveOpen(false); return; }
      if (isCollectionsOpen) { setIsCollectionsOpen(false); return; }
      if (isAdminOpen) { setIsAdminOpen(false); return; }
      if (isFeedbackOpen) { setIsFeedbackOpen(false); return; }
      if (isFAQOpen) { setIsFAQOpen(false); return; }
      if (isAboutOpen) { setIsAboutOpen(false); return; }
      if (isMenuOpen) { setIsMenuOpen(false); return; }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [previewFile, isSettingsOpen, isSidebarOpen, isArchiveOpen, isCollectionsOpen, isAdminOpen, isFeedbackOpen, isFAQOpen, isAboutOpen, isMenuOpen]);

  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchDrift = useCallback(async (type: string = '') => {
    try {
      const query = type ? `?type=${type}` : '';
      const res = await fetch(`/api/discovery/drift${query}`);
      if (res.status === 429) {
        showToast('Drift scanning too fast — slowing down.', 'info');
        return;
      }
      if (res.ok) setDriftData(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [showToast]);

  // Drift Auto-Refresh Interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isDrifting) {
      interval = setInterval(() => {
        fetchDrift(driftType);
      }, 60000); // 60 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDrifting, driftType, fetchDrift]);

  // Keep refs in sync with state (avoids stale closures in WS handler)
  useEffect(() => { sidebarTabRef.current = sidebarTab; }, [sidebarTab]);
  useEffect(() => { fetchDriftRef.current = fetchDrift; }, [fetchDrift]);

  // Debounced reconnect — uses refs for UI state to avoid dep churn
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
          showToast(`New SYMTXT from ${msg.sender_name || `user ${msg.sender_id}`}`, 'info');
          setUnreadCount(prev => prev + 1);
        } else if (msg.type === 'new_group_message') {
          if (sidebarTabRef.current !== 'planets') {
            setGroupUnreadCount(prev => prev + 1);
          }
        } else if (msg.type === 'signal_artifact') {
          fetchDriftRef.current();
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    socket.onclose = () => {
      setWs(null);
      wsRef.current = null;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => connectWebSocketRef.current(), 3000);
    };

    socket.onerror = () => socket.close();
  }, [showToast]);

  // Keep connectWebSocket ref in sync
  useEffect(() => { connectWebSocketRef.current = connectWebSocket; }, [connectWebSocket]);

  useEffect(() => {
    fetch('/api/users/me')
      .then(res => { if (res.ok) return res.json(); throw new Error('Unauthorized'); })
      .then(data => { setCurrentUser(data.user); setLoadingUser(false); connectWebSocketRef.current(); })
      .catch(() => setLoadingUser(false));

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDrift = () => {
    const newState = !isDrifting;
    setIsDrifting(newState);
    if (newState) {
      fetchDrift(driftType);
      showToast('Drift Mode: Scanning frequency...', 'info');
      navigate('/');
    } else {
      showToast('Drift Mode: Disengaged.', 'info');
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

  const handleForgotPassword = async (e: React.FormEvent, email: string) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      showToast(data.message || 'Reset link sent if email exists.', 'success');
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

  const { nodes, links, collections, refresh: refreshNetwork, loading, hasMoreFiles, loadMore } = useNetworkData({
    currentUserId: currentUser?.id || null,
    meUsername: currentUser?.username,
    meAvatarUrl: currentUser?.avatar_url,
    isDrifting,
    driftData,
    onlineUserIds,
  });

  const driftEmpty = isDrifting && !loading && driftData.users.length === 0 && driftData.files.length === 0 && (driftData.collections?.length ?? 0) === 0;

  useEffect(() => { refreshNetworkRef.current = refreshNetwork; }, [refreshNetwork]);

  // Track drift encounters in session history
  useEffect(() => {
    if (!isDrifting) return;
    const now = Date.now();
    const newEntries: typeof driftHistory = [
      ...driftData.users.map(u => ({ id: `u-${u.id}`, name: u.username, type: 'user' as const, timestamp: now })),
      ...driftData.files.map(f => ({ id: `f-${f.id}`, name: f.filename, type: 'file' as const, mime_type: f.mime_type, timestamp: now })),
      ...(driftData.collections || []).map(col => ({ id: `col-${col.id}`, name: col.name, type: 'file' as const, mime_type: 'collection', timestamp: now }))
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

  const openPreview = useCallback((fileId: number) => {
    setPreviewFile({ id: fileId, filename: '', mime_type: '' });
  }, []);

  const onNodeClick = (nodeId: string) => {
    if (nodeId.startsWith('file-')) {
      const node = nodes.find(n => n.id === nodeId);
      if (node?.data) setPreviewFile(node.data);
    } else if (nodeId.startsWith('col-')) {
      const node = nodes.find(n => n.id === nodeId);
      if (node?.data?.user_id) navigate(`/communique/${node.data.user_id}`);
    } else if (nodeId === 'me' && currentUser) {
      navigate(`/communique/${currentUser.id}`);
    } else {
      navigate(`/communique/${nodeId}`);
    }
  };

  const handleLogin = async (e: React.FormEvent, data?: any) => {
    if (e) e.preventDefault();
    const username = data?.username || loginUsername;
    const password = data?.password || loginPassword;
    setAuthError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const resData = await res.json();
      if (res.ok) { setCurrentUser(resData.user); connectWebSocket(); }
      else {
        showToast(resData.error, 'error');
        setAuthError(resData.error);
        if (resData.needs_verification) setIsResendVerify(true);
      }
    } catch { showToast('Login failed', 'error'); setAuthError('Login failed'); }
  };

  const handleRegister = async (e: React.FormEvent, data?: any) => {
    if (e) e.preventDefault();
    const username = data?.username || loginUsername;
    const password = data?.password || loginPassword;
    const email = data?.email || regEmail;
    setAuthError(null);
    if (password.length < 8) {
      const err = 'Password must be at least 8 characters';
      showToast(err, 'error');
      setAuthError(err);
      return;
    }
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      });
      const resData = await res.json();
      if (res.ok) { showToast('Registration successful! Check your email.', 'success'); setIsRegistering(false); }
      else { showToast(resData.error, 'error'); setAuthError(resData.error); }
    } catch { showToast('Registration failed', 'error'); setAuthError('Registration failed'); }
  };

  const isAdmin = currentUser?.role === 'admin';

  if (loadingUser) {
    return (
      <div className="loading-container">
        <TablerIcons.IconRadar2 size={48} className="spinner-icon" aria-hidden="true" />
        <div style={{ marginTop: 'var(--spacing-md)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Establishing Uplink…</div>
      </div>
    );
  }

  return (
    <>
      {!currentUser && !(location.pathname.startsWith('/verify') || location.pathname.startsWith('/reset-password')) ? (
        <LandingPage
          onLogin={handleLogin}
          onRegister={handleRegister}
          onForgotPassword={handleForgotPassword}
          authError={authError}
          isRegistering={isRegistering}
          setIsRegistering={setIsRegistering}
        />
      ) : (
        <>
          {/* Header / Nav */}
          <div className="header glass-panel" style={{ background: 'var(--header-bg-transparent)' }}>
            <div className="header-content">
              <div className="header-left">
                <h2 className="header-logo" onClick={() => navigate('/')} title="Relational Ephemeral Filenet">REL F <span className="header-logo-beta">BETA</span></h2>
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
                        <TablerIcons.IconChartCircles size={ICON_SIZES.lg} aria-hidden="true" />
                      </button>
                      <button onClick={() => { setViewMode('list'); navigate('/'); }} className={viewMode === 'list' ? 'active' : ''} title="List View">
                        <TablerIcons.IconList size={ICON_SIZES.lg} aria-hidden="true" />
                      </button>
                    </div>
                    <div className={`drift-controls ${isDrifting ? 'active' : ''}`}>
                      <button onClick={toggleDrift} title="Toggle Drift" aria-label="Toggle Drift Mode">
                        <TablerIcons.IconRadar2 size={ICON_SIZES.xl} aria-hidden="true" />
                      </button>
                      <button onClick={cycleDriftType} title={`Filter: ${driftType || 'All'}`} className="drift-filter-btn">
                        {driftType ? driftType.toUpperCase() : 'ALL'}
                      </button>
                      {isDrifting && driftHistory.length > 0 && (
                        <button onClick={() => openTab('history')} className={`drift-filter-btn${isSidebarOpen && sidebarTab === 'history' ? ' active' : ''}`} title="Drift History" aria-label="Drift session history">
                          {driftHistory.length}
                        </button>
                      )}
                    </div>
                    <button onClick={() => { openTab('inbox'); setUnreadCount(0); }} className={`nav-button${isSidebarOpen && sidebarTab === 'inbox' ? ' active' : ''}`} aria-label={`Inbox${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}>
                      <TablerIcons.IconMailbox size={ICON_SIZES.lg} aria-hidden="true" />
                      <span className="nav-label">Mail</span>
                      {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
                    </button>
                    <button onClick={() => { openTab('planets'); }} className={`nav-button${isSidebarOpen && sidebarTab === 'planets' ? ' active' : ''}`} aria-label="Groups">
                      <TablerIcons.IconUsersGroup size={ICON_SIZES.lg} aria-hidden="true" />
                      <span className="nav-label">Groups</span>
                      {groupUnreadCount > 0 && <span className="unread-badge">{groupUnreadCount}</span>}
                    </button>
                    <button onClick={() => openTab('galaxy')} className={`nav-button${isSidebarOpen && sidebarTab === 'galaxy' ? ' active' : ''}`} aria-label="Global Chat">
                      <TablerIcons.IconBroadcast size={ICON_SIZES.lg} aria-hidden="true" />
                      <span className="nav-label">Galaxy</span>
                    </button>
                  </div>
                  {/* Mobile: inbox badge button */}
                  <button className="mobile-only nav-button" onClick={() => { openTab('inbox'); setUnreadCount(0); }} aria-label={`Inbox, ${unreadCount} unread`}>
                    <TablerIcons.IconMessage size={ICON_SIZES.xl} aria-hidden="true" />
                    {unreadCount > 0 && <span className="unread-badge" aria-hidden="true"></span>}
                  </button>
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="nav-button" title="Menu" aria-label="Open menu" ref={menuRef as any}>
                    {isMenuOpen ? <TablerIcons.IconX size={ICON_SIZES.xl} aria-hidden="true" /> : <TablerIcons.IconMenu2 size={ICON_SIZES.xl} aria-hidden="true" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div ref={menuRef} className="glass-panel nav-dropdown">
              <div className="menu-mobile-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="menu-label">View Mode:</span>
                  <div className="view-toggle">
                    <button onClick={() => { setViewMode('graph'); setIsMenuOpen(false); navigate('/'); }} className={viewMode === 'graph' ? 'active' : ''}>
                      <TablerIcons.IconChartCircles size={ICON_SIZES.md} />
                    </button>
                    <button onClick={() => { setViewMode('list'); setIsMenuOpen(false); navigate('/'); }} className={viewMode === 'list' ? 'active' : ''}>
                      <TablerIcons.IconList size={ICON_SIZES.md} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="menu-label">Drift:</span>
                  <button onClick={() => { toggleDrift(); setIsMenuOpen(false); }} className={isDrifting ? 'active' : ''} style={{ padding: 'var(--spacing-xs)' }}>
                    <TablerIcons.IconRadar2 size={ICON_SIZES.lg} />
                  </button>
                </div>
              </div>
              <button onClick={() => { navigate(`/communique/${currentUser?.id}`); setIsMenuOpen(false); }} className="menu-item">
                <TablerIcons.IconUser size={ICON_SIZES.lg} /> My Cache (R3C)
              </button>
              <button onClick={() => { setIsArchiveOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <TablerIcons.IconChartCircles size={ICON_SIZES.lg} /> Community Archive
              </button>
              <button onClick={() => { setIsCollectionsOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <TablerIcons.IconFolder size={ICON_SIZES.lg} /> Collections
              </button>
              <button onClick={() => { setIsWorkspacesOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <TablerIcons.IconBriefcase size={ICON_SIZES.lg} /> Workspaces
              </button>
              <button onClick={() => { openTab('inbox'); setUnreadCount(0); setIsMenuOpen(false); }} className="menu-item">
                <TablerIcons.IconMailbox size={ICON_SIZES.lg} /> Mail {unreadCount > 0 && <span className="menu-badge">{unreadCount}</span>}
              </button>
              <button onClick={() => { openTab('planets'); setIsMenuOpen(false); }} className="menu-item">
                <TablerIcons.IconUsersGroup size={ICON_SIZES.lg} /> Groups {groupUnreadCount > 0 && <span className="menu-badge">{groupUnreadCount}</span>}
              </button>
              <button onClick={() => { openTab('galaxy'); setIsMenuOpen(false); }} className="menu-item">
                <TablerIcons.IconBroadcast size={ICON_SIZES.lg} /> Galaxy
              </button>
              <button onClick={() => { toggleTheme(); setIsMenuOpen(false); }} className="menu-item">
                <TablerIcons.IconPalette size={ICON_SIZES.lg} /> Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
              <button onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <TablerIcons.IconSettings size={ICON_SIZES.lg} /> Settings
              </button>
              <button onClick={() => { setIsFAQOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <TablerIcons.IconHelp size={ICON_SIZES.lg} /> Help
              </button>
              <button onClick={() => { setIsFeedbackOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <TablerIcons.IconMessage size={ICON_SIZES.lg} /> Feedback
              </button>
              <button onClick={() => { setIsAboutOpen(true); setIsMenuOpen(false); }} className="menu-item">
                <TablerIcons.IconInfoCircle size={ICON_SIZES.lg} /> About
              </button>
              {isAdmin && (
                <button onClick={() => { setIsAdminOpen(true); setIsMenuOpen(false); }} className="menu-item admin">
                  <TablerIcons.IconDashboard size={ICON_SIZES.lg} /> Admin
                </button>
              )}
              <div className="menu-divider"></div>
              <button onClick={handleLogout} className="menu-item">
                <TablerIcons.IconLogout size={ICON_SIZES.lg} /> Logout
              </button>
            </div>
          )}

          {isFAQOpen && <React.Suspense fallback={null}><FAQ onClose={() => setIsFAQOpen(false)} /></React.Suspense>}
          {isAboutOpen && <React.Suspense fallback={null}><About onClose={() => setIsAboutOpen(false)} /></React.Suspense>}
          {isAdmin && isAdminOpen && <React.Suspense fallback={null}><AdminDashboard onClose={() => setIsAdminOpen(false)} /></React.Suspense>}
          {isWorkspacesOpen && <React.Suspense fallback={null}><WorkspacesManager onClose={() => setIsWorkspacesOpen(false)} /></React.Suspense>}
          {/* Unified Sidebar */}
          <Sidebar
            isOpen={isSidebarOpen}
            activeTab={sidebarTab}
            onTabChange={(tab) => {
              openTab(tab);
              if (tab === 'inbox') setUnreadCount(0);
              if (tab === 'planets') setGroupUnreadCount(0);
            }}
            onClose={closeSidebar}
            unreadCounts={{ inbox: unreadCount, planets: groupUnreadCount }}
          >
            {sidebarTab === 'inbox' && (
              <Inbox onClose={closeSidebar} onOpenCommunique={onNodeClick} />
            )}
            {sidebarTab === 'planets' && (
              <React.Suspense fallback={<div className="loading-container"><div className="spinner" /></div>}>
                <GroupChat onClose={closeSidebar} currentUserId={currentUser?.id ?? 0} ws={ws} />
              </React.Suspense>
            )}
            {sidebarTab === 'galaxy' && (
              <React.Suspense fallback={<div className="loading-container"><div className="spinner" /></div>}>
                <GlobalChat onClose={closeSidebar} />
              </React.Suspense>
            )}
            {sidebarTab === 'history' && <DriftHistory onFileSelect={openPreview} />}
          </Sidebar>
          {isArchiveOpen && <React.Suspense fallback={null}><ArchiveVote onClose={() => setIsArchiveOpen(false)} /></React.Suspense>}
          {isCollectionsOpen && <React.Suspense fallback={null}><CollectionsManager onClose={() => setIsCollectionsOpen(false)} /></React.Suspense>}
          {isFeedbackOpen && <React.Suspense fallback={null}><FeedbackModal onClose={() => setIsFeedbackOpen(false)} /></React.Suspense>}
          {isSettingsOpen && currentUser && (
            <SettingsPage
              onClose={() => setIsSettingsOpen(false)}
              currentUser={currentUser}
              onUpdateUser={(u) => setCurrentUser(u)}
            />
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
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {driftEmpty && (
                  <div className="fade-in" style={{
                    position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--drawer-bg)', border: '1px solid var(--border-color)',
                    padding: '12px 24px', borderRadius: '4px', fontSize: '0.85rem',
                    color: 'var(--text-secondary)', zIndex: 'var(--z-overlay)', pointerEvents: 'none',
                    textAlign: 'center', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                  }}>
                    <TablerIcons.IconRadio size={20} style={{ marginBottom: '8px', opacity: 0.5 }} /><br/>
                    No signals found on this frequency.<br/>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Scanning for new artifacts every 60s...</span>
                  </div>
                )}
                {viewMode === 'graph' ? (
                  <AssociationWeb
                    onNodeClick={onNodeClick}
                    nodes={nodes}
                    links={links}
                    collections={collections}
                    isDrifting={isDrifting}
                    onlineUserIds={onlineUserIds}
                    hasMoreFiles={hasMoreFiles}
                    onLoadMore={loadMore}
                  />
                ) : (
                  <NetworkList nodes={nodes} onNodeClick={onNodeClick} onFilePreview={(f) => setPreviewFile(f)} loading={loading} />
                )}
              </div>
            } />
            <Route path="/communique/:userId" element={<CommuniquePage />} />
            <Route path="/admin" element={<Navigate to="/" replace />} />
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
          <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
            <defs>
              <linearGradient id="chrome-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a29bf6" /> {/* Lavender */}
                <stop offset="50%" stopColor="#ffffff" /> {/* Highlight */}
                <stop offset="100%" stopColor="#26de81" /> {/* Neon Green */}
              </linearGradient>
              <filter id="chrome-glow">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
          </svg>
          <Main />
        </ToastProvider>
      </CustomizationProvider>
    </ThemeProvider>
  );
}

export default App;
