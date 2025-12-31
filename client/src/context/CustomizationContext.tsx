import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface CustomizationState {
  theme_preferences: {
    mistDensity?: number; // 0.0 to 1.0
    navOpacity?: number; // 0.0 to 1.0
    backgroundUrl?: string; // Custom image or video URL
    backgroundType?: 'video' | 'image';
  };
  node_primary_color: string;
  node_secondary_color: string;
  node_size: number;
}

interface CustomizationContextType extends CustomizationState {
  updateCustomization: (updates: Partial<CustomizationState>) => Promise<void>;
  loading: boolean;
}

const defaultState: CustomizationState = {
  theme_preferences: { mistDensity: 0.5, navOpacity: 0.8 },
  node_primary_color: '#1F77B4',
  node_secondary_color: '#FF7F0E',
  node_size: 8
};

const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined);

export const CustomizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CustomizationState>(defaultState);
  const [loading, setLoading] = useState(true);

  const fetchCustomization = useCallback(async () => {
    try {
      const res = await fetch('/api/customization');
      if (res.ok) {
        const data = await res.json();
        setState({
          theme_preferences: typeof data.theme_preferences === 'string'
            ? JSON.parse(data.theme_preferences)
            : (data.theme_preferences || defaultState.theme_preferences),
          node_primary_color: data.node_primary_color || defaultState.node_primary_color,
          node_secondary_color: data.node_secondary_color || defaultState.node_secondary_color,
          node_size: data.node_size || defaultState.node_size,
        });
      }
    } catch (e) {
      console.error("Failed to load customization:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomization();
  }, [fetchCustomization]);

  const updateCustomization = async (updates: Partial<CustomizationState>) => {
    // Optimistic update
    setState(prev => ({ ...prev, ...updates }));

    try {
      // Strict Sanitization to prevent SQLITE_TOOBIG
      let themePrefsStr = undefined;
      if (updates.theme_preferences) {
          const cleanPreferences = {
              mistDensity: updates.theme_preferences.mistDensity
          };
          themePrefsStr = JSON.stringify(cleanPreferences);
      }

      const payload = {
          ...updates,
          theme_preferences: themePrefsStr
      };

      const res = await fetch('/api/customization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to save customization');
      }
    } catch (e) {
      console.error(e);
      // Revert on failure (could implement more robust rollback)
      fetchCustomization();
    }
  };

  return (
    <CustomizationContext.Provider value={{ ...state, updateCustomization, loading }}>
      {children}
    </CustomizationContext.Provider>
  );
};

export const useCustomization = () => {
  const context = useContext(CustomizationContext);
  if (!context) {
    throw new Error('useCustomization must be used within a CustomizationProvider');
  }
  return context;
};
