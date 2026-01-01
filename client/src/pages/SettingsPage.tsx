import React, { useState, useEffect } from 'react';
import { IconX, IconUser, IconShieldLock, IconEye, IconEyeOff, IconKey, IconTrash, IconCheck } from '@tabler/icons-react';
import { useToast } from '../context/ToastContext';

interface SettingsPageProps {
  onClose: () => void;
  currentUser: any;
  onUpdateUser: (user: any) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onClose, currentUser, onUpdateUser }) => {
  const { showToast } = useToast();
  
  // Account Settings
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Privacy Settings
  const [defaultVisibility, setDefaultVisibility] = useState<'public' | 'sym' | 'me'>('me');
  const [lurkerMode, setLurkerMode] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  
  // Encryption
  const [hasKeys, setHasKeys] = useState(false);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/customization');
      if (res.ok) {
        const data = await res.json();
        const prefs = typeof data.theme_preferences === 'string' 
          ? JSON.parse(data.theme_preferences) 
          : data.theme_preferences || {};
        
        setDefaultVisibility(prefs.defaultVisibility || 'me');
        setLurkerMode(prefs.lurkerMode || false);
        setShowOnlineStatus(prefs.showOnlineStatus !== false);
      }
      
      setHasKeys(!!(currentUser?.public_key));
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/users/me/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername })
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast('Username updated successfully', 'success');
        onUpdateUser({ ...currentUser, username: newUsername });
        setNewUsername('');
      } else {
        showToast(data.error || 'Failed to update username', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast('Password updated successfully', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.error || 'Failed to update password', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrivacy = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme_preferences: {
            defaultVisibility,
            lurkerMode,
            showOnlineStatus
          }
        })
      });
      
      if (res.ok) {
        showToast('Privacy settings updated', 'success');
      } else {
        showToast('Failed to update privacy settings', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKeys = async () => {
    setLoading(true);
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      );

      const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));
      const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKey)));

      const res = await fetch('/api/users/me/public-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_key: publicKeyBase64 })
      });

      if (res.ok) {
        localStorage.setItem('relf_private_key', privateKeyBase64);
        localStorage.setItem('relf_public_key', publicKeyBase64);
        setHasKeys(true);
        showToast('Encryption keys generated', 'success');
      } else {
        showToast('Failed to save public key', 'error');
      }
    } catch (e) {
      showToast('Key generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportKeys = () => {
    const privateKey = localStorage.getItem('relf_private_key');
    const publicKey = localStorage.getItem('relf_public_key');
    
    if (!privateKey || !publicKey) {
      showToast('No keys to export', 'error');
      return;
    }

    const keyBundle = JSON.stringify({ privateKey, publicKey, username: currentUser?.username, timestamp: Date.now() });
    const blob = new Blob([keyBundle], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relf-keys-${currentUser?.username}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Keys exported successfully', 'success');
  };

  const handleImportKeys = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const keyBundle = JSON.parse(event.target?.result as string);
        if (!keyBundle.privateKey || !keyBundle.publicKey) {
          throw new Error('Invalid key file');
        }

        localStorage.setItem('relf_private_key', keyBundle.privateKey);
        localStorage.setItem('relf_public_key', keyBundle.publicKey);

        const res = await fetch('/api/users/me/public-key', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_key: keyBundle.publicKey })
        });

        if (res.ok) {
          setHasKeys(true);
          showToast('Keys imported successfully', 'success');
        } else {
          showToast('Failed to sync public key', 'error');
        }
      } catch (e) {
        showToast('Invalid key file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure? This will permanently delete your account and all artifacts. This cannot be undone.')) {
      return;
    }
    
    const confirmation = prompt('Type DELETE to confirm:');
    if (confirmation !== 'DELETE') return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'DELETE'
      });
      
      if (res.ok) {
        showToast('Account deleted', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToast('Failed to delete account', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay fade-in" onClick={onClose} style={{ zIndex: 4000 }}>
      <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-sym)' }}>Settings</h2>
          <button onClick={onClose} className="icon-btn"><IconX size={24} /></button>
        </div>

        <div style={{ display: 'grid', gap: '30px' }}>
          
          {/* Account Settings */}
          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', marginBottom: '15px' }}>
              <IconUser size={20} /> Account
            </h3>
            
            <form onSubmit={handleUpdateUsername} style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Change Username
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder={currentUser?.username}
                  style={{ flex: 1 }}
                />
                <button type="submit" disabled={loading || !newUsername.trim()} className="primary-btn">
                  Update
                </button>
              </div>
            </form>

            <form onSubmit={handleUpdatePassword}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Change Password
              </label>
              <div style={{ display: 'grid', gap: '10px' }}>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 chars)"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
                <button type="submit" disabled={loading || !currentPassword || !newPassword} className="primary-btn">
                  Update Password
                </button>
              </div>
            </form>
          </section>

          {/* Privacy Settings */}
          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', marginBottom: '15px' }}>
              <IconShieldLock size={20} /> Privacy
            </h3>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Default Artifact Visibility
                </label>
                <select 
                  value={defaultVisibility} 
                  onChange={e => setDefaultVisibility(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="me">Private (Me Only)</option>
                  <option value="sym">Sym Connections Only</option>
                  <option value="public">Public (Drift)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Lurker Mode</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Hide your presence from The Drift (you won't appear in random discovery)
                  </div>
                </div>
                <button 
                  onClick={() => setLurkerMode(!lurkerMode)}
                  style={{ 
                    padding: '8px 16px', 
                    background: lurkerMode ? 'var(--accent-sym)' : 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {lurkerMode ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Show Online Status</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Let Sym connections see when you're online
                  </div>
                </div>
                <button 
                  onClick={() => setShowOnlineStatus(!showOnlineStatus)}
                  style={{ 
                    padding: '8px 16px', 
                    background: showOnlineStatus ? 'var(--accent-sym)' : 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {showOnlineStatus ? <IconCheck size={18} /> : <IconX size={18} />}
                </button>
              </div>

              <button onClick={handleUpdatePrivacy} disabled={loading} className="primary-btn" style={{ marginTop: '10px' }}>
                Save Privacy Settings
              </button>
            </div>
          </section>

          {/* Encryption */}
          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', marginBottom: '15px' }}>
              <IconKey size={20} /> Encryption
            </h3>
            
            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
              {hasKeys ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-sym)', marginBottom: '10px' }}>
                    <IconCheck size={20} />
                    <span style={{ fontWeight: 500 }}>Encryption Keys Active</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 15px 0' }}>
                    Your RSA key pair is configured. Files marked for encryption will be secured end-to-end.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={handleExportKeys} disabled={loading} className="primary-btn" style={{ fontSize: '0.9rem' }}>
                      Export Keys
                    </button>
                    <label style={{ display: 'inline-block' }}>
                      <input type="file" accept=".json" onChange={handleImportKeys} style={{ display: 'none' }} />
                      <button type="button" onClick={(e) => e.currentTarget.previousElementSibling?.click()} disabled={loading} style={{ fontSize: '0.9rem' }}>
                        Import Keys
                      </button>
                    </label>
                    <button onClick={handleGenerateKeys} disabled={loading} style={{ fontSize: '0.9rem', color: 'var(--accent-alert)' }}>
                      Regenerate Keys
                    </button>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--accent-alert)', marginTop: '10px' }}>
                    ⚠️ Export your keys regularly. If you lose them, encrypted files cannot be recovered.
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Generate encryption keys to enable end-to-end encrypted file sharing with Sym connections.
                  </p>
                  <button onClick={handleGenerateKeys} disabled={loading} className="primary-btn">
                    Generate Encryption Keys
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Danger Zone */}
          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-alert)', marginBottom: '15px' }}>
              <IconTrash size={20} /> Danger Zone
            </h3>
            
            <div style={{ padding: '15px', background: 'rgba(255,0,0,0.05)', border: '1px solid var(--accent-alert)', borderRadius: '4px' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button 
                onClick={handleDeleteAccount} 
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: 'var(--accent-alert)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Delete Account
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
