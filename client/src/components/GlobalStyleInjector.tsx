import React, { useMemo } from 'react';
import { useCustomization } from '../context/CustomizationContext';

export const GlobalStyleInjector: React.FC = () => {
  const { preferences } = useCustomization();

  const customCSS = useMemo(() => {
    if (preferences && preferences.theme_preferences) {
      try {
        const prefs = JSON.parse(preferences.theme_preferences);
        return prefs.custom_css || '';
      } catch (e) {
        console.error("Failed to parse theme preferences for custom CSS", e);
        return '';
      }
    }
    return '';
  }, [preferences]);

  if (!customCSS) return null;

  return (
    <style dangerouslySetInnerHTML={{ __html: customCSS }} />
  );
};
