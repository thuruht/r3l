import React, { useState } from 'react';
import { NetworkNode } from '../hooks/useNetworkData';
import { IconUser, IconFile, IconUsers, IconBroadcast, IconDice } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

interface NetworkListProps {
  nodes: NetworkNode[];
  onNodeClick: (nodeId: string) => void;
  loading?: boolean;
}

const NetworkList: React.FC<NetworkListProps> = ({ nodes, onNodeClick, loading }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [drifting, setDrifting] = useState(false);

  // Sort nodes: Me -> Sym -> Asym -> Drift Users -> Drift Files
  const sortedNodes = [...nodes].sort((a, b) => {
    const order = { me: 0, sym: 1, asym: 2, drift_user: 3, drift_file: 4, lurker: 5 };
    return order[a.group] - order[b.group];
  });

  const handleDrift = async () => {
    setDrifting(true);
    try {
      const res = await fetch('/api/users/random');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          navigate(`/communique/${data.user.id}`);
        } else {
            showToast('No one else is here.', 'info');
        }
      } else {
        showToast('Drift failed.', 'error');
      }
    } catch (e) {
        console.error(e);
        showToast('Connection error.', 'error');
    } finally {
        setDrifting(false);
    }
  };

  return (
    <div className="network-list fade-in page-content-spacer" style={{
      paddingRight: '20px',
      paddingBottom: '20px',
      paddingLeft: '20px',
      height: '100vh',
      overflowY: 'auto',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 1
    }}>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px' }}>Network Directory</h3>
      
      {loading && (
        <div style={{ marginTop: '20px' }}>
          <Skeleton height="60px" marginBottom="10px" />
          <Skeleton height="60px" marginBottom="10px" />
          <Skeleton height="60px" marginBottom="10px" />
          <Skeleton height="60px" marginBottom="10px" />
        </div>
      )}

      {!loading && sortedNodes.length > 0 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
        {sortedNodes.map(node => (
          <div 
            key={node.id} 
            role="button"
            tabIndex={0}
            aria-label={`View profile of ${node.name}`}
            onClick={() => onNodeClick(node.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNodeClick(node.id);
              }
            }}
            className={`network-item ${node.group.startsWith('drift') ? 'drift' : ''}`}
          >
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', 
              background: node.avatar_url ? `url(${node.avatar_url}) center/cover` : '#333',
              marginRight: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: node.group === 'sym' ? '2px solid var(--accent-sym)' : 'none',
              boxShadow: node.group === 'sym' ? 'var(--glow-sym)' : 'none'
            }}>
              {!node.avatar_url && (node.group === 'drift_file' ? <IconFile size={20} color="#888"/> : <IconUser size={20} color="#666"/>)}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: node.group === 'sym' ? 'var(--accent-sym)' : 'var(--text-primary)' }}>
                {node.name}
              </div>
              <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                {node.group === 'me' ? 'You' : 
                 node.group === 'sym' ? 'Sym Connection' :
                 node.group === 'asym' ? 'Asym Connection' :
                 node.group === 'drift_user' ? 'Drifting User' : 'Drifting Artifact'}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {!loading && sortedNodes.filter(n => n.group !== 'me').length === 0 && (
        <div
          role="status"
          style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '250px', color: 'var(--text-secondary)', textAlign: 'center'
        }}>
          <IconBroadcast size={48} stroke={1} style={{ marginBottom: '10px', opacity: 0.7 }} aria-hidden="true" />
          <p style={{ margin: 0, fontSize: '1.1em' }}>Sector Silent</p>
          <p style={{ fontSize: '0.9em', opacity: 0.7, marginTop: '5px', maxWidth: '300px' }}>No signals detected in your immediate network.</p>

          <button
            onClick={handleDrift}
            disabled={drifting}
            style={{
                marginTop: '20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--accent-asym)',
                color: 'var(--accent-asym)',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: drifting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                fontSize: '0.95rem'
            }}
            onMouseEnter={(e) => {
                if (!drifting) {
                    e.currentTarget.style.borderColor = 'var(--accent-sym)';
                    e.currentTarget.style.color = 'var(--accent-sym)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }
            }}
            onMouseLeave={(e) => {
                if (!drifting) {
                    e.currentTarget.style.borderColor = 'var(--accent-asym)';
                    e.currentTarget.style.color = 'var(--accent-asym)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
            }}
          >
            <IconDice size={18} className={drifting ? 'icon-spin' : ''} />
            {drifting ? 'Scanning...' : 'Drift to Random Signal'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NetworkList;
