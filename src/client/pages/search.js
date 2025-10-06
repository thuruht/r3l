import searchHtml from './search.html?raw'; export async function SearchPage() { const element = document.createElement('div'); element.innerHTML = searchHtml; return element; }
