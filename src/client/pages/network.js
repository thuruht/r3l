import networkHtml from './network.html?raw'; export async function NetworkPage() { const element = document.createElement('div'); element.innerHTML = networkHtml; return element; }
