/**
 * Generates a random salt and hashes the password using SHA-256.
 * In a high-security production env, consider PBKDF2 or Argon2 if available/performant.
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

// --- Encryption Helpers ---

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
  if (!/^[0-9a-fA-F]{24}$/.test(ivHex)) {
    throw new Error("Invalid IV");
  }
  const ivMatch = ivHex.match(/.{1,2}/g)!;
  const iv = new Uint8Array(ivMatch.map(byte => parseInt(byte, 16)));

  return await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encrypted
  );
}
