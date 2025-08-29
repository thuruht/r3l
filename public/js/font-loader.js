/**
 * Privacy-First Font Loader for R3L:F
 * Uses Bunny Fonts instead of Google Fonts
 */
class PrivacyFontLoader {
  constructor() {
    this.bunnyBaseUrl = 'https://fonts.bunny.net';
    this.loadedFonts = new Set();
  }

  /**
   * Load a font family with specified weights
   * @param {string} family - Font family name
   * @param {string[]} weights - Font weights to load
   */
  async loadFont(family, weights = ['400', '600', '700']) {
    if (this.loadedFonts.has(family)) return;

    const weightString = weights.join(';');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${this.bunnyBaseUrl}/css2?family=${family}:wght@${weightString}&display=swap`;

    document.head.appendChild(link);
    this.loadedFonts.add(family);

    return new Promise(resolve => {
      link.onload = () => resolve();
      link.onerror = () => {
        console.warn(`Failed to load font: ${family}`);
        resolve();
      };
    });
  }

  /**
   * Load Material Icons
   */
  async loadMaterialIcons() {
    if (this.loadedFonts.has('Material+Icons')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${this.bunnyBaseUrl}/icon?family=Material+Icons`;

    document.head.appendChild(link);
    this.loadedFonts.add('Material+Icons');

    return new Promise(resolve => {
      link.onload = () => resolve();
      link.onerror = () => {
        console.warn('Failed to load Material Icons');
        resolve();
      };
    });
  }

  /**
   * Load the default R3L:F fonts
   */
  async loadDefaultFonts() {
    await Promise.all([
      this.loadFont('Inter', ['400', '500', '600', '700']),
      this.loadFont('Space+Grotesk', ['400', '500', '600', '700']),
      this.loadFont('JetBrains+Mono', ['400', '500']),
      this.loadMaterialIcons(),
    ]);

    console.log('R3L:F fonts loaded from privacy-respecting Bunny CDN');
    return true;
  }
}

// Initialize and export a singleton instance
const fontLoader = new PrivacyFontLoader();
fontLoader.loadDefaultFonts();

// Export for use in other modules
window.fontLoader = fontLoader;
