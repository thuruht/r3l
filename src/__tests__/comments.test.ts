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

  // Create a verified user
  const { hash, salt } = await hashPassword('testpass123');
  const { success } = await env.DB.prepare(
    'INSERT INTO users (username, password, salt, email, is_verified) VALUES (?, ?, ?, ?, 1)'
  ).bind('commentuser', hash, salt, 'comment@test.com').run();
  if (success) {
    const user = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind('commentuser').first() as any;
    userId = user.id;
  }

  // Login to get auth cookie
  const loginRes = await SELF.fetch('http://localhost/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'commentuser', password: 'testpass123' }),
  });
  // Extract Set-Cookie header
  const setCookie = loginRes.headers.get('set-cookie') || '';
  authCookie = setCookie.split(';')[0];

  // Create a file
  const fileRes = await SELF.fetch('http://localhost/api/files', {
    method: 'POST',
    headers: { 'Cookie': authCookie },
    body: (() => {
      const form = new FormData();
      form.append('file', new Blob(['hello'], { type: 'text/plain' }), 'test.txt');
      form.append('visibility', 'public');
      return form;
    })(),
  });
  const fileData = await fileRes.json() as any;
  fileId = fileRes.status === 200 ? 0 : 0;

  // If upload via SELF.fetch + FormData is problematic, create file directly
  if (!fileData.r2_key) {
    const r2_key = 'commentuser/test.txt';
    await env.BUCKET.put(r2_key, 'hello');
    const { meta } = await env.DB.prepare(
      "INSERT INTO files (user_id, r2_key, filename, size, mime_type, visibility, expires_at) VALUES (?, ?, ?, ?, ?, 'public', datetime('now', '+7 days'))"
    ).bind(userId, r2_key, 'test.txt', 5, 'text/plain').run();
    fileId = meta.last_row_id as number;
  } else {
    // Get file id from db
    const f = await env.DB.prepare('SELECT id FROM files WHERE r2_key = ?').bind(fileData.r2_key).first() as any;
    fileId = f.id;
  }
});

describe('POST /api/comments/:fileId', () => {
  it('creates a comment on a file', async () => {
    const res = await SELF.fetch(`http://localhost/api/comments/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie,
      },
      body: JSON.stringify({ content: 'Great file!' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.comment.content).toBe('Great file!');
    expect(data.comment.file_id).toBe(fileId);
  });

  it('rejects empty content', async () => {
    const res = await SELF.fetch(`http://localhost/api/comments/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie,
      },
      body: JSON.stringify({ content: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects content over 10000 chars', async () => {
    const res = await SELF.fetch(`http://localhost/api/comments/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie,
      },
      body: JSON.stringify({ content: 'x'.repeat(10001) }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/comments/:fileId', () => {
  it('lists comments for a file', async () => {
    const res = await SELF.fetch(`http://localhost/api/comments/${fileId}`, {
      headers: { 'Cookie': authCookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data.comments)).toBe(true);
    expect(data.comments.length).toBeGreaterThanOrEqual(1);
  });
});

describe('PUT /api/comments/:commentId', () => {
  it('edits own comment', async () => {
    // First get the comment
    const getRes = await SELF.fetch(`http://localhost/api/comments/${fileId}`, {
      headers: { 'Cookie': authCookie },
    });
    const getData = await getRes.json() as any;
    const commentId = getData.comments[0].id;

    const res = await SELF.fetch(`http://localhost/api/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie,
      },
      body: JSON.stringify({ content: 'Updated comment' }),
    });
    expect(res.status).toBe(200);
  });

  it('rejects edit of non-existent comment', async () => {
    const res = await SELF.fetch('http://localhost/api/comments/999999', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie,
      },
      body: JSON.stringify({ content: 'haha' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/comments/:commentId', () => {
  it('deletes own comment', async () => {
    const getRes = await SELF.fetch(`http://localhost/api/comments/${fileId}`, {
      headers: { 'Cookie': authCookie },
    });
    const getData = await getRes.json() as any;
    const commentId = getData.comments[0].id;

    const res = await SELF.fetch(`http://localhost/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Cookie': authCookie },
    });
    expect(res.status).toBe(200);
  });

  it('returns 404 for already deleted comment', async () => {
    const res = await SELF.fetch('http://localhost/api/comments/999999', {
      method: 'DELETE',
      headers: { 'Cookie': authCookie },
    });
    expect(res.status).toBe(404);
  });
});
