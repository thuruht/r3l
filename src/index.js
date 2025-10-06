import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth.js';
import { contentRoutes, protectedContentRoutes } from './routes/content.js';
import { authMiddleware, rateLimitMiddleware } from './middleware/auth.js';

// Durable Objects (kept in main file for now due to export requirements)
export class CollaborationRoom {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.sessions = new Set();
        this.state.blockConcurrencyWhile(async () => {
            try {
                const stored = await this.state.storage.get('sessions');
                if (stored) this.sessions = new Set(stored);
            } catch (e) {
                console.error('Failed to load sessions from storage:', e);
            }
        });
    }

    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/messages') {
            switch (request.method) {
                case 'GET':
                    const messages = await this.state.storage.get('messages') || [];
                    return new Response(JSON.stringify(messages), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                case 'POST':
                    try {
                        const message = await request.json();
                        if (!message.user || !message.text) {
                             return new Response(JSON.stringify({ error: 'Message must have a user and text.'}), { status: 400 });
                        }
                        const messageList = await this.state.storage.get('messages') || [];
                        const timestampedMessage = { ...message, id: crypto.randomUUID(), timestamp: Date.now() };
                        messageList.push(timestampedMessage);
                        if (messageList.length > 100) messageList.shift();
                        await this.state.storage.put('messages', messageList);
                        return new Response(JSON.stringify({ success: true, message: timestampedMessage }), { status: 201 });
                    } catch (e) {
                        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
                    }
            }
        }
        return new Response('Not Found', { status: 404 });
    }
}

export class ConnectionsObject {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/network') {
            const cached = await this.state.storage.get('graphData');
            const cacheTime = await this.state.storage.get('graphDataTimestamp');
            const CACHE_TTL = 5 * 60 * 1000;

            if (cached && cacheTime && (Date.now() - cacheTime < CACHE_TTL)) {
                return new Response(JSON.stringify(cached), {
                    headers: { 'Content-Type': 'application/json', 'X-Cache-Hit': 'true' },
                });
            }

            try {
                const { results } = await this.env.R3L_DB.prepare(`
                    SELECT json_object(
                        'nodes', (SELECT json_group_array(json_object('id', 'user-' || id, 'label', display_name, 'type', 'user')) FROM users),
                        'links', (SELECT json_group_array(json_object('source', 'user-' || followerId, 'target', 'user-' || followingId, 'type', 'follows')) FROM connections)
                    ) AS graphData
                `).all();
                
                const graphData = results?.[0]?.graphData ? JSON.parse(results[0].graphData) : { nodes: [], links: [] };
                
                await this.state.storage.put('graphData', graphData);
                await this.state.storage.put('graphDataTimestamp', Date.now());

                return new Response(JSON.stringify(graphData), {
                    headers: { 'Content-Type': 'application/json' },
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: 'Failed to fetch network data' }), { status: 500 });
            }
        }
        return new Response('Not Found', { status: 404 });
    }
}

export class VisualizationObject {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/stats') {
            try {
                const [userResult, contentResult, connectionResult] = await Promise.all([
                    this.env.R3L_DB.prepare("SELECT COUNT(*) as count FROM users").first(),
                    this.env.R3L_DB.prepare("SELECT COUNT(*) as count FROM content").first(),
                    this.env.R3L_DB.prepare("SELECT COUNT(*) as count FROM connections").first(),
                ]);

                const stats = {
                    users: userResult?.count || 0,
                    content: contentResult?.count || 0,
                    connections: connectionResult?.count || 0,
                };

                return new Response(JSON.stringify(stats), {
                    headers: { 'Content-Type': 'application/json' },
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), { status: 500 });
            }
        }
        return new Response('Not Found', { status: 404 });
    }
}

function createApp(r2) {
    const app = new Hono();

    app.onError((err, c) => {
        console.error(`Hono App Error: ${err}`, err.stack);
        return c.json({ error: 'Internal Server Error' }, 500);
    });

    // Common middleware
    app.use('*', async (c, next) => {
        const allowedOrigins = (c.env.ALLOWED_ORIGINS || "").split(',');
        const corsMiddleware = cors({
            origin: (origin) => (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
            allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
            allowHeaders: ['Content-Type', 'Authorization'],
            maxAge: 600,
        });
        return corsMiddleware(c, next);
    });

    // Rate limiting
    app.use('*', async (c, next) => {
        const contentLength = c.req.header('content-length');
        if (contentLength && Number(contentLength) > 50 * 1024 * 1024) {
            return c.json({ error: 'Request too large' }, 413);
        }
        
        const ip = c.req.header('cf-connecting-ip') || 'unknown';
        const key = `rate-limit:${ip}`;
        const limit = Number(c.env.RATE_LIMIT_REQUESTS) || 100;
        const window = Number(c.env.RATE_LIMIT_WINDOW) || 60;
        const current = await c.env.R3L_KV.get(key, { type: 'text' });
        const count = Number(current || 0);
        if (count >= limit) {
            return c.json({ error: 'Too many requests' }, 429);
        }
        await c.env.R3L_KV.put(key, (count + 1).toString(), { expirationTtl: window });
        await next();
    });

    // Public API routes
    app.route('/api', authRoutes);
    app.route('/api/content', contentRoutes);

    // Protected API routes
    const protectedApi = new Hono();
    protectedApi.use('*', authMiddleware);
    protectedApi.use('*', rateLimitMiddleware);
    
    // Add r2 to context for content routes
    protectedApi.use('*', async (c, next) => {
        c.set('r2', r2);
        await next();
    });

    protectedApi.route('/content', protectedContentRoutes);

    // Essential protected routes (condensed)
    protectedApi.get('/auth/profile', async (c) => {
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

    protectedApi.get('/feed', async (c) => {
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

    protectedApi.get('/search', async (c) => {
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

    app.route('/api/auth', protectedApi);
    return app;
}

export default {
    async fetch(request, env, ctx) {
        const r2 = {
            createPresignedUrl: async (method, key, options) => {
                return await env.R3L_CONTENT_BUCKET.createPresignedUrl(method, key, options);
            }
        };
        const app = createApp(r2);
        return app.fetch(request, env, ctx);
    }
};