// src/client/pages/auth/login.js
import loginHtml from './login.html?raw';
import { login } from '../../api/api.js'; // Import the login helper we saw in api.js

export async function LoginPage() {
  const element = document.createElement('div');
  element.innerHTML = loginHtml;

  // 1. Select elements
  const form = element.querySelector('#login-form');
  const errorBox = element.querySelector('#login-error');
  const submitBtn = element.querySelector('button[type="submit"]');

  // 2. Attach Event Listener
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // Stop page reload

      // Reset UI state
      errorBox.style.display = 'none';
      errorBox.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';

      // Get form data
      const formData = new FormData(form);
      const username = formData.get('username');
      const password = formData.get('password');

      try {
        // 3. Call API
        const result = await login(username, password);

        if (result.success) {
           // 4. Redirect on success
           // We use a hard redirect here to ensure the specific Nav state (Login vs Logout) updates correctly
           window.location.href = '/profile';
        } else {
           throw new Error(result.error || 'Login failed');
        }
      } catch (error) {
        // 5. Handle Errors
        console.error('Login error:', error);
        errorBox.textContent = error.message || 'Invalid username or password.';
        errorBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In';
      }
    });
  }

  return element;
}