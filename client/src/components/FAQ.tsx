// FAQ.tsx

import React from 'react';
import { IconX } from '@tabler/icons-react';

interface FAQProps {
  onClose: () => void;
}

const FAQ: React.FC<FAQProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay fade-in">
      <div style={{
        width: '600px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto',
        background: 'var(--bg-mist)', border: '1px solid var(--border-color)', borderRadius: '8px',
        padding: '30px', position: 'relative', boxShadow: '0 0 30px #000'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '15px', right: '15px',
          background: 'transparent', border: 'none', padding: '5px'
        }}>
          <IconX />
        </button>

        <h2 style={{ color: 'var(--accent-sym)', marginTop: 0 }}>Drift Manual & FAQ</h2>

        <section style={{ marginBottom: '30px' }}>
          <h4>Beta Status</h4>
          <p style={{ color: 'var(--text-secondary)' }}>
            Rel F is currently in <strong>BETA</strong>. This means the universe is still expanding, and laws of physics may occasionally break.
            <br/><br/>
            If you encounter anomalies or have suggestions, please use the <strong>Feedback</strong> button in the main menu to contact the developer directly.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h4>What is the Drift?</h4>
          <p style={{ color: 'var(--text-secondary)' }}>
            The Drift is the mist between known nodes. By activating the Drift radar, you can detect faint signals from 
            users and artifacts outside your immediate circle.
          </p>
        </section>

        <section style={{ marginBottom: '30px' }}>
          <h4>Customizing Your Communique</h4>
          <p style={{ color: 'var(--text-secondary)' }}>
            Your Communique is your broadcast signal. You can format it using standard HTML and style it with CSS.
          </p>
          
          <h5 style={{ marginTop: '15px' }}>Styling Guide</h5>
          <p style={{ fontSize: '0.9em' }}>
            To style your communique without affecting the global interface, prefix your CSS rules with 
            <code style={{ background: '#000', padding: '2px 5px', borderRadius: '3px', marginLeft: '5px', color: '#ff79c6' }}>
              #communique-user-ID
            </code> (replace ID with your numeric user ID).
          </p>

          <div style={{ background: '#00000066', padding: '15px', borderRadius: '4px', marginTop: '10px', fontFamily: 'monospace', fontSize: '0.85em' }}>
            <div style={{ color: '#888' }}>/* Example: Make your text neon pink */</div>
            <div style={{ color: '#f8f8f2' }}>
              <span style={{ color: '#ff79c6' }}>#communique-user-123</span> {'{'}
              <br/>
              &nbsp;&nbsp;<span style={{ color: '#8be9fd' }}>color</span>: <span style={{ color: '#f1fa8c' }}>#ff00ff</span>;
              <br/>
              &nbsp;&nbsp;<span style={{ color: '#8be9fd' }}>font-family</span>: <span style={{ color: '#f1fa8c' }}>"Courier New"</span>;
              <br/>
              {'}'}
            </div>
            
            <div style={{ color: '#888', marginTop: '10px' }}>/* Target specific elements */</div>
            <div style={{ color: '#f8f8f2' }}>
              <span style={{ color: '#ff79c6' }}>#communique-user-123</span> <span style={{ color: '#50fa7b' }}>h1</span> {'{'}
              <br/>
              &nbsp;&nbsp;<span style={{ color: '#8be9fd' }}>text-transform</span>: <span style={{ color: '#f1fa8c' }}>uppercase</span>;
              <br/>
              &nbsp;&nbsp;<span style={{ color: '#8be9fd' }}>border-bottom</span>: <span style={{ color: '#bd93f9' }}>1px solid var(--accent-sym)</span>;
              <br/>
              {'}'}
            </div>
          </div>

          <h5 style={{ marginTop: '15px' }}>Available Classes</h5>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
            <li><code>.communique-content-wrapper</code> - The main container for your text.</li>
            <li><code>.communique-header</code> - The top bar with "Communique" title.</li>
            <li><code>.artifacts-container</code> - The section containing your files.</li>
          </ul>
        </section>

        <section>
          <h4>Active Signals vs. Archives</h4>
          <p style={{ color: 'var(--text-secondary)' }}>
            <strong>Active Signal:</strong> Files you upload enter your active stream. They have <strong>Vitality</strong>. Without attention (boosts), they decay and are eventually reclaimed by the void (deleted) after 7 days.
            <br/><br/>
            <strong>Archive:</strong> To save an artifact from the void, add it to a <strong>Collection</strong>. Collecting an artifact crystallizes it, preserving it permanently in your personal archive.
          </p>
        </section>
      </div>
    </div>
  );
};

export default FAQ;
