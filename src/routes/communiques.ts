// src/routes/communiques.ts
import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { broadcastSignal } from '../utils/notifications';

const communiques = new Hono<{ Bindings: Env, Variables: Variables }>();

communiques.get('/:user_id', async (c) => {
  const user_id = Number(c.req.param('user_id'));
  try {
    const user = await c.env.DB.prepare('SELECT is_lurking FROM users WHERE id = ?').bind(user_id).first() as any;
    if (!user) return c.json({ error: 'Not found' }, 404);
    if (user.is_lurking) return c.json({ error: 'Not found' }, 404);
    const communique = await c.env.DB.prepare('SELECT content, theme_prefs, updated_at FROM communiques WHERE user_id = ?').bind(user_id).first();
    if (!communique) return c.json({ content: '', theme_prefs: '{}', updated_at: null });
    return c.json(communique);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

communiques.put('/', async (c) => {
  const user_id = c.get('user_id');
  const { content, theme_prefs } = await c.req.json();
  if (typeof content === 'string' && content.length > 50000) return c.json({ error: 'Content too large' }, 400);
  try {
    await c.env.DB.prepare('INSERT INTO communiques (user_id, content, theme_prefs, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET content = excluded.content, theme_prefs = excluded.theme_prefs, updated_at = excluded.updated_at').bind(user_id, content, typeof theme_prefs === 'string' ? theme_prefs : JSON.stringify(theme_prefs)).run();
    await broadcastSignal(c.env, 'signal_communique', user_id, { updated_at: new Date().toISOString() });
    return c.json({ message: 'Communique updated' });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default communiques;
