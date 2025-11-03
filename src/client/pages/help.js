import helpHtml from './help.html?raw'; export async function HelpPage() { const element = document.createElement('div'); element.innerHTML = helpHtml; return element; }
