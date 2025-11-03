import randomHtml from './random.html?raw'; export async function RandomPage() { const element = document.createElement('div'); element.innerHTML = randomHtml; return element; }
