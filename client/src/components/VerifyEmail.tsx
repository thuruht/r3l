import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      showToast('No verification token found.', 'error');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/verify-email?token=${token}`);
        if (res.ok) {
          setStatus('success');
          showToast('Email verified successfully! You can now log in.', 'success');
          setTimeout(() => navigate('/'), 3000);
        } else {
          setStatus('error');
          const data = await res.json();
          showToast(data.error || 'Verification failed.', 'error');
        }
      } catch (e) {
        setStatus('error');
        showToast('Verification failed due to network error.', 'error');
      }
    };

    verify();
  }, [token, navigate, showToast]);

  return (
    <div className="glass-panel" style={{ 
      maxWidth: '400px', 
      margin: '100px auto', 
      padding: '40px', 
      textAlign: 'center',
      display: 'flex', 
      flexDirection: 'column', 
      gap: '20px' 
    }}>
      <h2>Email Verification</h2>
      {status === 'verifying' && <p>Verifying your email...</p>}
      {status === 'success' && <p style={{ color: 'var(--accent-sym)' }}>Success! Redirecting...</p>}
      {status === 'error' && <p style={{ color: 'var(--accent-alert)' }}>Verification failed. The token may be invalid or expired.</p>}
      
      <button onClick={() => navigate('/')}>Return Home</button>
    </div>
  );
};

export default VerifyEmail;
