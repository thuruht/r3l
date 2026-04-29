/**
 * Sanitizes HTML to prevent XSS. Strips all tags except a safe allowlist.
 * Used for rendering user-provided content like Communique bodies.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'del',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'a', 'img', 'hr', 'span', 'div', 'section',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  '*': new Set(['class', 'id', 'style']),
};

const SAFE_URL = /^(https?:|mailto:|\/|#)/i;
const URL_ATTRS = new Set(['href', 'src']);

/**
 * Sanitizes user-provided CSS to prevent XSS via expression(), javascript: urls,
 * data: urls, and other dangerous constructs.
 */
export const sanitizeCSS = (css: string): string => {
  if (!css) return '';
  return css
    .replace(/expression\s*\(/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/@import\b/gi, '')
    .replace(/behavior\s*:/gi, '')
    .replace(/-moz-binding\s*:/gi, '')
    .replace(/url\s*\(\s*["']?\s*(?:javascript|data|vbscript):/gi, 'url(');
};

export const sanitizeHTML = (html: string): string => {
  if (!html) return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const clean = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return node.cloneNode();

    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap: keep children, drop the tag itself
      const frag = document.createDocumentFragment();
      el.childNodes.forEach(child => {
        const cleaned = clean(child);
        if (cleaned) frag.appendChild(cleaned);
      });
      return frag;
    }

    const newEl = document.createElement(tag);
    const allowed = new Set([...(ALLOWED_ATTRS[tag] ?? []), ...(ALLOWED_ATTRS['*'] ?? [])]);

    for (const attr of Array.from(el.attributes)) {
      if (!allowed.has(attr.name)) continue;
      // Block javascript: and data: URLs
      if (URL_ATTRS.has(attr.name) && !SAFE_URL.test(attr.value.trim())) continue;
      // Force external links to be safe
      if (attr.name === 'href' && /^https?:/i.test(attr.value)) {
        newEl.setAttribute('rel', 'noopener noreferrer');
        newEl.setAttribute('target', '_blank');
      }
      newEl.setAttribute(attr.name, attr.value);
    }

    el.childNodes.forEach(child => {
      const cleaned = clean(child);
      if (cleaned) newEl.appendChild(cleaned);
    });

    return newEl;
  };

  const frag = document.createDocumentFragment();
  doc.body.childNodes.forEach(child => {
    const cleaned = clean(child);
    if (cleaned) frag.appendChild(cleaned);
  });

  const wrapper = document.createElement('div');
  wrapper.appendChild(frag);
  return wrapper.innerHTML;
};
