import React, { useEffect } from 'react';
import {
    generateRSAKeyPair,
    exportPublicKey,
    exportPrivateKey,
    importPrivateKey,
    encryptMessageForUser,
    decryptMessageWithKey
} from '../utils/crypto';

const KeyManager: React.FC = () => {
    useEffect(() => {
        const initKeys = async () => {
            const storedPrivate = localStorage.getItem('r3l_private_key');
            const storedPublic = localStorage.getItem('r3l_public_key');

            if (!storedPrivate || !storedPublic) {
                console.log("Generating new RSA Keypair...");
                try {
                    const keyPair = await generateRSAKeyPair();
                    const pubKeyBase64 = await exportPublicKey(keyPair.publicKey);
                    const privKeyBase64 = await exportPrivateKey(keyPair.privateKey);

                    localStorage.setItem('r3l_private_key', privKeyBase64);
                    localStorage.setItem('r3l_public_key', pubKeyBase64);

                    // Upload Public Key to Server
                    await fetch('/api/users/me/public-key', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ public_key: pubKeyBase64 })
                    });
                    console.log("Public Key uploaded.");

                } catch (e) {
                    console.error("Failed to generate/upload keys:", e);
                }
            } else {
                // Ensure server has it? (Optional optimization: check if server key matches)
                // For now, we assume if it's in LS, we probably sent it. 
                // Or we could aggressively send it every time to be safe (idempotent).
                // Let's not spam the server on every reload.
            }
        };

        // Only run if we are logged in? KeyManager is usually rendered inside Auth check in App.tsx
        // Assuming this component is only mounted when user is authenticated.
        initKeys();
    }, []);

    return null;
};

// --- Private Layer Utilities ---

/**
 * Encrypts arbitrary data for the current user's "Private Layer".
 * This ensures data is never sent as cleartext to the server.
 */
export const encryptPrivateLayer = async (data: any): Promise<string | null> => {
    const pubKey = localStorage.getItem('r3l_public_key');
    if (!pubKey) {
        console.warn("Public key not found for encryption");
        return null;
    }

    try {
        const json = JSON.stringify(data);
        // Encrypt for myself using my public key
        // Returns { encryptedContent: "ciphertext:iv", encryptedKey: "wrappedKey" }
        const { encryptedContent, encryptedKey } = await encryptMessageForUser(json, pubKey);
        // Return packed format "key:content" to store as a single blob
        return `${encryptedKey}:${encryptedContent}`;
    } catch (e) {
        console.error("Private Layer Encryption failed:", e);
        return null;
    }
};

/**
 * Decrypts "Private Layer" data.
 */
export const decryptPrivateLayer = async (packed: string): Promise<any | null> => {
    const privKeyBase64 = localStorage.getItem('r3l_private_key');
    if (!privKeyBase64) {
        console.warn("Private key not found for decryption");
        return null;
    }

    try {
        // Unpack "key:content"
        const firstColon = packed.indexOf(':');
        if (firstColon === -1) throw new Error("Invalid packed format");

        const encryptedKey = packed.substring(0, firstColon);
        const encryptedContent = packed.substring(firstColon + 1);

        const privKey = await importPrivateKey(privKeyBase64);
        const json = await decryptMessageWithKey(encryptedContent, encryptedKey, privKey);
        return JSON.parse(json);
    } catch (e) {
        console.error("Private Layer Decryption failed:", e);
        return null;
    }
};

export default KeyManager;
