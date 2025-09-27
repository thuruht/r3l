/**
 * UI Helper Utilities for R3L:F
 * Consistent UI patterns and helper functions
 */

/**
 * Generate a reference code for error tracking
 * @param {string} prefix - Error prefix (e.g., 'FE-PROF-001')
 * @returns {string} Reference code
 */
export function generateRefCode(prefix) {
  const timestamp = Date.now().toString(36);
  return `${prefix}-${timestamp}`;
}

/**
 * Display an empty state message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Message to display
 * @param {string} refCode - Reference code
 */
export function displayEmptyState(container, message, refCode = '') {
  const emptyStateHtml = `
    <div class="empty-state">
      <span class="material-icons">inbox</span>
      <h3>Nothing Here Yet</h3>
      <p>${message}</p>
      ${refCode ? `<small>Ref: ${refCode}</small>` : ''}
    </div>
  `;
  container.innerHTML = emptyStateHtml;
}

/**
 * Display an error message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Error message
 * @param {string} refCode - Reference code
 */
export function displayError(container, message, refCode = '') {
  const errorHtml = `
    <div class="alert alert-error">
      <span class="material-icons">error_outline</span>
      <div>
        <strong>Something went wrong</strong>
        <p>${message}</p>
        ${refCode ? `<small>Ref: ${refCode}</small>` : ''}
      </div>
    </div>
  `;
  container.innerHTML = errorHtml;
}

/**
 * Display a success message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Success message
 */
export function displaySuccess(container, message) {
  const successHtml = `
    <div class="alert alert-success">
      <span class="material-icons">check_circle</span>
      <div>
        <strong>Success!</strong>
        <p>${message}</p>
      </div>
    </div>
  `;
  container.innerHTML = successHtml;
}

/**
 * Show loading state
 * @param {HTMLElement} element - Element to show loading on
 * @param {string} message - Loading message
 */
export function showLoading(element, message = 'Loading...') {
  element.classList.add('loading');
  element.innerHTML = `
    <div class="loading-state">
      <span class="material-icons">hourglass_top</span>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Hide loading state
 * @param {HTMLElement} element - Element to hide loading from
 */
export function hideLoading(element) {
  element.classList.remove('loading');
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format time remaining until expiry
 * @param {string|Date} expiryDate - Expiry date
 * @returns {string} Time remaining
 */
export function formatTimeRemaining(expiryDate) {
  if (!expiryDate) return 'Permanent';
  
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry - now;
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return '<1h';
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (fallbackErr) {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export function validatePassword(password) {
  const result = {
    isValid: false,
    score: 0,
    feedback: []
  };

  if (password.length < 8) {
    result.feedback.push('At least 8 characters required');
  } else {
    result.score += 1;
  }

  if (!/[a-z]/.test(password)) {
    result.feedback.push('Include lowercase letters');
  } else {
    result.score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    result.feedback.push('Include uppercase letters');
  } else {
    result.score += 1;
  }

  if (!/\d/.test(password)) {
    result.feedback.push('Include numbers');
  } else {
    result.score += 1;
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    result.feedback.push('Include special characters');
  } else {
    result.score += 1;
  }

  result.isValid = result.score >= 4;
  return result;
}

/**
 * Create a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds
 */
export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="material-icons">${getToastIcon(type)}</span>
    <span>${message}</span>
    <button class="toast-close" aria-label="Close">
      <span class="material-icons">close</span>
    </button>
  `;

  // Add to page
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  toastContainer.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.remove();
  }, duration);

  // Manual close
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });
}

function getToastIcon(type) {
  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };
  return icons[type] || icons.info;
}

/**
 * Handle API errors consistently
 * @param {Error} error - Error object
 * @param {HTMLElement} container - Container to display error in
 * @param {string} fallbackMessage - Fallback error message
 */
export function handleApiError(error, container, fallbackMessage = 'An error occurred') {
  console.error('API Error:', error);
  
  let message = fallbackMessage;
  let refCode = generateRefCode('API-ERR');
  
  if (error.message) {
    message = error.message;
  }
  
  if (error.status === 401) {
    message = 'You need to log in to access this feature';
    // Redirect to login after a delay
    setTimeout(() => {
      window.location.href = '/auth/login.html';
    }, 2000);
  } else if (error.status === 403) {
    message = 'You do not have permission to access this feature';
  } else if (error.status === 404) {
    message = 'The requested resource was not found';
  } else if (error.status >= 500) {
    message = 'Server error - please try again later';
  }
  
  displayError(container, message, refCode);
}

/**
 * Initialize responsive image loading
 */
export function initResponsiveImages() {
  const images = document.querySelectorAll('img[data-src]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  } else {
    // Fallback for older browsers
    images.forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove('lazy');
    });
  }
}

/**
 * Initialize accessibility enhancements
 */
export function initAccessibility() {
  // Add skip link
  const skipLink = document.createElement('a');
  skipLink.href = '#main';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Add main landmark if missing
  if (!document.querySelector('main')) {
    const main = document.createElement('main');
    main.id = 'main';
    const container = document.querySelector('.container');
    if (container) {
      container.parentNode.insertBefore(main, container);
      main.appendChild(container);
    }
  }
  
  // Enhance form labels
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) {
        input.setAttribute('aria-labelledby', label.id || `label-${input.id}`);
        if (!label.id) {
          label.id = `label-${input.id}`;
        }
      }
    }
  });
}