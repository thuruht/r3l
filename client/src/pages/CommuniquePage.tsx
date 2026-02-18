import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Communique from '../components/Communique';
import { useTheme } from '../context/ThemeContext'; // Assuming ThemeContext is accessible
import { IconArrowLeft } from '@tabler/icons-react';

interface CommuniquePageProps {
  currentUser: { id: number; username: string; avatar_url?: string } | null;
  onUpdateUser: (user: { id: number; username: string; avatar_url?: string }) => void;
}

const CommuniquePage: React.FC<CommuniquePageProps> = ({ currentUser, onUpdateUser }) => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme(); // Use theme context if needed for styling

  if (!userId) {
    return <div>User ID not found in URL.</div>;
  }

  // Determine if the viewed communique belongs to the current user
  const isOwner = currentUser?.id?.toString() === userId;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'var(--bg-color)', zIndex: 1000, overflowY: 'auto',
      display: 'flex', justifyContent: 'center', paddingTop: '20px', paddingBottom: '20px'
    }}>
        <div style={{
            maxWidth: '800px', width: '90%',
            background: 'var(--bg-mist)', border: '1px solid var(--border-color)', borderRadius: '8px',
            padding: '20px', position: 'relative', boxShadow: '0 0 30px #000'
        }}>
            <button 
                onClick={() => navigate(-1)} 
                style={{ 
                    position: 'absolute', top: '15px', left: '15px', 
                    background: 'transparent', border: 'none', padding: '5px',
                    color: 'var(--text-primary)'
                }}>
                <IconArrowLeft size={24} /> Back
            </button>

            <div style={{ marginTop: '50px' }}> {/* Offset for back button */}
                <Communique
                    userId={userId}
                    isOwner={isOwner}
                    currentUser={currentUser}
                    onUpdateUser={onUpdateUser}
                />
            </div>
        </div>
    </div>
  );
};

export default CommuniquePage;
