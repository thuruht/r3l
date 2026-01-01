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
            <li><strong>Authentication:</strong> Username, password (hashed with bcrypt), and email (for verification and password reset only).</li>
            <li><strong>Content:</strong> Files and text you explicitly upload (artifacts, communiques, messages).</li>
            <li><strong>Graph Data:</strong> Relationships (Sym/A-Sym connections), group memberships.</li>
            <li><strong>Metadata:</strong> Upload timestamps, file sizes, MIME types, visibility settings.</li>
          </ul>
          <p>We <strong>do not</strong> collect:</p>
          <ul>
            <li>IP addresses for logging (transiently used for rate-limiting only, stored in KV with TTL).</li>
            <li>Device fingerprints or browser tracking data.</li>
            <li>Third-party analytics or advertising data.</li>
            <li>Location data.</li>
          </ul>

          <h3>2. Ephemerality (The Void)</h3>
          <p>
            By default, all content on Rel F is temporary. Files expire after 7 days unless explicitly refreshed or archived. 
            Once deleted from our database and storage buckets, <strong>it is gone forever</strong>. We do not maintain "soft delete" backups for expired content.
          </p>

          <h3>3. Encryption & Security</h3>
          <p>
            <strong>Client-Side Encryption:</strong> You can generate RSA-OAEP 2048-bit key pairs locally. Encrypted files use AES-GCM 256-bit encryption. 
            Your private keys are stored in browser localStorage and never transmitted to our servers. We cannot decrypt your encrypted content.<br/>
            <strong>Server-Side Encryption:</strong> Files can be encrypted server-side with AES-GCM before storage in R2. Encryption keys are derived from environment secrets.<br/>
            <strong>Transport Security:</strong> All connections use HTTPS/TLS. Passwords are hashed with bcrypt before storage.<br/>
            <strong>JWT Tokens:</strong> Stored in httpOnly cookies to prevent XSS attacks.
          </p>

          <h3>4. Visibility & Privacy Controls</h3>
          <p>
            <strong>Private (Me):</strong> Visible only to you.<br/>
            <strong>Sym:</strong> Visible to mutual connections only.<br/>
            <strong>Public:</strong> Visible to anyone on the network, including Drift discovery.<br/>
            <strong>Lurker Mode:</strong> Hide from Drift discovery while remaining visible to Sym connections.<br/>
            <strong>Online Status:</strong> Control whether others see when you're online.
          </p>
          <p>
            You control the visibility of every artifact, collection, and communique.
          </p>

          <h3>5. Messaging & Communication</h3>
          <p>
            <strong>Whispers (DMs):</strong> Direct messages between users. Sym connections can message freely. A-Sym followers and Drift users can send message requests.<br/>
            <strong>Group Chats:</strong> Multi-user conversations with Sym connections. Group creators are admins.<br/>
            <strong>Message Requests:</strong> Non-mutual connections send requests (like Instagram). You can accept or ignore.<br/>
            <strong>Retention:</strong> Messages are stored until manually deleted or account deletion.
          </p>

          <h3>6. Third Parties</h3>
          <p>
            We use <strong>Cloudflare</strong> for infrastructure (Workers, D1 database, R2 storage, KV cache, Durable Objects) and <strong>Resend</strong> for transactional emails (verification, password reset). 
            Both providers are bound by strict data processing agreements. We use <strong>no other third-party processors</strong>. No analytics, no tracking pixels, no ad networks.
          </p>

          <h3>7. Data Deletion & Account Removal</h3>
          <p>
            <strong>Self-Service:</strong> Delete individual artifacts, messages, or your entire account from Settings.<br/>
            <strong>Cascade Deletion:</strong> Account deletion removes all your data: artifacts (from R2 and D1), messages, relationships, notifications, group memberships.<br/>
            <strong>Irreversible:</strong> Once deleted, data cannot be recovered. We do not maintain backups of user content.
          </p>

          <h3>8. Contact</h3>
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
