import React from 'react';
import { IconX, IconRadar2, IconRefresh, IconBolt, IconLink } from '@tabler/icons-react';

interface FAQProps {
  onClose: () => void;
}

const FAQ: React.FC<FAQProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay fade-in" onClick={onClose} style={{ zIndex: 4000 }}>
      <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-sym)' }}>Signal Calibration</h2>
          <button onClick={onClose} className="icon-btn"><IconX size={24} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <section>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-me)' }}><IconRadar2 /> The Drift</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>A sampling of random public signals from the network. No algorithms, no filters.</p>
          </section>

          <section>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-alert)' }}><IconRefresh /> Artifact Decay</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Files expire in 168 hours. Refresh them to reset the clock or boost them for vitality.</p>
          </section>

          <section>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-sym)' }}><IconBolt /> Vitality</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Attention provides life. High-vitality signals are archived permanently.</p>
          </section>

          <section>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}><IconLink /> Relationships</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Sym connections are mutual and encrypted. Asym connections are incidental.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
