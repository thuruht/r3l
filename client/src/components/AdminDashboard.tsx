import React, { useEffect, useState } from 'react';
import { IconX, IconServer, IconUsers, IconFiles, IconArchive } from '@tabler/icons-react';

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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
        width: '800px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto',
        background: 'var(--bg-mist)', border: '1px solid var(--border-color)', borderRadius: '8px',
        padding: '30px', position: 'relative', boxShadow: '0 0 30px #000'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '15px', right: '15px',
          background: 'transparent', border: 'none', padding: '5px', cursor: 'pointer', color: 'var(--text-secondary)'
        }}>
          <IconX />
        </button>

        <h2 style={{ color: 'var(--accent-sym)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconServer /> System Status
        </h2>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading telemetry...</div>
        ) : stats ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '30px' }}>
            <StatCard icon={IconUsers} label="Total Users" value={stats.users} color="#4deeea" />
            <StatCard icon={IconFiles} label="Total Artifacts" value={stats.total_files} color="#f7b731" />
            <StatCard icon={IconFiles} label="Active Signals" value={stats.active_files} color="#26de81" />
            <StatCard icon={IconArchive} label="Archived" value={stats.archived_files} color="#a55eea" />
          </div>
        ) : (
          <div style={{ color: 'var(--accent-alert)' }}>Access Denied or Failed to Fetch.</div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;