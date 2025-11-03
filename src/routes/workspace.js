import { Hono } from 'hono';

const workspaceRoutes = new Hono();

workspaceRoutes.get('/', async (c) => {
    const userId = c.get('userId');
    const { results } = await c.env.R3L_DB.prepare(
        `SELECT id, name, description FROM workspaces WHERE ownerId = ?`
    ).bind(userId).all();
    return c.json(results || []);
});

workspaceRoutes.post('/', async (c) => {
    const userId = c.get('userId');
    const { name, description } = await c.req.json();
    const workspaceId = crypto.randomUUID();

    await c.env.R3L_DB.prepare(
        "INSERT INTO workspaces (id, name, description, ownerId) VALUES (?, ?, ?, ?)"
    ).bind(workspaceId, name, description || '', userId).run();

    return c.json({ success: true, workspaceId }, 201);
});

export default workspaceRoutes;