// AdminDashboard.tsx

import React, { useEffect, useState } from 'react';
import { IconX, IconServer, IconUsers, IconFiles, IconArchive, IconBroadcast, IconTrash } from '@tabler/icons-react';
import { useToast } from '../context/ToastContext';

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'status' | 'users' | 'broadcast'>('status');
  const [users, setUsers] = useState<any[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');

  const { showToast } = useToast();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setErrorMsg(null);
    if (tab === 'status') {
        setLoading(true);
        fetch('/api/admin/stats')
        .then(async res => {
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Error ${res.status}: ${text || res.statusText}`);
            }
            return res.json();
        })
        .then(data => setStats(data))
        .catch(err => {
            console.error(err);
            setErrorMsg(err.message);
        })
        .finally(() => setLoading(false));
    } else if (tab === 'users') {
        fetch('/api/admin/users')
        .then(async res => {
             if (!res.ok) {
                 const text = await res.text();
                 throw new Error(`Error ${res.status}: ${text || res.statusText}`);
             }
             return res.json();
        })
        .then(data => setUsers(data.users || []))
        .catch(err => {
            console.error(err);
            showToast(err.message, 'error');
        });
    }
  }, [tab]);

  const handleDeleteUser = async (id: number) => {
      if (!confirm('Are you sure? This will delete all user data.')) return;
      try {
          const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
          if (res.ok) {
              setUsers(prev => prev.filter(u => u.id !== id));
              showToast('User terminated.', 'success');
          } else {
              showToast('Failed to delete.', 'error');
          }
      } catch (e) { showToast('Network error', 'error'); }
  };

  const handleRoleChange = async (id: number, newRole: string) => {
      try {
          const res = await fetch(`/api/admin/users/${id}/role`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: newRole })
          });
          if (res.ok) {
              setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
              showToast('Role updated.', 'success');
          } else {
              showToast('Failed to update role.', 'error');
          }
      } catch (e) { showToast('Network error', 'error'); }
  };

  const handleBroadcast = async () => {
      if (!broadcastMsg) return;
      try {
          const res = await fetch('/api/admin/broadcast', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ message: broadcastMsg })
          });
          if (res.ok) {
              setBroadcastMsg('');
              showToast('Signal broadcasted.', 'success');
          }
      } catch (e) { showToast('Network error', 'error'); }
  };

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div style={{
      background: '#ffffff0d', border: '1px solid var(--border-color)',
      borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px',
      flex: '1 1 200px'
    }}>
      <div style={{ padding: '10px', borderRadius: '50%', background: `${color}22`, color: color }}>
        <Icon size={24} />
      </div>
      <div>
        <div style={{ fontSize: '2em', fontWeight: 'bold', lineHeight: 1 }}>{value ?? '-'}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9em', marginTop: '5px' }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div className="admin-overlay fade-in" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: '#000000dd', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        width: '800px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--bg-mist)', border: '1px solid var(--border-color)', borderRadius: '8px',
        padding: '20px', position: 'relative', boxShadow: '0 0 30px #000'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '15px', right: '15px',
          background: 'transparent', border: 'none', padding: '5px', cursor: 'pointer', color: 'var(--text-secondary)'
        }}>
          <IconX />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <h2 style={{ color: 'var(--accent-sym)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconServer /> Admin
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setTab('status')} style={{ opacity: tab === 'status' ? 1 : 0.5 }}>Status</button>
                <button onClick={() => setTab('users')} style={{ opacity: tab === 'users' ? 1 : 0.5 }}>Users</button>
                <button onClick={() => setTab('broadcast')} style={{ opacity: tab === 'broadcast' ? 1 : 0.5 }}>Broadcast</button>
            </div>
        </div>

        {tab === 'status' && (
            loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading telemetry...</div>
            ) : errorMsg ? (
                <div style={{ color: 'var(--accent-alert)', padding: '20px', textAlign: 'center', border: '1px solid var(--accent-alert)', borderRadius: '4px' }}>
                    <strong>Access Denied or Failed to Fetch</strong><br/>
                    <span style={{ fontSize: '0.9em' }}>{errorMsg}</span>
                </div>
            ) : stats ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '30px' }}>
                <StatCard icon={IconUsers} label="Total Users" value={stats.users} color="#26de81" />
                <StatCard icon={IconFiles} label="Total Artifacts" value={stats.total_files} color="#f7b731" />
                <StatCard icon={IconFiles} label="Active Signals" value={stats.active_files} color="#26de81" />
                <StatCard icon={IconArchive} label="Archived" value={stats.archived_files} color="#a55eea" />
            </div>
            ) : null
        )}

        {tab === 'users' && (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>ID</th>
                            <th style={{ padding: '10px' }}>Username</th>
                            <th style={{ padding: '10px' }}>Email</th>
                            <th style={{ padding: '10px' }}>Role</th>
                            <th style={{ padding: '10px' }}>Joined</th>
                            <th style={{ padding: '10px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #ffffff11' }}>
                                <td style={{ padding: '10px' }}>{u.id}</td>
                                <td style={{ padding: '10px' }}>{u.username}</td>
                                <td style={{ padding: '10px' }}>{u.email}</td>
                                <td style={{ padding: '10px' }}>
                                    <select
                                        value={u.role || 'user'}
                                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                        style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '2px', borderRadius: '4px' }}
                                        disabled={u.id === 1}
                                    >
                                        <option value="user">User</option>
                                        <option value="moderator">Mod</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td style={{ padding: '10px' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                <td style={{ padding: '10px' }}>
                                    {u.id !== 1 && (
                                        <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '4px', color: 'var(--accent-alert)', border: 'none', background: 'transparent' }} title="Delete">
                                            <IconTrash size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {tab === 'broadcast' && (
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <h3 style={{ marginTop: 0 }}><IconBroadcast size={20} style={{ verticalAlign: 'middle' }} /> Global System Alert</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Send a notification to all currently connected users.</p>
                <textarea
                    value={broadcastMsg}
                    onChange={e => setBroadcastMsg(e.target.value)}
                    placeholder="Message content..."
                    style={{ width: '100%', minHeight: '100px', margin: '10px 0' }}
                />
                <button onClick={handleBroadcast} className="primary-btn" disabled={!broadcastMsg}>Send Broadcast</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;