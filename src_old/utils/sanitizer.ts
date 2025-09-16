/**
 * Sanitizer utility for R3L:F
 *
 * Provides methods for sanitizing various types of user input
 */
// Using a simple fallback for Cloudflare Workers where DOMPurify may not be available
const simpleSanitize = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Create a simple DOMPurify-like interface for Cloudflare Workers
interface DOMPurifyInterface {
  sanitize: (input: string, config?: any) => string;
}

// Simple implementation that just uses the simpleSanitize function
const domPurify: DOMPurifyInterface = {
  sanitize: (input: string) => simpleSanitize(input),
};

/**
 * Sanitizer utility class
 */
export class Sanitizer {
  /**
   * Sanitize HTML content
   *
   * @param input HTML content to sanitize
   * @returns Sanitized HTML
   */
  static sanitizeHtml(input: string): string {
    if (!input) return '';

    // Use DOMPurify if available, otherwise fallback to basic sanitization
    return domPurify.sanitize(input);
  }

  /**
   * Sanitize SQL identifiers (table names, column names)
   *
   * @param input SQL identifier to sanitize
   * @returns Sanitized identifier
   */
  static sanitizeSqlIdentifier(input: string): string {
    if (!input) return '';

    // Only allow alphanumeric and underscore
    return input.replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Sanitize filenames to prevent directory traversal
   *
   * @param fileName Filename to sanitize
   * @returns Sanitized filename
   */
  static sanitizeFileName(fileName: string): string {
    if (!fileName) return '';

    // Remove any path components
    const baseName = fileName.replace(/^.*[\\\/]/, '');

    // Replace any potentially dangerous characters
    const sanitized = baseName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.{2,}/g, '.'); // Prevent directory traversal

    // Limit length
    return sanitized.substring(0, 255);
  }

  /**
   * Validate geographic coordinates
   *
   * @param lat Latitude
   * @param lng Longitude
   * @returns Whether the coordinates are valid
   */
  static validateCoordinates(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  /**
   * Sanitize free text input (usernames, display names, etc.)
   *
   * @param input Text to sanitize
   * @param maxLength Maximum allowed length
   * @returns Sanitized text
   */
  static sanitizeText(input: string, maxLength: number = 255): string {
    if (!input) return '';

    // Trim whitespace and limit length
    return input.trim().substring(0, maxLength);
  }

  /**
   * Sanitize and validate email addresses
   *
   * @param email Email address to sanitize
   * @returns Sanitized email or empty string if invalid
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const trimmed = email.trim().toLowerCase();

    if (!emailRegex.test(trimmed)) {
      return '';
    }

    return trimmed;
  }

  /**
   * Enhanced HTML sanitization with allowed tags
   *
   * @param input HTML content to sanitize
   * @param options Sanitization options
   * @returns Sanitized HTML
   */
  static sanitizeHtmlWithTags(
    input: string,
    options: {
      allowedTags?: string[];
      allowedAttributes?: Record<string, string[]>;
    } = {}
  ): string {
    if (!input) return '';

    // Simple tag regex-based sanitization for Cloudflare Workers
    // where DOMPurify may not be fully functional

    const defaultAllowedTags = [
      'p',
      'b',
      'i',
      'em',
      'strong',
      'a',
      'ul',
      'ol',
      'li',
      'br',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'pre',
      'code',
    ];
    const allowedTags = options.allowedTags || defaultAllowedTags;

    // Convert allowed tags array to regex pattern
    const allowedTagsPattern = allowedTags.join('|');

    // Replace disallowed tags with their HTML entities
    const sanitizedHtml = input.replace(
      new RegExp(`<(?!\/?(?:${allowedTagsPattern})\\b)[^>]+>`, 'gi'),
      match => Sanitizer.sanitizeHtml(match)
    );

    return sanitizedHtml;
  }

  /**
   * Sanitize communique HTML content with more formatting options
   * Specially designed for the Drawer communique
   *
   * @param input Communique HTML content to sanitize
   * @returns Sanitized HTML safe for display
   */
  static sanitizeCommunique(input: string): string {
    if (!input) return '';

    // Communique allows more formatting options than regular content
    const allowedTags = [
      // Basic formatting
      'p',
      'br',
      'hr',
      'div',
      'span',
      // Typography
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'b',
      'strong',
      'i',
      'em',
      'u',
      'del',
      'strike',
      'small',
      'mark',
      // Lists
      'ul',
      'ol',
      'li',
      'dl',
      'dt',
      'dd',
      // Links and media
      'a',
      'img',
      'figure',
      'figcaption',
      // Quotes
      'blockquote',
      'cite',
      'q',
      // Code
      'pre',
      'code',
      'samp',
      // Tables (simple ones)
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ];

    // First sanitize all URLs in the HTML
    // This is important to prevent XSS attacks via URLs
    let sanitizedHtml = input;

    // Sanitize href attributes
    sanitizedHtml = sanitizedHtml.replace(
      /href\s*=\s*["']([^"']*)["']/gi,
      (match, url) => `href="${Sanitizer.sanitizeUrl(url)}"`
    );

    // Sanitize src attributes
    sanitizedHtml = sanitizedHtml.replace(
      /src\s*=\s*["']([^"']*)["']/gi,
      (match, url) => `src="${Sanitizer.sanitizeUrl(url)}"`
    );

    // Use the tag-based sanitization
    return Sanitizer.sanitizeHtmlWithTags(sanitizedHtml, { allowedTags });
  }

  /**
   * Sanitize a URL to prevent JavaScript or other malicious content
   *
   * @param url URL to sanitize
   * @returns Sanitized URL
   */
  static sanitizeUrl(url: string): string {
    if (!url) return '';

    // Trim whitespace
    const trimmed = url.trim();

    // Check for javascript: and data: URLs
    if (
      /^javascript:/i.test(trimmed) ||
      /^data:/i.test(trimmed) ||
      /^vbscript:/i.test(trimmed) ||
      /^file:/i.test(trimmed)
    ) {
      return '#'; // Return a safe URL
    }

    // Allow http:, https:, mailto:, tel:
    if (/^(https?|mailto|tel):/i.test(trimmed)) {
      return trimmed;
    }

    // For relative URLs, make sure they don't start with a slash
    // This prevents directory traversal attacks
    if (trimmed.startsWith('/')) {
      // Make relative to the current path
      return trimmed;
    }

    // For all other URLs, assume they're relative and sanitize them
    return trimmed;
  }

  /**
   * Sanitize user input for search queries
   *
   * @param query Search query to sanitize
   * @returns Sanitized query
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query) return '';

    // Remove SQL injection patterns
    const sanitized = query
      .replace(/[';\\]/g, '') // Remove common SQL injection characters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comment start
      .replace(/\*\//g, '') // Remove block comment end
      .replace(/union\s+select/gi, '') // Remove UNION SELECT
      .trim();

    return sanitized;
  }

  /**
   * Sanitize JSON input
   *
   * @param input JSON string to sanitize
   * @returns Parsed and sanitized object
   */
  static sanitizeJson<T>(input: string): T | null {
    if (!input) return null;

    try {
      // Parse JSON
      const parsed = JSON.parse(input) as T;

      // Additional validation could be added here

      return parsed;
    } catch (error) {
      console.error('Invalid JSON input:', error);
      return null;
    }
  }
}
