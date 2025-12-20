import React from 'react';
import { NetworkNode } from '../hooks/useNetworkData';
import { IconUser, IconFile } from '@tabler/icons-react';
import Skeleton from './Skeleton';

interface NetworkListProps {
  nodes: NetworkNode[];
  onNodeClick: (nodeId: string) => void;
  loading?: boolean;
}

const NetworkList: React.FC<NetworkListProps> = ({ nodes, onNodeClick, loading }) => {
  // Sort nodes: Me -> Sym -> Asym -> Drift Users -> Drift Files
  const sortedNodes = [...nodes].sort((a, b) => {
    const order = { me: 0, sym: 1, asym: 2, drift_user: 3, drift_file: 4, lurker: 5 };
    return order[a.group] - order[b.group];
  });

  return (
    <div className="network-list fade-in page-content-spacer" style={{
      paddingRight: '20px',
      paddingBottom: '20px',
      paddingLeft: '20px',
      height: '100vh',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Network Directory</h3>
      
      {loading && (
        <div style={{ marginTop: '20px' }}>
          <Skeleton height="60px" marginBottom="10px" />
          <Skeleton height="60px" marginBottom="10px" />
          <Skeleton height="60px" marginBottom="10px" />
          <Skeleton height="60px" marginBottom="10px" />
        </div>
      )}

      {!loading && (
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
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              background: 'var(--drawer-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: node.group.startsWith('drift') ? 0.7 : 1
            }}
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
                 node.group === 'sym' ? 'Mutual Connection' : 
                 node.group === 'asym' ? 'One-way Connection' : 
                 node.group === 'drift_user' ? 'Drifting User' : 'Drifting Artifact'}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default NetworkList;
