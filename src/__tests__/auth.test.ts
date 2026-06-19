import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { applyAllMigrations } from './setup';

beforeAll(async () => {
  await applyAllMigrations();
});

describe('POST /api/register', () => {
  const testUser = {
    username: 'testuser_' + Date.now(),
    password: 'testpass123',
    email: `test_${Date.now()}@example.com`,
  };

  it('registers a new user', async () => {
    const res = await SELF.fetch('http://localhost/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.message).toContain('created');
  });

  it('rejects duplicate username', async () => {
    const res = await SELF.fetch('http://localhost/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    expect(res.status).toBe(409);
    const data = await res.json() as any;
    expect(data.error).toContain('already taken');
  });

  it('rejects short password', async () => {
    const res = await SELF.fetch('http://localhost/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...testUser, username: `other_${Date.now()}`, password: 'short' }),
    });
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toContain('at least 8 characters');
  });

  it('rejects missing fields', async () => {
    const res = await SELF.fetch('http://localhost/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'foo' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/login', () => {
  const username = 'loginuser_' + Date.now();
  const password = 'testpass123';
  const email = `login_${Date.now()}@example.com`;

  beforeAll(async () => {
    // Register a verified user directly via DB
    const { hashPassword } = await import('../utils/security');
    const { hash, salt } = await hashPassword(password);
    await env.DB.prepare(
      'INSERT INTO users (username, password, salt, email, is_verified) VALUES (?, ?, ?, ?, 1)'
    ).bind(username, hash, salt, email).run();
  });

  it('logs in with valid credentials', async () => {
    const res = await SELF.fetch('http://localhost/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.user).toBeDefined();
    expect(data.user.username).toBe(username);
  });

  it('rejects invalid password', async () => {
    const res = await SELF.fetch('http://localhost/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'wrongpass123' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects unknown user', async () => {
    const res = await SELF.fetch('http://localhost/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nonexistent', password: 'testpass123' }),
    });
    expect(res.status).toBe(401);
  });
});
