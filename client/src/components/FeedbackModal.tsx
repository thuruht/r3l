import React, { useState, useEffect, useRef } from 'react';
import { IconX, IconSend, IconMessage } from '@tabler/icons-react';
import { useToast } from '../context/ToastContext';

interface FeedbackModalProps {
  onClose: () => void;
}

const MAX_CHARS = 1000;

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('general');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLSelectElement>(null);

  // Auto-fill user data if available in global context (simplified here)
  useEffect(() => {
      // In a real implementation, this would pull from AuthContext
      // For now, we rely on the backend to append the authenticated user's ID/Username
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Focus the first input on mount
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const submitFeedback = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type, name, email })
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitFeedback();
  };

  const handleTextAreaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submitFeedback();
    }
  };

  return (
    <div
      className="modal-overlay fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div
        ref={modalRef}
        className="glass-panel"
        style={{ width: '500px', maxWidth: '90%', padding: '0', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-sticky" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
          <h3 id="feedback-modal-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconMessage size={20} aria-hidden="true" /> Feedback / Contact
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none' }} aria-label="Close feedback modal">
            <IconX />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            Found a bug? Have an idea? Want to say hello? Messages are sent directly to the developer.
          </p>

          <div>
            <label htmlFor="feedback-type" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Type</label>
            <select
              id="feedback-type"
              ref={firstInputRef}
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

          <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                  <label htmlFor="feedback-name" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Name (Optional)</label>
                  <input
                    type="text"
                    id="feedback-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    style={{ width: '100%', padding: '8px', background: 'var(--bg-mist)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}
                  />
              </div>
              <div style={{ flex: 1 }}>
                  <label htmlFor="feedback-email" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Email (Optional)</label>
                  <input
                    type="email"
                    id="feedback-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{ width: '100%', padding: '8px', background: 'var(--bg-mist)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}
                  />
              </div>
          </div>

          <div>
            <label htmlFor="feedback-message" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
              Message <span style={{ color: 'var(--accent-alert)', marginLeft: '4px' }} aria-label="required">*</span>
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleTextAreaKeyDown}
              placeholder="Your message here..."
              maxLength={MAX_CHARS}
              style={{ width: '100%', minHeight: '150px', resize: 'vertical', fontFamily: 'inherit' }}
              required
              aria-describedby="message-hint"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span id="message-hint">Press Ctrl+Enter to send</span>
                <span aria-label={`${message.length} of ${MAX_CHARS} characters used`}>
                    {message.length} / {MAX_CHARS}
                </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={sending || !message.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <IconSend size={16} aria-hidden="true" /> {sending ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
