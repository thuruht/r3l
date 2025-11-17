import Navigo from 'navigo';
import { render as renderNav } from './components/Nav.js';
import { HomePage } from './pages/home.js';
import { LoginPage } from './pages/auth/login.js';
import { RegisterPage } from './pages/auth/register.js';
import { ProfilePage } from './pages/profile.js';
import api from './api/api.js';

const router = new Navigo('/');
const appRoot = document.getElementById('app-root');

const renderPage = async (pageComponent) => {
  appRoot.innerHTML = '<p>Loading...</p>';
  const element = await pageComponent();
  appRoot.innerHTML = '';
  appRoot.appendChild(element);
};

router
  .on({
    '/': () => renderPage(HomePage),
    '/login': () => renderPage(LoginPage),
    '/register': () => renderPage(RegisterPage),
    '/profile': () => renderPage(ProfilePage),
    '/logout': () => {
      api.post('/api/logout').then(() => {
        window.location.href = '/';
      });
    },
  })
  .resolve();

// Initial nav render
renderNav();

export default router;