import React, { useState, useEffect } from 'react';
import { useCustomization } from '../context/CustomizationContext';
import { IconSettings, IconX, IconRefresh, IconWallpaper, IconTrash, IconChevronRight } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';
import { useToast } from '../context/ToastContext';

const CustomizationSettings: React.FC = () => {
  const {
    node_primary_color,
    node_secondary_color,
    node_size,
    theme_preferences,
    updateCustomization
  } = useCustomization();

  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [localState, setLocalState] = useState({
    node_primary_color,
    node_secondary_color,
    node_size,
    mistDensity: theme_preferences.mistDensity || 0.5,
    navOpacity: theme_preferences.navOpacity || 0.8
  });

  const DEFAULT_PRIMARY = '#10b981';
  const DEFAULT_SECONDARY = '#8b5cf6';

  useEffect(() => {
    setLocalState(prev => {
      if (
        prev.node_primary_color !== node_primary_color ||
        prev.node_secondary_color !== node_secondary_color ||
        prev.node_size !== node_size ||
        prev.mistDensity !== (theme_preferences.mistDensity || 0.5) ||
        prev.navOpacity !== (theme_preferences.navOpacity || 0.8)
      ) {
        return {
          node_primary_color: node_primary_color.slice(0, 7),
          node_secondary_color: node_secondary_color.slice(0, 7),
          node_size,
          mistDensity: theme_preferences.mistDensity || 0.5,
          navOpacity: theme_preferences.navOpacity || 0.8
        };
      }
      return prev;
    });
  }, [node_primary_color, node_secondary_color, node_size, theme_preferences]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const pColor = localState.node_primary_color.length === 7 ? localState.node_primary_color + 'ff' : localState.node_primary_color;
      const sColor = localState.node_secondary_color.length === 7 ? localState.node_secondary_color + 'ff' : localState.node_secondary_color;
      if (pColor !== node_primary_color || sColor !== node_secondary_color || localState.node_size !== node_size ||
          localState.mistDensity !== theme_preferences.mistDensity || localState.navOpacity !== theme_preferences.navOpacity) {
        updateCustomization({
          node_primary_color: pColor,
          node_secondary_color: sColor,
          node_size: localState.node_size,
          theme_preferences: {
            ...theme_preferences,
            mistDensity: localState.mistDensity,
            navOpacity: localState.navOpacity
          }
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localState, node_primary_color, node_secondary_color, node_size, theme_preferences, updateCustomization]);

  const handleLocalChange = (key: string, value: any) => {
    setLocalState(prev => ({ ...prev, [key]: value }));
  };

  const resetColors = () => {
    setLocalState(prev => ({ ...prev, node_primary_color: DEFAULT_PRIMARY, node_secondary_color: DEFAULT_SECONDARY }));
  };

  const fetchUserFiles = async () => {
      try {
          const res = await fetch('/api/files');
          if (res.ok) {
              const data = await res.json();
              const filtered = (data.files || []).filter((f: any) => 
                  f.mime_type.startsWith('image/') || f.mime_type.startsWith('video/')
              );
              setUserFiles(filtered);
          }
      } catch (e) {
          console.error(e);
      }
  };

  const setBackground = (file: any) => {
      updateCustomization({
          theme_preferences: {
              ...theme_preferences,
              backgroundUrl: `/api/files/${file.id}/content`,
              backgroundType: file.mime_type.startsWith('video/') ? 'video' : 'image'
          }
      });
      showToast('Environment background updated.', 'success');
      setShowFilePicker(false);
  };

  const clearBackground = () => {
      updateCustomization({
          theme_preferences: {
              ...theme_preferences,
              backgroundUrl: null as any,
              backgroundType: null as any
          }
      });
      showToast('Background cleared.', 'info');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute', bottom: '20px', left: '20px', zIndex: 100,
          padding: '8px', background: 'var(--drawer-bg)', border: '1px solid var(--border-color)',
          color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer'
        }}
        aria-label="Customize Appearance"
      >
        <IconSettings size={ICON_SIZES.xl} className="chrome-icon" />
      </button>
    );
  }

  return (
    <div className="glass-panel" style={{
      position: 'absolute',
      bottom: '60px',
      left: window.innerWidth < 768 ? '10px' : '20px',
      right: window.innerWidth < 768 ? '10px' : 'auto',
      width: window.innerWidth < 768 ? 'auto' : 'min(300px, calc(100vw - 40px))',
      maxHeight: 'min(80vh, calc(100vh - 130px))',
      overflowY: 'auto',
      borderRadius: '8px', padding: window.innerWidth < 768 ? '12px' : '16px',
      zIndex: 101, boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', gap: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconSettings size={ICON_SIZES.md} /> AESTHETICS
        </h3>
        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }} aria-label="Close settings">
          <IconX size={ICON_SIZES.md} />
        </button>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>INTERFACE</label>
        
        <div style={{ marginBottom: '12px' }}>
          <label htmlFor="nav-opacity-input" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
            <span>NAV OPACITY</span>
            <span>{(localState.navOpacity * 100).toFixed(0)}%</span>
          </label>
          <input id="nav-opacity-input" type="range" min="0" max="100" value={localState.navOpacity * 100}
            onChange={(e) => handleLocalChange('navOpacity', Number(e.target.value) / 100)} style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="mist-density-input" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
            <span>MIST DENSITY</span>
            <span>{(localState.mistDensity * 100).toFixed(0)}%</span>
          </label>
          <input id="mist-density-input" type="range" min="0" max="100" value={localState.mistDensity * 100}
            onChange={(e) => handleLocalChange('mistDensity', Number(e.target.value) / 100)} style={{ width: '100%' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
                onClick={() => { setShowFilePicker(!showFilePicker); if (!showFilePicker) fetchUserFiles(); }}
                style={{ width: '100%', fontSize: '0.75rem', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
                <IconWallpaper size={ICON_SIZES.sm} /> {showFilePicker ? 'CANCEL' : 'CHOOSE BACKGROUND'}
            </button>

            {showFilePicker && (
                <div className="glass-panel" style={{ padding: '8px', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(0,0,0,0.2)' }}>
                    {userFiles.length === 0 ? (
                        <div style={{ fontSize: '10px', color: '#666', textAlign: 'center', padding: '10px' }}>No compatible artifacts found.</div>
                    ) : userFiles.map(f => (
                        <button key={f.id} onClick={() => setBackground(f)} style={{ fontSize: '10px', padding: '4px 8px', textAlign: 'left', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.filename}</span>
                            <IconChevronRight size={10} />
                        </button>
                    ))}
                </div>
            )}

            <button 
                onClick={clearBackground}
                disabled={!theme_preferences.backgroundUrl} 
                style={{ width: '100%', fontSize: '0.75rem', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: theme_preferences.backgroundUrl ? 1 : 0.5 }}
            >
                <IconTrash size={ICON_SIZES.sm} /> RESET BACKGROUND
            </button>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>GRAPH</label>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="node-size-input" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
            <span>NODE SIZE</span>
            <span>{localState.node_size}px</span>
          </label>
          <input id="node-size-input" type="range" min="4" max="20" value={localState.node_size}
            onChange={(e) => handleLocalChange('node_size', Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="primary-color-input" style={{ display: 'block', fontSize: '10px', marginBottom: '4px', color: '#888' }}>PRIMARY (SYM)</label>
            <input id="primary-color-input" type="color" value={localState.node_primary_color}
              onChange={(e) => handleLocalChange('node_primary_color', e.target.value)}
              style={{ width: '100%', height: '32px', border: '1px solid var(--border-color)', cursor: 'pointer', borderRadius: '4px', background: 'none', padding: 0 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="secondary-color-input" style={{ display: 'block', fontSize: '10px', marginBottom: '4px', color: '#888' }}>SECONDARY (A-SYM)</label>
            <input id="secondary-color-input" type="color" value={localState.node_secondary_color}
              onChange={(e) => handleLocalChange('node_secondary_color', e.target.value)}
              style={{ width: '100%', height: '32px', border: '1px solid var(--border-color)', cursor: 'pointer', borderRadius: '4px', background: 'none', padding: 0 }} />
          </div>
        </div>
        <button onClick={resetColors} style={{ width: '100%', fontSize: '0.75rem', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <IconRefresh size={ICON_SIZES.sm} /> RESET COLORS
        </button>
      </div>
    </div>
  );
};

export default CustomizationSettings;
