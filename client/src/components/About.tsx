import React from 'react';
import { IconX, IconBrandGithub, IconRefresh, IconBolt, IconRadar2, IconFolder } from '@tabler/icons-react';

interface AboutProps {
  onClose: () => void;
}

const About: React.FC<AboutProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay fade-in">
      <div style={{
        width: '800px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--bg-mist)', border: '1px solid var(--border-color)', borderRadius: '8px',
        padding: '30px', position: 'relative', boxShadow: '0 0 30px #000'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '15px', right: '15px',
          background: 'transparent', border: 'none', padding: '5px', cursor: 'pointer', color: 'var(--text-secondary)'
        }}>
          <IconX />
        </button>

        <header style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '1px dotted var(--border-color)', paddingBottom: '20px' }}>
             <h1 style={{ fontSize: '2rem', color: 'var(--accent-sym)', margin: '0 0 10px 0' }}>REL F</h1>
             <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>
                 Relational & Ephemeral File Network
             </p>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '10px' }}>
                 <em>Know</em> what you share. <span style={{ textDecoration: 'underline' }}>Choose</span> who you’re sym with.
             </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <IconRefresh size={20} color="var(--accent-asym)" /> Ephemerality
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    In traditional villages, conversations vanish into the air. Modern social media haunts you with a permanent record. 
                    <strong>Rel F</strong> restores the right to be forgotten. Content expires (decays) automatically unless you choose to save it.
                </p>
            </div>
            <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <IconRadar2 size={20} color="var(--accent-sym)" /> The Rel
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    "REL" is not an acronym—it’s the spirit of organic connection. 
                    We reject algorithmic engagement farming. 
                    Your network is built on voluntary, mutual (Sym) interactions, not unilateral following.
                </p>
            </div>
        </div>

        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--text-primary)' }}>Ideological Overview</h3>
        <div style={{ columns: '2 300px', columnGap: '20px', marginBottom: '30px' }}>
            <p style={{ marginTop: 0 }}>
                <strong>Mutual Visibility:</strong> No gods, no influencers. If you are connected, both parties see each other. This horizontal approach fosters accountability and empathy.
            </p>
            <p>
                <strong>The Drift:</strong> Tune your radar to detect faint signals from the void. The Drift surfaces content based on randomness and vitality, not optimization for addiction.
            </p>
            <p>
                <strong>Vitality:</strong> Data requires energy. Artifacts decay without attention. Boost signals to keep them alive, or let them fade back into the mist.
            </p>
            <p>
                <strong>User-Curated:</strong> A billionaire's AI shouldn't dictate your friends. You build your network through trust and deliberate choice.
            </p>
        </div>

        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--text-primary)' }}>Core Concepts</h3>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 20px', alignItems: 'baseline' }}>
            <dt style={{ color: 'var(--accent-sym)', fontWeight: 'bold' }}>Sym (s,1)</dt>
            <dd style={{ margin: 0, color: 'var(--text-secondary)' }}>Clear, reciprocal, symmetrical interactions. Mutual agreement.</dd>

            <dt style={{ color: 'var(--accent-asym)', fontWeight: 'bold' }}>A-Sym (a,2)</dt>
            <dd style={{ margin: 0, color: 'var(--text-secondary)' }}>Casual, serendipitous, one-way observations. The Drift.</dd>

            <dt style={{ color: 'var(--accent-me)', fontWeight: 'bold' }}>3rd Space (3,3)</dt>
            <dd style={{ margin: 0, color: 'var(--text-secondary)' }}>Secure, private, self-contained collaborations. Your private cache (RPC).</dd>

            <dt style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>RCC (Wrick)</dt>
            <dd style={{ margin: 0, color: 'var(--text-secondary)' }}>R3LF Cache Communique. Your public digital drawer/profile.</dd>
        </dl>

        <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'center', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
            <p>
                <em>"Every moment away from the endless scroll is a small revolution."</em>
            </p>
            <a href="https://github.com/thuruht/r3l" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)', textDecoration: 'none' }}>
                <IconBrandGithub size={16} /> Source Code
            </a>
        </div>
      </div>
    </div>
  );
};

export default About;
