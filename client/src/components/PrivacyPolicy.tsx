import React from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="page-content-spacer fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px', background: 'transparent', border: 'none', color: 'var(--accent-sym)', padding: 0 }}>
        <IconArrowLeft size={18} /> Back
      </button>

      <div className="glass-panel" style={{ padding: '40px' }}>
        <h1 style={{ color: 'var(--accent-sym)', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>Privacy & Data Policy</h1>
        
        <div style={{ lineHeight: '1.6', color: 'var(--text-primary)' }}>
          <p className="font-heading" style={{ fontSize: '1.1rem', color: 'var(--accent-asym)' }}>
            <strong>Philosophy: No Surveillance. No Permanence.</strong>
          </p>
          <p>
            Rel F is built on a foundation of respect for user autonomy and data ephemerality. We do not track you across the web. We do not sell your data. We do not want your data to exist longer than necessary.
          </p>

          <h3>1. Data Collection</h3>
          <p>We collect only the absolute minimum required to function:</p>
          <ul>
            <li><strong>Authentication:</strong> Username, password (hashed), and email (for verification and notifications only).</li>
            <li><strong>Content:</strong> The files and text you explicitly upload.</li>
            <li><strong>Graph Data:</strong> Who you follow and who you connect with (Sym/Asym).</li>
          </ul>
          <p>We <strong>do not</strong> collect:</p>
          <ul>
            <li>IP addresses for logging purposes (transiently used for rate-limiting only).</li>
            <li>Device fingerprints.</li>
            <li>Third-party analytics data.</li>
          </ul>

          <h3>2. Ephemerality (The Void)</h3>
          <p>
            By default, all content on Rel F is temporary. Files expire after 7 days unless explicitly refreshed or archived. 
            Once deleted from our database and storage buckets, <strong>it is gone forever</strong>. We do not maintain "soft delete" backups for expired content.
          </p>

          <h3>3. Private vs. Public</h3>
          <p>
            <strong>Private:</strong> Visible only to you. <br/>
            <strong>Sym:</strong> Visible to mutual connections.<br/>
            <strong>Public:</strong> Visible to anyone on the network.
          </p>
          <p>
            You control the visibility of every artifact.
          </p>

          <h3>4. Third Parties</h3>
          <p>
            We use <strong>Cloudflare</strong> for infrastructure (hosting, database, storage) and <strong>Resend</strong> for transactional emails. 
            Both providers are bound by strict data processing agreements. We use no other third-party processors.
          </p>

          <h3>5. Contact</h3>
          <p>
            For privacy concerns or data removal requests (beyond the self-service tools provided), contact the administrator at: <br/>
            <a href="mailto:lowlyserf@distorted.work" style={{ color: 'var(--accent-sym)' }}>lowlyserf@distorted.work</a>
          </p>

          <div style={{ marginTop: '40px', padding: '20px', border: '1px solid var(--accent-alert)', borderRadius: '4px', background: 'rgba(255, 75, 75, 0.1)' }}>
            <h4 style={{ color: 'var(--accent-alert)', marginTop: 0 }}>Beta Disclaimer</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Rel F is currently in <strong>BETA</strong>. While we strive for perfection, bugs may exist. 
              Data integrity is a priority, but during this phase, rapid development may necessitate occasional schema resets (though we will strive to avoid this). 
              Use at your own risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
