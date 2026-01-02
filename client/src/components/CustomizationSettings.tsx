import React, { useState, useEffect } from 'react';
import { useCustomization } from '../context/CustomizationContext';
import { IconSettings, IconX, IconRefresh } from '@tabler/icons-react';

const CustomizationSettings: React.FC = () => {
  const {
    node_primary_color,
    node_secondary_color,
    node_size,
    theme_preferences,
    updateCustomization
  } = useCustomization();

  const [isOpen, setIsOpen] = useState(false);
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
      setLocalState(prev => ({
          ...prev,
          node_primary_color: DEFAULT_PRIMARY,
          node_secondary_color: DEFAULT_SECONDARY
      }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            zIndex: 100,
            padding: '8px',
            background: 'var(--drawer-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: '4px',
            cursor: 'pointer'
        }}
        aria-label="Customize Appearance"
      >
        <IconSettings size={20} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: window.innerWidth < 768 ? '10px' : window.innerHeight < 600 ? '10px' : '60px',
      left: window.innerWidth < 768 ? '10px' : '20px',
      right: window.innerWidth < 768 ? '10px' : 'auto',
      width: window.innerWidth < 768 ? 'auto' : 'min(280px, calc(100vw - 40px))',
      maxHeight: window.innerWidth < 768 ? 'calc(100vh - 20px)' : window.innerHeight < 600 ? 'calc(100vh - 20px)' : 'calc(100vh - 100px)',
      overflowY: 'auto',
      background: 'var(--drawer-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: window.innerWidth < 768 ? '12px' : '16px',
      zIndex: 101,
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Aesthetics</h3>
        <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
            aria-label="Close settings"
        >
            <IconX size={16} />
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Interface
        </label>
        
        <div style={{ marginBottom: '12px' }}>
          <label htmlFor="nav-opacity-input" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
            Nav Opacity: {(localState.navOpacity * 100).toFixed(0)}%
          </label>
          <input
            id="nav-opacity-input"
            type="range"
            min="0"
            max="100"
            value={localState.navOpacity * 100}
            onChange={(e) => handleLocalChange('navOpacity', Number(e.target.value) / 100)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label htmlFor="mist-density-input" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
            Mist Density: {(localState.mistDensity * 100).toFixed(0)}%
          </label>
          <input
            id="mist-density-input"
            type="range"
            min="0"
            max="100"
            value={localState.mistDensity * 100}
            onChange={(e) => handleLocalChange('mistDensity', Number(e.target.value) / 100)}
            style={{ width: '100%' }}
          />
        </div>

        <button
          onClick={() => updateCustomization({ theme_preferences: { ...theme_preferences, backgroundUrl: null as any } })}
          disabled={!theme_preferences.backgroundUrl}
          style={{ width: '100%', fontSize: '0.75rem', padding: '6px' }}
        >
          <IconRefresh size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          Reset Background
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Graph
        </label>

        <div style={{ marginBottom: '12px' }}>
          <label htmlFor="node-size-input" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
            Node Size: {localState.node_size}px
          </label>
          <input
            id="node-size-input"
            type="range"
            min="4"
            max="20"
            value={localState.node_size}
            onChange={(e) => handleLocalChange('node_size', Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="primary-color-input" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Primary (Sym)
            </label>
            <input
              id="primary-color-input"
              type="color"
              value={localState.node_primary_color}
              onChange={(e) => handleLocalChange('node_primary_color', e.target.value)}
              style={{ width: '100%', height: '36px', border: '1px solid var(--border-color)', cursor: 'pointer', borderRadius: '4px' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label htmlFor="secondary-color-input" style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Secondary (Asym)
            </label>
            <input
              id="secondary-color-input"
              type="color"
              value={localState.node_secondary_color}
              onChange={(e) => handleLocalChange('node_secondary_color', e.target.value)}
              style={{ width: '100%', height: '36px', border: '1px solid var(--border-color)', cursor: 'pointer', borderRadius: '4px' }}
            />
          </div>
        </div>

        <button
          onClick={resetColors}
          style={{ width: '100%', fontSize: '0.75rem', padding: '6px' }}
        >
          <IconRefresh size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          Reset Colors
        </button>
      </div>

    </div>
  );
};

export default CustomizationSettings;
