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
  const codeHtml = refCode ? `<small>Ref: ${refCode}</small>` : '';
  container.innerHTML = `
    <div class="empty-state-container">
      <p>${message}</p>
      ${codeHtml}
    </div>
  `;
}

/**
 * Displays a standard error message within a container element.
 * @param {HTMLElement} container - The DOM element to display the message in.
 * @param {string} message - The main message to display.
 * @param {string} code - The unique error code for logging.
 */
export function displayError(container, message, code) {
  console.error(`Error ${code}: ${message}`);
  const errorHtml = `
    <div class="alert alert-error">
      <span class="material-icons">error_outline</span>
      <div>
        <strong>An Error Occurred</strong>
        <p>${message}</p>
        <small>Error code: ${code}</small>
      </div>
    </div>
  `;
  if (typeof container === 'string') {
    const el = document.getElementById(container);
    if (el) el.innerHTML = errorHtml;
  } else {
    container.innerHTML = errorHtml;
  }
}
