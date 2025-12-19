import React, { useState, useEffect } from 'react';
import { useCustomization } from '../context/CustomizationContext';
import { useTheme } from '../context/ThemeContext'; // To toggle default themes
import { IconPalette, IconX, IconCheck } from '@tabler/icons-react';

interface ThemeSettingsProps {
  onClose: () => void;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ onClose }) => {
  const { preferences, updateThemePreferences } = useCustomization();
  const { theme: currentDefaultTheme, toggleTheme } = useTheme();

  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>('');
  const [customSecondaryColor, setCustomSecondaryColor] = useState<string>('');
  const [bgColor, setBgColor] = useState<string>('');
  const [textColor, setTextColor] = useState<string>('');
  const [borderColor, setBorderColor] = useState<string>('');
  const [accentMe, setAccentMe] = useState<string>('');
  const [accentSym, setAccentSym] = useState<string>('');
  const [accentAsym, setAccentAsym] = useState<string>('');
  const [bgMist, setBgMist] = useState<string>('');
  const [accentAlert, setAccentAlert] = useState<string>('');
  const [drawerBg, setDrawerBg] = useState<string>('');
  const [glowSym, setGlowSym] = useState<string>('');
  const [glowMe, setGlowMe] = useState<string>('');
  const [hoverBg, setHoverBg] = useState<string>('');

  // Profile Aesthetics states
  const [nodePrimaryColor, setNodePrimaryColor] = useState<string>('');
  const [nodeSecondaryColor, setNodeSecondaryColor] = useState<string>('');
  const [nodeSize, setNodeSize] = useState<number>(0);

  useEffect(() => {
    if (preferences) {
      if (preferences.theme_preferences) {
        try {
          const parsedPrefs = JSON.parse(preferences.theme_preferences);
          setCustomPrimaryColor(parsedPrefs['accent-primary'] || '');
          setCustomSecondaryColor(parsedPrefs['accent-secondary'] || '');
          setBgColor(parsedPrefs['bg-color'] || '');
          setTextColor(parsedPrefs['text-primary'] || '');
          setBorderColor(parsedPrefs['border-color'] || '');
          setAccentMe(parsedPrefs['accent-me'] || '');
          setAccentSym(parsedPrefs['accent-sym'] || '');
          setAccentAsym(parsedPrefs['accent-asym'] || '');
          setBgMist(parsedPrefs['bg-mist'] || '');
          setAccentAlert(parsedPrefs['accent-alert'] || '');
          setDrawerBg(parsedPrefs['drawer-bg'] || '');
          setGlowSym(parsedPrefs['glow-sym'] || '');
          setGlowMe(parsedPrefs['glow-me'] || '');
          setHoverBg(parsedPrefs['hover-bg'] || '');
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

  const handleSaveCustomTheme = async () => {
    const newCustomPrefs = {
      'accent-primary': customPrimaryColor,
      'accent-secondary': customSecondaryColor,
      'bg-color': bgColor,
      'text-primary': textColor,
      'border-color': borderColor,
      'accent-me': accentMe,
      'accent-sym': accentSym,
      'accent-asym': accentAsym,
      'bg-mist': bgMist,
      'accent-alert': accentAlert,
      'drawer-bg': drawerBg,
      'glow-sym': glowSym,
      'glow-me': glowMe,
      'hover-bg': hoverBg,
    };
    await updateThemePreferences(newCustomPrefs);
    // onClose(); // Keep modal open for aesthetics update
  };

  const handleSaveProfileAesthetics = async () => {
    const newAesthetics = {
      node_primary_color: nodePrimaryColor,
      node_secondary_color: nodeSecondaryColor,
      node_size: nodeSize,
    };
    await updateProfileAesthetics(newAesthetics);
    onClose();
  };

  return (
    <div className="overlay-panel fade-in" style={{ zIndex: 3000 }}>
      <div className="glass-panel" style={{ width: '400px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0 }}>Theme Settings</h2>
          <button onClick={onClose} title="Close">
            <IconX size={18} />
          </button>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>Default Themes</h3>
          <p>Current: {currentDefaultTheme}</p>
          <button onClick={toggleTheme}>Toggle Default Theme</button>
        </div>

        <div>
          <h3>Custom Theme (Experimental)</h3>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Primary Accent Color (#RRGGBBAA):
              <input
                type="text"
                value={customPrimaryColor}
                onChange={(e) => setCustomPrimaryColor(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Secondary Accent Color (#RRGGBBAA):
              <input
                type="text"
                value={customSecondaryColor}
                onChange={(e) => setCustomSecondaryColor(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Background Color (#RRGGBBAA):
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Background Mist Color (#RRGGBBAA):
              <input
                type="text"
                value={bgMist}
                onChange={(e) => setBgMist(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Text Color (#RRGGBBAA):
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Border Color (#RRGGBBAA):
              <input
                type="text"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Accent "Me" Color (#RRGGBBAA):
              <input
                type="text"
                value={accentMe}
                onChange={(e) => setAccentMe(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Accent "Sym" Color (#RRGGBBAA):
              <input
                type="text"
                value={accentSym}
                onChange={(e) => setAccentSym(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Accent "Asym" Color (#RRGGBBAA):
              <input
                type="text"
                value={accentAsym}
                onChange={(e) => setAccentAsym(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Accent Alert Color (#RRGGBBAA):
              <input
                type="text"
                value={accentAlert}
                onChange={(e) => setAccentAlert(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Drawer Background Color (#RRGGBBAA):
              <input
                type="text"
                value={drawerBg}
                onChange={(e) => setDrawerBg(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Glow Sym Color (CSS Filter value):
              <input
                type="text"
                value={glowSym}
                onChange={(e) => setGlowSym(e.target.value)}
                placeholder="0 0 10px #26de8166"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Glow Me Color (CSS Filter value):
              <input
                type="text"
                value={glowMe}
                onChange={(e) => setGlowMe(e.target.value)}
                placeholder="0 0 15px #ffffff80"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Hover Background Color (#RRGGBBAA):
              <input
                type="text"
                value={hoverBg}
                onChange={(e) => setHoverBg(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <button onClick={handleSaveCustomTheme} style={{ marginRight: '10px' }}>
            <IconCheck size={18} style={{ verticalAlign: 'middle' }} /> Save Custom Theme
          </button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3>Profile Node Aesthetics</h3>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Node Primary Color (#RRGGBBAA):
              <input
                type="text"
                value={nodePrimaryColor}
                onChange={(e) => setNodePrimaryColor(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Node Secondary Color (#RRGGBBAA):
              <input
                type="text"
                value={nodeSecondaryColor}
                onChange={(e) => setNodeSecondaryColor(e.target.value)}
                placeholder="#AABBCCFF"
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Node Size (e.g., 8, 12, 16):
              <input
                type="number"
                value={nodeSize === 0 ? '' : nodeSize} // Handle 0 for placeholder
                onChange={(e) => setNodeSize(parseInt(e.target.value) || 0)}
                placeholder="8"
                min="4"
                max="30"
              />
            </label>
          </div>
          <button onClick={handleSaveProfileAesthetics}>
            <IconCheck size={18} style={{ verticalAlign: 'middle' }} /> Save Profile Aesthetics
          </button>
        </div>
      </div>
    </div>
  );
}

export default ThemeSettings;