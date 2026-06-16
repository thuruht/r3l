import React from 'react';
import { IconX, IconRadar2, IconRefresh, IconBolt, IconLink } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';

interface FAQProps {
  onClose: () => void;
}

const FAQ: React.FC<FAQProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay fade-in" onClick={onClose} style={{ zIndex: 'var(--z-modal)' }}>
      <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-sym)' }}>Signal Calibration</h2>
          <button onClick={onClose} className="icon-btn"><IconX size={ICON_SIZES['2xl']} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <section>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-me)' }}><IconRadar2 /> DRIFT</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>A sampling of random public signals from the network. No algorithms, no filters.</p>
          </section>

          <section>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-alert)' }}><IconRefresh /> File TTL</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Files expire in 168 hours. Refresh them to reset the clock or boost a file's TTL to keep it alive.</p>
          </section>

          <section>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-sym)' }}><IconBolt /> ARCHIVE</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Files with enough community engagement are voted into permanent ARCHIVE — preserved forever regardless of TTL.</p>
          </section>

          <section>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}><IconLink /> SYM, A-SYM & 3SPACE</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>SYM connections are mutual and public. A-SYM connections are one-way observations. 3SPACE connections are mutual but invisible — ghost connections for maximum privacy. DRIFT surfaces random strangers with no connection required.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
