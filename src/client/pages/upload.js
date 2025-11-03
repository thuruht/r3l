import uploadHtml from './upload.html?raw'; export async function UploadPage() { const element = document.createElement('div'); element.innerHTML = uploadHtml; return element; }
