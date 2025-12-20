// App.tsx

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { IconRadar2, IconHelp, IconList, IconChartCircles, IconPalette, IconInfoCircle, IconDashboard, IconMenu2, IconX, IconLogout, IconFolder, IconHome } from '@tabler/icons-react';
import AssociationWeb from './components/AssociationWeb';
import NetworkList from './components/NetworkList';
import CommuniquePage from './components/CommuniquePage';
import Inbox from './components/Inbox';
import FAQ from './components/FAQ';
import About from './components/About';
import FilePreviewModal from './components/FilePreviewModal';
import { ToastProvider, useToast } from './context/ToastContext';
import AdminDashboard from './components/AdminDashboard';
import ThemeSettings from './components/ThemeSettings';
import CollectionsManager from './components/CollectionsManager';
import LandingPage from './components/LandingPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CustomizationProvider } from './context/CustomizationContext';
import { useNetworkData } from './hooks/useNetworkData';
import { SearchBar, RandomUserButton } from './components/UserDiscovery';
import { GlobalStyleInjector } from './components/GlobalStyleInjector';
import './styles/global.css';

interface User {
  id: number;
  username: string;
  avatar_url?: string;
}

function Main() {
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isFAQOpen, setIsFAQOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrifting, setIsDrifting] = useState(false);
  const [driftData, setDriftData] = useState<{ users: any[], files: any[] }>({ users: [], files: [] });
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] = useState<any | null>(null); // For initial fetch

  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const { nodes, links, refresh: refreshNetwork, loading } = useNetworkData({
    currentUserId: currentUser?.id || null,
    meUsername: currentUser?.username,
    meAvatarUrl: currentUser?.avatar_url,
    isDrifting,
    driftData,
    onlineUserIds
  });

  const refreshNetworkRef = useRef(refreshNetwork);
  useEffect(() => {
    refreshNetworkRef.current = refreshNetwork;
  }, [refreshNetwork]);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // Drop to A4
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/do-websocket`;

    let ws: WebSocket;
    let reconnectTimer: any;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'new_notification') {
            showToast(`New signal: ${data.notificationType}`, 'info');
            playNotificationSound();
            setUnreadCount(prev => prev + 1);
            if (refreshNetworkRef.current) refreshNetworkRef.current();
          } 
          else if (data.type === 'presence_sync') {
             setOnlineUserIds(new Set(data.onlineUserIds));
          }
          else if (data.type === 'presence_update') {
             setOnlineUserIds(prev => {
                 const next = new Set(prev);
                 if (data.status === 'online') next.add(data.userId);
                 else next.delete(data.userId);
                 return next;
             });
          }
          else if (data.type === 'signal_communique') {
          }
          else if (data.type === 'signal_artifact') {
              showToast('New artifact signal detected', 'info');
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
  }, [isAuthenticated, showToast]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          setIsAuthenticated(true);
          const prefsResponse = await fetch('/api/users/me/preferences');
          if (prefsResponse.ok) {
            const prefsData = await prefsResponse.json();
            setUserPreferences(prefsData); // Set initial preferences for CustomizationProvider
          } else {
            console.warn('Failed to fetch user preferences');
          }
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setUserPreferences(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setCurrentUser(null);
        setUserPreferences(null);
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
      setDriftData({ users: [], files: [] });
    }
  }, [isDrifting]);

  const handleLogin = async (e: React.FormEvent, credentials: any) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        const prefsResponse = await fetch('/api/users/me/preferences');
        if (prefsResponse.ok) {
          const prefsData = await prefsResponse.json();
          setUserPreferences(prefsData); // Set initial preferences for CustomizationProvider
        } else {
          console.warn('Failed to fetch user preferences after login');
        }
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

  const handleRegister = async (e: React.FormEvent, credentials: any) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (response.ok) {
        showToast('Registration successful! Please log in.', 'success');
        setIsRegistering(false);
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
      setUserPreferences(null);
      showToast('Logged out', 'info');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const onNodeClick = (nodeId: string) => {
    if (nodeId.startsWith('file-')) {
      const node = nodes.find(n => n.id === nodeId);
      if (node && node.data) {
        setPreviewFile(node.data);
      }
    } else {
      navigate(`/communique/${nodeId}`);
    }
  };

  const toggleDrift = () => {
    setIsDrifting(!isDrifting);
  };

  const isCommuniquePage = location.pathname.startsWith('/communique');
  const navRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.id === 1;

  useLayoutEffect(() => {
    if (navRef.current) {
      gsap.fromTo(navRef.current, 
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
      );
      
      const buttons = navRef.current.querySelectorAll('button');
      gsap.fromTo(buttons, 
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, delay: 0.3, ease: 'power2.out' }
      );
    }
  }, []);

  return (
    <CustomizationProvider initialPreferences={userPreferences} currentUserId={currentUser?.id || null}>
      <GlobalStyleInjector />
      {!isAuthenticated ? (
        <LandingPage 
          onLogin={handleLogin}
          onRegister={handleRegister}
          authError={authError}
          isRegistering={isRegistering}
          setIsRegistering={setIsRegistering}
        />
      ) : (
        <>
          <div ref={navRef} className="overlay-ui">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={() => navigate('/')}>
                        <h1 style={{ margin: 0, fontSize: '1.2rem', lineHeight: 1 }}>Rel F</h1>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {new Date().toLocaleDateString()}
                        </p>
                    </div>
                
                {currentUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ marginRight: '5px', fontSize: '0.9rem' }}>{currentUser.username}</span>
                    </div>
                    
                    <button onClick={() => navigate('/')} title="Home" style={{ padding: '6px' }}>
                        <IconHome size={18} />
                    </button>

                    <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <SearchBar />
                      <RandomUserButton />
                      
                      {/* View Mode Toggle (Segmented Control) */}
                      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px', marginRight: '5px' }}>
                        <button 
                          onClick={() => setViewMode('graph')} 
                          title="Graph View"
                          style={{ 
                            padding: '4px 8px', 
                            background: viewMode === 'graph' ? 'var(--accent-sym)' : 'transparent', 
                            color: viewMode === 'graph' ? '#000' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: '3px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <IconChartCircles size={16} />
                        </button>
                        <button 
                          onClick={() => setViewMode('list')} 
                          title="List View"
                          style={{ 
                            padding: '4px 8px', 
                            background: viewMode === 'list' ? 'var(--accent-sym)' : 'transparent', 
                            color: viewMode === 'list' ? '#000' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: '3px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <IconList size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <button onClick={toggleDrift} title="Toggle Drift" className={isDrifting ? 'active' : ''} style={{ padding: '6px' }}>
                    <IconRadar2 size={18} />
                    </button>
                    
                    <button onClick={() => { setIsInboxOpen(!isInboxOpen); setUnreadCount(0); }} style={{ padding: '6px', position: 'relative' }}>
                    Inbox
                    {unreadCount > 0 && (
                        <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        background: 'var(--accent-alert)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '14px',
                        height: '14px',
                        fontSize: '0.6rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                        }}>
                        {unreadCount}
                        </span>
                    )}
                    </button>
    
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ padding: '6px' }} title="Menu">
                        {isMenuOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
                    </button>
                </div>
                )}
                </div>
            </div>
    
            {/* Dropdown Menu */}
            {isMenuOpen && currentUser && (
                <div className="glass-panel fade-in" style={{
                    position: 'fixed',
                    top: '60px',
                    right: '5vw', /* Use viewport unit for responsive right position */
                    width: 'min(200px, 80vw)', /* Responsive width */
                    padding: '10px',
                    borderRadius: '8px',
                    zIndex: 'var(--z-dropdown)', /* Use CSS variable for z-index */
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <div className="mobile-only" style={{ flexDirection: 'column', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                           <SearchBar />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>View:</span>
                             <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px' }}>
                                <button 
                                  onClick={() => { setViewMode('graph'); setIsMenuOpen(false); }} 
                                  style={{ 
                                    padding: '4px 8px', 
                                    background: viewMode === 'graph' ? 'var(--accent-sym)' : 'transparent', 
                                    color: viewMode === 'graph' ? '#000' : 'var(--text-secondary)',
                                    border: 'none',
                                    borderRadius: '3px'
                                  }}
                                >
                                  <IconChartCircles size={16} />
                                </button>
                                <button 
                                  onClick={() => { setViewMode('list'); setIsMenuOpen(false); }} 
                                  style={{ 
                                    padding: '4px 8px', 
                                    background: viewMode === 'list' ? 'var(--accent-sym)' : 'transparent', 
                                    color: viewMode === 'list' ? '#000' : 'var(--text-secondary)',
                                    border: 'none',
                                    borderRadius: '3px'
                                  }}
                                >
                                  <IconList size={16} />
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Discover:</span>
                             <RandomUserButton />
                        </div>
                    </div>

                    <button onClick={() => { setIsFAQOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}>
                        <IconHelp size={18} /> Help
                    </button>
                    <button onClick={() => { setIsAboutOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}>
                        <IconInfoCircle size={18} /> About
                    </button>
                    <button onClick={() => { setIsCollectionsOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}>
                        <IconFolder size={18} /> Collections
                    </button>
                    <button onClick={() => { setIsThemeSettingsOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}>
                        <IconPalette size={18} /> Theme Settings
                    </button>
                    <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}>
                        <IconPalette size={18} /> Toggle Default Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </button>
                    {isAdmin && (
                      <button onClick={() => { setIsAdminOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start', border: 'none', background: 'transparent', color: 'var(--accent-alert)' }}>
                          <IconDashboard size={18} /> Admin
                      </button>
                    )}
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '5px 0' }}></div>
                    <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}>
                        <IconLogout size={18} /> Logout
                    </button>
                </div>
            )}
    
            {isFAQOpen && <FAQ onClose={() => setIsFAQOpen(false)} />}
            {isAboutOpen && <About onClose={() => setIsAboutOpen(false)} />}
            {isAdmin && isAdminOpen && <AdminDashboard onClose={() => setIsAdminOpen(false)} />}
            {isInboxOpen && <Inbox onClose={() => setIsInboxOpen(false)} onOpenCommunique={onNodeClick} />}
            {isThemeSettingsOpen && <ThemeSettings onClose={() => setIsThemeSettingsOpen(false)} />}                  
            {isCollectionsOpen && <CollectionsManager onClose={() => setIsCollectionsOpen(false)} />}
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
              <Route path="/" element={
                viewMode === 'graph' ? (
                  <AssociationWeb
                    onNodeClick={onNodeClick}
                    nodes={nodes}
                    links={links}
                    isDrifting={isDrifting}
                    onlineUserIds={onlineUserIds}
                  />
                ) : (
                  <NetworkList
                    nodes={nodes}
                    onNodeClick={onNodeClick}
                    loading={loading}
                    />
                )
              } />
              <Route path="/communique/:userId" element={<CommuniquePage />} />
            </Routes>
        </>
      )}
    </CustomizationProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Main />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;