import loginHtml from './login.html?raw'; export async function LoginPage() { const element = document.createElement('div'); element.innerHTML = loginHtml; return element; }
