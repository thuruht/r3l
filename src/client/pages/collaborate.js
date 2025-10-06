import collaborateHtml from './collaborate.html?raw'; export async function CollaboratePage() { const element = document.createElement('div'); element.innerHTML = collaborateHtml; return element; }
