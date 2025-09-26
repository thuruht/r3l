import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import bcrypt from 'bcryptjs';

// --- DURABLE OBJECTS ---
export class CollaborationRoom {
    constructor(state, env) {
        this.state = state;
        this.messages = []; // In-memory message store
    }

    async fetch(request) {
        const url = new URL(request.url);

        // For simplicity, we'll use the path to route actions
        if (url.pathname === '/messages') {
            switch (request.method) {
                case 'GET':
                    return new Response(JSON.stringify(this.messages), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                case 'POST':
                    try {
                        const message = await request.json();
                        if (!message.user || !message.text) {
                             return new Response(JSON.stringify({ error: 'Message must have a user and text.'}), { status: 400 });
                        }
                        this.messages.push(message);
                        return new Response(JSON.stringify({ success: true }), { status: 201 });
                    } catch (e) {
                        return new Response(JSON.stringify({ error: 'Invalid JSON body.'}), { status: 400 });
                    }
                default:
                    return new Response('Method Not Allowed', { status: 405 });
            }
        }
        return new Response('Not Found', { status: 404 });
    }
}

const GRAPH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

            if (cached && cacheTime && (Date.now() - cacheTime < GRAPH_CACHE_TTL)) {
                return new Response(JSON.stringify(cached), {
                    headers: { 'Content-Type': 'application/json', 'X-Cache-Hit': 'true' },
                });
            }

            const query = `
                WITH UserNodes AS (
                    SELECT 'user-' || u.id AS id, p.displayName AS label, 'user' AS type
                    FROM users u JOIN profiles p ON u.id = p.userId
                ),
                ContentNodes AS (
                    SELECT 'content-' || c.id AS id, c.title AS label, 'content' AS type
                    FROM content c
                ),
                AllNodes AS (
                    SELECT id, label, type FROM UserNodes
                    UNION ALL
                    SELECT id, label, type FROM ContentNodes
                ),
                AuthorLinks AS (
                    SELECT 'user-' || c.userId AS source, 'content-' || c.id AS target, 'author' AS type
                    FROM content c
                ),
                ConnectionLinks AS (
                    SELECT 'user-' || c.followerId AS source, 'user-' || c.followingId AS target, 'follows' AS type
                    FROM connections c
                ),
                AllLinks AS (
                    SELECT source, target, type FROM AuthorLinks
                    UNION ALL
                    SELECT source, target, type FROM ConnectionLinks
                )
                SELECT json_object(
                    'nodes', (SELECT json_group_array(json_object('id', id, 'label', label, 'type', type)) FROM AllNodes),
                    'links', (SELECT json_group_array(json_object('source', source, 'target', target, 'type', type)) FROM AllLinks)
                ) AS graphData;
            `;

            try {
                const { results } = await this.env.R3L_DB.prepare(query).all();
                if (!results || results.length === 0 || !results[0].graphData) {
                    return new Response(JSON.stringify({ nodes: [], links: [] }), { headers: { 'Content-Type': 'application/json' }});
                }

                const graphData = JSON.parse(results[0].graphData);

                // Fire and forget storage
                this.state.storage.put('graphData', graphData);
                this.state.storage.put('graphDataTimestamp', Date.now());

                return new Response(JSON.stringify(graphData), {
                    headers: { 'Content-Type': 'application/json' },
                });

            } catch (e) {
                console.error("D1 Query Failed in ConnectionsObject:", e.message);
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
            const cached = await this.state.storage.get('stats');
            const cacheTime = await this.state.storage.get('statsTimestamp');

            if (cached && cacheTime && (Date.now() - cacheTime < GRAPH_CACHE_TTL)) {
                return new Response(JSON.stringify(cached), {
                    headers: { 'Content-Type': 'application/json', 'X-Cache-Hit': 'true' },
                });
            }

            try {
                const userQuery = this.env.R3L_DB.prepare("SELECT COUNT(*) as count FROM users");
                const contentQuery = this.env.R3L_DB.prepare("SELECT COUNT(*) as count FROM content");
                const connectionQuery = this.env.R3L_DB.prepare("SELECT COUNT(*) as count FROM connections");

                const [userResult, contentResult, connectionResult] = await Promise.all([
                    userQuery.first(),
                    contentQuery.first(),
                    connectionQuery.first(),
                ]);

                const stats = {
                    users: userResult ? userResult.count : 0,
                    content: contentResult ? contentResult.count : 0,
                    connections: connectionResult ? connectionResult.count : 0,
                };

                this.state.storage.put('stats', stats);
                this.state.storage.put('statsTimestamp', Date.now());

                return new Response(JSON.stringify(stats), {
                    headers: { 'Content-Type': 'application/json' },
                });

            } catch (e) {
                console.error("D1 Query Failed in VisualizationObject:", e.message);
                return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), { status: 500 });
            }
        }
        return new Response('Not Found', { status: 404 });
    }
}

// --- ZOD VALIDATION SCHEMAS ---
const loginSchema = z.object({
    email: z.string().email('Invalid email address.'),
    password: z.string(),
});

const registerSchema = z.object({
    email: z.string().email('Invalid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters long.'),
    username: z.string().min(3, 'Username must be at least 3 characters long.'),
    displayName: z.string().min(1, 'Display name is required.').optional(),
});

const contentCreateSchema = z.object({
  filename: z.string().min(1, 'Filename is required.'),
  contentType: z.string().refine(
      (value) => ['image/', 'video/', 'application/'].some(prefix => value.startsWith(prefix)),
      { message: 'Invalid content type. Must start with image/, video/, or application/.' }
  ),
  fileSize: z.number().int().positive('File size must be a positive integer.'),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

const validationErrorHandler = (result, c) => {
    if (!result.success) {
        return c.json({
            error: 'Validation failed',
            messages: result.error.flatten().fieldErrors
        }, 422);
    }
};

// --- HONO APP FACTORY ---
function createApp(r2) {
    const app = new Hono();

    app.onError((err, c) => {
        console.error(`Hono App Error: ${err}`, err.stack);
        return c.json({ error: 'Internal Server Error' }, 500);
    });

    // --- API MIDDLEWARE ---
    const api = new Hono();
    const commonMiddleware = new Hono();

    commonMiddleware.use('*', async (c, next) => {
        const allowedOrigins = (c.env.ALLOWED_ORIGINS || "").split(',');
        const corsMiddleware = cors({
            origin: (origin) => (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
            allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization'],
            maxAge: 600,
        });
        return corsMiddleware(c, next);
    });

    commonMiddleware.use('*', async (c, next) => {
        const ip = c.req.header('cf-connecting-ip') || 'unknown';
        const key = `rate-limit:${ip}`;
        const limit = Number(c.env.RATE_LIMIT_REQUESTS);
        const window = Number(c.env.RATE_LIMIT_WINDOW);
        const current = await c.env.R3L_KV.get(key, { type: 'text' });
        const count = Number(current || 0);
        if (count >= limit) {
            return c.json({ error: 'Too many requests' }, 429);
        }
        await c.env.R3L_KV.put(key, (count + 1).toString(), { expirationTtl: window });
        await next();
    });

    api.use('*', commonMiddleware);

    // --- PUBLIC API ROUTES ---
    const publicApi = new Hono();

    publicApi.post('/register', zValidator('json', registerSchema, validationErrorHandler), async (c) => {
        const body = c.req.valid('json');
        const userId = crypto.randomUUID();
        const passwordHash = await bcrypt.hash(body.password, 10);

        try {
            await c.env.R3L_DB.batch([
                c.env.R3L_DB.prepare("INSERT INTO users (id, email, passwordHash) VALUES (?, ?, ?)")
                          .bind(userId, body.email, passwordHash),
                c.env.R3L_DB.prepare("INSERT INTO profiles (userId, username, displayName) VALUES (?, ?, ?)")
                          .bind(userId, body.username, body.displayName || body.username)
            ]);
            return c.json({ success: true, userId: userId }, 201);
        } catch (e) {
             if (e.message && e.message.includes('UNIQUE constraint failed')) {
                // More specific error based on which constraint failed
                if (e.message.includes('users.email')) {
                    return c.json({ error: 'An account with this email already exists.' }, 409);
                }
                if (e.message.includes('profiles.username')) {
                    return c.json({ error: 'This username is already taken.' }, 409);
                }
                return c.json({ error: 'Email or username already exists.' }, 409);
            }
            console.error("Registration failed:", e);
            return c.json({ error: 'Registration failed due to a server error.' }, 500);
        }
    });

    publicApi.post('/login', zValidator('json', loginSchema, validationErrorHandler), async (c) => {
        const body = c.req.valid('json');
        const user = await c.env.R3L_DB.prepare("SELECT id, passwordHash FROM users WHERE email = ?")
            .bind(body.email)
            .first();

        if (!user) {
            console.log(`Login failed: User not found for email ${body.email}`);
            return c.json({ error: 'Invalid email or password.' }, 401);
        }

        const passwordMatch = await bcrypt.compare(body.password, user.passwordHash);

        if (!passwordMatch) {
            console.log(`Login failed: Invalid password for user ${user.id}`);
            return c.json({ error: 'Invalid email or password.' }, 401);
        }

        const sessionToken = crypto.randomUUID();
        const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        const userAgent = c.req.header('user-agent') || 'unknown';

        await c.env.R3L_DB.prepare(
            "INSERT INTO auth_sessions (token, userId, expiresAt, userAgent) VALUES (?, ?, ?, ?)"
        ).bind(sessionToken, user.id, sessionExpiry.toISOString(), userAgent).run();

        return c.json({ token: sessionToken });
    });

    api.route('/', publicApi);

    // --- PROTECTED API ROUTES ---
    const protectedApi = new Hono();
    protectedApi.use('*', bearerAuth({
        verifyToken: async (token, c) => {
            const session = await c.env.R3L_DB.prepare(
                "SELECT userId, userAgent FROM auth_sessions WHERE token = ? AND expiresAt > datetime('now')"
            ).bind(token).first();

            if (!session) {
                return false;
            }

            // Verify the User-Agent to prevent token hijacking
            const requestUserAgent = c.req.header('user-agent') || 'unknown';
            if (session.userAgent !== requestUserAgent) {
                console.warn(`Session token used with mismatched User-Agent. Original: "${session.userAgent}", Request: "${requestUserAgent}"`);
                return false;
            }

            c.set('userId', session.userId);
            return true;
        }
    }));

    protectedApi.post('/content', zValidator('json', contentCreateSchema, validationErrorHandler), async (c) => {
        const body = c.req.valid('json');
        const userId = c.get('userId');
        const maxUploadSize = Number(c.env.MAX_UPLOAD_SIZE);
        if (body.fileSize > maxUploadSize) {
            return c.json({ error: `File size exceeds the limit of ${maxUploadSize / 1024 / 1024} MB.` }, 413);
        }
        const expirationDays = Number(c.env.CONTENT_EXPIRATION_DAYS);
        const contentId = crypto.randomUUID();
        const objectKey = `${userId}/${contentId}/${body.filename.replace(/[^a-zA-Z0-9.-_]/g, '')}`;
        const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

        await c.env.R3L_DB.batch([
            c.env.R3L_DB.prepare("INSERT INTO content (id, userId, title, description) VALUES (?, ?, ?, ?)").bind(contentId, userId, body.title || body.filename, body.description || ''),
            c.env.R3L_DB.prepare("INSERT INTO content_location (contentId, objectKey, contentType, fileSize) VALUES (?, ?, ?, ?)").bind(contentId, objectKey, body.contentType, body.fileSize),
            c.env.R3L_DB.prepare("INSERT INTO content_lifecycle (contentId, status, expiresAt) VALUES (?, 'active', ?)").bind(contentId, expiresAt.toISOString())
        ]);

        const signedUrl = await r2.getSignedUrl('putObject', { key: objectKey, contentType: body.contentType, expires: 600 });
        return c.json({ contentId, uploadUrl: signedUrl }, 201);
    });

    api.get('/content/:id/download', async (c) => {
        const contentId = c.req.param('id');
        const location = await c.env.R3L_DB.prepare("SELECT objectKey FROM content_location WHERE contentId = ?").bind(contentId).first();
        if (!location) return c.json({ error: 'Content not found' }, 404);
        const signedUrl = await r2.getSignedUrl('getObject', { key: location.objectKey, expires: 300 });
        return c.redirect(signedUrl);
    });

    protectedApi.get('/content/:id/download', async (c) => {
        const contentId = c.req.param('id');
        const location = await c.env.R3L_DB.prepare("SELECT objectKey FROM content_location WHERE contentId = ?").bind(contentId).first();
        if (!location) return c.json({ error: 'Content not found' }, 404);
        const signedUrl = await r2.getSignedUrl('getObject', { key: location.objectKey, expires: 300 });
        return c.redirect(signedUrl);
    });

    protectedApi.get('/network', async (c) => {
        try {
            const id = c.env.R3L_CONNECTIONS.idFromName("global-network");
            const stub = c.env.R3L_CONNECTIONS.get(id);
            const response = await stub.fetch(new Request(c.req.url, c.req.raw));
            return response;
        } catch (e) {
            console.error("Error forwarding to ConnectionsObject:", e.message);
            return c.json({ error: "Could not retrieve network data" }, 500);
        }
    });

    protectedApi.all('/collaboration/:id/*', async (c) => {
        try {
            const id = c.env.R3L_COLLABORATION.idFromName(c.req.param('id'));
            const stub = c.env.R3L_COLLABORATION.get(id);
            // Construct the new URL by taking the original URL and replacing the host and path
            const newUrl = new URL(c.req.url)
            const newPath = newUrl.pathname.match(/\/api\/collaboration\/[^/]+(\/.*)/)[1]
            newUrl.pathname = newPath
            const response = await stub.fetch(new Request(newUrl, c.req.raw));
            return response;
        } catch (e) {
            console.error("Error forwarding to CollaborationRoom:", e.message);
            return c.json({ error: "Could not forward to collaboration room" }, 500);
        }
    });

    protectedApi.get('/visualization/stats', async (c) => {
        try {
            const id = c.env.R3L_VISUALIZATION.idFromName("global-stats");
            const stub = c.env.R3L_VISUALIZATION.get(id);
            const response = await stub.fetch(new Request(new URL(c.req.url).origin + "/stats"));
            const stats = await response.json();
            return c.json(stats);
        } catch (e) {
            console.error("Error forwarding to VisualizationObject:", e.message);
            return c.json({ error: "Could not retrieve visualization stats" }, 500);
        }
    });

    api.route('/', protectedApi);

    app.route('/api', api);
    return app;
}

// --- CRON JOB LOGIC ---
const ARCHIVE_VOTE_THRESHOLD = 5;

async function handleScheduled(env) {
  console.log("CRON: Starting content lifecycle management job.");
  try {
    const r2 = env.R3L_CONTENT_BUCKET;
    const now = new Date().toISOString();
    await processActiveExpiredContent(env, now);
    await processDeletedContent(env, r2);
    console.log("CRON: Content lifecycle job completed successfully.");
  } catch (err) {
    console.error("CRON ERROR: Job failed.", err.message, err.stack);
  }
}

async function processActiveExpiredContent(env, now) {
  const { results: expiredItems } = await env.R3L_DB.prepare("SELECT contentId FROM content_lifecycle WHERE status = 'active' AND expiresAt <= ?").bind(now).all();
  if (!expiredItems || expiredItems.length === 0) {
    console.log("CRON: No active content has expired.");
    return;
  }
  for (const item of expiredItems) {
    const voteResult = await env.R3L_DB.prepare("SELECT COUNT(*) as votes FROM community_archive_votes WHERE contentId = ? AND voteType = 'archive'").bind(item.contentId).first();
    if (voteResult && voteResult.votes >= ARCHIVE_VOTE_THRESHOLD) {
      await env.R3L_DB.prepare("UPDATE content_lifecycle SET status = 'archived', expiresAt = NULL WHERE contentId = ?").bind(item.contentId).run();
    } else {
      await env.R3L_DB.prepare("UPDATE content_lifecycle SET status = 'deleted' WHERE contentId = ?").bind(item.contentId).run();
    }
  }
}

async function processDeletedContent(env, r2) {
  const { results: itemsToDelete } = await env.R3L_DB.prepare(`SELECT l.contentId, loc.objectKey FROM content_lifecycle l JOIN content_location loc ON l.contentId = loc.contentId WHERE l.status = 'deleted' LIMIT 1000`).all();
  if (!itemsToDelete || itemsToDelete.length === 0) {
    console.log("CRON: No content marked for deletion.");
    return;
  }
  const objectKeysToDelete = itemsToDelete.map(item => item.objectKey);
  await r2.deleteObjects({ keys: objectKeysToDelete });
  const stmts = itemsToDelete.map(item => env.R3L_DB.prepare("DELETE FROM content WHERE id = ?").bind(item.contentId));
  await env.R3L_DB.batch(stmts);
}

// --- WORKER EXPORT ---
export default {
  async fetch(request, env, ctx) {
    try {
      const r2 = env.R3L_CONTENT_BUCKET;
      const app = createApp(r2);
      return await app.fetch(request, env, ctx);
    } catch (err) {
      console.error('Unhandled error in fetch:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
  async scheduled(event, env, ctx) {
    console.log(`CRON: Triggered at ${new Date(event.scheduledTime).toISOString()}`);
    ctx.waitUntil(handleScheduled(env));
  },
};
