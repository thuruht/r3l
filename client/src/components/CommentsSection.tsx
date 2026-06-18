import React, { useState, useEffect, useRef } from 'react';
import { IconSend, IconTrash } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';
import { useToast } from '../context/ToastContext';

interface Comment {
  id: number;
  file_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  created_at: string;
  username: string;
}

interface CommentsSectionProps {
  fileId: string;
  currentUser: any;
  fileOwnerId: number;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ fileId, currentUser, fileOwnerId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments/${fileId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [fileId]);

  const handleSubmit = async () => {
    if (!inputText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/comments/${fileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: inputText.trim(),
          parent_id: replyTo?.id || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => [...prev, data.comment]);
        setInputText('');
        setReplyTo(null);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to post comment.', 'error');
      }
    } catch {
      showToast('Error posting comment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        showToast('Comment deleted.', 'info');
      }
    } catch {
      showToast('Error deleting comment.', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: number) => comments.filter(c => c.parent_id === parentId);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const CommentItem = ({ comment, isReply }: { comment: Comment; isReply?: boolean }) => {
    const isOwner = currentUser?.id === comment.user_id;
    const replies = getReplies(comment.id);

    return (
      <div style={{
        marginLeft: isReply ? '24px' : 0,
        marginTop: '8px',
        padding: '8px 10px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '4px',
        borderLeft: isReply ? '2px solid var(--accent-sym)' : 'none',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-sym)' }}>{comment.username}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{formatTime(comment.created_at)}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {!isReply && (
              <button
                onClick={() => {
                  setReplyTo({ id: comment.id, username: comment.username });
                  inputRef.current?.focus();
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
              >
                Reply
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => handleDelete(comment.id)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-alert)', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <IconTrash size={14} />
              </button>
            )}
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {comment.content}
        </div>
        {replies.map(reply => (
          <CommentItem key={reply.id} comment={reply} isReply />
        ))}
      </div>
    );
  };

  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Comments ({comments.length})
      </div>

      {replyTo && (
        <div style={{ fontSize: '0.75rem', color: 'var(--accent-sym)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Replying to <strong>{replyTo.username}</strong>
          <button
            onClick={() => setReplyTo(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.7rem', marginLeft: 'auto' }}
          >
            Cancel
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment…"
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            padding: '8px 10px',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!inputText.trim() || submitting}
          style={{
            background: 'var(--accent-sym)',
            border: 'none',
            borderRadius: '4px',
            padding: '8px',
            color: '#000',
            cursor: !inputText.trim() || submitting ? 'not-allowed' : 'pointer',
            opacity: !inputText.trim() || submitting ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconSend size={ICON_SIZES.sm} />
        </button>
      </div>

      {loading && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px' }}>Loading comments…</div>}

      {!loading && comments.length === 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px' }}>
          No comments yet.
        </div>
      )}

      {rootComments.map(comment => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
};

export default CommentsSection;
