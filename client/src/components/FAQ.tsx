import React from 'react';
import { IconX, IconRadar2, IconRefresh, IconBolt, IconLink, IconFolder, IconShieldLock, IconEye } from '@tabler/icons-react';

interface FAQProps {
  onClose: () => void;
}

const FAQ: React.FC<FAQProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay fade-in" onClick={onClose} style={{ zIndex: 4000 }}>
      <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-sym)' }}>Field Manual / FAQ</h2>
          <button onClick={onClose} className="icon-btn"><IconX size={24} /></button>
        </div>

        <div style={{ display: 'grid', gap: '25px' }}>
          
          <section>
             <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                 <IconRefresh /> The Cycle of Decay
             </h3>
             <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                 <strong>How long do files last?</strong><br/>
                 By default, artifacts expire in 168 hours (7 days). This keeps the network light and present-focused.
                 <br/><br/>
                 <strong>Can I save them?</strong><br/>
                 Yes. You can "Refresh" a file to reset its clock, or "Boost" its vitality. High-vitality signals may be permanently archived by the community.
             </p>
          </section>

          <section>
             <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-sym)' }}>
                 <IconLink /> Connection Modes
             </h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                 <div className="glass-panel" style={{ padding: '10px' }}>
                     <strong>Sym (Symmetrical)</strong>
                     <p style={{ fontSize: '0.85em', margin: '5px 0 0' }}>Mutual agreement. You both see each other. Encryption enabled. Direct sharing.</p>
                 </div>
                 <div className="glass-panel" style={{ padding: '10px' }}>
                     <strong>A-Sym (Asymmetrical)</strong>
                     <p style={{ fontSize: '0.85em', margin: '5px 0 0' }}>One-way observation. The Drift. Public artifacts floating by.</p>
                 </div>
             </div>
          </section>

          <section>
             <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-me)' }}>
                 <IconShieldLock /> Privacy & Safety
             </h3>
             <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                 <strong>Who can see my files?</strong><br/>
                 You control the audience (Visibility) for each artifact:
                 <ul style={{ marginTop: '5px' }}>
                     <li><strong>A-Sym (Public):</strong> Visible to everyone in The Drift.</li>
                     <li><strong>Sym (Connections):</strong> Visible only to your mutual connections.</li>
                     <li><strong>3rd Space (Private):</strong> Visible only to you (RPC).</li>
                 </ul>
                 <strong>Is it encrypted?</strong><br/>
                 Files in your private cache and Sym-shared files are encrypted.
             </p>
          </section>

          <section>
             <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-asym)' }}>
                 <IconRadar2 /> The Drift
             </h3>
             <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                 <strong>What is this?</strong><br/>
                 A random sampling of the network's public consciousness. Toggle the radar icon to enter Drift Mode. 
                 Filters allow you to tune the frequency (Images, Audio, Text).
             </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default FAQ;