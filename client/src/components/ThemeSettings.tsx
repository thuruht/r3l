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
  // Add more custom theme states as needed (e.g., mist density, glow radius)

  useEffect(() => {
    if (preferences && preferences.theme_preferences) {
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
        // Set other custom theme states
      } catch (e) {
        console.error("Failed to parse initial theme preferences", e);
      }
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
      // Add other custom theme values
    };
    await updateThemePreferences(newCustomPrefs);
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
          <button onClick={handleSaveCustomTheme} style={{ marginRight: '10px' }}>
            <IconCheck size={18} style={{ verticalAlign: 'middle' }} /> Save Custom Theme
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;