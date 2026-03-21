/**
 * Rel F Client-Side Cryptography
 * RSA-OAEP 2048-bit for key wrapping, AES-GCM 256-bit for content encryption.
 */

const RSA_PARAMS = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

const AES_PARAMS = { name: 'AES-GCM', length: 256 };

// --- Helpers ---

export function b64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
}

export function bytesToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

// --- Key Generation ---

export async function generateRelfKeypair() {
  const keys = await window.crypto.subtle.generateKey(RSA_PARAMS, true, ['encrypt', 'decrypt']);
  const pub = await window.crypto.subtle.exportKey('spki', keys.publicKey);
  const priv = await window.crypto.subtle.exportKey('pkcs8', keys.privateKey);
  return {
    publicKey: bytesToB64(pub),
    privateKey: bytesToB64(priv),
  };
}

// --- Key Import ---

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  return window.crypto.subtle.importKey('spki', b64ToBytes(b64), RSA_PARAMS, false, ['encrypt']);
}

export async function importPrivateKey(b64: string): Promise<CryptoKey> {
  return window.crypto.subtle.importKey('pkcs8', b64ToBytes(b64), RSA_PARAMS, false, ['decrypt']);
}

// --- Message Encryption (E2EE) ---

/**
 * Encrypts a message for a recipient using their public key.
 * Generates a one-time AES key, encrypts the content with it,
 * then wraps the AES key with the recipient's RSA public key.
 */
export async function encryptMessageForUser(
  plaintext: string,
  recipientPublicKeyB64: string
): Promise<{ encryptedContent: string; encryptedKey: string }> {
  const recipientKey = await importPublicKey(recipientPublicKeyB64);

  // Generate ephemeral AES key
  const aesKey = await window.crypto.subtle.generateKey(AES_PARAMS, true, ['encrypt', 'decrypt']);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt content
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);

  // Export and wrap AES key with recipient's RSA public key
  const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
  const wrappedKey = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipientKey, rawAesKey);

  // Pack iv + ciphertext together: first 12 bytes = iv
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), 12);

  return {
    encryptedContent: bytesToB64(combined.buffer),
    encryptedKey: bytesToB64(wrappedKey),
  };
}

/**
 * Decrypts a message using the recipient's private key.
 */
export async function decryptMessageWithKey(
  encryptedContentB64: string,
  encryptedKeyB64: string,
  privateKey: CryptoKey
): Promise<string> {
  // Unwrap AES key
  const wrappedKey = b64ToBytes(encryptedKeyB64);
  const rawAesKey = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, wrappedKey);
  const aesKey = await window.crypto.subtle.importKey('raw', rawAesKey, AES_PARAMS, false, ['decrypt']);

  // Unpack iv + ciphertext
  const combined = b64ToBytes(encryptedContentB64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plaintext = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext);
  return new TextDecoder().decode(plaintext);
}

// --- Identity Storage (private key wrapped with password) ---

async function deriveWrapper(password: string, saltStr: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const salt = b64ToBytes(saltStr);
  const baseKey = await window.crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    AES_PARAMS,
    false,
    ['wrapKey', 'unwrapKey']
  );
}

// --- File Encryption (Client-Side, for UploadModal) ---

export async function generateKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(AES_PARAMS, true, ['encrypt', 'decrypt']);
}

export async function encryptFile(file: File, key: CryptoKey): Promise<{ encryptedBlob: Blob; iv: Uint8Array }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const buffer = await file.arrayBuffer();
  const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer);
  return { encryptedBlob: new Blob([encrypted], { type: 'application/octet-stream' }), iv };
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await window.crypto.subtle.exportKey('raw', key);
  return bytesToB64(raw);
}

export async function storeIdentity(privateKey: string, password: string, userId: number) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const saltStr = bytesToB64(salt.buffer);
  const wrapper = await deriveWrapper(password, saltStr);

  const privKey = await importPrivateKey(privateKey);
  const wrapped = await window.crypto.subtle.wrapKey('pkcs8', privKey, wrapper, { name: 'AES-GCM', iv });

  localStorage.setItem(`relf_identity_${userId}`, JSON.stringify({
    wrapped: bytesToB64(wrapped),
    salt: saltStr,
    iv: bytesToB64(iv.buffer),
  }));
}

export async function loadIdentity(password: string, userId: number): Promise<string | null> {
  const raw = localStorage.getItem(`relf_identity_${userId}`);
  if (!raw) return null;

  const { wrapped, salt, iv } = JSON.parse(raw);
  const wrapper = await deriveWrapper(password, salt);
  const ivBuf = b64ToBytes(iv);
  const wrappedBuf = b64ToBytes(wrapped);

  try {
    const privKey = await window.crypto.subtle.unwrapKey(
      'pkcs8', wrappedBuf, wrapper, { name: 'AES-GCM', iv: ivBuf }, RSA_PARAMS, true, ['decrypt']
    );
    const exported = await window.crypto.subtle.exportKey('pkcs8', privKey);
    return bytesToB64(exported);
  } catch {
    return null;
  }
}
