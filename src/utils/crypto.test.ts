import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hashPassword, encryptData, decryptData } from './crypto.ts';

describe('Crypto Utilities', () => {
  describe('hashPassword', () => {
    test('should generate consistent hashes for the same password and salt', async () => {
      const password = 'mySecretPassword';
      const salt = 'randomSalt123';

      const res1 = await hashPassword(password, salt);
      const res2 = await hashPassword(password, salt);

      assert.strictEqual(res1.hash, res2.hash);
      assert.strictEqual(res1.salt, salt);
    });

    test('should generate different hashes for different passwords with the same salt', async () => {
      const salt = 'randomSalt123';
      const res1 = await hashPassword('password1', salt);
      const res2 = await hashPassword('password2', salt);

      assert.notStrictEqual(res1.hash, res2.hash);
    });

    test('should generate a random salt if none is provided', async () => {
      const res1 = await hashPassword('password');
      const res2 = await hashPassword('password');

      assert.notStrictEqual(res1.salt, res2.salt);
      assert.notStrictEqual(res1.hash, res2.hash);
    });
  });

  describe('Encryption/Decryption Round-trip', () => {
    const secret = 'super-secret-key';

    test('should encrypt and decrypt a string successfully', async () => {
      const originalText = 'Hello, this is a secret message!';

      const { encrypted, iv } = await encryptData(originalText, secret);
      const decryptedBuffer = await decryptData(encrypted, iv, secret);
      const decryptedText = new TextDecoder().decode(decryptedBuffer);

      assert.strictEqual(decryptedText, originalText);
    });

    test('should encrypt and decrypt an ArrayBuffer successfully', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]).buffer;

      const { encrypted, iv } = await encryptData(data, secret);
      const decryptedBuffer = await decryptData(encrypted, iv, secret);

      assert.deepStrictEqual(new Uint8Array(decryptedBuffer), new Uint8Array(data));
    });

    test('should produce different ciphertexts for the same input (due to random IV)', async () => {
      const text = 'Same message';

      const res1 = await encryptData(text, secret);
      const res2 = await encryptData(text, secret);

      assert.notStrictEqual(res1.iv, res2.iv);

      const view1 = new Uint8Array(res1.encrypted);
      const view2 = new Uint8Array(res2.encrypted);

      assert.notDeepStrictEqual(view1, view2);
    });

    test('should fail to decrypt with an incorrect secret', async () => {
      const text = 'Secure message';
      const { encrypted, iv } = await encryptData(text, secret);

      await assert.rejects(
        () => decryptData(encrypted, iv, 'wrong-secret'),
        { name: 'OperationError' } // Web Crypto throws OperationError on failed decryption
      );
    });

    test('should fail to decrypt with an invalid IV', async () => {
      const text = 'Secure message';
      const { encrypted } = await encryptData(text, secret);

      await assert.rejects(
        () => decryptData(encrypted, 'invalidiv', secret),
        /Invalid IV/
      );
    });
  });
});
