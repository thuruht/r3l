// src/routes/admin.ts
import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { getAdminId } from '../utils/helpers';
import { RelfDO } from '../do';

const admin = new Hono<any>();

admin.use('*', async (c, next) => {
  const user_id = c.get('user_id');
  if (user_id !== getAdminId(c.env)) return c.json({ error: 'Unauthorized' }, 403);
  await next();
});

admin.get('/stats', async (c) => {
  try {
    const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first('count');
    const fileCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM files').first('count');
    return c.json({ users: userCount, total_files: fileCount });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.get('/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT id, username, email, role, created_at, is_verified FROM users ORDER BY created_at DESC LIMIT 100').all();
    return c.json({ users: results });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.delete('/users/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (!id) return c.json({ error: 'Invalid ID' }, 400);
  try {
    const { results: files } = await c.env.DB.prepare('SELECT r2_key FROM files WHERE user_id = ?').bind(id).all();
    const user = await c.env.DB.prepare('SELECT avatar_url FROM users WHERE id = ?').bind(id).first() as any;

    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM files WHERE user_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM relationships WHERE source_user_id = ? OR target_user_id = ?').bind(id, id),
      c.env.DB.prepare('DELETE FROM mutual_connections WHERE user_a_id = ? OR user_b_id = ?').bind(id, id),
      c.env.DB.prepare('DELETE FROM notifications WHERE user_id = ? OR actor_id = ?').bind(id, id),
      c.env.DB.prepare('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?').bind(id, id),
      c.env.DB.prepare('DELETE FROM communiques WHERE user_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM group_members WHERE user_id = ?').bind(id),
      c.env.DB.prepare(`
        DELETE FROM groups WHERE id IN (
          SELECT g.id FROM groups g
          JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ? AND gm.role = 'admin'
          WHERE (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND role = 'admin') = 1
        )
      `).bind(id),
      c.env.DB.prepare('DELETE FROM group_messages WHERE sender_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM group_files WHERE shared_by = ?').bind(id),
      c.env.DB.prepare('DELETE FROM workspace_members WHERE user_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM workspaces WHERE owner_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM groups WHERE creator_id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
    ]);

    const cleanupPromises = (files as any[]).map(f => c.env.BUCKET.delete(f.r2_key as string).catch(() => {}));
    if (user?.avatar_url && typeof user.avatar_url === 'string' && user.avatar_url.startsWith('avatars/')) {
      cleanupPromises.push(c.env.BUCKET.delete(user.avatar_url).catch(() => {}));
    }
    c.executionCtx.waitUntil(Promise.all(cleanupPromises));

    return c.json({ ok: true });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.put('/users/:id/role', async (c) => {
  const id = parseInt(c.req.param('id'));
  const { role } = await c.req.json();
  if (!id || !['user', 'admin', 'moderator'].includes(role)) return c.json({ error: 'Invalid' }, 400);
  try {
    await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, id).run();
    return c.json({ ok: true });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.post('/verify-user', async (c) => {
  const { target_user_id } = await c.req.json();
  if (!target_user_id) return c.json({ error: 'target_user_id required' }, 400);
  try {
    await c.env.DB.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').bind(target_user_id).run();
    return c.json({ ok: true });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.post('/broadcast', async (c) => {
    const { message, type } = await c.req.json();
    if (!message) return c.json({ error: 'Message required' }, 400);
    try {
        const doId = c.env.DO_NAMESPACE.idFromName('relf-do-instance');
        const doStub = c.env.DO_NAMESPACE.get(doId) as DurableObjectStub<RelfDO>;
        await doStub.broadcastSignal({ type: 'system_alert', userId: 0, payload: { message, alertType: type || 'info' } });
        return c.json({ message: 'Broadcast sent' });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default admin;
