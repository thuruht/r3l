import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  IconRadar2, IconLogout, IconMessage, IconInfoCircle, IconHelp, IconMenu2, IconX,
  IconChartCircles, IconList, IconFolder, IconPalette, IconDashboard, IconSettings, IconUsers, IconArchive, IconMessageCircle
} from '@tabler/icons-react';
import AssociationWeb from './components/AssociationWeb';
import NetworkList from './components/NetworkList';
import Inbox from './components/Inbox';
import GroupChat from './components/GroupChat';
import ArchiveVote from './components/ArchiveVote';
import GlobalChat from './components/GlobalChat';
import CommuniquePage from './pages/CommuniquePage';
import SettingsPage from './pages/SettingsPage';
import About from './components/About';
import FAQ from './components/FAQ';
import PrivacyPolicy from './components/PrivacyPolicy';
import AdminDashboard from './components/AdminDashboard';
import VerifyEmail from './components/VerifyEmail';
import CollectionsManager from './components/CollectionsManager';
import FeedbackModal from './components/FeedbackModal';
import FilePreviewModal from './components/FilePreviewModal';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CustomizationProvider, useCustomization } from './context/CustomizationContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { useNetworkData } from './hooks/useNetworkData';
import { SearchBar, RandomUserButton } from './components/UserDiscovery';
import AmbientBackground from './components/AmbientBackground';
import CustomizationSettings from './components/CustomizationSettings';
import KeyManager from './components/KeyManager';

import './styles/global.css';
import './styles/App.css';

interface User {
  id: number;
  username: string;
  avatar_url?: string;
  is_lurking?: boolean;
}

function Main() {
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isGroupChatOpen, setIsGroupChatOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isFAQOpen, setIsFAQOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isDrifting, setIsDrifting] = useState(false);
  const [driftType, setDriftType] = useState<string>(''); // '' = all, 'image', 'audio', 'text'
  const [driftData, setDriftData] = useState<{users: any[], files: any[]}>({ users: [], files: [] });
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previewFile, setPreviewFile] = useState<any>(null);

  // Websocket state
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const reconnectTimeoutRef = useRef<number | null>(null);

  const { theme, toggleTheme } = useTheme();
  const { theme_preferences } = useCustomization();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check Auth
    fetch('/api/users/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Unauthorized');
      })
      .then(data => {
        setCurrentUser(data.user);
        setLoadingUser(false);
        // Connect WS
        connectWebSocket();
      })
      .catch(() => {
        setLoadingUser(false);
        if (location.pathname !== '/verify') { // Don't redirect if verifying
             // Allow unauthenticated landing view (Drift only mode?)
             // For now, simple auth gate, but maybe show "Connect" button
        }
      });
  }, []); // Run once

  // Websocket Connection
  const connectWebSocket = () => {
      if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/do-websocket`;

      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
          console.log('Connected to Signal Stream');
          setWs(socket);
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
                  }
                  refreshNetwork();
              } else if (msg.type === 'new_message') {
                  showToast(`New Whisper from user ${msg.sender_id}`, 'info');
                  setUnreadCount(prev => prev + 1);
              } else if (msg.type === 'signal_artifact') {
                   if (isDrifting) {
                       fetchDrift(driftType);
                   }
              }
          } catch (e) {
              console.error("WS Error", e);
          }
      };

      socket.onclose = () => {
          console.log('Signal Stream lost. Reconnecting...');
          setWs(null);
          reconnectTimeoutRef.current = window.setTimeout(connectWebSocket, 3000);
      };
  };


  const fetchDrift = async (type: string = '') => {
      try {
          const query = type ? `?type=${type}` : '';
          const res = await fetch(`/api/drift${query}`);
          if (res.ok) {
              const data = await res.json();
              setDriftData(data);
          }
      } catch (e) {
          console.error(e);
      }
  };

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

  const cycleDriftType = (e: React.MouseEvent) => {
      e.stopPropagation();
      const types = ['', 'image', 'audio', 'text'];
      const currentIndex = types.indexOf(driftType);
      const nextType = types[(currentIndex + 1) % types.length];
      setDriftType(nextType);

      const label = nextType === '' ? 'All' : nextType.charAt(0).toUpperCase() + nextType.slice(1);
      showToast(`Drift Filter: ${label}`, 'info');

      if (isDrifting) {
          fetchDrift(nextType);
      }
  };

  const { nodes, links, collections, refresh: refreshNetwork, loading } = useNetworkData({
    currentUserId: currentUser?.id || null,
    meUsername: currentUser?.username,
    meAvatarUrl: currentUser?.avatar_url,
    isDrifting,
    driftData,
    onlineUserIds
  });

  useEffect(() => {
    refreshNetwork();
  }, [currentUser, isDrifting, driftData]);

  const playNotificationSound = () => {
    try {
        const audio = new Audio('/assets/ping.mp3');
        audio.volume = 0.2;
        audio.play().catch(e => console.log('Audio play failed', e));
    } catch (e) {}
  };

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.reload();
  };

  const onNodeClick = (nodeId: string) => {
      // Logic to handle node clicks (Profile, File, etc.)
      if (nodeId.startsWith('file-')) {
          const fileId = nodeId.replace('file-', '');
          // Identify if it's a drift file object or just an ID
          // We can find it in nodes
          const node = nodes.find(n => n.id === nodeId);
          if (node && node.data) {
              setPreviewFile(node.data);
          }
      } else if (nodeId.startsWith('collection-')) {
          const collectionId = nodeId.replace('collection-', '');
          // Open CollectionsManager. For now, just open the manager,
          // later we might add a specific view mode for a collection.
          setIsCollectionsOpen(true);
          // Potentially: setFocusedCollectionId(collectionId); in state and pass down
      }
      else {
         // It's a user
         navigate(`/communique/${nodeId}`);
      }
  };

  // Login Form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regEmail, setRegEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const res = await fetch('/api/login', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ username: loginUsername, password: loginPassword })
          });
          const data = await res.json();
          if (res.ok) {
              setCurrentUser(data.user);
              connectWebSocket();
          } else {
              showToast(data.error, 'error');
          }
      } catch (err) {
          showToast('Login failed', 'error');
      }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const res = await fetch('/api/register', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ username: loginUsername, password: loginPassword, email: regEmail })
          });
          const data = await res.json();
          if (res.ok) {
              showToast('Registration successful! Check your email.', 'success');
              setIsRegistering(false);
          } else {
              showToast(data.error, 'error');
          }
      } catch (err) {
          showToast('Registration failed', 'error');
      }
  };

  // Admin Check
  const isAdmin = currentUser?.id === 1; // Hardcoded admin ID for now

  if (loadingUser) {
    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-color)',
            color: 'var(--text-primary)',
            flexDirection: 'column',
            gap: '20px'
        }}>
            <div className="radar-scan" style={{ width: '50px', height: '50px', border: '2px solid var(--accent-sym)', borderRadius: '50%' }}></div>
            <div>Establishing Uplink...</div>
        </div>
    );
  }

  return (
    <>
      {!currentUser && location.pathname !== '/verify' ? (
        <div className="login-container">
            <h1 className="glitch" data-text="r3L-f">r3L-f</h1>
            <p className="subtitle">R E L A T I O N A L &nbsp; E P H E M E R A L &nbsp; F I L E N E T</p>

            <div className="login-grid">
               <div className="info-card">
                  <IconRadar2 size={32} color="var(--accent-sym)" />
                  <h3>THE DRIFT</h3>
                  <p>Tune your radar to detect faint signals from the void. Discover artifacts and users floating in the digital ether.</p>
               </div>

                <div className="info-card">
                  <IconChartCircles size={32} color="var(--accent-alert)" />
                  <h3>VITALITY</h3>
                  <p>Data requires energy. Artifacts decay without attention. Boost signals to keep them alive, or let them fade.</p>
               </div>

               <div className="login-form-card">
                   <h2>{isRegistering ? 'INITIALIZE NODE' : 'RESUME BROADCAST'}</h2>
                   <form onSubmit={isRegistering ? handleRegister : handleLogin}>
                       <input
                         type="text"
                         placeholder="Username"
                         value={loginUsername}
                         onChange={e => setLoginUsername(e.target.value)}
                         required
                       />
                        {isRegistering && (
                            <input
                                type="email"
                                placeholder="Email (for verification)"
                                value={regEmail}
                                onChange={e => setRegEmail(e.target.value)}
                                required
                            />
                        )}
                       <input
                         type="password"
                         placeholder="Password"
                         value={loginPassword}
                         onChange={e => setLoginPassword(e.target.value)}
                         required
                       />
                       <button type="submit" className="primary-btn">
                           {isRegistering ? 'REGISTER' : 'LOGIN'} <IconMenu2 size={16} style={{transform: 'rotate(90deg)'}}/>
                       </button>
                   </form>
                   <button className="text-btn" onClick={() => setIsRegistering(!isRegistering)}>
                       {isRegistering ? 'Already have a frequency? Login' : 'Need a frequency? Register'}
                   </button>
               </div>
            </div>
        </div>
      ) : (
        <>
            <KeyManager />
            {/* Header / Nav */}
            <div className="header glass-panel" style={{ 
              background: `rgba(${theme === 'light' ? '255, 255, 255' : '20, 25, 32'}, ${theme_preferences.navOpacity ?? 0.8})`,
              backdropFilter: 'blur(12px)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '2px', cursor: 'pointer' }} onClick={() => navigate('/')}>r3L-f <span style={{ fontSize: '0.6rem', color: 'var(--accent-sym)', border: '1px solid var(--accent-sym)', padding: '1px 3px', borderRadius: '3px', verticalAlign: 'middle' }}>BETA</span></h2>
                    <div className="desktop-only" style={{ display: 'flex', gap: '10px' }}>
                         <SearchBar />
                         <RandomUserButton />
                    </div>
                </div>

                {currentUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    
                    <div className="desktop-only" style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '2px', border: '1px solid var(--border-color)' }}>
                        <button 
                          onClick={() => { setViewMode('graph'); navigate('/'); }}
                          title="Graph View"
                          style={{ 
                            padding: '6px 10px', 
                            background: viewMode === 'graph' ? 'var(--accent-sym)' : 'transparent', 
                            color: viewMode === 'graph' ? '#000' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          <IconChartCircles size={18} aria-hidden="true" />
                        </button>
                        <button 
                          onClick={() => { setViewMode('list'); navigate('/'); }}
                          title="List View"
                          style={{ 
                            padding: '6px 10px', 
                            background: viewMode === 'list' ? 'var(--accent-sym)' : 'transparent', 
                            color: viewMode === 'list' ? '#000' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          <IconList size={18} aria-hidden="true" />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', background: isDrifting ? 'rgba(50, 255, 100, 0.1)' : 'transparent', borderRadius: '4px' }}>
                          <button onClick={toggleDrift} title="Toggle Drift" aria-label="Toggle Drift Mode" className={isDrifting ? 'active' : ''} style={{ padding: '8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                            <IconRadar2 size={20} aria-hidden="true" />
                          </button>
                          <button onClick={cycleDriftType} title={`Filter: ${driftType || 'All'}`} style={{ padding: '8px 6px', fontSize: '0.7rem', minWidth: '40px', color: isDrifting ? 'var(--accent-sym)' : 'var(--text-secondary)' }}>
                              {driftType ? driftType.toUpperCase() : 'ALL'}
                          </button>
                      </div>
                    </div>
                    
                    <button onClick={() => { 
                      if (!isInboxOpen) setIsMenuOpen(false); 
                      setIsInboxOpen(!isInboxOpen); 
                      setUnreadCount(0); 
                    }} style={{ padding: '8px', position: 'relative' }} aria-label={`Inbox, ${unreadCount} unread`}>
                    Inbox
                    {unreadCount > 0 && (
                        <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'var(--accent-alert)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '8px',
                        height: '8px',
                        }} aria-hidden="true"></span>
                    )}
                    </button>
    
                    <button onClick={() => {
                        if (!isMenuOpen) setIsInboxOpen(false);
                        setIsMenuOpen(!isMenuOpen);
                    }} style={{ padding: '8px' }} title="Menu" aria-label="Open menu">
                        {isMenuOpen ? <IconX size={20} aria-hidden="true" /> : <IconMenu2 size={20} aria-hidden="true" />}
                    </button>
                </div>
                )}
                </div>
            </div>
    
            {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="glass-panel nav-dropdown" style={{
                  position: 'absolute',
                  top: '60px',
                  right: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  zIndex: 2000,
                  maxHeight: '80vh',
                  overflowY: 'auto'
                }}>
                    <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                        <SearchBar onNavigate={() => setIsMenuOpen(false)} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>View Mode:</span>
                             <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px' }}>
                                <button 
                                  onClick={() => { setViewMode('graph'); setIsMenuOpen(false); navigate('/'); }}
                                  style={{ 
                                    padding: '6px 10px', 
                                    background: viewMode === 'graph' ? 'var(--accent-sym)' : 'transparent', 
                                    color: viewMode === 'graph' ? '#000' : 'var(--text-secondary)',
                                    border: 'none',
                                    borderRadius: '3px'
                                  }}
                                >
                                  <IconChartCircles size={16} />
                                </button>
                                <button 
                                  onClick={() => { setViewMode('list'); setIsMenuOpen(false); navigate('/'); }}
                                  style={{ 
                                    padding: '6px 10px', 
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
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Drift:</span>
                            <button onClick={() => { toggleDrift(); setIsMenuOpen(false); }} className={isDrifting ? 'active' : ''} style={{ padding: '6px' }}>
                                <IconRadar2 size={18} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Discover:</span>
                             <RandomUserButton onNavigate={() => setIsMenuOpen(false)} />
                        </div>
                    </div>

                    <button onClick={() => { setIsCollectionsOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '5px' }}>
                        <IconFolder size={18} /> Collections
                    </button>

                    <button onClick={() => { setIsGroupChatOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '5px' }}>
                        <IconUsers size={18} /> Groups
                    </button>

                    <button onClick={() => { navigate('/chat'); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '5px' }}>
                        <IconMessageCircle size={18} /> Global Chat
                    </button>

                    <button onClick={() => { setIsArchiveOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '5px' }}>
                        <IconArchive size={18} /> Community Archive
                    </button>

                    <button onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '5px' }}>
                        <IconSettings size={18} /> Settings
                    </button>

                    <button onClick={() => { toggleTheme(); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '5px' }}>
                        <IconPalette size={18} /> Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </button>

                    <button onClick={() => { setIsFAQOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '5px' }}>
                        <IconHelp size={18} /> Help
                    </button>
                    <button onClick={() => { setIsFeedbackOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '5px' }}>
                        <IconMessage size={18} /> Feedback
                    </button>
                    <button onClick={() => { setIsAboutOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '5px' }}>
                        <IconInfoCircle size={18} /> About
                    </button>
                    
                    {isAdmin && (
                      <button onClick={() => { setIsAdminOpen(true); setIsMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', border: 'none', background: 'transparent', color: 'var(--accent-alert)', padding: '5px' }}>
                          <IconDashboard size={18} /> Admin
                      </button>
                    )}
                    
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '5px 0' }}></div>
                    
                    <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '5px' }}>
                        <IconLogout size={18} /> Logout
                    </button>
                </div>
            )}
    
            {isFAQOpen && <FAQ onClose={() => setIsFAQOpen(false)} />}
            {isAboutOpen && <About onClose={() => setIsAboutOpen(false)} />}
            {isAdmin && isAdminOpen && <AdminDashboard onClose={() => setIsAdminOpen(false)} />}
            {isInboxOpen && <Inbox onClose={() => setIsInboxOpen(false)} onOpenCommunique={onNodeClick} />}
            {isGroupChatOpen && currentUser && <GroupChat onClose={() => setIsGroupChatOpen(false)} currentUserId={currentUser.id} />}
            {isArchiveOpen && <ArchiveVote onClose={() => setIsArchiveOpen(false)} />}
            {isCollectionsOpen && <CollectionsManager onClose={() => setIsCollectionsOpen(false)} />}
            {isFeedbackOpen && <FeedbackModal onClose={() => setIsFeedbackOpen(false)} />}
            {isSettingsOpen && <SettingsPage onClose={() => setIsSettingsOpen(false)} currentUser={currentUser} onUpdateUser={setCurrentUser} />}
            {previewFile && (
              <FilePreviewModal
                  fileId={previewFile.id}
                  currentUser={currentUser}
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
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/chat" element={<GlobalChat />} />
        <Route path="/" element={
                viewMode === 'graph' ? (
                  <AssociationWeb
                    onNodeClick={onNodeClick}
                    nodes={nodes}
                    links={links}
                    collections={collections}
                    isDrifting={isDrifting}
                    onlineUserIds={onlineUserIds}
                    isLurking={currentUser?.is_lurking}
                  />
                ) : (
                  <NetworkList
                    nodes={nodes}
                    onNodeClick={onNodeClick}
                    loading={loading}
                    />
                )
              } />
              <Route path="/communique/:userId" element={<CommuniquePage currentUser={currentUser} onUpdateUser={(user) => setCurrentUser(user)} />} />
            </Routes>

            {currentUser && <CustomizationSettings />}
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
          <AmbientBackground
            // Optional: Pass videoSrc="/assets/nebula_loop.webm" if available
            // Optional: audioSrc="/assets/drone_ambient.mp3"
          />
          <Main />
        </ToastProvider>
      </CustomizationProvider>
    </ThemeProvider>
  );
}

export default App;
