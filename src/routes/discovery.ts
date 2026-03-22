// src/routes/discovery.ts
import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { checkRateLimit, getR2PublicUrl } from '../utils/helpers';

const discovery = new Hono<{ Bindings: Env, Variables: Variables }>();

discovery.get('/drift', async (c) => {
    if (!await checkRateLimit(c, 'drift', 20, 600)) return c.json({ error: 'Too fast' }, 429);
    const user_id = c.get('user_id');
    try {
        // Optimized Sampling: Get counts and use random offsets
        const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE id != ? AND is_lurking = 0').bind(user_id).first('count') as number;
        const fileCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM files WHERE visibility = "public" AND user_id != ?').bind(user_id).first('count') as number;

        const userOffset = Math.floor(Math.random() * Math.max(0, userCount - 10));
        const fileOffset = Math.floor(Math.random() * Math.max(0, fileCount - 10));

        const driftUsers = await c.env.DB.prepare(
            'SELECT id, username, avatar_url FROM users WHERE id != ? AND is_lurking = 0 LIMIT 10 OFFSET ?'
        ).bind(user_id, userOffset).all();

        const driftFiles = await c.env.DB.prepare(
            'SELECT f.id, f.filename, f.mime_type, f.user_id, u.username as owner_username FROM files f JOIN users u ON f.user_id = u.id WHERE f.visibility = "public" AND f.user_id != ? LIMIT 10 OFFSET ?'
        ).bind(user_id, fileOffset).all();
        
        const processAvatar = (u: any) => ({
            ...u,
            avatar_url: (u.avatar_url && typeof u.avatar_url === 'string' && u.avatar_url.startsWith('avatars/')) ? getR2PublicUrl(c.env, u.avatar_url) : u.avatar_url
        });

        return c.json({
            users: driftUsers.results.map(processAvatar),
            files: driftFiles.results
        });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

discovery.get('/users/search', async (c) => {
  const query = c.req.query('q');
  if (!query || query.length < 2) return c.json({ users: [] });
  try {
    const { results } = await c.env.DB.prepare('SELECT id, username, avatar_url FROM users WHERE username LIKE ? LIMIT 10').bind(`%${query}%`).all();
    return c.json({ users: results.map((u: any) => ({ ...u, avatar_url: (u.avatar_url?.startsWith('avatars/')) ? getR2PublicUrl(c.env, u.avatar_url) : u.avatar_url })) });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default discovery;
