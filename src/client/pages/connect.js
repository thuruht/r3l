import connectHtml from './connect.html?raw'; export async function ConnectPage() { const element = document.createElement('div'); element.innerHTML = connectHtml; return element; }
