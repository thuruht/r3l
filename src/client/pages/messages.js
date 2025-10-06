import messagesHtml from './messages.html?raw'; export async function MessagesPage() { const element = document.createElement('div'); element.innerHTML = messagesHtml; return element; }
