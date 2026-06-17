// src/routes/artifacts.ts
import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { checkRateLimit, getR2PublicUrl } from '../utils/helpers';
import { encryptData, decryptData } from '../utils/security';
import { broadcastSignal, createNotification } from '../utils/notifications';

const artifacts = new Hono<any>();

// GET /api/files/community-archived
artifacts.get('/community-archived', async (c) => {
  const type = c.req.query('type');
  const limit = Math.min(Number(c.req.query('limit') || 100), 100);
  const offset = Number(c.req.query('offset') || 0);

  let query = `SELECT f.id, f.filename, f.mime_type, f.archive_votes, u.username as owner_name
               FROM files f JOIN users u ON f.user_id = u.id
               WHERE f.is_community_archived = 1 AND f.is_archived = 1`;
  const params: any[] = [];
  if (type) {
    query += ' AND f.mime_type LIKE ?';
    params.push(`${type}/%`);
  }
  query += ' ORDER BY f.archive_votes DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
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
  const limit = Math.min(Number(c.req.query('limit') || 50), 100);
  const offset = Number(c.req.query('offset') || 0);

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT f.*, (SELECT COUNT(*) FROM vitality_votes WHERE file_id = f.id AND user_id = ?) > 0 as is_boosted
       FROM files f WHERE f.user_id = ? AND f.is_archived = 0 ORDER BY f.created_at DESC LIMIT ? OFFSET ?`
    ).bind(user_id, user_id, limit, offset).all();

    const total = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM files WHERE user_id = ? AND is_archived = 0'
    ).bind(user_id).first('count');

    return c.json({ files: results, total, limit, offset });
  } catch (e) {
    return c.json({ error: 'Failed to list files' }, 500);
  }
});

// GET /api/files/users/:target_user_id
artifacts.get('/users/:target_user_id', async (c) => {
  const user_id = c.get('user_id');
  const target_user_id = Number(c.req.param('target_user_id'));
  if (isNaN(target_user_id)) return c.json({ error: 'Invalid ID' }, 400);

  const limit = Math.min(Number(c.req.query('limit') || 50), 100);
  const offset = Number(c.req.query('offset') || 0);

  try {
    if (user_id === target_user_id) {
        const { results } = await c.env.DB.prepare(
          `SELECT f.*, (SELECT COUNT(*) FROM vitality_votes WHERE file_id = f.id AND user_id = ?) > 0 as is_boosted
           FROM files f WHERE f.user_id = ? AND f.is_archived = 0 ORDER BY f.created_at DESC LIMIT ? OFFSET ?`
        ).bind(user_id, user_id, limit, offset).all();

        const total = await c.env.DB.prepare(
          'SELECT COUNT(*) as count FROM files WHERE user_id = ? AND is_archived = 0'
        ).bind(user_id).first('count');

        return c.json({ files: results, total, limit, offset });
    }

    const mutual = await c.env.DB.prepare(
      'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
    ).bind(Math.min(user_id, target_user_id), Math.max(user_id, target_user_id), Math.min(user_id, target_user_id), Math.max(user_id, target_user_id)).first();

    const is3space = await c.env.DB.prepare(
      `SELECT id FROM relationships WHERE ((source_user_id = ? AND target_user_id = ?) OR (source_user_id = ? AND target_user_id = ?)) AND type = '3space_accepted' AND status = 'accepted'`
    ).bind(user_id, target_user_id, target_user_id, user_id).first();

    let visibilities = ['"public"'];
    if (mutual) visibilities.push('"sym"');
    if (is3space) visibilities.push('"3space"');

    let query = `SELECT f.*, (SELECT COUNT(*) FROM vitality_votes WHERE file_id = f.id AND user_id = ?) > 0 as is_boosted
                 FROM files f WHERE f.user_id = ? AND f.is_archived = 0 AND f.visibility IN (${visibilities.join(',')})`;
    let countQuery = `SELECT COUNT(*) as count FROM files WHERE user_id = ? AND is_archived = 0 AND visibility IN (${visibilities.join(',')})`;

    const { results } = await c.env.DB.prepare(query + ' ORDER BY f.created_at DESC LIMIT ? OFFSET ?').bind(user_id, target_user_id, limit, offset).all();
    const total = await c.env.DB.prepare(countQuery).bind(target_user_id).first('count');

    return c.json({ files: results, total, limit, offset });
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
    const VALID_VISIBILITIES = ['public', 'sym', 'me', '3space'];
    if (!VALID_VISIBILITIES.includes(visibility)) return c.json({ error: 'Invalid visibility' }, 400);
    const parent_id = formData['parent_id'] ? Number(formData['parent_id']) : null;
    const shouldEncrypt = formData['encrypt'] === 'true';
    const burn_on_read = formData['burn_on_read'] === 'true';

    if (!file || !(file instanceof File)) return c.json({ error: 'Invalid format' }, 400);

    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
    const r2_key = `${user_id}/${crypto.randomUUID()}-${safeFilename.replace(/\//g, '_')}`;
    
    let body = await file.arrayBuffer();
    let size = body.byteLength;
    let is_encrypted = 0;
    let iv: string | null = null;

    if (shouldEncrypt && c.env.ENCRYPTION_SECRET) {
      const ivBytes = crypto.getRandomValues(new Uint8Array(12));
      iv = Array.from(ivBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const { encrypted } = await encryptData(body, c.env.ENCRYPTION_SECRET);
      body = encrypted;
      size = body.byteLength;
      is_encrypted = 1;
    }

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
        c.executionCtx.waitUntil(broadcastSignal(c.env, 'signal_file', user_id, { filename: safeFilename, mime_type: file.type, visibility }));
    }

    return c.json({ message: 'Uploaded', r2_key, expires_at });
  } catch (e) {
    return c.json({ error: 'Upload failed' }, 500);
  }
});

// PUT /api/files/:id/metadata (visibility update)
artifacts.put('/:id/metadata', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  const { visibility } = await c.req.json();
  const VALID_VISIBILITIES = ['public', 'sym', 'me'];
  if (!visibility || !VALID_VISIBILITIES.includes(visibility)) return c.json({ error: 'Invalid visibility' }, 400);
  try {
    const file = await c.env.DB.prepare('SELECT user_id FROM files WHERE id = ?').bind(file_id).first() as any;
    if (!file) return c.json({ error: 'Not found' }, 404);
    if (file.user_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);
    await c.env.DB.prepare('UPDATE files SET visibility = ? WHERE id = ?').bind(visibility, file_id).run();
    return c.json({ message: 'Updated' });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// POST /api/files/:id/archive-vote
artifacts.post('/:id/archive-vote', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  try {
    const file = await c.env.DB.prepare('SELECT id, archive_votes, is_archived FROM files WHERE id = ? AND visibility = "public"').bind(file_id).first() as any;
    if (!file) return c.json({ error: 'Not found' }, 404);
    if (file.is_archived) return c.json({ error: 'Already archived' }, 409);

    // Check for duplicate vote
    const existing = await c.env.DB.prepare('SELECT id FROM archive_votes WHERE file_id = ? AND user_id = ?').bind(file_id, user_id).first();
    if (existing) return c.json({ error: 'Already voted' }, 409);

    const newVotes = (file.archive_votes || 0) + 1;
    const stmts = [
      c.env.DB.prepare('INSERT INTO archive_votes (file_id, user_id) VALUES (?, ?)').bind(file_id, user_id),
      c.env.DB.prepare('UPDATE files SET archive_votes = ? WHERE id = ?').bind(newVotes, file_id)
    ];
    if (newVotes >= 10) {
      stmts.push(c.env.DB.prepare('UPDATE files SET is_archived = 1, is_community_archived = 1 WHERE id = ?').bind(file_id));
    }
    await c.env.DB.batch(stmts);
    return c.json({ message: 'Vote recorded', archive_votes: newVotes });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// GET /api/files/:id/metadata
artifacts.get('/:id/metadata', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  try {
    const file = await c.env.DB.prepare('SELECT id, filename, size, mime_type, visibility, vitality, expires_at, created_at, user_id FROM files WHERE id = ?').bind(file_id).first() as any;
    if (!file) return c.json({ error: 'Not found' }, 404);

    const boosted = await c.env.DB.prepare('SELECT id FROM vitality_votes WHERE file_id = ? AND user_id = ?').bind(file_id, user_id).first();
    file.is_boosted = !!boosted;

    if (file.user_id !== user_id) {
      if (file.visibility === 'me') return c.json({ error: 'Unauthorized' }, 403);
      const mutual = await c.env.DB.prepare(
        'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
      ).bind(Math.min(user_id, file.user_id), Math.max(user_id, file.user_id), Math.min(user_id, file.user_id), Math.max(user_id, file.user_id)).first();
      if (file.visibility === 'sym' && !mutual) return c.json({ error: 'Unauthorized' }, 403);
      if (file.visibility === '3space' && !mutual) {
        const is3space = await c.env.DB.prepare(
          `SELECT id FROM relationships WHERE ((source_user_id = ? AND target_user_id = ?) OR (source_user_id = ? AND target_user_id = ?)) AND type = '3space_accepted' AND status = 'accepted'`
        ).bind(user_id, file.user_id, file.user_id, user_id).first();
        if (!is3space) return c.json({ error: 'Unauthorized' }, 403);
      }
    }

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

    // Visibility enforcement
    if (file.user_id !== user_id) {
      if (file.visibility === 'me') return c.json({ error: 'Unauthorized' }, 403);
      const mutual = await c.env.DB.prepare(
        'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
      ).bind(Math.min(user_id, file.user_id), Math.max(user_id, file.user_id), Math.min(user_id, file.user_id), Math.max(user_id, file.user_id)).first();
      if (file.visibility === 'sym' && !mutual) return c.json({ error: 'Unauthorized' }, 403);
      if (file.visibility === '3space' && !mutual) {
        const is3space = await c.env.DB.prepare(
          `SELECT id FROM relationships WHERE ((source_user_id = ? AND target_user_id = ?) OR (source_user_id = ? AND target_user_id = ?)) AND type = '3space_accepted' AND status = 'accepted'`
        ).bind(user_id, file.user_id, file.user_id, user_id).first();
        if (!is3space) return c.json({ error: 'Unauthorized' }, 403);
      }
    }

    const rangeHeader = c.req.header('Range');

    // Parse range to get specific byte ranges if present
    let parsedRange: { offset?: number; length?: number; suffix?: number } | undefined;
    if (rangeHeader) {
        // Very basic range parser for Cloudflare R2 compatibility.
        // It's usually better to just pass the header, but we need to know
        // to set a 206 status code if a range was requested.
        const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
        if (match) {
           const start = match[1] ? parseInt(match[1], 10) : undefined;
           const end = match[2] ? parseInt(match[2], 10) : undefined;
           if (start !== undefined && end !== undefined) {
               parsedRange = { offset: start, length: end - start + 1 };
           } else if (start !== undefined) {
               parsedRange = { offset: start };
           } else if (end !== undefined) {
               parsedRange = { suffix: end };
           }
        }
    }

    const object = await c.env.BUCKET.get(file.r2_key, parsedRange ? { range: parsedRange } : undefined);
    if (!object) return c.json({ error: 'Missing' }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Disposition', `${file.mime_type === 'application/pdf' ? 'inline' : 'attachment'}; filename="${file.filename}"`);

    if (parsedRange) {
        headers.set('Accept-Ranges', 'bytes');
        // R2 `get` with range automatically adds Content-Range to `writeHttpMetadata` if requested
        const status = 206;

        // Encrypted files must be buffered for decryption
        if (file.is_encrypted && file.iv && c.env.ENCRYPTION_SECRET) {
            const body = await object.arrayBuffer();
            const decrypted = await decryptData(body, file.iv, c.env.ENCRYPTION_SECRET);
            return new Response(decrypted, { status, headers });
        }

        return new Response(object.body, { status, headers });
    }

    // Burn-on-read: schedule cleanup after serving
    if (file.burn_on_read && file.user_id !== user_id) {
        c.executionCtx.waitUntil((async () => {
            await c.env.BUCKET.delete(file.r2_key);
            await c.env.DB.prepare('DELETE FROM files WHERE id = ?').bind(file_id).run();
        })());
    }

    // Encrypted files must be buffered for decryption
    if (file.is_encrypted && file.iv && c.env.ENCRYPTION_SECRET) {
        const body = await object.arrayBuffer();
        const decrypted = await decryptData(body, file.iv, c.env.ENCRYPTION_SECRET);
        return new Response(decrypted, { headers });
    }

    // Stream non-encrypted files directly from R2 — avoids 128MB Worker memory limit
    return new Response(object.body, { status: 200, headers });
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
    
    const file = await c.env.DB.prepare('SELECT vitality, user_id, filename FROM files WHERE id = ?').bind(file_id).first() as any;
    if (!file) return c.json({ error: 'File not found' }, 404);

    const stmts = [
      c.env.DB.prepare('INSERT INTO vitality_votes (file_id, user_id) VALUES (?, ?)').bind(file_id, user_id),
      c.env.DB.prepare("UPDATE files SET vitality = vitality + ?, expires_at = datetime(expires_at, '+' || ? || ' hours') WHERE id = ?").bind(amount, amount, file_id)
    ];

    // If it's a mutual connection boosting, increase relationship strength
    const userA = Math.min(user_id, file.user_id);
    const userB = Math.max(user_id, file.user_id);
    const mutual = await c.env.DB.prepare('SELECT id FROM mutual_connections WHERE user_a_id = ? AND user_b_id = ?').bind(userA, userB).first();
    if (mutual) {
        stmts.push(c.env.DB.prepare('UPDATE mutual_connections SET strength = strength + 1 WHERE user_a_id = ? AND user_b_id = ?').bind(userA, userB));
    }

    await c.env.DB.batch(stmts);
    
    const updatedFile = await c.env.DB.prepare('SELECT vitality FROM files WHERE id = ?').bind(file_id).first() as any;
    if (updatedFile?.vitality >= 10) await c.env.DB.prepare('UPDATE files SET is_archived = 1 WHERE id = ?').bind(file_id).run();
    
    return c.json({ message: 'Boosted', vitality: updatedFile?.vitality });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});


// POST /api/files/:id/share
artifacts.post('/:id/share', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  const { target_user_id } = await c.req.json();

  if (!target_user_id) return c.json({ error: 'Missing target_user_id' }, 400);

  try {
    // Verify file exists and user has access
    const file = await c.env.DB.prepare('SELECT id, filename FROM files WHERE id = ? AND (user_id = ? OR visibility = "public" OR visibility = "sym")').bind(file_id, user_id).first() as any;
    if (!file) return c.json({ error: 'File not found or access denied' }, 404);

    // Create notification for target user
    await createNotification(c.env, c.env.DB, target_user_id, 'file_shared', user_id, { file_id, filename: file.filename });

    return c.json({ message: 'File shared successfully' });
  } catch (e) {
    return c.json({ error: 'Failed to share file' }, 500);
  }
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
