import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { createNotification } from '../utils/notifications';
import { checkRateLimit } from '../utils/helpers';

const comments = new Hono<any>();

comments.get('/:fileId', async (c) => {
  const fileId = c.req.param('fileId');
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT c.id, c.file_id, c.user_id, c.parent_id, c.content, c.created_at, u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.file_id = ?
      ORDER BY c.created_at ASC
    `).bind(fileId).all();
    return c.json({ comments: results });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

comments.post('/:fileId', async (c) => {
  if (!await checkRateLimit(c, 'comment', 10, 60)) return c.json({ error: 'Too many' }, 429);
  const user_id = c.get('user_id');
  const fileId = c.req.param('fileId');
  const { content, parent_id } = await c.req.json();
  if (!content || typeof content !== 'string' || content.trim().length === 0) return c.json({ error: 'Content required' }, 400);
  if (content.length > 10000) return c.json({ error: 'Content too long' }, 400);

  const trimmed = content.trim();

  try {
    const file = await c.env.DB.prepare('SELECT id, user_id FROM files WHERE id = ?').bind(fileId).first() as any;
    if (!file) return c.json({ error: 'File not found' }, 404);

    const result = await c.env.DB.prepare(
      'INSERT INTO comments (file_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)'
    ).bind(fileId, user_id, parent_id || null, trimmed).run();

    const commentId = result.meta.last_row_id;

    const user = await c.env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(user_id).first() as any;
    const username = user?.username || 'Unknown';

    // Notification logic
    if (parent_id) {
      const parent = await c.env.DB.prepare('SELECT user_id FROM comments WHERE id = ?').bind(parent_id).first() as any;
      if (parent && parent.user_id !== user_id) {
        await createNotification(c.env, c.env.DB, parent.user_id, 'comment_reply', user_id, {
          file_id: Number(fileId),
          comment_id: commentId,
          snippet: trimmed.length > 100 ? trimmed.slice(0, 100) + '…' : trimmed,
          parent_comment_id: parent_id,
        });
      }
    } else if (file.user_id !== user_id) {
      await createNotification(c.env, c.env.DB, file.user_id, 'comment_reply', user_id, {
        file_id: Number(fileId),
        comment_id: commentId,
        snippet: trimmed.length > 100 ? trimmed.slice(0, 100) + '…' : trimmed,
      });
    }

    return c.json({
      comment: {
        id: commentId,
        file_id: Number(fileId),
        user_id,
        parent_id: parent_id || null,
        content: trimmed,
        created_at: new Date().toISOString(),
        username,
      }
    }, 201);
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

comments.delete('/:commentId', async (c) => {
  const user_id = c.get('user_id');
  const commentId = c.req.param('commentId');
  try {
    const comment = await c.env.DB.prepare('SELECT user_id FROM comments WHERE id = ?').bind(commentId).first() as any;
    if (!comment) return c.json({ error: 'Not found' }, 404);
    if (comment.user_id !== user_id) return c.json({ error: 'Forbidden' }, 403);
    await c.env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(commentId).run();
    return c.json({ message: 'Deleted' });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

export default comments;
