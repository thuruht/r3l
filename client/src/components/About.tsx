import React from 'react';
import { IconX, IconBrandGithub, IconRefresh, IconBolt, IconRadar2, IconFolder, IconHeart, IconCode, IconShieldLock } from '@tabler/icons-react';

interface AboutProps {
  onClose: () => void;
}

const About: React.FC<AboutProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay fade-in" onClick={onClose}>
      <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{
        maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '15px', right: '15px',
          background: 'transparent', border: 'none', padding: '5px', cursor: 'pointer', color: 'var(--text-secondary)'
        }}>
          <IconX />
        </button>

        <header style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '1px dotted var(--border-color)', paddingBottom: '20px' }}>
             <h1 style={{ fontSize: '2.5rem', color: 'var(--accent-sym)', margin: '0 0 10px 0', letterSpacing: '3px' }}>R3L:F</h1>
             <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0, letterSpacing: '2px' }}>
                 RELATIONAL RELATIVITY & RANDOM EPHEMERALITY FILE-NET
             </p>
             <p style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '15px', fontStyle: 'italic' }}>
                 A serendipitous social network prioritizing user agency, organic discovery, and ephemeral content.
             </p>
        </header>

        <div style={{ display: 'grid', gap: '30px' }}>
          
          {/* Core Philosophy */}
          <section>
            <h3 style={{ color: 'var(--accent-sym)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Core Philosophy</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                  <IconRefresh size={20} color="var(--accent-asym)" /> Ephemerality
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Content expires by default (7 days). This restores the right to be forgotten and keeps the network present-focused. 
                  No permanent records haunting you forever.
                </p>
              </div>
              
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                  <IconRadar2 size={20} color="var(--accent-sym)" /> Organic Discovery
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  No algorithmic feeds. The Drift surfaces content through randomness and vitality, not engagement optimization. 
                  You find what you look for, or what looks for you.
                </p>
              </div>
              
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                  <IconHeart size={20} color="var(--accent-me)" /> User Agency
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  You control your data, connections, and visibility. Mutual (Sym) relationships require consent from both parties. 
                  No forced engagement or influencer hierarchies.
                </p>
              </div>
            </div>
          </section>

          {/* Key Features */}
          <section>
            <h3 style={{ color: 'var(--accent-sym)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Key Features</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '15px', alignItems: 'start' }}>
                <IconFolder size={24} color="var(--accent-asym)" />
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Universal Artifacts</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Share any file type: images, text, code, audio, video. In-place editing, remixing, and burn-on-read support.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '15px', alignItems: 'start' }}>
                <IconBolt size={24} color="var(--accent-sym)" />
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Vitality System</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Boost signals to extend life and increase visibility. Refresh to reset the 7-day timer. High-vitality content may be permanently archived.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '15px', alignItems: 'start' }}>
                <IconShieldLock size={24} color="var(--accent-me)" />
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>End-to-End Encryption</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    RSA-OAEP 2048-bit + AES-GCM 256-bit client-side encryption. Key management with export/import. Lock icon indicators for encrypted files.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '15px', alignItems: 'start' }}>
                <IconCode size={24} color="var(--accent-asym)" />
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Real-Time Collaboration</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Live document editing with Yjs CRDT. WebSocket-powered presence and notifications. Spatial audio for graph nodes.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Connection Types */}
          <section>
            <h3 style={{ color: 'var(--accent-sym)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Connection Types</h3>
            <dl style={{ display: 'grid', gap: '15px' }}>
              <div className="glass-panel" style={{ padding: '15px' }}>
                <dt style={{ color: 'var(--accent-sym)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>Sym (Symmetric)</dt>
                <dd style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Mutual, consensual relationships. Both parties see each other. Enables Sym-only artifact sharing, Whispers (DMs), group chats, and encrypted communication.
                </dd>
              </div>

              <div className="glass-panel" style={{ padding: '15px' }}>
                <dt style={{ color: 'var(--accent-asym)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>A-Sym (Asymmetric)</dt>
                <dd style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  One-way follows. Casual observation without mutual agreement. Can send message requests to users you follow.
                </dd>
              </div>

              <div className="glass-panel" style={{ padding: '15px' }}>
                <dt style={{ color: 'var(--accent-me)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>The Drift</dt>
                <dd style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Random sampling of public artifacts and users. Serendipitous discovery without algorithmic curation. Toggle filters for media types.
                </dd>
              </div>
            </dl>
          </section>

          {/* Technology Stack */}
          <section>
            <h3 style={{ color: 'var(--accent-sym)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Technology Stack</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.9rem' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Frontend:</strong>
                <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)' }}>React 18, TypeScript, D3.js, GSAP, CodeMirror, Yjs</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Backend:</strong>
                <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)' }}>Cloudflare Workers (Hono), Durable Objects</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Database:</strong>
                <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)' }}>Cloudflare D1 (SQLite)</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Storage:</strong>
                <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)' }}>Cloudflare R2 (S3-compatible)</p>
              </div>
            </div>
          </section>

          {/* Ideological Stance */}
          <section>
            <h3 style={{ color: 'var(--accent-sym)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Why Rel F Exists</h3>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <p>
                Traditional social media platforms optimize for engagement, not well-being. They create permanent records, 
                algorithmic echo chambers, and parasocial hierarchies. Rel F is a counter-concept:
              </p>
              <ul style={{ marginTop: '10px' }}>
                <li><strong>Temporary by default:</strong> Content expires unless actively maintained</li>
                <li><strong>No algorithms:</strong> Discovery through randomness and user curation</li>
                <li><strong>Horizontal relationships:</strong> No influencers, no follower counts, no clout</li>
                <li><strong>User-controlled:</strong> You own your data, connections, and visibility</li>
                <li><strong>Privacy-first:</strong> Encryption, lurker mode, and granular visibility controls</li>
              </ul>
              <p style={{ marginTop: '15px', fontStyle: 'italic', textAlign: 'center', color: 'var(--text-primary)' }}>
                "Every moment away from the endless scroll is a small revolution."
              </p>
            </div>
          </section>

          {/* Footer */}
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'center', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
            <p style={{ marginBottom: '10px' }}>Rel F is open source and built on the Cloudflare Developer Platform.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <a href="https://github.com/thuruht/r3l" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)', textDecoration: 'none' }}>
                <IconBrandGithub size={16} /> Source Code
              </a>
              <span>•</span>
              <span>Version: Beta 1.0</span>
              <span>•</span>
              <span>Status: Active Development</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default About;
