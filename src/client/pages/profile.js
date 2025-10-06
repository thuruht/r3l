import profileHtml from './profile.html?raw'; export async function ProfilePage() { const element = document.createElement('div'); element.innerHTML = profileHtml; return element; }
