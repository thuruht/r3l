import archiveHtml from './archive.html?raw'; export async function ArchivePage() { const element = document.createElement('div'); element.innerHTML = archiveHtml; return element; }
