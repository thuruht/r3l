import React from 'react';
import { IconX, IconBrandGithub } from '@tabler/icons-react';

interface AboutProps {
  onClose: () => void;
}

const About: React.FC<AboutProps> = ({ onClose }) => {
  return (
    <div className="about-overlay fade-in" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: '#000000dd', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        width: '600px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto',
        background: 'var(--bg-mist)', border: '1px solid var(--border-color)', borderRadius: '8px',
        padding: '30px', position: 'relative', boxShadow: '0 0 30px #000'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '15px', right: '15px',
          background: 'transparent', border: 'none', padding: '5px', cursor: 'pointer', color: 'var(--text-secondary)'
        }}>
          <IconX />
        </button>

        <h2 style={{ color: 'var(--accent-sym)', marginTop: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Rel F: Philosophy
        </h2>

        <div style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}>
            <p>
                <strong>Rel F</strong> (Relational Ephemeral Filenet) is an experiment in digital impermanence and connection.
            </p>
            
            <h4 style={{ color: 'var(--accent-asym)', marginTop: '20px', marginBottom: '10px' }}>The Void & The Drift</h4>
            <p style={{ marginTop: 0 }}>
                The modern web remembers everything. Rel F forgets. 
                The <strong>Drift</strong> is the noise between signals. By tuning your radar, you can discover 
                artifacts and users floating in this digital ether.
            </p>

            <h4 style={{ color: 'var(--accent-asym)', marginTop: '20px', marginBottom: '10px' }}>Vitality</h4>
            <p style={{ marginTop: 0 }}>
                Data requires energy to exist. Artifacts (files) uploaded to the network have <strong>Vitality</strong>. 
                Without attention (boosts), they decay and are eventually reclaimed by the void (deleted). 
                Only those that resonate with the network survive.
            </p>

            <h4 style={{ color: 'var(--accent-asym)', marginTop: '20px', marginBottom: '10px' }}>Symmetry</h4>
            <p style={{ marginTop: 0 }}>
                Connections are defined by their geometry. 
                <strong>Asym</strong> (Asymmetrical) links are one-way observations. 
                <strong>Sym</strong> (Symmetrical) links are mutual agreements, opening channels for direct sharing.
            </p>

            <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                <p>
                    <em>"We are but signals in the noise."</em>
                </p>
                <a href="https://github.com/thuruht/r3l" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)', textDecoration: 'none' }}>
                    <IconBrandGithub size={16} /> Source Code
                </a>
            </div>
        </div>
      </div>
    </div>
  );
};

export default About;