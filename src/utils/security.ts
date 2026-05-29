// src/utils/security.ts

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'del',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'a', 'img', 'hr', 'span', 'div', 'section',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  '*': new Set(['class']),
};

const SAFE_URL_RE = /^(https?:|mailto:|\/|#)/i;
const URL_ATTRS = new Set(['href', 'src']);

/**
 * Server-side HTML sanitization using Workers HTMLRewriter.
 * Uses a streaming DOM-tree approach — not regex — so it's safe against
 * nested tags, encoding tricks, and SVG/MathML injection vectors.
 */
export async function sanitizeHTML(html: string): Promise<string> {
  if (!html) return '';

  const rewriter = new HTMLRewriter()
    .on('*', {
      element(el) {
        const tag = el.tagName.toLowerCase();

        if (!ALLOWED_TAGS.has(tag)) {
          // Remove the element entirely (its text children will still flow through)
          el.removeAndKeepContent();
          return;
        }

        // Scrub attributes
        const tagAllowed = ALLOWED_ATTRS[tag];
        const globalAllowed = ALLOWED_ATTRS['*'];

        for (const attr of el.attributes) {
          const name = attr[0].toLowerCase();
          const value = attr[1];

          const isAllowed =
            (tagAllowed && tagAllowed.has(name)) ||
            (globalAllowed && globalAllowed.has(name));

          if (!isAllowed || name.startsWith('on')) {
            el.removeAttribute(attr[0]);
            continue;
          }

          // Block javascript: / data: / vbscript: in URL attributes
          if (URL_ATTRS.has(name) && !SAFE_URL_RE.test(value.trim())) {
            el.removeAttribute(attr[0]);
            continue;
          }

          // Force safe link behavior for external URLs
          if (name === 'href' && /^https?:/i.test(value)) {
            el.setAttribute('rel', 'noopener noreferrer');
            el.setAttribute('target', '_blank');
          }
        }
      },
    });

  // HTMLRewriter operates on Response objects
  const input = new Response(html, { headers: { 'Content-Type': 'text/html' } });
  const output = rewriter.transform(input);
  return await output.text();
}

/**
 * Escapes HTML entities for contexts where HTML is never appropriate.
 * Use this for user-supplied text in notification payloads, etc.
 */
export function escapeHTML(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Generates a random salt and hashes the password using SHA-256.
 */
export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const mySalt = salt || crypto.randomUUID();
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const saltBuffer = encoder.encode(mySalt);
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    256
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash: hashHex, salt: mySalt };
}

export async function getEncryptionKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(data: ArrayBuffer | string, secret: string): Promise<{ encrypted: ArrayBuffer, iv: string }> {
  const key = await getEncryptionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedData
  );
  
  return { 
    encrypted, 
    iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('') 
  };
}

export async function decryptData(encrypted: ArrayBuffer, ivHex: string, secret: string): Promise<ArrayBuffer> {
  const key = await getEncryptionKey(secret);
  const ivMatch = ivHex.match(/.{1,2}/g);
  if (!ivMatch) throw new Error("Invalid IV");
  const iv = new Uint8Array(ivMatch.map(byte => parseInt(byte, 16)));
  
  return await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encrypted
  );
}
