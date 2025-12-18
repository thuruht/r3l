import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from './ToastContext';

interface UserPreferences {
  theme_preferences: string; // JSON string
  node_primary_color: string; // #RRGGBBAA
  node_secondary_color: string; // #RRGGBBAA
  node_size: number;
}

interface CustomizationContextType {
  preferences: UserPreferences | null;
  updateThemePreferences: (newPrefs: any) => Promise<void>;
  updateProfileAesthetics: (newAesthetics: any) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined);

export const CustomizationProvider: React.FC<{ children: ReactNode; initialPreferences: UserPreferences | null; currentUserId: number | null }> = ({ children, initialPreferences, currentUserId }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(initialPreferences);
  const { showToast } = useToast();

  useEffect(() => {
    if (initialPreferences) {
      setPreferences(initialPreferences);
    }
  }, [initialPreferences]);

  const refreshPreferences = useCallback(async () => {
    if (!currentUserId) {
        setPreferences(null);
        return;
    }
    try {
      const prefsResponse = await fetch('/api/users/me/preferences');
      if (prefsResponse.ok) {
        const prefsData = await prefsResponse.json();
        setPreferences(prefsData);
      } else {
        console.warn('Failed to refresh user preferences');
        setPreferences(null);
      }
    } catch (error) {
      console.error('Error refreshing user preferences:', error);
      setPreferences(null);
    }
  }, [currentUserId]);

  const updateThemePreferences = useCallback(async (newPrefs: any) => {
    try {
      const response = await fetch('/api/users/me/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme_preferences: newPrefs }),
      });
      if (response.ok) {
        showToast('Theme preferences updated!', 'success');
        refreshPreferences();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update theme preferences', 'error');
      }
    } catch (error) {
      console.error('Error updating theme preferences:', error);
      showToast('Network error updating theme preferences', 'error');
    }
  }, [showToast, refreshPreferences]);

  const updateProfileAesthetics = useCallback(async (newAesthetics: any) => {
    try {
      const response = await fetch('/api/users/me/profile-aesthetics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAesthetics),
      });
      if (response.ok) {
        showToast('Profile aesthetics updated!', 'success');
        refreshPreferences();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update profile aesthetics', 'error');
      }
    } catch (error) {
      console.error('Error updating profile aesthetics:', error);
      showToast('Network error updating profile aesthetics', 'error');
    }
  }, [showToast, refreshPreferences]);


  return (
    <CustomizationContext.Provider value={{ preferences, updateThemePreferences, updateProfileAesthetics, refreshPreferences }}>
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