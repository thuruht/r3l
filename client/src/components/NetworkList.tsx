import React, { useState } from 'react';
import { NetworkNode } from '../hooks/useNetworkData';
import { IconUser, IconFile, IconUsers, IconBroadcast, IconDice, IconFolder } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';
import { useNavigate } from 'react-router-dom';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

interface NetworkListProps {
  nodes: NetworkNode[];
  onNodeClick: (nodeId: string) => void;
  onFilePreview?: (file: any) => void;
  loading?: boolean;
}

const NetworkList: React.FC<NetworkListProps> = ({ nodes, onNodeClick, onFilePreview, loading }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [drifting, setDrifting] = useState(false);

  // Sort nodes: Me -> Sym -> Asym -> Artifacts -> Collections -> Drift Users -> Drift Files
  const sortedNodes = [...nodes].sort((a, b) => {
    const order: Record<string, number> = { me: 0, sym: 1, asym: 2, artifact: 3, collection: 4, drift_user: 5, drift_file: 6, lurker: 7 };
    return (order[a.group] ?? 99) - (order[b.group] ?? 99);
  });

  const handleDrift = async () => {
    setDrifting(true);
    try {
      const res = await fetch('/api/discovery/users/random');
      if (res.ok) {
        const data = await res.json();
        const user = data.users?.[0];
        if (user) {
          navigate(`/communique/${user.id}`);
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
  const getIcon = (node: NetworkNode) => {
      if (node.avatar_url) return null;
      
      switch (node.group) {
          case 'artifact':
          case 'drift_file':
              return <IconFile size={ICON_SIZES.xl} color="#888"/>;
          case 'collection':
              return <IconFolder size={ICON_SIZES.xl} color="var(--accent-sym)"/>;
          case 'sym':
          case 'asym':
          case 'me':
          case 'drift_user':
          default:
              return <IconUser size={ICON_SIZES.xl} color="#666"/>;
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
            aria-label={`View ${node.group} ${node.name}`}
            onClick={() => {
              if ((node.group === 'artifact' || node.group === 'drift_file') && node.data && onFilePreview) {
                onFilePreview(node.data);
              } else if (node.group === 'collection' && node.data && onFilePreview) {
                // For collections, we can still use onFilePreview if the caller handles it, 
                // or just showToast for now as in AssociationWeb
                showToast(`Collection: ${node.data.name} by ${node.data.owner_username}`, 'info');
              } else {
                onNodeClick(node.id);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if ((node.group === 'artifact' || node.group === 'drift_file') && node.data && onFilePreview) {
                  onFilePreview(node.data);
                } else if (node.group === 'collection' && node.data) {
                  showToast(`Collection: ${node.data.name} by ${node.data.owner_username}`, 'info');
                } else {
                  onNodeClick(node.id);
                }
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
              {getIcon(node)}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: node.group === 'sym' ? 'var(--accent-sym)' : 'var(--text-primary)' }}>
                {node.name}
              </div>
              <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                {node.group === 'me' ? 'You' :
                 node.group === 'sym' ? 'Sym' :
                 node.group === 'asym' ? 'A-Sym' :
                 node.group === 'artifact' ? 'Artifact' :
                 node.group === 'collection' ? 'Collection' :
                 node.group === 'drift_user' ? 'Drift' : 'Drift Artifact'}
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
          <IconBroadcast size={ICON_SIZES['2xl']} stroke={1} style={{ marginBottom: '10px', opacity: 0.7 }} aria-hidden="true" />
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
            <IconDice size={ICON_SIZES.lg} className={drifting ? 'icon-spin' : ''} />
            {drifting ? 'Scanning...' : 'Drift to Random Signal'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NetworkList;
