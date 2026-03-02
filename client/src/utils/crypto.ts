// client/src/utils/crypto.ts

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importKey(base64Key: string): Promise<CryptoKey> {
  const rawKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFile(file: File, key: CryptoKey): Promise<{ encryptedBlob: Blob, iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const arrayBuffer = await file.arrayBuffer();

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    arrayBuffer
  );

  return {
    encryptedBlob: new Blob([encryptedBuffer], { type: file.type }),
    iv
  };
}

export async function decryptFile(encryptedBlob: Blob, iv: Uint8Array, key: CryptoKey): Promise<Blob> {
  const arrayBuffer = await encryptedBlob.arrayBuffer();
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    arrayBuffer
  );

  return new Blob([decryptedBuffer], { type: encryptedBlob.type });
}

// --- RSA (Asymmetric) Logic for Key Sharing ---

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256"
        },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey("spki", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey("pkcs8", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
    const binaryDer = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    return crypto.subtle.importKey(
        "spki",
        binaryDer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt", "wrapKey"]
    );
}

export async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
    const binaryDer = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    return crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt", "unwrapKey"]
    );
}

export async function wrapKey(symmetricKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
    const wrapped = await crypto.subtle.wrapKey(
        "raw",
        symmetricKey,
        publicKey,
        { name: "RSA-OAEP" }
    );
    return btoa(String.fromCharCode(...new Uint8Array(wrapped)));
}

export async function unwrapKey(wrappedKeyBase64: string, privateKey: CryptoKey): Promise<CryptoKey> {
    const wrappedKey = Uint8Array.from(atob(wrappedKeyBase64), c => c.charCodeAt(0));
    return crypto.subtle.unwrapKey(
        "raw",
        wrappedKey,
        privateKey,
        { name: "RSA-OAEP" },
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}


// --- Text Encryption (for messages) ---

export async function encryptText(text: string, key: CryptoKey): Promise<{ encrypted: string, iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iv: btoa(String.fromCharCode(...new Uint8Array(iv)))
  };
}

export async function decryptText(encryptedBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
  const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}


export async function encryptMessageForUser(message: string, recipientPublicKey: string): Promise<{ encryptedContent: string; encryptedKey: string }> {
  const messageKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, messageKey, new TextEncoder().encode(message));
  
  const publicKey = await crypto.subtle.importKey('spki', base64ToArrayBuffer(recipientPublicKey), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['wrapKey']);
  const wrappedKey = await crypto.subtle.wrapKey('raw', messageKey, publicKey, { name: 'RSA-OAEP' });
  
  return {
    encryptedContent: arrayBufferToBase64(encrypted) + ':' + arrayBufferToBase64(iv.buffer),
    encryptedKey: arrayBufferToBase64(wrappedKey)
  };
}

export async function decryptMessageWithKey(encryptedContent: string, encryptedKey: string, privateKey: CryptoKey): Promise<string> {
  const [content, ivStr] = encryptedContent.split(':');
  const iv = new Uint8Array(base64ToArrayBuffer(ivStr));
  
  const unwrappedKey = await crypto.subtle.unwrapKey('raw', base64ToArrayBuffer(encryptedKey), privateKey, { name: 'RSA-OAEP' }, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, unwrappedKey, base64ToArrayBuffer(content));
  
  return new TextDecoder().decode(decrypted);
}

// --- Helpers ---

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
