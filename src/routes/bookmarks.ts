import { Hono } from 'hono';
import { Env, Variables } from '../types';

const bookmarks = new Hono<any>();

bookmarks.get('/', async (c) => {
  const user_id = c.get('user_id');
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT b.id, b.file_id, b.created_at, f.filename, f.mime_type, f.size, f.user_id as owner_id, u.username as owner_username
      FROM bookmarks b
      JOIN files f ON b.file_id = f.id
      JOIN users u ON f.user_id = u.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).bind(user_id).all();
    return c.json({ bookmarks: results });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

bookmarks.post('/:fileId', async (c) => {
  const user_id = c.get('user_id');
  const fileId = c.req.param('fileId');
  try {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM bookmarks WHERE user_id = ? AND file_id = ?'
    ).bind(user_id, fileId).first();
    if (existing) {
      await c.env.DB.prepare('DELETE FROM bookmarks WHERE id = ?').bind(existing.id).run();
      return c.json({ bookmarked: false });
    }
    await c.env.DB.prepare(
      'INSERT INTO bookmarks (user_id, file_id) VALUES (?, ?)'
    ).bind(user_id, fileId).run();
    return c.json({ bookmarked: true }, 201);
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

bookmarks.get('/check/:fileId', async (c) => {
  const user_id = c.get('user_id');
  const fileId = c.req.param('fileId');
  try {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM bookmarks WHERE user_id = ? AND file_id = ?'
    ).bind(user_id, fileId).first();
    return c.json({ bookmarked: !!existing });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

export default bookmarks;
