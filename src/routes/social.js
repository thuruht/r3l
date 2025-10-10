import { Hono } from 'hono';

const socialRoutes = new Hono();

socialRoutes.get('/messages', async (c) => {
    const userId = c.get('userId');
    const { limit = 20, offset = 0 } = c.req.query();

    const { results } = await c.env.R3L_DB.prepare(`
        SELECT m.id, m.content, m.createdAt, m.isRead,
               s.username as sender_username, s.display_name as sender_display_name
        FROM messages m
        JOIN users s ON m.senderId = s.id
        WHERE m.recipientId = ?
        ORDER BY m.createdAt DESC
        LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all();

    return c.json(results || []);
});

socialRoutes.get('/notifications', async (c) => {
    const userId = c.get('userId');
    const { limit = 20, offset = 0 } = c.req.query();

    const { results } = await c.env.R3L_DB.prepare(`
        SELECT id, type, title, content, actionUrl, isRead, createdAt
        FROM notifications
        WHERE userId = ?
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all();

    return c.json(results || []);
});

socialRoutes.get('/network', async (c) => {
    const doId = c.env.R3L_CONNECTIONS.idFromName('network-graph');
    const stub = c.env.R3L_CONNECTIONS.get(doId);
    const url = new URL(c.req.url);
    url.pathname = '/network';
    const doRequest = new Request(url, c.req.raw);
    return stub.fetch(doRequest);
});

export default socialRoutes;