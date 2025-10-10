import { Hono } from 'hono';

const filesRoutes = new Hono();

filesRoutes.get('/avatar', async (c) => {
    const userId = c.get('userId');
    const user = await c.env.R3L_DB.prepare(
        `SELECT avatar_key FROM users WHERE id = ?`
    ).bind(userId).first();

    if (!user || !user.avatar_key) {
        return c.json({ error: 'Avatar not found' }, 404);
    }

    const object = await c.env.R3L_CONTENT_BUCKET.get(user.avatar_key);

    if (object === null) {
        return c.json({ error: 'Avatar not found in storage' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, {
        headers,
    });
});

export default filesRoutes;