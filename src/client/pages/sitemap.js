import sitemapHtml from './sitemap.html?raw'; export async function SitemapPage() { const element = document.createElement('div'); element.innerHTML = sitemapHtml; return element; }
