import React, { useEffect } from 'react';
import { generateRSAKeyPair, exportPublicKey, exportPrivateKey, importPrivateKey } from '../utils/crypto';

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

export default KeyManager;
