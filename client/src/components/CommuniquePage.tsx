// client/src/components/CommuniquePage.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Communique from './Communique';
import { IconArrowLeft } from '@tabler/icons-react';

const CommuniquePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  return (
    <div className="communique-page-container" style={{ padding: '20px', height: '100vh', boxSizing: 'border-box', overflowY: 'auto' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          color: 'var(--accent-sym)',
          cursor: 'pointer'
        }}
      >
        <IconArrowLeft size={20} style={{ marginRight: '5px' }} />
        Back to Web
      </button>

      {userId ? (
        <Communique
            userId={parseInt(userId)}
            onClose={() => navigate('/')}
        />
      ) : (
        <p>User not found.</p>
      )}
    </div>
  );
};

export default CommuniquePage;
