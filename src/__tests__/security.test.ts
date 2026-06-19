import { describe, it, expect } from 'vitest';
import { escapeHTML, hashPassword, encryptData, decryptData } from '../utils/security';

describe('escapeHTML', () => {
  it('escapes & < > " \'', () => {
    expect(escapeHTML('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('passes through safe text', () => {
    expect(escapeHTML('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(escapeHTML('')).toBe('');
  });

  it('escapes ampersands first', () => {
    expect(escapeHTML('a&b')).toBe('a&amp;b');
  });
});

describe('hashPassword', () => {
  it('produces a hash and salt', async () => {
    const result = await hashPassword('mypassword');
    expect(result.hash).toBeTruthy();
    expect(result.salt).toBeTruthy();
    expect(result.hash.length).toBe(64); // SHA-256 hex
  });

  it('produces different hashes for different salts', async () => {
    const r1 = await hashPassword('password', 'salt1');
    const r2 = await hashPassword('password', 'salt2');
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('produces the same hash with the same salt', async () => {
    const r1 = await hashPassword('password', 'fixedsalt');
    const r2 = await hashPassword('password', 'fixedsalt');
    expect(r1.hash).toBe(r2.hash);
  });

  it('generates a valid UUID salt when not provided', async () => {
    const result = await hashPassword('test');
    expect(result.salt).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('encryptData / decryptData', () => {
  const secret = 'test-secret-key-1234567890';

  it('encrypts and decrypts a string', async () => {
    const original = 'Hello, World!';
    const { encrypted, iv } = await encryptData(original, secret);
    const decrypted = await decryptData(encrypted, iv, secret);
    const decoder = new TextDecoder();
    expect(decoder.decode(decrypted)).toBe(original);
  });

  it('encrypts and decrypts binary data', async () => {
    const original = new Uint8Array([0, 1, 2, 255, 254, 253]);
    const { encrypted, iv } = await encryptData(original.buffer, secret);
    const decrypted = await decryptData(encrypted, iv, secret);
    const result = new Uint8Array(decrypted);
    expect(Array.from(result)).toEqual([0, 1, 2, 255, 254, 253]);
  });

  it('fails decryption with wrong secret', async () => {
    const original = 'secret message';
    const { encrypted, iv } = await encryptData(original, secret);
    await expect(decryptData(encrypted, iv, 'wrong-secret')).rejects.toThrow();
  });

  it('fails decryption with wrong IV', async () => {
    const original = 'test';
    const { encrypted } = await encryptData(original, secret);
    await expect(decryptData(encrypted, '000000000000000000000000', secret)).rejects.toThrow();
  });
});
