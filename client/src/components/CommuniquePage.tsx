// client/src/components/CommuniquePage.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Communique from './Communique';
import { IconArrowLeft } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';

const CommuniquePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  return (
    <div className="communique-page-container page-content-spacer" style={{ padding: '20px', height: '100vh', boxSizing: 'border-box', overflowY: 'auto' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          marginBottom: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '0.8em',
          opacity: 0.7,
          padding: '2px 0'
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
      >
        <IconArrowLeft size={ICON_SIZES.xl} style={{ marginRight: '5px' }} />
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
