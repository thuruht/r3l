import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { IconEdit, IconDeviceFloppy, IconX } from '@tabler/icons-react';
import Artifacts from './Artifacts';

interface CommuniqueProps {
  userId: string;
  isOwner: boolean;
}

interface CommuniqueData {
  content: string;
  theme_prefs: string;
  updated_at: string | null;
}

const Communique: React.FC<CommuniqueProps> = ({ userId, isOwner }) => {
  const [data, setData] = useState<CommuniqueData>({ content: '', theme_prefs: '{}', updated_at: null });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editCSS, setEditCSS] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const contentRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCommunique();
  }, [userId]);

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
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    }
  };

  // Helper to safely extract CSS for rendering
  const getRenderCSS = () => {
      try {
          const prefs = JSON.parse(data.theme_prefs || '{}');
          return prefs.custom_css || '';
      } catch (e) { return ''; }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Drifting through the mist...</div>;
  }

  return (
    <div id={`communique-user-${userId}`} className="communique-container fade-in" style={{ position: 'relative' }}>
      {/* Inject Scoped Styles */}
      <style>{getRenderCSS()}</style>

      <div className="communique-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, color: 'var(--accent-sym)', textShadow: 'var(--glow-sym)' }}>Communique</h4>
        {data.updated_at && (
          <small style={{ color: 'var(--text-secondary)', fontSize: '0.7em' }}>
            Last signal: {new Date(data.updated_at).toLocaleDateString()}
          </small>
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
      
      <Artifacts userId={userId} isOwner={isOwner} />
    </div>
  );
};

export default Communique;