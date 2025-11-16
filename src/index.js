import { Hono } from 'hono';
import { cors } from 'hono/cors';
import bcrypt from 'bcryptjs';

// This is the HTML shell for the Single-Page Application.
// It's served as a fallback for any routes not handled by the API.
const spaHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>r3l</title>
    <link rel="stylesheet" href="/css/rel-f-global.css" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <main id="app-root">
      <h1>Loading R3L:F...</h1>
    </main>
    <!-- The Vite build will inject the correct script here -->
    <script type="module" src="/main.js"></script>
  </body>
</html>`;

// --- Durable Objects ---
// The runtime needs these classes to be exported from the main entrypoint.

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
                case 'GET': {
                    const messages = await this.state.storage.get('messages') || [];
                    return new Response(JSON.stringify(messages), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                case 'POST': {
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
            const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

// --- Hono App Setup ---

const app = new Hono();

// --- Middleware ---

app.onError((err, c) => {
    console.error(`Hono App Error: ${err}`, err.stack);
    return c.json({ error: 'Internal Server Error' }, 500);
});

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

app.use('*', async (c, next) => {
    const contentLength = c.req.header('content-length');
    if (contentLength && Number(contentLength) > 50 * 1024 * 1024) { // 50MB limit
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


// --- Routing ---

// Public Auth Routes
app.post('/api/register', async (c) => {
    const { username, password, displayName } = await c.req.json();
    if (!username || !password) {
        return c.json({ error: 'Username and password are required' }, 400);
    }
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const recoveryKey = crypto.randomUUID();
    const recoveryHash = await bcrypt.hash(recoveryKey, 10);

    await c.env.R3L_DB.prepare(
        "INSERT INTO users (id, username, passwordHash, recoveryHash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())"
    ).bind(userId, username, passwordHash, recoveryHash, displayName || username).run();

    const sessionToken = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await c.env.R3L_DB.prepare(
        "INSERT INTO auth_sessions (token, userId, expiresAt) VALUES (?, ?, ?)"
    ).bind(sessionToken, userId, sessionExpiry.toISOString()).run();

    c.header('Set-Cookie', `r3l_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`);

    return c.json({ success: true, userId, recoveryKey }, 201);
});

app.post('/api/login', async (c) => {
    const { username, password } = await c.req.json();
    if (!username || !password) {
        return c.json({ error: 'Username and password are required' }, 400);
    }
    const user = await c.env.R3L_DB.prepare("SELECT id, passwordHash FROM users WHERE username = ?")
        .bind(username).first();

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    const sessionToken = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await c.env.R3L_DB.prepare(
        "INSERT INTO auth_sessions (token, userId, expiresAt) VALUES (?, ?, ?)"
    ).bind(sessionToken, user.id, sessionExpiry.toISOString()).run();

    c.header('Set-Cookie', `r3l_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`);

    return c.json({ success: true });
});

// Protected Routes
const protectedApi = new Hono();
protectedApi.use('*', async (c, next) => {
    const cookieHeader = c.req.header('Cookie');
    let sessionToken = null;

    if (cookieHeader) {
        const sessionCookie = cookieHeader.split(';').find(cookie => cookie.trim().startsWith('r3l_session='));
        if (sessionCookie) {
            sessionToken = sessionCookie.split('=')[1];
        }
    }

    if (!sessionToken) {
        return c.json({ error: 'Authentication required' }, 401);
    }

    const session = await c.env.R3L_DB.prepare(
        "SELECT userId FROM auth_sessions WHERE token = ? AND expiresAt > datetime('now')"
    ).bind(sessionToken).first();

    if (!session) {
        return c.json({ error: 'Invalid or expired session' }, 401);
    }

    c.set('userId', session.userId);
    await next();
});

protectedApi.get('/profile', async (c) => {
    const userId = c.get('userId');
    const user = await c.env.R3L_DB.prepare(
        `SELECT id, created_at, username, display_name, bio, avatar_key, preferences FROM users WHERE id = ?`
    ).bind(userId).first();

    if (!user) return c.json({ error: 'User not found' }, 404);

    user.preferences = user.preferences ? JSON.parse(user.preferences) : {};
    return c.json(user);
});

protectedApi.get('/workspaces', async (c) => {
    const userId = c.get('userId');
    const { results } = await c.env.R3L_DB.prepare(
        `SELECT id, name, description FROM workspaces WHERE ownerId = ?`
    ).bind(userId).all();
    return c.json(results || []);
});

protectedApi.post('/workspaces', async (c) => {
    const userId = c.get('userId');
    const { name, description } = await c.req.json();
    const workspaceId = crypto.randomUUID();

    await c.env.R3L_DB.prepare(
        "INSERT INTO workspaces (id, name, description, ownerId) VALUES (?, ?, ?, ?)"
    ).bind(workspaceId, name, description || '', userId).run();

    return c.json({ success: true, workspaceId }, 201);
});

protectedApi.post('/logout', async (c) => {
    const cookieHeader = c.req.header('Cookie');
     let sessionToken = null;
    if (cookieHeader) {
        const sessionCookie = cookieHeader.split(';').find(cookie => cookie.trim().startsWith('r3l_session='));
        if (sessionCookie) {
            sessionToken = sessionCookie.split('=')[1];
        }
    }
    if(sessionToken) {
        await c.env.R3L_DB.prepare("DELETE FROM auth_sessions WHERE token = ?").bind(sessionToken).run();
    }
    c.header('Set-Cookie', `r3l_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
    return c.json({ success: true });
});

protectedApi.get('/content/:id', async (c) => {
    const { id } = c.req.param();
    const userId = c.get('userId');

    const content = await c.env.R3L_DB.prepare(`
        SELECT c.id, c.title, c.description, c.createdAt as created_at,
               u.username, u.display_name, u.avatar_key,
               (SELECT 1 FROM bookmarks WHERE contentId = c.id AND userId = ?) as is_bookmarked
        FROM content c
        JOIN users u ON c.userId = u.id
        WHERE c.id = ?
    `).bind(userId, id).first();

    if (!content) {
        return c.json({ error: 'Content not found' }, 404);
    }
    return c.json(content);
});

app.route('/api', protectedApi);


// --- SPA Fallback ---

app.get('*', (c) => c.html(spaHtml));


// --- Worker Entrypoint ---

export default {
    async fetch(request, env, ctx) {
        return app.fetch(request, env, ctx);
    }
};