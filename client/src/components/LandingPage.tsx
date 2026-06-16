import React, { useState } from 'react';
import { IconArrowRight, IconRadar2, IconActivity, IconCirclesRelation } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';

interface LandingPageProps {
  onLogin: (e: React.FormEvent, data: any) => void;
  onRegister: (e: React.FormEvent, data: any) => void;
  onForgotPassword: (e: React.FormEvent, email: string) => void;
  authError: string | null;
  isRegistering: boolean;
  setIsRegistering: (val: boolean) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  onRegister,
  onForgotPassword,
  authError,
  isRegistering,
  setIsRegistering,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
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

  return (
    <div className="landing-container fade-in">
      <div className="landing-content">
        <header className="landing-header">
          <h1 className="glitch-text" data-text="Rel F">Rel F</h1>
          <p className="subtitle">Relational Ephemeral Filenet</p>
        </header>

        <div className="landing-grid">
          <div className="feature-card">
            <IconRadar2 size={ICON_SIZES['2xl']} color="var(--accent-sym)" />
            <h3>The Drift</h3>
            <p>Tune your radar to detect faint signals from the void. Discover artifacts and users floating in the digital ether.</p>
          </div>
          <div className="feature-card">
            <IconActivity size={ICON_SIZES['2xl']} color="var(--accent-alert)" />
            <h3>Vitality</h3>
            <p>Data requires energy. Artifacts decay without attention. Boost signals to keep them alive, or let them fade.</p>
          </div>
          <div className="feature-card">
            <IconCirclesRelation size={ICON_SIZES['2xl']} color="var(--accent-me)" />
            <h3>Sym & A-Sym</h3>
            <p>Forge connections. A-Sym links are one-way observations. Sym links are mutual — explicit, consensual channels for direct exchange.</p>
          </div>
        </div>

        <div className="auth-panel glass-panel">
          {showForgot ? (
            <>
              <h2>Reset Signal Key</h2>
              <form onSubmit={handleForgotSubmit}>
                <div className="input-group">
                  <label htmlFor="forgot-email" className="input-label">Email address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="your@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="submit-btn">
                  Send Reset Link <IconArrowRight size={ICON_SIZES.lg} />
                </button>
              </form>
              <div className="auth-switch">
                <button onClick={() => setShowForgot(false)}>Back to login</button>
              </div>
            </>
          ) : (
            <>
              <h2>{isRegistering ? 'Initialize Signal' : 'Resume Broadcast'}</h2>

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="auth-username" className="input-label">Username</label>
                  <input
                    id="auth-username"
                    type="text"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete={isRegistering ? 'username' : 'username'}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="auth-password" className="input-label">Password</label>
                  <input
                    id="auth-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    minLength={isRegistering ? 8 : undefined}
                  />
                </div>
                {isRegistering && (
                  <div className="input-group fade-in">
                    <label htmlFor="auth-email" className="input-label">Email</label>
                    <input
                      id="auth-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                )}

                {authError && <div className="error-message fade-in" role="alert">{authError}</div>}

                <button type="submit" className="submit-btn">
                  {isRegistering ? 'Register' : 'Login'} <IconArrowRight size={ICON_SIZES.lg} />
                </button>
              </form>

              <div className="auth-switch">
                <button onClick={() => setIsRegistering(!isRegistering)}>
                  {isRegistering ? 'Already have a signal? Login' : 'Need a frequency? Register'}
                </button>
                {!isRegistering && (
                  <button onClick={() => setShowForgot(true)} style={{ marginTop: '8px', display: 'block', width: '100%' }}>
                    Forgot password?
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="landing-background">
        <div className="grid-overlay"></div>
        <div className="glow-orb"></div>
      </div>

      <style>{`
        .landing-container {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background-color: var(--bg-color);
          overflow-y: auto;
          padding: 20px;
          box-sizing: border-box;
        }

        .landing-content {
          position: relative;
          z-index: 2;
          max-width: 1000px;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 60px;
          align-items: center;
        }

        .landing-header {
          grid-column: 1 / -1;
          text-align: center;
          margin-bottom: 40px;
        }

        .landing-header h1 {
          font-size: 5rem;
          margin: 0;
          letter-spacing: 0.1em;
          text-shadow: 0 0 20px var(--accent-sym);
        }

        .subtitle {
          font-family: 'Rajdhani', sans-serif;
          font-size: 1.5rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.3em;
        }

        .landing-grid {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          padding: 20px;
          border-radius: 8px;
          transition: transform 0.3s;
        }

        .feature-card:hover {
          transform: translateX(10px);
          border-color: var(--accent-sym);
          background: rgba(255, 255, 255, 0.05);
        }

        .feature-card h3 {
          margin: 10px 0 5px 0;
          color: var(--text-primary);
        }

        .feature-card p {
          margin: 0;
          font-size: 0.9em;
          color: var(--text-secondary);
        }

        .auth-panel {
          padding: 30px;
          border-radius: 12px;
          background: var(--drawer-bg);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }

        .auth-panel h2 {
          margin-top: 0;
          text-align: center;
          margin-bottom: 20px;
          font-size: 1.5rem;
        }

        .input-group {
          margin-bottom: 15px;
        }

        .input-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 5px;
          font-family: var(--font-family-heading);
        }

        .input-group input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px;
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-radius: 6px;
          transition: border-color 0.3s;
        }

        .input-group input:focus {
          border-color: var(--accent-sym);
          outline: none;
        }

        .submit-btn {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: var(--accent-sym);
          color: #000;
          font-weight: bold;
          border: none;
          margin-top: 10px;
        }

        .submit-btn:hover {
          background: var(--accent-sym-bright);
          box-shadow: 0 0 15px var(--accent-sym);
        }

        .auth-switch {
          margin-top: 20px;
          text-align: center;
        }

        .auth-switch button {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.9em;
          text-decoration: underline;
        }

        .auth-switch button:hover {
          color: var(--text-primary);
          box-shadow: none;
        }

        .error-message {
          color: var(--accent-alert);
          font-size: 0.9em;
          margin-bottom: 15px;
          text-align: center;
        }

        .landing-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        .grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image:
            linear-gradient(var(--border-color) 1px, transparent 1px),
            linear-gradient(90deg, var(--border-color) 1px, transparent 1px);
          background-size: 50px 50px;
          opacity: 0.1;
          mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
        }

        .glow-orb {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, var(--accent-sym) 0%, transparent 70%);
          opacity: 0.1;
          filter: blur(80px);
          animation: pulse 5s infinite ease-in-out;
        }

        @media (max-width: 900px) {
          .landing-content {
            grid-template-columns: 1fr;
            max-width: 500px;
          }
          .landing-grid {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
          }
          .feature-card {
            flex: 1 1 200px;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
