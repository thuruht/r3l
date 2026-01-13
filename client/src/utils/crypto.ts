// client/src/utils/crypto.ts

export async function generateKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importKey(base64Key: string): Promise<CryptoKey> {
  const rawKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  return window.crypto.subtle.importKey(
    "raw",
    rawKey,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFile(file: File, key: CryptoKey): Promise<{ encryptedBlob: Blob, iv: Uint8Array }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const arrayBuffer = await file.arrayBuffer();

  const encryptedBuffer = await window.crypto.subtle.encrypt(
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
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    arrayBuffer
  );

  return new Blob([decryptedBuffer], { type: encryptedBlob.type });
}

// --- E2EE Identity Helpers ---

/**
 * Generates an RSA-OAEP key pair for identity.
 * - Public Key: Stored on server (visible to others).
 * - Private Key: Encrypted with user password, stored on server.
 */
export async function generateIdentityKeys(): Promise<{ publicKey: CryptoKey, privateKey: CryptoKey }> {
    return window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * Derives a key from the user's password for wrapping the private key.
 */
async function deriveWrappingKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["wrapKey", "unwrapKey", "encrypt", "decrypt"]
    );
}

export async function wrapPrivateKey(privateKey: CryptoKey, password: string): Promise<{ wrappedKey: string, salt: string, iv: string }> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const wrappingKey = await deriveWrappingKey(password, salt);

    const wrappedBuffer = await window.crypto.subtle.wrapKey(
        "jwk",
        privateKey,
        wrappingKey,
        { name: "AES-GCM", iv: iv }
    );

    return {
        wrappedKey: btoa(String.fromCharCode(...new Uint8Array(wrappedBuffer))),
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv))
    };
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}
