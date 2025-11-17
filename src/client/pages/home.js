// src/client/pages/home.js
export async function HomePage() {
  const element = document.createElement('div');
  element.innerHTML = `
    <h2>Home</h2>
    <p>Welcome to R3L:F.</p>
  `;
  return element;
}