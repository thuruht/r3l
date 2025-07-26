import { Sanitizer } from '../utils/sanitizer';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class Validator {
  /**
   * Validate content creation data
   * 
   * @param data Content creation data
   * @returns Validation result
   */
  static validateContentCreation(data: any): ValidationResult {
    const errors: string[] = [];
    
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title is required');
    }
    
    if (data.title && data.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }
    
    if (!data.type || !['text', 'image', 'video', 'audio', 'document'].includes(data.type)) {
      errors.push('Invalid content type');
    }
    
    if (data.location) {
      if (!data.location.lat || !data.location.lng) {
        errors.push('Location must include both latitude and longitude');
      } else if (!Sanitizer.validateCoordinates(data.location.lat, data.location.lng)) {
        errors.push('Invalid coordinates');
      }
    }
    
    if (data.visibility && !['public', 'private', 'connections'].includes(data.visibility)) {
      errors.push('Invalid visibility setting');
    }
    
    if (data.expiresIn !== undefined && (isNaN(data.expiresIn) || data.expiresIn < 0)) {
      errors.push('Expiration time must be a positive number or 0 for no expiration');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  /**
   * Validate user registration data
   * 
   * @param data User registration data
   * @returns Validation result
   */
  static validateUserRegistration(data: any): ValidationResult {
    const errors: string[] = [];
    
    if (!data.username || !/^[a-zA-Z0-9_]{3,30}$/.test(data.username)) {
      errors.push('Username must be 3-30 characters and contain only letters, numbers, and underscores');
    }
    
    if (!data.password || data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!data.displayName || data.displayName.trim().length === 0) {
      errors.push('Display name is required');
    }
    
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  /**
   * Validate message creation data
   * 
   * @param data Message creation data
   * @returns Validation result
   */
  static validateMessage(data: any): ValidationResult {
    const errors: string[] = [];
    
    if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
      errors.push('Message content is required');
    }
    
    if (data.content && data.content.length > 5000) {
      errors.push('Message content must be less than 5000 characters');
    }
    
    if (!data.recipientId || typeof data.recipientId !== 'string') {
      errors.push('Recipient ID is required');
    }
    
    if (data.attachments && !Array.isArray(data.attachments)) {
      errors.push('Attachments must be an array');
    }
    
    if (data.attachments && data.attachments.length > 5) {
      errors.push('Maximum 5 attachments allowed per message');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  /**
   * Validate search parameters
   * 
   * @param data Search parameters
   * @returns Validation result
   */
  static validateSearch(data: any): ValidationResult {
    const errors: string[] = [];
    
    if (data.query && typeof data.query !== 'string') {
      errors.push('Query must be a string');
    }
    
    if (data.type && !['content', 'user', 'tag', 'location'].includes(data.type)) {
      errors.push('Invalid search type');
    }
    
    if (data.limit && (isNaN(data.limit) || data.limit < 1 || data.limit > 100)) {
      errors.push('Limit must be between 1 and 100');
    }
    
    if (data.offset && (isNaN(data.offset) || data.offset < 0)) {
      errors.push('Offset must be a non-negative number');
    }
    
    if (data.randomness && (isNaN(data.randomness) || data.randomness < 0 || data.randomness > 100)) {
      errors.push('Randomness must be between 0 and 100');
    }
    
    if (data.location) {
      if (!data.location.lat || !data.location.lng) {
        errors.push('Location must include both latitude and longitude');
      } else if (!Sanitizer.validateCoordinates(data.location.lat, data.location.lng)) {
        errors.push('Invalid coordinates');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  /**
   * Validate profile update data
   * 
   * @param data Profile update data
   * @returns Validation result
   */
  static validateProfileUpdate(data: any): ValidationResult {
    const errors: string[] = [];
    
    if (data.displayName && (typeof data.displayName !== 'string' || data.displayName.trim().length === 0)) {
      errors.push('Display name cannot be empty');
    }
    
    if (data.bio && typeof data.bio !== 'string') {
      errors.push('Bio must be a string');
    }
    
    if (data.bio && data.bio.length > 500) {
      errors.push('Bio must be less than 500 characters');
    }
    
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }
    
    if (data.password && data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (data.settings && typeof data.settings !== 'object') {
      errors.push('Settings must be an object');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  /**
   * Validate file upload data
   * 
   * @param file File to validate
   * @param maxSize Maximum size in bytes
   * @param allowedTypes Array of allowed MIME types
   * @returns Validation result
   */
  static validateFileUpload(
    file: { name: string; type: string; size: number },
    maxSize: number = 10 * 1024 * 1024, // 10MB default
    allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif']
  ): ValidationResult {
    const errors: string[] = [];
    
    if (!file) {
      errors.push('File is required');
      return { valid: false, errors };
    }
    
    if (file.size > maxSize) {
      errors.push(`File size exceeds the maximum limit of ${maxSize / (1024 * 1024)}MB`);
    }
    
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
