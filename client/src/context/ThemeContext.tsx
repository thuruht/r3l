import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useCustomization } from './CustomizationContext'; // New import

type Theme = 'mist' | 'dusk' | 'dawn';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize theme from localStorage or default to 'mist'
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'mist';
    }
    return 'mist';
  });

  const { preferences } = useCustomization(); // Use custom preferences

  const applyTheme = useCallback((currentTheme: Theme) => {
    document.documentElement.className = ''; // Clear existing
    document.documentElement.classList.add(`theme-${currentTheme}`);
    localStorage.setItem('theme', currentTheme);
    // Also update color-scheme for browser
    document.documentElement.style.colorScheme = currentTheme === 'dawn' ? 'light' : 'dark';

    // Apply custom theme preferences if available
    if (preferences && preferences.theme_preferences) {
      try {
        const customPrefs = JSON.parse(preferences.theme_preferences);
        for (const [key, value] of Object.entries(customPrefs)) {
          // Assuming key is a valid CSS variable name (e.g., --bg-color-custom)
          document.documentElement.style.setProperty(`--${key}`, value as string);
        }
      } catch (e) {
        console.error("Failed to parse custom theme preferences", e);
      }
    }
  }, [preferences]); // Added preferences to dependency array

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      if (prevTheme === 'mist') return 'dusk';
      if (prevTheme === 'dusk') return 'dawn';
      return 'mist';
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
