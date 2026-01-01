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

// --- RSA (Asymmetric) Logic for Key Sharing ---

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
    return window.crypto.subtle.generateKey(
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
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("pkcs8", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
    const binaryDer = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    return window.crypto.subtle.importKey(
        "spki",
        binaryDer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt", "wrapKey"]
    );
}

export async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
    const binaryDer = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    return window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt", "unwrapKey"]
    );
}

export async function wrapKey(symmetricKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
    const wrapped = await window.crypto.subtle.wrapKey(
        "raw",
        symmetricKey,
        publicKey,
        { name: "RSA-OAEP" }
    );
    return btoa(String.fromCharCode(...new Uint8Array(wrapped)));
}

export async function unwrapKey(wrappedKeyBase64: string, privateKey: CryptoKey): Promise<CryptoKey> {
    const wrappedKey = Uint8Array.from(atob(wrappedKeyBase64), c => c.charCodeAt(0));
    return window.crypto.subtle.unwrapKey(
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
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
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

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
