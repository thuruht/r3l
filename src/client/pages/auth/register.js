// src/client/pages/auth/register.js
import registerHtml from './register.html?raw';
import { register } from '../../api/api.js';

export async function RegisterPage() {
  const element = document.createElement('div');
  element.innerHTML = registerHtml;

  const form = element.querySelector('#register-form');
  const errorBox = element.querySelector('#register-error');
  const submitBtn = element.querySelector('button[type="submit"]');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      errorBox.style.display = 'none';
      errorBox.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Registering...';

      const formData = new FormData(form);
      const username = formData.get('username');
      const password = formData.get('password');
      const displayName = formData.get('displayName');

      try {
        const result = await register(username, password, displayName);

        if (result.success) {
           window.location.href = '/login';
        } else {
           throw new Error(result.error || 'Registration failed');
        }
      } catch (error) {
        console.error('Registration error:', error);
        errorBox.textContent = error.message || 'An unexpected error occurred.';
        errorBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
      }
    });
  }

  return element;
}