import React, { useState } from 'react';
import { IconShieldLock, IconDownload, IconRefresh } from '@tabler/icons-react';
import { generateRelfKeypair, storeIdentity } from '../utils/crypto';
import { useToast } from '../context/ToastContext';

const KeyManagement: React.FC<{ userId: number }> = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSyncKeys = async () => {
    const password = window.prompt("Confirm your frequency password to secure your identity keys:");
    if (!password) return;

    setLoading(true);
    try {
      const { publicKey, privateKey } = await generateRelfKeypair();
      
      const res = await fetch('/api/users/me/public-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_key: publicKey })
      });

      if (!res.ok) throw new Error("Sync failure");

      await storeIdentity(privateKey, password, userId);
      showToast("Identity keys synchronized.", "success");
    } catch (e) {
      showToast("Failed to secure identity.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = () => {
    const raw = localStorage.getItem(`relf_identity_${userId}`);
    if (!raw) return showToast("No identity locally stored.", "error");

    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relf_identity_backup_${userId}.json`;
    a.click();
    showToast("Backup downloaded. Secure it offline.", "info");
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', marginTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <IconShieldLock color="var(--accent-sym)" />
        <h3 style={{ margin: 0 }}>Cryptographic Identity</h3>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Your private key never leaves this device. It is wrapped locally using your password.
      </p>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={handleBackup} className="secondary-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <IconDownload size={18} /> Backup
        </button>
        <button onClick={handleSyncKeys} disabled={loading} className="primary-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <IconRefresh size={18} /> {loading ? 'Syncing...' : 'Regenerate'}
        </button>
      </div>
    </div>
  );
};

export default KeyManagement;
