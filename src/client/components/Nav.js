import { getAuthState } from '../pages/auth/login.js';

const guestLinks = [
  { path: '/', name: 'Home' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
];

const userLinks = [
  { path: '/', name: 'Home' },
  { path: '/profile', name: 'Profile' },
  { path: '/logout', name: 'Logout' },
];

export const render = () => {
  const { isAuthenticated } = getAuthState();
  const links = isAuthenticated ? userLinks : guestLinks;

  const header = document.getElementById('main-header');
  header.innerHTML = `
    <nav>
      <ul>
        ${links.map(link => `<li><a href="${link.path}" data-navigo>${link.name}</a></li>`).join('')}
      </ul>
    </nav>
  `;
};