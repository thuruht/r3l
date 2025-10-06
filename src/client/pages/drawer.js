import drawerHtml from './drawer.html?raw'; export async function DrawerPage() { const element = document.createElement('div'); element.innerHTML = drawerHtml; return element; }
