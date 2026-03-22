// src/utils/security.ts

/**
 * Very basic server-side HTML sanitization.
 */
export function basicSanitize(html: string): string {
  if (!html) return '';
  const ALLOWED_TAGS = ['p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'del', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'hr', 'span', 'div'];
  
  return html.replace(/<(\/?)([a-z0-9]+)([^>]*)>/gi, (match, slash, tag, attrs) => {
    if (ALLOWED_TAGS.includes(tag.toLowerCase())) {
      const safeAttrs = attrs.replace(/ ([a-z]+)=(['"])(.*?)\2/gi, (attrMatch: string, name: string, quote: string, value: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.startsWith('on')) return ''; // strip all event handlers
        if (['href', 'src', 'alt', 'title', 'class'].includes(lowerName)) {
          if (['href', 'src'].includes(lowerName) && /^(javascript:|data:)/i.test(value.trim())) return '';
          return attrMatch;
        }
        return '';
      });
      return `<${slash}${tag}${safeAttrs}>`;
    }
    return '';
  });
}

/**
 * Generates a random salt and hashes the password using SHA-256.
 */
export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const mySalt = salt || crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(password + mySalt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
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
