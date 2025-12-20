import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { IconEdit, IconDeviceFloppy, IconX, IconUserPlus, IconUserMinus, IconLink, IconLinkOff, IconCheck, IconCirclesRelation } from '@tabler/icons-react'; // Added icons
import Artifacts from './Artifacts';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext'; // Added
import { useCustomization } from '../context/CustomizationContext'; // New Import

interface CommuniqueProps {
  userId: number; // Changed to number to match typical usage, though strict string/number handling is good
  onClose?: () => void; // Optional now if we use routes
}

interface CommuniqueData {
  content: string;
  theme_prefs: string;
  updated_at: string | null;
}

interface UserProfile {
    id: number;
    username: string;
    avatar_url?: string;
}

const Communique: React.FC<CommuniqueProps> = ({ userId, onClose }) => {
  const [data, setData] = useState<CommuniqueData>({ content: '', theme_prefs: '{}', updated_at: null });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editCSS, setEditCSS] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [relationshipStatus, setRelationshipStatus] = useState<string | null>(null); // e.g., 'none', 'following', 'sym_pending', 'sym_accepted', 'incoming_sym_request'
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);

  // New states for profile aesthetics
  const [primaryNodeColor, setPrimaryNodeColor] = useState<string>('');
  const [secondaryNodeColor, setSecondaryNodeColor] = useState<string>('');
  const [nodeSize, setNodeSize] = useState<number>(8); // Default to 8

  const contentRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { preferences, updateProfileAesthetics } = useCustomization(); // Use customization context

  const isOwner = currentUser?.id === userId;

  useEffect(() => {
    // Load initial profile aesthetics from preferences
    if (preferences) {
        setPrimaryNodeColor(preferences.node_primary_color || '#1F77B4');
        setSecondaryNodeColor(preferences.node_secondary_color || '#FF7F0E');
        setNodeSize(preferences.node_size || 8);
    }
  }, [preferences]);

  useEffect(() => {
    const fetchMe = async () => {
        try {
            const res = await fetch('/api/users/me');
            if (res.ok) {
                const json = await res.json();
                setCurrentUser(json.user);
            }
        } catch (e) {
            console.error(e);
        }
    };
    fetchMe();
  }, []);

  useEffect(() => {
      const fetchTargetUser = async () => {
          try {
              const res = await fetch(`/api/users/${userId}`);
              if (res.ok) {
                  const json = await res.json();
                  setTargetUser(json.user);
              }
          } catch (e) {
              console.error("Failed to fetch target user", e);
          }
      };
      fetchTargetUser();
      fetchCommunique();
  }, [userId]);

  // Fetch relationship status
  useEffect(() => {
    const fetchRelationshipStatus = async () => {
      if (!currentUser || !userId || isOwner) { // No relationship to fetch if it's our own communique
        setRelationshipStatus(null);
        return;
      }

      try {
        const res = await fetch('/api/relationships');
        if (res.ok) {
          const { outgoing, incoming, mutual } = await res.json();
          
          const targetId = userId;

          // Check if currentUser follows this userId
          const isFollowing = outgoing.some((r: any) => r.user_id === targetId && r.type === 'asym_follow');
          if (isFollowing) {
            setRelationshipStatus('following');
            return;
          }

          // Check for pending sym request from currentUser to this userId
          const symRequested = outgoing.some((r: any) => r.user_id === targetId && r.type === 'sym_request');
          if (symRequested) {
            setRelationshipStatus('sym_requested');
            return;
          }

          // Check for incoming sym request from this userId to currentUser
          const incomingSymRequest = incoming.some((r: any) => r.user_id === targetId && r.type === 'sym_request');
          if (incomingSymRequest) {
            setRelationshipStatus('incoming_sym_request');
            return;
          }

          // Check for mutual (sym) connection
          const isMutual = mutual.some((r: any) => r.user_id === targetId);
          if (isMutual) {
            setRelationshipStatus('sym_accepted');
            return;
          }
          
          setRelationshipStatus('none'); // No specific relationship found
        } else {
          showToast('Failed to load relationship status.', 'error');
          setRelationshipStatus(null);
        }
      } catch (err) {
        console.error("Failed to load relationship status", err);
        showToast('Error loading relationship status.', 'error');
        setRelationshipStatus(null);
      }
    };

    fetchRelationshipStatus();
  }, [userId, currentUser, isOwner, showToast]);

  useEffect(() => {
    if (isEditing && editorRef.current) {
      gsap.fromTo(editorRef.current, { opacity: 0, height: 0 }, { opacity: 1, height: 'auto', duration: 0.3, ease: 'power2.out' });
    }
  }, [isEditing]);

  const fetchCommunique = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/communiques/${userId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setEditContent(json.content || '');
        
        // Parse theme_prefs to get CSS string if it exists
        let css = '';
        try {
            const prefs = JSON.parse(json.theme_prefs || '{}');
            css = prefs.custom_css || '';
        } catch (e) {
            // If it's just a string, maybe it was stored directly? Fallback
        }
        setEditCSS(css);
      }
    } catch (err) {
      console.error("Failed to load communique", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
        return;
    }
    const file = event.target.files[0];
    if (!currentUser) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
        const res = await fetch('/api/users/me/avatar', {
            method: 'POST',
            body: formData,
        });

        if (res.ok) {
            const data = await res.json();
            showToast('Avatar uploaded successfully!', 'success');
            // Optimistically update current user state if we had a global store,
            // but here we just update local state which might not reflect everywhere until reload.
            setCurrentUser(prev => prev ? ({ ...prev, avatar_url: data.avatar_url }) : null);
        } else {
            const err = await res.json();
            showToast(err.error || 'Failed to upload avatar', 'error');
        }
    } catch (err) {
        showToast('Network error during avatar upload', 'error');
    } finally {
        // Clear the file input
        event.target.value = '';
    }
  };

    const handleSave = async () => {
      setSaveStatus('saving');
      try {
        const themePrefs = { custom_css: editCSS };
        const res = await fetch('/api/communiques', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editContent, theme_prefs: JSON.stringify(themePrefs) })
        });
        if (res.ok) {
          setSaveStatus('saved');
          setData(prev => ({ 
              ...prev, 
              content: editContent, 
              theme_prefs: JSON.stringify(themePrefs),
              updated_at: new Date().toISOString() 
          }));
          setIsEditing(false);
          showToast('Communique updated!', 'success');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('error');
          showToast('Failed to update communique.', 'error');
        }
      } catch (err) {
        setSaveStatus('error');
        showToast('Error updating communique.', 'error');
      }

      // Save profile aesthetics
      try {
          await updateProfileAesthetics({
              node_primary_color: primaryNodeColor,
              node_secondary_color: secondaryNodeColor,
              node_size: nodeSize,
          });
          // showToast('Profile aesthetics updated!', 'success'); // Toast already handled by CustomizationContext
      } catch (err) {
          console.error("Error updating profile aesthetics", err);
          showToast('Failed to update profile aesthetics.', 'error');
      }
    };
  
    const performRelationshipAction = async (endpoint: string, method: string = 'POST', body?: any) => {
      if (!currentUser || !userId) return;
      const targetUserId = userId;
  
      try {
        const res = await fetch(endpoint.replace(':target_user_id', targetUserId.toString()), {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined
        });
        if (res.ok) {
          showToast('Relationship updated!', 'success');
          return true;
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update relationship.', 'error');
          return false;
        }
      } catch (err) {
        showToast('Network error updating relationship.', 'error');
        return false;
      }
    };
  
    const handleFollow = async () => {
      if (await performRelationshipAction('/api/relationships/follow', 'POST', { target_user_id: userId })) {
        setRelationshipStatus('following');
      }
    };
  
    const handleUnfollow = async () => {
      if (await performRelationshipAction('/api/relationships/:target_user_id', 'DELETE')) {
        setRelationshipStatus('none');
      }
    };
  
    const handleSymRequest = async () => {
      if (await performRelationshipAction('/api/relationships/sym-request', 'POST', { target_user_id: userId })) {
        setRelationshipStatus('sym_requested');
      }
    };
  
    const handleCancelSymRequest = async () => {
      if (await performRelationshipAction('/api/relationships/:target_user_id', 'DELETE')) {
        setRelationshipStatus('none');
      }
    };
  
    const handleAcceptSymRequest = async () => {
      if (await performRelationshipAction('/api/relationships/accept-sym-request', 'POST', { source_user_id: userId })) {
        setRelationshipStatus('sym_accepted');
      }
    };
  
    const handleRemoveSym = async () => {
      if (await performRelationshipAction('/api/relationships/:target_user_id', 'DELETE')) {
        setRelationshipStatus('none');
      }
    };
  
    // Helper to safely extract CSS for rendering
    const getRenderCSS = () => {
      try {
          const prefs = JSON.parse(data.theme_prefs || '{}');
          return prefs.custom_css || '';
      } catch (e) { return ''; }
  };

  if (loading && !targetUser) {
    return (
        <div style={{ padding: '20px' }}>
            <Skeleton height="30px" width="50%" marginBottom="20px" />
            <Skeleton height="15px" width="100%" marginBottom="10px" />
            <Skeleton height="15px" width="90%" marginBottom="10px" />
            <Skeleton height="15px" width="95%" marginBottom="30px" />
            <Skeleton height="100px" />
        </div>
    );
  }

  return (
    <div id={`communique-user-${userId}`} className="communique-container fade-in" style={{ position: 'relative' }}>
      {/* Inject Scoped Styles */}
      <style>{getRenderCSS()}</style>

      <div className="communique-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, color: 'var(--accent-sym)', textShadow: 'var(--glow-sym)' }}>
            Communique: {targetUser?.username || 'Signal'}
        </h4>
        {isOwner && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                        type="file" 
                        accept="image/*" 
                        ref={avatarInputRef} 
                        style={{ display: 'none' }} 
                        onChange={handleAvatarUpload}
                    />
                    {currentUser?.avatar_url && (
                      <img 
                        src={currentUser.avatar_url} 
                        alt="Avatar" 
                        style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    )}
                    <button 
                        onClick={() => avatarInputRef.current?.click()} 
                        style={{ fontSize: '0.8em', padding: '0.4em 0.8em', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                        <IconUserPlus size={14} /> Upload Avatar
                    </button>
                </div>
                {data.updated_at && (
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.7em' }}>
                    Last signal: {new Date(data.updated_at).toLocaleDateString()}
                  </small>
                )}
            </div>
        )}
      </div>

      {!isEditing ? (
        <div 
          ref={contentRef}
          className="communique-content-wrapper"
          style={{ 
            minHeight: '100px',
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6',
            opacity: data.content ? 1 : 0.6,
            marginBottom: '20px'
          }}
          dangerouslySetInnerHTML={{ __html: data.content || (isOwner ? "Your frequency is silent. Broadcast something..." : "This signal is empty.") }}
        />
      ) : (
        <div ref={editorRef} style={{ marginBottom: '20px', overflow: 'hidden' }}>
          <div style={{ marginBottom: '10px', fontSize: '0.8em', color: 'var(--accent-sym)' }}>Content (HTML supported):</div>
          <textarea 
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{ 
              width: '100%', 
              minHeight: '150px', 
              background: '#0000004d', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--accent-sym)',
              padding: '10px',
              resize: 'vertical',
              marginBottom: '15px',
              fontFamily: 'monospace'
            }}
            placeholder="Broadcast your thoughts..."
          />
          
          <div style={{ marginBottom: '10px', fontSize: '0.8em', color: 'var(--accent-sym)' }}>
             Custom CSS (Scope with #communique-user-{userId}):
          </div>
          <textarea 
            value={editCSS}
            onChange={(e) => setEditCSS(e.target.value)}
            style={{ 
              width: '100%', 
              minHeight: '100px', 
              background: '#0000004d', 
              color: '#a6e22e', // Monokai-ish green for code
              border: '1px solid var(--border-color)',
              padding: '10px',
              resize: 'vertical',
              fontFamily: 'monospace',
              fontSize: '0.85em'
            }}
            placeholder={`#communique-user-${userId} {\n  color: pink;\n}`}
          />

          <div style={{ marginBottom: '20px', fontSize: '0.8em', color: 'var(--accent-sym)' }}>
            Node Aesthetics:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <label>
              Primary Node Color (#RRGGBBAA):
              <input
                type="text"
                value={primaryNodeColor}
                onChange={(e) => setPrimaryNodeColor(e.target.value)}
                placeholder="#1F77B4FF"
              />
            </label>
            <label>
              Secondary Node Color (#RRGGBBAA):
              <input
                type="text"
                value={secondaryNodeColor}
                onChange={(e) => setSecondaryNodeColor(e.target.value)}
                placeholder="#FF7F0EFF"
              />
            </label>
            <label>
              Node Size (1-20):
              <input
                type="number"
                value={nodeSize}
                onChange={(e) => setNodeSize(parseInt(e.target.value) || 8)}
                min="1"
                max="20"
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={handleSave} disabled={saveStatus === 'saving'} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <IconDeviceFloppy size={16} /> {saveStatus === 'saving' ? 'Transmitting...' : 'Broadcast'}
            </button>
            <button onClick={() => { setIsEditing(false); setEditContent(data.content || ''); }} style={{ background: 'transparent', borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <IconX size={16} /> Cancel
            </button>
          </div>
          {saveStatus === 'error' && <span style={{ color: 'var(--accent-alert)' }}>Transmission failed.</span>}
        </div>
      )}

      {isOwner && !isEditing && (
        <button onClick={() => setIsEditing(true)} style={{ fontSize: '0.8em', padding: '0.4em 0.8em', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <IconEdit size={14} /> Edit Signal
        </button>
      )}
      
      {!isOwner && currentUser && ( // Show relationship buttons only if not owner and logged in
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          {relationshipStatus === 'none' && (
            <>
              <button onClick={handleFollow} style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IconUserPlus size={14} /> Follow
              </button>
              <button onClick={handleSymRequest} style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IconLink size={14} /> Request Sym
              </button>
            </>
          )}
          {relationshipStatus === 'following' && (
            <>
              <button onClick={handleUnfollow} style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IconUserMinus size={14} /> Unfollow
              </button>
              <button onClick={handleSymRequest} style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IconLink size={14} /> Request Sym
              </button>
            </>
          )}
          {relationshipStatus === 'sym_requested' && (
            <button onClick={handleCancelSymRequest} style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <IconLinkOff size={14} /> Cancel Sym Request
            </button>
          )}
          {relationshipStatus === 'incoming_sym_request' && (
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={handleAcceptSymRequest} style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '5px', borderColor: 'var(--accent-sym)' }}>
                <IconCheck size={14} /> Accept Sym
              </button>
              <button onClick={handleCancelSymRequest} style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IconX size={14} /> Decline Sym
              </button>
            </div>
          )}
          {relationshipStatus === 'sym_accepted' && (
            <button onClick={handleRemoveSym} style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-alert)', borderColor: 'var(--accent-alert)' }}>
              <IconCirclesRelation size={14} /> Remove Sym
            </button>
          )}
        </div>
      )}
      
      <Artifacts userId={userId.toString()} isOwner={isOwner} />
    </div>
  );
};

export default Communique;
