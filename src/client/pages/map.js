import mapHtml from './map.html?raw'; export async function MapPage() { const element = document.createElement('div'); element.innerHTML = mapHtml; return element; }
