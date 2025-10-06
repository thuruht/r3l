import aboutHtml from './about.html?raw';

/**
 * Fetches and prepares the About page content.
 * The '?raw' import is a Vite feature that lets us import HTML as a string.
 * @returns {Promise<HTMLElement>} A promise that resolves to the page's DOM element.
 */
export async function AboutPage() {
  const element = document.createElement('div');
  element.innerHTML = aboutHtml;
  return element;
}