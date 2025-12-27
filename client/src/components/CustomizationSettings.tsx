import React, { useState, useEffect } from 'react';
import { useCustomization } from '../context/CustomizationContext';
import { IconSettings, IconX } from '@tabler/icons-react';

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
      mistDensity: theme_preferences.mistDensity || 0.5
  });

  // Sync local state when context updates (initial load)
  useEffect(() => {
      setLocalState({
          node_primary_color,
          node_secondary_color,
          node_size,
          mistDensity: theme_preferences.mistDensity || 0.5
      });
  }, [node_primary_color, node_secondary_color, node_size, theme_preferences]);

  // Debounced update
  useEffect(() => {
      const timer = setTimeout(() => {
          updateCustomization({
              node_primary_color: localState.node_primary_color,
              node_secondary_color: localState.node_secondary_color,
              node_size: localState.node_size,
              theme_preferences: { ...theme_preferences, mistDensity: localState.mistDensity }
          });
      }, 500); // 500ms debounce
      return () => clearTimeout(timer);
  }, [localState]);

  const handleLocalChange = (key: string, value: any) => {
      setLocalState(prev => ({ ...prev, [key]: value }));
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
      bottom: '60px',
      left: '20px',
      width: '250px',
      background: 'var(--modal-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '16px',
      zIndex: 101,
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Aesthetics</h3>
        <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            aria-label="Close settings"
        >
            <IconX size={16} />
        </button>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="node-size-input" style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
          Node Size ({localState.node_size}px)
        </label>
        <input
          id="node-size-input"
          type="range"
          min="4"
          max="20"
          value={localState.node_size}
          onChange={(e) => handleLocalChange('node_size', Number(e.target.value))}
          style={{ width: '100%' }}
          aria-valuemin={4}
          aria-valuemax={20}
          aria-valuenow={localState.node_size}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="mist-density-input" style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
          Mist Density ({(localState.mistDensity * 100).toFixed(0)}%)
        </label>
        <input
          id="mist-density-input"
          type="range"
          min="0"
          max="100"
          value={localState.mistDensity * 100}
          onChange={(e) => handleLocalChange('mistDensity', Number(e.target.value) / 100)}
          style={{ width: '100%' }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={localState.mistDensity * 100}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="primary-color-input" style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
          Primary Color (Sym)
        </label>
        <input
          id="primary-color-input"
          type="color"
          value={localState.node_primary_color}
          onChange={(e) => handleLocalChange('node_primary_color', e.target.value)}
          style={{ width: '100%', height: '30px', border: 'none', cursor: 'pointer' }}
        />
      </div>

      <div style={{ marginBottom: '0px' }}>
        <label htmlFor="secondary-color-input" style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
          Secondary Color (Asym)
        </label>
        <input
          id="secondary-color-input"
          type="color"
          value={localState.node_secondary_color}
          onChange={(e) => handleLocalChange('node_secondary_color', e.target.value)}
          style={{ width: '100%', height: '30px', border: 'none', cursor: 'pointer' }}
        />
      </div>

    </div>
  );
};

export default CustomizationSettings;
