import React, { useState, useEffect } from 'react';
import { useCustomization } from '../context/CustomizationContext';
import { useTheme } from '../context/ThemeContext'; // To toggle default themes
import { IconPalette, IconX, IconCheck, IconDeviceFloppy } from '@tabler/icons-react';

interface ThemeSettingsProps {
  onClose: () => void;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ onClose }) => {
  const { preferences, updateThemePreferences, updateProfileAesthetics } = useCustomization();
  const { theme: currentDefaultTheme, toggleTheme } = useTheme();

  const [customCSS, setCustomCSS] = useState<string>('');
  
  // Profile Aesthetics states
  const [nodePrimaryColor, setNodePrimaryColor] = useState<string>('');
  const [nodeSecondaryColor, setNodeSecondaryColor] = useState<string>('');
  const [nodeSize, setNodeSize] = useState<number>(0);

  useEffect(() => {
    if (preferences) {
      if (preferences.theme_preferences) {
        try {
          const parsedPrefs = JSON.parse(preferences.theme_preferences);
          setCustomCSS(parsedPrefs.custom_css || '');
        } catch (e) {
          console.error("Failed to parse initial theme preferences", e);
        }
      }
      // Set profile aesthetics states
      setNodePrimaryColor(preferences.node_primary_color || '');
      setNodeSecondaryColor(preferences.node_secondary_color || '');
      setNodeSize(preferences.node_size || 0);
    }
  }, [preferences]);

  const handleSaveCustomCSS = async () => {
    const newCustomPrefs = {
      custom_css: customCSS
    };
    await updateThemePreferences(newCustomPrefs);
  };

  const handleSaveProfileAesthetics = async () => {
    const newAesthetics = {
      node_primary_color: nodePrimaryColor,
      node_secondary_color: nodeSecondaryColor,
      node_size: nodeSize,
    };
    await updateProfileAesthetics(newAesthetics);
    // We don't close automatically to allow user to tweak
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="glass-panel" style={{ width: '500px', padding: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconPalette size={24} /> Theme Settings
          </h2>
          <button onClick={onClose} title="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <IconX size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ marginTop: 0 }}>Base Theme</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span>Current: <strong>{currentDefaultTheme.charAt(0).toUpperCase() + currentDefaultTheme.slice(1)}</strong></span>
            <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconPalette size={16} /> Toggle Theme
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ marginTop: 0 }}>Global Custom CSS</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Inject custom CSS rules that apply to your entire view of the application. 
            Overrides base theme styles.
          </p>
          <textarea
            value={customCSS}
            onChange={(e) => setCustomCSS(e.target.value)}
            placeholder={`/* Example */\n:root {\n  --accent-primary: #ff00ff;\n}\n\nbody {\n  font-family: 'Courier New', monospace;\n}`}
            style={{
              width: '100%',
              minHeight: '200px',
              background: 'rgba(0,0,0,0.3)',
              color: '#a6e22e',
              fontFamily: 'monospace',
              fontSize: '14px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '10px',
              resize: 'vertical'
            }}
          />
          <button onClick={handleSaveCustomCSS} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconDeviceFloppy size={18} /> Save CSS
          </button>
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>Profile Node Aesthetics</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
            Customize how your node appears in the network graph.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
                Primary Color
              </label>
              <input
                type="text"
                value={nodePrimaryColor}
                onChange={(e) => setNodePrimaryColor(e.target.value)}
                placeholder="#1F77B4"
                style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
                Secondary Color
              </label>
              <input
                type="text"
                value={nodeSecondaryColor}
                onChange={(e) => setNodeSecondaryColor(e.target.value)}
                placeholder="#FF7F0E"
                style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
              Node Size (Default: 8)
            </label>
            <input
              type="number"
              value={nodeSize === 0 ? '' : nodeSize}
              onChange={(e) => setNodeSize(parseInt(e.target.value) || 0)}
              placeholder="8"
              min="4"
              max="30"
              style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>

          <button onClick={handleSaveProfileAesthetics} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconCheck size={18} /> Save Node Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default ThemeSettings;