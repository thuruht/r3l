// src/routes/artifacts.ts
import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { checkRateLimit, getR2PublicUrl } from '../utils/helpers';
import { encryptData, decryptData } from '../utils/security';
import { broadcastSignal, createNotification } from '../utils/notifications';

const artifacts = new Hono<{ Bindings: Env, Variables: Variables }>();

// GET /api/files/community-archived
artifacts.get('/community-archived', async (c) => {
  const type = c.req.query('type');
  let query = `SELECT f.id, f.filename, f.mime_type, f.archive_votes, u.username as owner_name
               FROM files f JOIN users u ON f.user_id = u.id
               WHERE f.is_community_archived = 1 AND f.is_archived = 1`;
  const params: any[] = [];
  if (type) {
    query += ' AND f.mime_type LIKE ?';
    params.push(`${type}/%`);
  }
  query += ' ORDER BY f.archive_votes DESC LIMIT 100';
  try {
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ files: results });
  } catch (e) {
    return c.json({ error: 'Failed to fetch community archive' }, 500);
  }
});

// GET /api/files: My Files
artifacts.get('/', async (c) => {
  const user_id = c.get('user_id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM files WHERE user_id = ? AND is_archived = 0 ORDER BY created_at DESC'
    ).bind(user_id).all();
    return c.json({ files: results });
  } catch (e) {
    return c.json({ error: 'Failed to list files' }, 500);
  }
});

// GET /api/files/users/:target_user_id
artifacts.get('/users/:target_user_id', async (c) => {
  const user_id = c.get('user_id');
  const target_user_id = Number(c.req.param('target_user_id'));
  if (isNaN(target_user_id)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    if (user_id === target_user_id) {
        const { results } = await c.env.DB.prepare('SELECT * FROM files WHERE user_id = ? AND is_archived = 0 ORDER BY created_at DESC').bind(user_id).all();
        return c.json({ files: results });
    }

    const mutual = await c.env.DB.prepare(
      'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
    ).bind(Math.min(user_id, target_user_id), Math.max(user_id, target_user_id), Math.min(user_id, target_user_id), Math.max(user_id, target_user_id)).first();

    let query = 'SELECT * FROM files WHERE user_id = ? AND is_archived = 0 AND visibility = "public"';
    if (mutual) {
        query = 'SELECT * FROM files WHERE user_id = ? AND is_archived = 0 AND (visibility = "public" OR visibility = "sym")';
    }

    const { results } = await c.env.DB.prepare(query + ' ORDER BY created_at DESC').bind(target_user_id).all();
    return c.json({ files: results });
  } catch (e) {
    return c.json({ error: 'Failed to list user files' }, 500);
  }
});

// POST /api/files: Upload
artifacts.post('/', async (c) => {
  if (!await checkRateLimit(c, 'file_upload', 10, 600)) return c.json({ error: 'Too many uploads' }, 429);
  const user_id = c.get('user_id');
  
  try {
    const formData = await c.req.parseBody();
    const file = formData['file'] as File;
    const visibility = (formData['visibility'] as string) || 'me';
    const parent_id = formData['parent_id'] ? Number(formData['parent_id']) : null;
    const shouldEncrypt = formData['encrypt'] === 'true';
    const burn_on_read = formData['burn_on_read'] === 'true';

    if (!file || !(file instanceof File)) return c.json({ error: 'Invalid format' }, 400);

    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
    
    let body: any = file.stream();
    let is_encrypted = 0;
    let iv: string | null = null;
    let size = file.size;

    if (shouldEncrypt && c.env.ENCRYPTION_SECRET) {
      const arrayBuffer = await file.arrayBuffer();
      const encrypted = await encryptData(arrayBuffer, c.env.ENCRYPTION_SECRET);
      body = encrypted.encrypted;
      iv = encrypted.iv;
      is_encrypted = 1;
      size = body.byteLength;
    }

    const r2_key = `${user_id}/${crypto.randomUUID()}-${safeFilename}`;
    await c.env.BUCKET.put(r2_key, body, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
      customMetadata: { originalName: safeFilename, userId: String(user_id), isEncrypted: String(is_encrypted) }
    });

    const expires_at = new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString();
    const { success } = await c.env.DB.prepare(
      `INSERT INTO files (user_id, r2_key, filename, size, mime_type, visibility, expires_at, parent_id, is_encrypted, iv, burn_on_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(user_id, r2_key, safeFilename, size, file.type || 'application/octet-stream', visibility, expires_at, parent_id, is_encrypted, iv, burn_on_read).run();

    if (success && (visibility === 'public' || visibility === 'sym')) {
        c.executionCtx.waitUntil(broadcastSignal(c.env, 'signal_artifact', user_id, { filename: safeFilename, mime_type: file.type, visibility }));
    }

    return c.json({ message: 'Uploaded', r2_key, expires_at });
  } catch (e) {
    return c.json({ error: 'Upload failed' }, 500);
  }
});

// GET /api/files/:id/metadata
artifacts.get('/:id/metadata', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  try {
    const file = await c.env.DB.prepare('SELECT id, filename, size, mime_type, visibility, vitality, expires_at, created_at, user_id FROM files WHERE id = ?').bind(file_id).first() as any;
    if (!file) return c.json({ error: 'Not found' }, 404);
    
    if (file.user_id !== user_id && file.visibility === 'private') return c.json({ error: 'Unauthorized' }, 403);
    
    return c.json(file);
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// GET /api/files/:id/content
artifacts.get('/:id/content', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  try {
    const file = await c.env.DB.prepare('SELECT * FROM files WHERE id = ?').bind(file_id).first() as any;
    if (!file) return c.json({ error: 'Not found' }, 404);
    if (file.expires_at && new Date(file.expires_at) < new Date()) return c.json({ error: 'Expired' }, 410);

    const object = await c.env.BUCKET.get(file.r2_key, { range: c.req.header('Range') });
    if (!object) return c.json({ error: 'Missing' }, 404);

    let body = await object.arrayBuffer();
    if (file.is_encrypted && file.iv && c.env.ENCRYPTION_SECRET) {
        body = await decryptData(body, file.iv, c.env.ENCRYPTION_SECRET);
    }

    if (file.burn_on_read) {
        c.executionCtx.waitUntil((async () => {
            await c.env.BUCKET.delete(file.r2_key);
            await c.env.DB.prepare('DELETE FROM files WHERE id = ?').bind(file_id).run();
        })());
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Disposition', `${file.mime_type === 'application/pdf' ? 'inline' : 'attachment'}; filename="${file.filename}"`);
    return new Response(body, { headers });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// PUT /api/files/:id/content
artifacts.put('/:id/content', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  const { content } = await c.req.json();
  try {
    const file = await c.env.DB.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').bind(file_id, user_id).first() as any;
    if (!file) return c.json({ error: 'Not found or unauthorized' }, 404);
    await c.env.BUCKET.put(file.r2_key, content, { httpMetadata: { contentType: file.mime_type } });
    await c.env.DB.prepare('UPDATE files SET size = ?, vitality = vitality + 1 WHERE id = ?').bind(content.length, file_id).run();
    return c.json({ message: 'Updated' });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// POST /api/files/:id/refresh
artifacts.post('/:id/refresh', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  const new_expires = new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString();
  try {
    const { success } = await c.env.DB.prepare('UPDATE files SET expires_at = ? WHERE id = ? AND user_id = ?').bind(new_expires, file_id, user_id).run();
    return success ? c.json({ message: 'Refreshed', expires_at: new_expires }) : c.json({ error: 'Failed' }, 403);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// POST /api/files/:id/vitality
artifacts.post('/:id/vitality', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  const { amount } = await c.req.json().catch(() => ({ amount: 1 }));
  try {
    const existing = await c.env.DB.prepare('SELECT id FROM vitality_votes WHERE file_id = ? AND user_id = ?').bind(file_id, user_id).first();
    if (existing) return c.json({ error: 'Already boosted' }, 409);
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO vitality_votes (file_id, user_id) VALUES (?, ?)').bind(file_id, user_id),
      c.env.DB.prepare("UPDATE files SET vitality = vitality + ?, expires_at = datetime(expires_at, '+' || ? || ' hours') WHERE id = ?").bind(amount, amount, file_id)
    ]);
    const file = await c.env.DB.prepare('SELECT vitality, user_id, filename FROM files WHERE id = ?').bind(file_id).first() as any;
    if (file?.vitality >= 10) await c.env.DB.prepare('UPDATE files SET is_archived = 1 WHERE id = ?').bind(file_id).run();
    return c.json({ message: 'Boosted', vitality: file?.vitality });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// POST /api/files/:id/remix
artifacts.post('/:id/remix', async (c) => {
  const user_id = c.get('user_id');
  const source_id = Number(c.req.param('id'));
  try {
    const source = await c.env.DB.prepare('SELECT * FROM files WHERE id = ?').bind(source_id).first() as any;
    if (!source) return c.json({ error: 'Not found' }, 404);
    const object = await c.env.BUCKET.get(source.r2_key);
    if (!object) return c.json({ error: 'Missing content' }, 404);
    const remixFilename = `remix-${source.filename}`;
    const r2_key = `${user_id}/${crypto.randomUUID()}-${remixFilename}`;
    await c.env.BUCKET.put(r2_key, await object.arrayBuffer(), { httpMetadata: { contentType: source.mime_type } });
    const { meta } = await c.env.DB.prepare("INSERT INTO files (user_id, r2_key, filename, size, mime_type, visibility, expires_at, remix_of) VALUES (?, ?, ?, ?, ?, 'me', ?, ?)").bind(user_id, r2_key, remixFilename, source.size, source.mime_type, new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString(), source_id).run();
    return c.json({ message: 'Remixed', file_id: meta.last_row_id });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// POST /api/files/:id/archive
artifacts.post('/:id/archive', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  try {
    const { success } = await c.env.DB.prepare('UPDATE files SET is_archived = 1 WHERE id = ? AND user_id = ?').bind(file_id, user_id).run();
    return success ? c.json({ message: 'Archived' }) : c.json({ error: 'Failed' }, 403);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// DELETE /api/files/:id
artifacts.delete('/:id', async (c) => {
    const user_id = c.get('user_id');
    const file_id = Number(c.req.param('id'));
    try {
        const file = await c.env.DB.prepare('SELECT r2_key FROM files WHERE id = ? AND user_id = ?').bind(file_id, user_id).first() as any;
        if (file) {
            await c.env.BUCKET.delete(file.r2_key);
            await c.env.DB.prepare('DELETE FROM files WHERE id = ?').bind(file_id).run();
            return c.json({ message: 'Deleted' });
        }
        return c.json({ error: 'Not found' }, 404);
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default artifacts;
