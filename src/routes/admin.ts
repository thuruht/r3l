// src/routes/admin.ts
import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { getAdminId } from '../utils/helpers';

const admin = new Hono<{ Bindings: Env, Variables: Variables }>();

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
    const { results } = await c.env.DB.prepare('SELECT id, username, email, created_at, is_verified FROM users ORDER BY created_at DESC LIMIT 100').all();
    return c.json({ users: results });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.post('/broadcast', async (c) => {
    const { message, type } = await c.req.json();
    if (!message) return c.json({ error: 'Message required' }, 400);
    try {
        const doId = c.env.DO_NAMESPACE.idFromName('relf-do-instance');
        const doStub = c.env.DO_NAMESPACE.get(doId);
        await doStub.fetch('http://do-stub/broadcast-signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'system_alert', userId: 0, payload: { message, alertType: type || 'info' } }),
        });
        return c.json({ message: 'Broadcast sent' });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default admin;
