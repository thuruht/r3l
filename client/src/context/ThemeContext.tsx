import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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

  const applyTheme = useCallback((currentTheme: Theme) => {
    document.documentElement.className = ''; // Clear existing
    document.documentElement.classList.add(`theme-${currentTheme}`);
    localStorage.setItem('theme', currentTheme);
    // Also update color-scheme for browser
    document.documentElement.style.colorScheme = currentTheme === 'dawn' ? 'light' : 'dark';
  }, []);

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
