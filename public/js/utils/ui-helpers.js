/**
 * Generates a short, random reference code for error logging.
 * @param {string} prefix - A prefix to identify the error context (e.g., 'FE-PROF').
 * @returns {string} A unique reference code like 'FE-PROF-A1B2'.
 */
export function generateRefCode(prefix = 'ERR') {
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${code}`;
}

/**
 * Displays a standard empty state message within a container element.
 * @param {HTMLElement} container - The DOM element to display the message in.
 * @param {string} message - The main message to display (e.g., 'No items found.').
 * @param {string} [refCode] - An optional reference code to display.
 */
export function displayEmptyState(container, message, refCode) {
  const emptyStateDiv = document.createElement('div');
  emptyStateDiv.className = 'empty-state-container';
  
  const p = document.createElement('p');
  p.textContent = message;
  emptyStateDiv.appendChild(p);
  
  if (refCode) {
    const small = document.createElement('small');
    small.textContent = `Ref: ${refCode}`;
    emptyStateDiv.appendChild(small);
  }
  
  container.innerHTML = '';
  container.appendChild(emptyStateDiv);
}

/**
 * Displays a standard error message within a container element.
 * @param {HTMLElement} container - The DOM element to display the message in.
 * @param {string} message - The main message to display.
 * @param {string} code - The unique error code for logging.
 */
export function displayError(container, message, code) {
  console.error(`Error ${code}: ${message}`);
  
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-error';
  
  const icon = document.createElement('span');
  icon.className = 'material-icons';
  icon.textContent = 'error_outline';
  
  const contentDiv = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = 'An Error Occurred';
  const p = document.createElement('p');
  p.textContent = message;
  const small = document.createElement('small');
  small.textContent = `Error code: ${code}`;
  
  contentDiv.appendChild(strong);
  contentDiv.appendChild(p);
  contentDiv.appendChild(small);
  
  alertDiv.appendChild(icon);
  alertDiv.appendChild(contentDiv);
  
  const targetContainer = typeof container === 'string' ? document.getElementById(container) : container;
  if (targetContainer) {
    targetContainer.innerHTML = '';
    targetContainer.appendChild(alertDiv);
  }
}
