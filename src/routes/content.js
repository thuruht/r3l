import { Hono } from 'hono';

const contentRoutes = new Hono();

contentRoutes.get('/feed', async (c) => {
    const userId = c.get('userId');
    const { limit = 20, offset = 0 } = c.req.query();

    const { results } = await c.env.R3L_DB.prepare(`
        SELECT c.id, c.title, c.description, c.createdAt as created_at,
               u.username, u.display_name, u.avatar_key,
               cl.expiresAt as content_expires_at
        FROM content c
        JOIN users u ON c.userId = u.id
        JOIN content_lifecycle cl ON c.id = cl.contentId
        WHERE c.userId IN (SELECT followingId FROM connections WHERE followerId = ?)
        ORDER BY c.createdAt DESC
        LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all();

    return c.json({
        items: results || [],
        pagination: { hasMore: results?.length === parseInt(limit) }
    });
});

contentRoutes.get('/search', async (c) => {
    const { q, limit = 20, offset = 0, type } = c.req.query();
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (q) {
        whereClause += ' AND (c.title LIKE ? OR c.description LIKE ?)';
        params.push(`%${q}%`, `%${q}%`);
    }

    if (type && type !== 'all') {
        whereClause += ' AND c.contentType LIKE ?';
        params.push(`${type}%`);
    }

    const { results } = await c.env.R3L_DB.prepare(`
        SELECT c.id, c.title, c.description, c.createdAt as created_at,
               u.username, u.display_name, u.avatar_key,
               cl.expiresAt as content_expires_at
        FROM content c
        JOIN users u ON c.userId = u.id
        JOIN content_lifecycle cl ON c.id = cl.contentId
        ${whereClause}
        ORDER BY c.createdAt DESC
        LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();

    return c.json({
        items: results || [],
        pagination: { hasMore: results?.length === parseInt(limit) }
    });
});

contentRoutes.get('/:id', async (c) => {
    const { id } = c.req.param();
    const userId = c.get('userId');

    const content = await c.env.R3L_DB.prepare(`
        SELECT c.id, c.title, c.description, c.createdAt as created_at,
               u.username, u.display_name, u.avatar_key,
               cl.expiresAt as content_expires_at,
               (SELECT 1 FROM bookmarks WHERE contentId = c.id AND userId = ?) as is_bookmarked
        FROM content c
        JOIN users u ON c.userId = u.id
        LEFT JOIN content_lifecycle cl ON c.id = cl.contentId
        WHERE c.id = ?
    `).bind(userId, id).first();

    if (!content) {
        return c.json({ error: 'Content not found' }, 404);
    }

    return c.json(content);
});

contentRoutes.get('/', async (c) => {
    const { limit = 20, offset = 0 } = c.req.query();
    const { results } = await c.env.R3L_DB.prepare(`
        SELECT c.id, c.title, c.description, c.createdAt as created_at,
               u.username, u.display_name, u.avatar_key
        FROM content c
        JOIN users u ON c.userId = u.id
        ORDER BY c.createdAt DESC
        LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    return c.json({
        items: results || [],
        pagination: { hasMore: results?.length === parseInt(limit) }
    });
});

export default contentRoutes;