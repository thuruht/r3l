/**
 * Rel F Production Cryptography
 * Implements RSA-OAEP for key wrapping and AES-GCM for content encryption.
 */

const RSA_PARAMS = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

/**
 * Generates an RSA keypair for E2EE.
 */
export async function generateRelfKeypair() {
  const keys = await window.crypto.subtle.generateKey(RSA_PARAMS, true, ["encrypt", "decrypt"]);
  const pub = await window.crypto.subtle.exportKey("spki", keys.publicKey);
  const priv = await window.crypto.subtle.exportKey("pkcs8", keys.privateKey);

  return {
    publicKey: btoa(String.fromCharCode(...new Uint8Array(pub))),
    privateKey: btoa(String.fromCharCode(...new Uint8Array(priv))),
  };
}

/**
 * Derives a wrapping key from user password using PBKDF2.
 */
async function deriveWrapper(password: string, saltStr: string) {
  const encoder = new TextEncoder();
  const salt = new Uint8Array(atob(saltStr).split("").map(c => c.charCodeAt(0)));
  const baseKey = await window.crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

/**
 * Wraps and stores the private key in localStorage.
 */
export async function storeIdentity(privateKey: string, password: string, userId: number) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const saltStr = btoa(String.fromCharCode(...salt));
  const wrapper = await deriveWrapper(password, saltStr);

  const privDer = new Uint8Array(atob(privateKey).split("").map(c => c.charCodeAt(0)));
  const privKey = await window.crypto.subtle.importKey("pkcs8", privDer, RSA_PARAMS, true, ["decrypt"]);

  const wrapped = await window.crypto.subtle.wrapKey("pkcs8", privKey, wrapper, { name: "AES-GCM", iv });

  const payload = {
    wrapped: btoa(String.fromCharCode(...new Uint8Array(wrapped))),
    salt: saltStr,
    iv: btoa(String.fromCharCode(...new Uint8Array(iv)))
  };

  localStorage.setItem(`relf_identity_${userId}`, JSON.stringify(payload));
}

/**
 * Unwraps the private key using the password.
 */
export async function loadIdentity(password: string, userId: number): Promise<string | null> {
  const raw = localStorage.getItem(`relf_identity_${userId}`);
  if (!raw) return null;

  const { wrapped, salt, iv } = JSON.parse(raw);
  const wrapper = await deriveWrapper(password, salt);
  const wrappedBuf = new Uint8Array(atob(wrapped).split("").map(c => c.charCodeAt(0)));
  const ivBuf = new Uint8Array(atob(iv).split("").map(c => c.charCodeAt(0)));

  try {
    const privKey = await window.crypto.subtle.unwrapKey("pkcs8", wrappedBuf, wrapper, { name: "AES-GCM", iv: ivBuf }, RSA_PARAMS, true, ["decrypt"]);
    const exported = await window.crypto.subtle.exportKey("pkcs8", privKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  } catch (e) {
    return null;
  }
}
