import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { applyAllMigrations } from './setup';
import { hashPassword } from '../utils/security';

let authCookie = '';
let userId = 0;
let fileId = 0;

beforeAll(async () => {
  await applyAllMigrations();

  const { hash, salt } = await hashPassword('artifactspass');
  await env.DB.prepare(
    'INSERT INTO users (username, password, salt, email, is_verified) VALUES (?, ?, ?, ?, 1)'
  ).bind('artifactsuser', hash, salt, 'artifacts@test.com').run();
  const user = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind('artifactsuser').first() as any;
  userId = user.id;

  const loginRes = await SELF.fetch('http://localhost/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'artifactsuser', password: 'artifactspass' }),
  });
  const setCookie = loginRes.headers.get('set-cookie') || '';
  authCookie = setCookie.split(';')[0];

  // Insert a test file directly
  const r2_key = `${userId}/test-upload.txt`;
  await env.BUCKET.put(r2_key, 'hello world');
  const { meta } = await env.DB.prepare(
    "INSERT INTO files (user_id, r2_key, filename, size, mime_type, visibility, expires_at) VALUES (?, ?, ?, ?, ?, 'public', datetime('now', '+7 days'))"
  ).bind(userId, r2_key, 'test-upload.txt', 11, 'text/plain').run();
  fileId = meta.last_row_id as number;
});

describe('GET /api/files', () => {
  it('lists own files', async () => {
    const res = await SELF.fetch('http://localhost/api/files', {
      headers: { 'Cookie': authCookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data.files)).toBe(true);
    expect(data.files.length).toBeGreaterThanOrEqual(1);
  });

  it('returns pagination metadata', async () => {
    const res = await SELF.fetch('http://localhost/api/files?limit=10&offset=0', {
      headers: { 'Cookie': authCookie },
    });
    const data = await res.json() as any;
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.limit).toBe(10);
    expect(data.offset).toBe(0);
  });

  it('filters files by search query', async () => {
    const res = await SELF.fetch('http://localhost/api/files?q=test-upload', {
      headers: { 'Cookie': authCookie },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.files).toBeDefined();
    expect(data.files.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty results for non-matching query', async () => {
    const res = await SELF.fetch('http://localhost/api/files?q=nonexistent_file_xyz', {
      headers: { 'Cookie': authCookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.files).toBeDefined();
    expect(data.files.length).toBe(0);
  });
});

describe('GET /api/files/:id/metadata', () => {
  it('returns file metadata', async () => {
    const res = await SELF.fetch(`http://localhost/api/files/${fileId}/metadata`, {
      headers: { 'Cookie': authCookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.filename).toBe('test-upload.txt');
    expect(data.id).toBe(fileId);
  });
});

describe('PUT /api/files/:id/metadata', () => {
  it('updates file visibility', async () => {
    const res = await SELF.fetch(`http://localhost/api/files/${fileId}/metadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie,
      },
      body: JSON.stringify({ visibility: 'me' }),
    });
    expect(res.status).toBe(200);

    // Verify
    const getRes = await SELF.fetch(`http://localhost/api/files/${fileId}/metadata`, {
      headers: { 'Cookie': authCookie },
    });
    const data = await getRes.json() as any;
    expect(data.visibility).toBe('me');
  });

  it('rejects invalid visibility', async () => {
    const res = await SELF.fetch(`http://localhost/api/files/${fileId}/metadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie,
      },
      body: JSON.stringify({ visibility: 'invalid' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/files/:id/archive', () => {
  it('archives own file', async () => {
    const res = await SELF.fetch(`http://localhost/api/files/${fileId}/archive`, {
      method: 'POST',
      headers: { 'Cookie': authCookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.message).toBe('Archived');
  });

  it('returns 200 even for non-existent file (UPDATE succeeds with no rows)', async () => {
    const res = await SELF.fetch('http://localhost/api/files/999999/archive', {
      method: 'POST',
      headers: { 'Cookie': authCookie },
    });
    // D1 run() returns success=true even when no rows match
    expect(res.status).toBe(200);
  });
});
