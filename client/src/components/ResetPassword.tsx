import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (password.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Password reset successfully.', 'success');
        navigate('/');
      } else {
        showToast(data.error || 'Failed to reset password.', 'error');
      }
    } catch (e) {
      showToast('Request failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="glass-panel" style={{ maxWidth: '400px', margin: '100px auto', padding: '40px', textAlign: 'center' }}>
        <h2>Invalid Link</h2>
        <p>No reset token found.</p>
        <button className="primary-btn" onClick={() => navigate('/')}>Return Home</button>
      </div>
    );
  }

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
      <h2>Reset Password</h2>
      <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Enter your new password below.</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="password" 
          placeholder="New Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
          style={{ width: '100%' }}
        />
        <input 
          type="password" 
          placeholder="Confirm New Password" 
          value={confirmPassword} 
          onChange={e => setConfirmPassword(e.target.value)} 
          required 
          style={{ width: '100%' }}
        />
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'RESETTING...' : 'RESET PASSWORD'}
        </button>
      </form>
      
      <button className="text-btn" onClick={() => navigate('/')}>Cancel</button>
    </div>
  );
};

export default ResetPassword;
