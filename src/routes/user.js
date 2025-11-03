import { Hono } from 'hono';

const userRoutes = new Hono();

userRoutes.get('/profile', async (c) => {
    const userId = c.get('userId');
    const user = await c.env.R3L_DB.prepare(
        `SELECT id, created_at, username, display_name, bio, avatar_key, preferences FROM users WHERE id = ?`
    ).bind(userId).first();

    if (!user) return c.json({ error: 'User not found' }, 404);

    if (user.preferences) {
        try {
            user.preferences = JSON.parse(user.preferences);
        } catch (e) {
            user.preferences = {};
        }
    } else {
        user.preferences = {};
    }

    return c.json(user);
});

userRoutes.get('/files', async (c) => {
    const userId = c.get('userId');
    const { limit = 20, offset = 0 } = c.req.query();

    const { results } = await c.env.R3L_DB.prepare(`
        SELECT c.id, c.title, c.description, c.createdAt as created_at,
               cl.status, cl.expiresAt
        FROM content c
        LEFT JOIN content_lifecycle cl ON c.id = cl.contentId
        WHERE c.userId = ?
        ORDER BY c.createdAt DESC
        LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all();

    return c.json({
        items: results || [],
        pagination: { hasMore: results?.length === parseInt(limit) }
    });
});

userRoutes.get('/stats', async (c) => {
    const doId = c.env.R3L_VISUALIZATION.idFromName('global-stats');
    const stub = c.env.R3L_VISUALIZATION.get(doId);
    const url = new URL(c.req.url);
    url.pathname = '/stats';
    const doRequest = new Request(url, c.req.raw);
    return stub.fetch(doRequest);
});

userRoutes.get('/bookmarks', async (c) => {
    const userId = c.get('userId');
    const { limit = 20, offset = 0 } = c.req.query();

    const { results } = await c.env.R3L_DB.prepare(`
        SELECT c.id, c.title, c.description, c.createdAt as created_at,
               u.username, u.display_name, u.avatar_key
        FROM bookmarks b
        JOIN content c ON b.contentId = c.id
        JOIN users u ON c.userId = u.id
        WHERE b.userId = ?
        ORDER BY b.createdAt DESC
        LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all();

    return c.json(results || []);
});

export default userRoutes;