import React, { useState } from 'react';
import { IconX, IconSend, IconMessage } from '@tabler/icons-react';
import { useToast } from '../context/ToastContext';

interface FeedbackModalProps {
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('general');
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type })
      });

      if (res.ok) {
        showToast('Feedback sent. Thank you.', 'success');
        onClose();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to send feedback', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="glass-panel" style={{ width: '500px', maxWidth: '90%', padding: '0', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header-sticky" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconMessage size={20} /> Feedback / Contact
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none' }} aria-label="Close">
            <IconX />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            Found a bug? Have an idea? Want to say hello? Messages are sent directly to the developer.
          </p>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Type</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'var(--bg-mist)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}
            >
              <option value="general">General</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message here..."
              style={{ width: '100%', minHeight: '150px', resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <IconSend size={16} /> {sending ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
