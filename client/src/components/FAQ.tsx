import React, { useState } from 'react';
import { IconX, IconRadar2, IconRefresh, IconBolt, IconLink, IconFolder, IconShieldLock, IconEye, IconUpload, IconMessage, IconSearch, IconSettings } from '@tabler/icons-react';

interface FAQProps {
  onClose: () => void;
}

const FAQ: React.FC<FAQProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('getting-started');

  const sections = [
    { id: 'getting-started', label: 'Getting Started', icon: IconEye },
    { id: 'artifacts', label: 'Artifacts', icon: IconUpload },
    { id: 'connections', label: 'Connections', icon: IconLink },
    { id: 'drift', label: 'The Drift', icon: IconRadar2 },
    { id: 'collections', label: 'Collections', icon: IconFolder },
    { id: 'privacy', label: 'Privacy', icon: IconShieldLock },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: IconSettings },
  ];

  return (
    <div className="modal-overlay fade-in" onClick={onClose} style={{ zIndex: 4000 }}>
      <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-sym)' }}>Help & Documentation</h2>
          <button onClick={onClose} className="icon-btn"><IconX size={24} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', flex: 1 }}>
          {/* Sidebar */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    background: activeSection === section.id ? 'var(--accent-sym)' : 'transparent',
                    color: activeSection === section.id ? '#000' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.9rem'
                  }}
                >
                  <Icon size={18} />
                  {section.label}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div style={{ display: 'grid', gap: '20px' }}>
            
            {activeSection === 'getting-started' && (
              <>
                <section>
                  <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}>Welcome to Rel F</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Rel F is a serendipitous social network built on ephemeral content and organic connections. 
                    Unlike traditional platforms, there are no algorithms, no permanent records, and no forced engagement.
                  </p>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>First Steps</h4>
                  <ol style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li><strong>Upload an Artifact:</strong> Click the upload button in your Communique to share files</li>
                    <li><strong>Find Connections:</strong> Use the search bar or Random User button to discover others</li>
                    <li><strong>Send Sym Requests:</strong> Build mutual connections with users you trust</li>
                    <li><strong>Explore The Drift:</strong> Toggle the radar icon to discover random public content</li>
                    <li><strong>Customize Your Space:</strong> Edit your Communique and adjust theme settings</li>
                  </ol>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Key Concepts</h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div className="glass-panel" style={{ padding: '10px' }}>
                      <strong style={{ color: 'var(--accent-sym)' }}>Communique:</strong> Your personal profile/manifesto page
                    </div>
                    <div className="glass-panel" style={{ padding: '10px' }}>
                      <strong style={{ color: 'var(--accent-asym)' }}>Artifacts:</strong> Files you share (images, text, code, audio, video)
                    </div>
                    <div className="glass-panel" style={{ padding: '10px' }}>
                      <strong style={{ color: 'var(--accent-me)' }}>Vitality:</strong> Energy that keeps artifacts alive beyond 7 days
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeSection === 'artifacts' && (
              <>
                <section>
                  <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}><IconUpload size={20} /> Artifacts</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Artifacts are the core unit of content on Rel F. Any file type is supported.
                  </p>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Uploading Files</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li>Click the upload button in your Communique or any collection</li>
                    <li>Drag and drop multiple files or click to browse</li>
                    <li>Set visibility: <strong>Private</strong> (you only), <strong>Sym</strong> (connections), or <strong>Public</strong> (Drift)</li>
                    <li>Optional: Enable encryption for sensitive files</li>
                    <li>Optional: Enable "Burn on Read" for self-destructing files</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Expiration & Vitality</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <strong>Default Lifespan:</strong> 7 days (168 hours)<br/>
                    <strong>Refresh:</strong> Reset the 7-day timer to keep content alive<br/>
                    <strong>Boost Vitality:</strong> Extend life and increase visibility in The Drift<br/>
                    <strong>Archive:</strong> Files with high vitality may be permanently preserved
                  </p>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Editing & Remixing</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li><strong>In-Place Editing:</strong> Text files can be edited directly in the browser</li>
                    <li><strong>Remix:</strong> Create derivative works from existing artifacts</li>
                    <li><strong>Preview:</strong> HTML/CSS/JS files can be previewed in a sandboxed iframe</li>
                    <li><strong>Syntax Highlighting:</strong> 20+ languages supported in code editor</li>
                  </ul>
                </section>
              </>
            )}

            {activeSection === 'connections' && (
              <>
                <section>
                  <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}><IconLink size={20} /> Connections</h3>
                </section>

                <section>
                  <h4 style={{ color: 'var(--accent-sym)' }}>Sym (Symmetric)</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Mutual, consensual relationships. Both parties must agree.
                  </p>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li>Send a Sym request from a user's Communique</li>
                    <li>They receive a notification and can accept or decline</li>
                    <li>Once accepted, you can share Sym-only artifacts and send Whispers (DMs)</li>
                    <li>Sym connections appear with a glowing aura in the graph</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--accent-asym)' }}>A-Sym (Asymmetric)</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    One-way follows. No mutual agreement required.
                  </p>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li>Follow users to see their public artifacts</li>
                    <li>They won't be notified</li>
                    <li>Appears as dashed lines in the graph</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Finding Users</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li><strong>Search:</strong> Use the search bar to find users by username</li>
                    <li><strong>Random Discovery:</strong> Click the dice icon for a random user</li>
                    <li><strong>The Drift:</strong> Discover users through their public artifacts</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Whispers (Direct Messages)</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Sym connections can exchange direct messages. A-Sym followers and Drift users can send message requests (like Instagram), which you can accept or ignore in your Inbox.
                  </p>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Group Chats</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Create group conversations with multiple Sym connections. Access Groups from the menu. Group creators are admins and can add/remove members.
                  </p>
                </section>
              </>
            )}

            {activeSection === 'drift' && (
              <>
                <section>
                  <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}><IconRadar2 size={20} /> The Drift</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    A radar-like discovery mode that samples random public artifacts and users from the network.
                  </p>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>How It Works</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li>Toggle the radar icon in the header to enter Drift Mode</li>
                    <li>Random public artifacts appear as pulsating "ghost nodes" in the graph</li>
                    <li>Click on drift nodes to preview files or visit user profiles</li>
                    <li>Use filters (ALL/IMAGE/AUDIO/TEXT) to tune the frequency</li>
                    <li>Exit Drift Mode to return to your normal network view</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Philosophy</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    The Drift is anti-algorithmic. It surfaces content based on randomness and vitality, 
                    not engagement optimization. You find what you look for, or what looks for you.
                  </p>
                </section>
              </>
            )}

            {activeSection === 'collections' && (
              <>
                <section>
                  <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}><IconFolder size={20} /> Collections</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Organize related artifacts into collections.
                  </p>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Creating Collections</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li>Open Collections Manager from the menu</li>
                    <li>Click "New Collection" and set name, description, and visibility</li>
                    <li>Add artifacts by clicking "Add to Collection" on any file</li>
                    <li>Drag and drop to reorder files within a collection</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Sharing Collections</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li><strong>Private:</strong> Only you can see</li>
                    <li><strong>Sym:</strong> Visible to mutual connections</li>
                    <li><strong>Public:</strong> Visible in The Drift</li>
                    <li><strong>ZIP Export:</strong> Download entire collections as ZIP files</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Graph Visualization</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Collections appear as grouped nodes with a convex hull outline in the Association Web.
                  </p>
                </section>
              </>
            )}

            {activeSection === 'privacy' && (
              <>
                <section>
                  <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}><IconShieldLock size={20} /> Privacy & Security</h3>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Visibility Modes</h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div className="glass-panel" style={{ padding: '10px' }}>
                      <strong style={{ color: 'var(--accent-asym)' }}>Public:</strong> Visible to everyone in The Drift
                    </div>
                    <div className="glass-panel" style={{ padding: '10px' }}>
                      <strong style={{ color: 'var(--accent-sym)' }}>Sym:</strong> Visible only to mutual connections
                    </div>
                    <div className="glass-panel" style={{ padding: '10px' }}>
                      <strong style={{ color: 'var(--accent-me)' }}>Private (Me):</strong> Visible only to you
                    </div>
                  </div>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Encryption</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li><strong>RSA-OAEP 2048-bit + AES-GCM 256-bit:</strong> Client-side encryption</li>
                    <li><strong>Key Management:</strong> Generate, export, import keys in Settings</li>
                    <li><strong>Encrypted Files:</strong> Marked with lock icon in artifact list</li>
                    <li><strong>Backup Keys:</strong> Export and store securely offline</li>
                    <li><strong>Burn on Read:</strong> Self-destructing files that delete after viewing</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Privacy Settings</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li><strong>Default Visibility:</strong> Set default for new uploads (public/sym/private)</li>
                    <li><strong>Lurker Mode:</strong> Hide from Drift discovery</li>
                    <li><strong>Online Status:</strong> Control who sees when you're online</li>
                  </ul>
                </section>
              </>
            )}

            {activeSection === 'troubleshooting' && (
              <>
                <section>
                  <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}><IconSettings size={20} /> Troubleshooting</h3>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Files Not Uploading</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li>Check file size (large files may take time)</li>
                    <li>Ensure stable internet connection</li>
                    <li>Try refreshing the page and uploading again</li>
                    <li>Check browser console for errors (F12)</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Can't See Sym Connection's Files</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li>Verify the connection is mutual (both accepted)</li>
                    <li>Check if their files are set to "Sym" or "Public" visibility</li>
                    <li>Private files are never visible to others</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Drift Not Showing Content</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li>Ensure Drift Mode is toggled ON (radar icon should be active)</li>
                    <li>Try changing the filter (ALL/IMAGE/AUDIO/TEXT)</li>
                    <li>There may not be public content matching your filter</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Encryption Keys Not Working</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li>Regenerate keys in Settings if corrupted</li>
                    <li>Ensure browser supports Web Crypto API</li>
                    <li>Private key is stored in localStorage - clearing browser data will delete it</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Graph Performance Issues</h4>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li>Reduce node count by removing A-Sym follows</li>
                    <li>Disable spatial audio in Customization settings</li>
                    <li>Use List View instead of Graph View</li>
                    <li>Close other browser tabs to free up resources</li>
                  </ul>
                </section>

                <section>
                  <h4 style={{ color: 'var(--text-primary)' }}>Still Need Help?</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Use the Feedback button in the menu to report issues or request features.
                  </p>
                </section>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;