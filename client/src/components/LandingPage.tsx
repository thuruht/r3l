import React, { useState, useEffect, useRef } from 'react';

interface LandingPageProps {
  onLogin: (e: React.FormEvent, data: any) => void;
  onRegister: (e: React.FormEvent, data: any) => void;
  onForgotPassword: (e: React.FormEvent, email: string) => void;
  authError: string | null;
  isRegistering: boolean;
  setIsRegistering: (val: boolean) => void;
}

const DRIFT_FILES = [
  { name: 'fieldnotes_june16.txt', snippet: 'everything moved slowly today...', connection: 'SYM', ttl: 72, ttlUrgent: false },
  { name: 'circuit_topology_v4.kicad', connection: 'A-SYM', ttl: 48, ttlUrgent: false },
  { name: 'on_impermanence.md', snippet: 'nothing should outlast its...', connection: '3SPACE', ttl: 168, ttlUrgent: false },
  { name: 'still_life_study_03.jpg', connection: 'SYM', ttl: 92, ttlUrgent: false },
  { name: 'voice_fragment_0614.m4a', connection: 'SYM', ttl: 22, ttlUrgent: true },
  { name: 'score_fragment_viii.sib', connection: 'A-SYM', ttl: 36, ttlUrgent: false },
  { name: 'resonance_study_ii.wav', connection: 'SYM', ttl: 14, ttlUrgent: true, resonance: true },
  { name: 'glaze_tests_2026.pdf', connection: 'A-SYM', ttl: 120, ttlUrgent: false },
  { name: 'network_sketch_001.svg', connection: '3SPACE', ttl: 80, ttlUrgent: false },
  { name: 'draft_manifesto_v2.txt', snippet: 'what we keep we keep together', connection: '3SPACE', ttl: 96, ttlUrgent: false },
  { name: 'process_log_0616.md', snippet: 'iteration 23, lattice test...', connection: 'SYM', ttl: 156, ttlUrgent: false },
  { name: 'archive_proposal.txt', connection: 'SYM', ttl: 8, ttlUrgent: true, archive: true },
];

const CONNECTION_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  SYM: { color: '#26de81', bg: 'rgba(38,222,129,.12)', border: 'rgba(38,222,129,.18)' },
  'A-SYM': { color: '#7a7870', bg: 'rgba(122,120,112,.11)', border: 'rgba(122,120,112,.16)' },
  '3SPACE': { color: '#7c3aed', bg: 'rgba(124,58,237,.13)', border: 'rgba(124,58,237,.18)' },
};

const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  onRegister,
  onForgotPassword,
  authError,
  isRegistering,
  setIsRegistering,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>(isRegistering ? 'register' : 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [driftCount, setDriftCount] = useState(0);

  useEffect(() => {
    let count = 1900 + Math.floor(Math.random() * 400);
    setDriftCount(count);
    const interval = setInterval(() => {
      count += Math.floor(Math.random() * 7) - 3;
      if (count < 1400) count = 1400;
      setDriftCount(count);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'register') {
      onRegister(e, { username, password, email });
    } else {
      onLogin(e, { username, password });
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    onForgotPassword(e, forgotEmail);
    setShowForgot(false);
    setForgotEmail('');
  };

  const openLogin = () => { setAuthMode('login'); setIsRegistering(false); setModalOpen(true); };
  const openRegister = () => { setAuthMode('register'); setIsRegistering(true); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07080f',
      color: '#e2e6f0',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      <section style={{
        position: 'relative', width: '100%', minHeight: '100vh',
        background: '#07080f', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Drift field */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {DRIFT_FILES.map((f, i) => {
            const cc = CONNECTION_COLORS[f.connection];
            const left = [1, 8, 15, 3, 10, 19, 73, 80, 87, 76, 83, 90][i % 12];
            const delay = [0, -12, -7, -18, -4, -22, -9, 0, -16, -5, -11, -20][i % 12];
            const duration = [23, 28, 19, 31, 21, 26, 24, 29, 20, 32, 18, 27][i % 12];
            const rotate = [-2, 1.5, -1, 2, -1.5, 0.5, 1, -2, 1.5, -1, 2, -1.5][i % 12];
            const width = [148, 160, 154, 144, 166, 150, 158, 152, 148, 162, 154, 146][i % 12];

            return (
              <div key={i} style={{
                position: 'absolute', left: `${left}%`, bottom: '-200px',
                width: `${width}px`, transform: `rotate(${rotate}deg)`,
                animation: `drift-up ${duration}s linear ${delay}s infinite`,
                pointerEvents: 'none',
              }}>
                <div style={{
                  background: 'rgba(13,15,24,.94)', border: `1px solid ${cc.border}`,
                  borderRadius: '3px', padding: '10px 12px',
                }}>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                    color: '#7a8799', marginBottom: f.snippet ? '4px' : '6px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{f.name}</div>
                  {f.snippet && (
                    <div style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px',
                      color: '#3d4455', fontStyle: 'italic', marginBottom: '6px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{f.snippet}</div>
                  )}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px',
                      color: cc.color, background: cc.bg,
                      border: '1px solid transparent', padding: '2px 5px', borderRadius: '2px',
                    }}>{f.connection}</span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px',
                      color: f.ttlUrgent ? '#ff4b4b' : '#e8763a',
                      background: f.ttlUrgent ? 'rgba(255,75,75,.1)' : 'rgba(232,118,58,.1)',
                      border: '1px solid transparent', padding: '2px 5px', borderRadius: '2px',
                    }}>{f.ttl}h TTL</span>
                    {f.resonance && (
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px',
                        color: 'rgba(38,222,129,.7)',
                        background: 'rgba(38,222,129,.08)',
                        border: '1px solid rgba(38,222,129,.2)',
                        padding: '2px 5px', borderRadius: '2px',
                      }}>RESONANCE</span>
                    )}
                    {f.archive && (
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px',
                        color: '#e2e6f0', background: 'rgba(255,255,255,.06)',
                        border: '1px solid rgba(255,255,255,.12)',
                        padding: '2px 5px', borderRadius: '2px',
                      }}>ARCHIVE</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(38,222,129,.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(38,222,129,.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }} />

        {/* Emergence gradients */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '22vh',
          background: 'linear-gradient(transparent, rgba(7,8,15,.85))',
          pointerEvents: 'none', zIndex: 2,
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '14vh',
          background: 'linear-gradient(rgba(7,8,15,.7), transparent)',
          pointerEvents: 'none', zIndex: 2,
        }} />

        {/* Radial vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 52% 68% at 50% 50%, rgba(7,8,15,.94) 0%, rgba(7,8,15,.78) 30%, rgba(7,8,15,.44) 55%, rgba(7,8,15,.1) 72%, transparent 86%)',
          pointerEvents: 'none', zIndex: 3,
        }} />

        {/* Center content */}
        <div style={{
          position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '16px', textAlign: 'center',
          padding: '24px 48px', maxWidth: '580px',
          animation: 'fade-up-in .9s ease-out both',
        }}>
          {/* Node icon */}
          <div style={{ animation: 'node-float 5s ease-in-out infinite', opacity: 0.6 }}>
            <svg width="48" height="48" viewBox="0 0 32 32">
              <line x1="4" y1="27" x2="16" y2="5" stroke="#26de81" strokeWidth="1.5" opacity=".45" />
              <line x1="28" y1="27" x2="16" y2="5" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="3 2" opacity=".5" />
              <line x1="4" y1="27" x2="28" y2="27" stroke="#7a7870" strokeWidth="1.5" opacity=".4" />
              <circle cx="4" cy="27" r="4.5" fill="#26de81" />
              <circle cx="28" cy="27" r="4.5" fill="#7a7870" />
              <circle cx="16" cy="5" r="4.5" fill="#7c3aed" />
            </svg>
          </div>

          {/* Wordmark with scan line */}
          <div style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', paddingBottom: '10px' }}>
            <h1 style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: 'clamp(72px,9vw,116px)', lineHeight: 1,
              letterSpacing: '.02em', margin: 0,
              WebkitTextStroke: '0.75px rgba(255,255,255,.07)',
              animation: 'glitch-hero 13s ease-in-out 3s infinite',
            }}>
              <span style={{ color: '#e2e6f0' }}>R</span>
              <span style={{ color: '#26de81' }}>3</span>
              <span style={{ color: '#e2e6f0' }}>L</span>
              <span style={{ color: '#26de81', fontSize: '.75em', verticalAlign: '-.07em', letterSpacing: '-.02em' }}>:</span>
              <span style={{ color: '#e2e6f0' }}>F</span>
            </h1>
            <div style={{
              position: 'absolute', top: '50%', left: 0, right: 0, height: '2px',
              background: 'linear-gradient(90deg, transparent 0%, #26de81 28%, rgba(38,222,129,.55) 72%, transparent 100%)',
              animation: 'scan-hero 8s ease-in-out 2s infinite',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Tagline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '-4px' }}>
            <div style={{ height: '1px', width: '32px', background: '#1c2035', flexShrink: 0 }} />
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 'clamp(8px,0.85vw,10px)', color: '#3d4455',
              letterSpacing: '.26em', textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>Relational Relativity &amp; Random Ephemerality File-net</div>
            <div style={{ height: '1px', width: '32px', background: '#1c2035', flexShrink: 0 }} />
          </div>

          {/* Philosophy */}
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(11px,1.1vw,13px)', fontWeight: 300,
            color: '#5a6478', lineHeight: 2.1, margin: '4px 0 0', maxWidth: '460px',
          }}>
            Three ways to connect: SYM, A-SYM, 3SPACE.<br />
            Three ways to share: DRIFT, your network, or yourself alone.<br />
            Files expire. Permanence is earned.
          </p>

          {/* CTAs */}
          <div style={{
            display: 'flex', gap: '12px', alignItems: 'center',
            flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px',
          }}>
            <button
              onClick={openRegister}
              style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800,
                fontSize: 'clamp(12px,1.2vw,14px)', letterSpacing: '.1em',
                textTransform: 'uppercase', background: '#26de81', color: '#000',
                border: 'none', padding: '13px 32px', cursor: 'pointer',
                borderRadius: '2px', transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4deaa0'; e.currentTarget.style.boxShadow = '0 0 22px rgba(38,222,129,.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#26de81'; e.currentTarget.style.boxShadow = 'none'; }}
            >INITIALIZE SIGNAL</button>
            <button
              onClick={openLogin}
              style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800,
                fontSize: 'clamp(12px,1.2vw,14px)', letterSpacing: '.1em',
                textTransform: 'uppercase', background: 'transparent',
                color: '#b8bfcc', border: '1px solid #3d4455',
                padding: '13px 32px', cursor: 'pointer',
                borderRadius: '2px', transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#e2e6f0'; e.currentTarget.style.borderColor = '#6a7280'; e.currentTarget.style.background = 'rgba(255,255,255,.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#b8bfcc'; e.currentTarget.style.borderColor = '#3d4455'; e.currentTarget.style.background = 'transparent'; }}
            >RESUME BROADCAST</button>
          </div>

          {/* Drift count */}
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 'clamp(9px,0.9vw,11px)', color: '#3d4455', marginTop: '4px',
            animation: 'count-tick 4s ease-in-out infinite',
          }}>
            <span style={{ color: 'rgba(38,222,129,.55)' }}>{driftCount.toLocaleString()}</span> files in drift
          </div>
        </div>

        {/* DRIFT · LIVE */}
        <div style={{
          position: 'absolute', bottom: '28px', left: '36px', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none',
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#26de81', opacity: 0.65,
            animation: 'pulse-dot 2s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
            color: '#3d4455', letterSpacing: '.18em', textTransform: 'uppercase',
          }}>DRIFT · LIVE</span>
        </div>
      </section>

      {/* Auth Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
            backdropFilter: 'blur(6px)', zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: '#0d0f1c', border: '1px solid #2a2f3a',
              borderRadius: '4px', width: '100%', maxWidth: '380px',
              padding: '36px 32px', position: 'relative',
              animation: 'modal-in .22s ease-out both',
              boxShadow: '0 24px 64px rgba(0,0,0,.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'transparent', border: 'none',
                color: '#4a5568', fontSize: '18px', cursor: 'pointer',
                padding: '4px 8px', lineHeight: 1, fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#e2e6f0'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#4a5568'; }}
            >×</button>

            <h2 style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: '22px', letterSpacing: '.08em',
              textTransform: 'uppercase', margin: '0 0 4px', color: '#e2e6f0',
            }}>
              {showForgot ? 'Reset Signal Key' : (authMode === 'login' ? 'RESUME BROADCAST' : 'INITIALIZE SIGNAL')}
            </h2>
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
              color: '#3d4455', letterSpacing: '.1em', margin: '0 0 28px',
            }}>
              {showForgot ? 'reset your access key' : (authMode === 'login' ? 'sign back into your node' : 'establish a new presence')}
            </p>

            {showForgot ? (
              <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block', fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '9px', color: '#3d4455', letterSpacing: '.18em',
                    textTransform: 'uppercase', marginBottom: '6px',
                  }}>Email</label>
                  <input
                    type="email" value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="your@address.net" required
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: 'rgba(0,0,0,.25)', border: '1px solid #2a2f3a',
                      borderRadius: '3px', color: '#e2e6f0',
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px',
                      outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#26de81'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(38,222,129,.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#2a2f3a'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <button type="submit" style={{
                  width: '100%', padding: '13px', background: '#26de81',
                  color: '#000', border: 'none', borderRadius: '3px',
                  fontFamily: "'Syne', sans-serif", fontWeight: 800,
                  fontSize: '14px', letterSpacing: '.12em',
                  textTransform: 'uppercase', cursor: 'pointer', marginTop: '8px',
                  transition: 'all .2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#4deaa0'; e.currentTarget.style.boxShadow = '0 0 20px rgba(38,222,129,.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#26de81'; e.currentTarget.style.boxShadow = 'none'; }}
                >Send Reset Link</button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block', fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '9px', color: '#3d4455', letterSpacing: '.18em',
                    textTransform: 'uppercase', marginBottom: '6px',
                  }}>Username</label>
                  <input
                    type="text" value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="your_handle" required
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: 'rgba(0,0,0,.25)', border: '1px solid #2a2f3a',
                      borderRadius: '3px', color: '#e2e6f0',
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px',
                      outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#26de81'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(38,222,129,.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#2a2f3a'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block', fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '9px', color: '#3d4455', letterSpacing: '.18em',
                    textTransform: 'uppercase', marginBottom: '6px',
                  }}>Password</label>
                  <input
                    type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: 'rgba(0,0,0,.25)', border: '1px solid #2a2f3a',
                      borderRadius: '3px', color: '#e2e6f0',
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px',
                      outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#26de81'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(38,222,129,.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#2a2f3a'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                {authMode === 'register' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block', fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '9px', color: '#3d4455', letterSpacing: '.18em',
                      textTransform: 'uppercase', marginBottom: '6px',
                    }}>Email</label>
                    <input
                      type="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@address.net" required
                      style={{
                        width: '100%', padding: '11px 14px',
                        background: 'rgba(0,0,0,.25)', border: '1px solid #2a2f3a',
                        borderRadius: '3px', color: '#e2e6f0',
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px',
                        outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#26de81'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(38,222,129,.12)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#2a2f3a'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                )}

                {authError && (
                  <div style={{
                    color: '#ff4b4b', fontSize: '0.9em', marginBottom: '15px',
                    textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace",
                  }}>{authError}</div>
                )}

                <button type="submit" style={{
                  width: '100%', padding: '13px', background: '#26de81',
                  color: '#000', border: 'none', borderRadius: '3px',
                  fontFamily: "'Syne', sans-serif", fontWeight: 800,
                  fontSize: '14px', letterSpacing: '.12em',
                  textTransform: 'uppercase', cursor: 'pointer', marginTop: '8px',
                  transition: 'all .2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#4deaa0'; e.currentTarget.style.boxShadow = '0 0 20px rgba(38,222,129,.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#26de81'; e.currentTarget.style.boxShadow = 'none'; }}
                >{authMode === 'login' ? 'RESUME BROADCAST' : 'INITIALIZE SIGNAL'}</button>
              </form>
            )}

            {/* Mode switch */}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              {showForgot ? (
                <button
                  onClick={() => setShowForgot(false)}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                    color: '#3d4455', background: 'transparent', border: 'none',
                    cursor: 'pointer', letterSpacing: '.05em',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#7a8799'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#3d4455'; }}
                >Back to login</button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const next = authMode === 'login' ? 'register' : 'login';
                      setAuthMode(next);
                      setIsRegistering(next === 'register');
                      setShowForgot(false);
                    }}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                      color: '#3d4455', background: 'transparent', border: 'none',
                      cursor: 'pointer', letterSpacing: '.05em',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#7a8799'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#3d4455'; }}
                  >
                    {authMode === 'login' ? 'No signal yet? Initialize →' : 'Already broadcasting? Login →'}
                  </button>
                  {authMode === 'login' && (
                    <div style={{ marginTop: '12px' }}>
                      <button
                        onClick={() => setShowForgot(true)}
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                          color: '#3d4455', background: 'transparent', border: 'none',
                          cursor: 'pointer', letterSpacing: '.05em',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#7a8799'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#3d4455'; }}
                      >Forgot password?</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-orb {
          0%, 100% { opacity: .07; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: .13; transform: translate(-50%, -50%) scale(1.06); }
        }
        @keyframes glitch-hero {
          0%, 88%, 100% { text-shadow: none; transform: none; }
          89% { text-shadow: -3px 0 rgba(255,75,75,.65), 3px 0 rgba(112,234,170,.65); transform: skewX(-1.5deg) translateX(-2px); }
          91% { text-shadow: 3px 0 rgba(255,75,75,.45), -3px 0 rgba(112,234,170,.45); transform: translateX(2px); }
          93% { text-shadow: none; transform: none; }
        }
        @keyframes scan-hero {
          0%   { transform: translateX(-100%); opacity: 0; }
          5%, 95% { opacity: 1; }
          100% { transform: translateX(220%); opacity: 0; }
        }
        @keyframes drift-up {
          0%   { transform: translateY(0);       opacity: 0; }
          6%   { opacity: .82; }
          88%  { opacity: .82; }
          100% { transform: translateY(-115vh);  opacity: 0; }
        }
        @keyframes fade-up-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes count-tick {
          0%, 93%, 100% { opacity: 1; }
          95%, 97%      { opacity: 0; }
        }
        @keyframes modal-in {
          from { opacity: 0; transform: translateY(12px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes node-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: .5; }
          50%       { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
        @media (max-width: 768px) {
          .field-drift { display: none; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
