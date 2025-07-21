/**
 * Test Auth Helper
 * 
 * This script provides functions to test auth state and cookies.
 * It can be used for debugging authentication issues.
 */

// Function to get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Display cookie debug info
function showAuthInfo() {
  const container = document.createElement('div');
  container.className = 'auth-debug';
  container.style.position = 'fixed';
  container.style.bottom = '10px';
  container.style.right = '10px';
  container.style.padding = '10px';
  container.style.background = 'rgba(0,0,0,0.8)';
  container.style.color = '#fff';
  container.style.borderRadius = '5px';
  container.style.zIndex = '9999';
  container.style.maxWidth = '300px';
  
  const authState = getCookie('r3l_auth_state');
  const sessionCookie = getCookie('r3l_session');
  
  container.innerHTML = `
    <h3>Auth Debug</h3>
    <p>Auth State: ${authState ? 'true' : 'null'}</p>
    <p>Session: ${sessionCookie ? 'present' : 'null'}</p>
    <p>All Cookies: ${document.cookie || 'none'}</p>
    <button id="test-set-cookie">Set Test Cookie</button>
    <button id="test-clear-cookie">Clear Cookies</button>
  `;
  
  document.body.appendChild(container);
  
  document.getElementById('test-set-cookie').addEventListener('click', async () => {
    try {
      const response = await fetch('/api/auth/test-cookies', {
        credentials: 'include'
      });
      const data = await response.json();
      alert(`Set cookie result: ${JSON.stringify(data)}`);
      location.reload();
    } catch (error) {
      alert(`Error setting cookie: ${error.message}`);
    }
  });
  
  document.getElementById('test-clear-cookie').addEventListener('click', () => {
    document.cookie = 'r3l_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'r3l_auth_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    alert('Cookies cleared');
    location.reload();
  });
}

// Add auth test to window for easy access
window.showAuthInfo = showAuthInfo;

// Auto-run if ?debug-auth is in URL
if (window.location.search.includes('debug-auth')) {
  document.addEventListener('DOMContentLoaded', showAuthInfo);
}

// Export functions
export { getCookie, showAuthInfo };
