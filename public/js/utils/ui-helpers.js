/**
 * Generates a unique reference code for error logging.
 * @param {string} prefix - A prefix to identify the type of error.
 * @returns {string} A unique reference code.
 */
export function generateRefCode(prefix = 'ERR') {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${randomPart}`.toUpperCase();
}

/**
 * Displays a standardized empty state or error message in a given container.
 * @param {HTMLElement} container - The container element to display the message in.
 * @param {string} message - The user-friendly message to display.
 * @param {string} refCode - The unique reference code for this occurrence.
 */
export function displayEmptyState(container, message, refCode) {
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <p>${message}</p>
      <p class="text-muted" style="font-size: 0.8em;">Reference code: ${refCode}</p>
    </div>
  `;
  console.log(`${message} (Ref: ${refCode})`);
}
