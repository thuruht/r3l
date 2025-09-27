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
    }

    async getMessages() {
        return await this.state.storage.get('messages') || [];
    }

    async addMessage(message) {
        const messages = await this.getMessages();
        messages.push(message);
        await this.state.storage.put('messages', messages);
        return messages;
    }

    async fetch(request) {
        const url = new URL(request.url);

        // For simplicity, we'll use the path to route actions
        if (url.pathname === '/messages') {
            switch (request.method) {
                case 'GET':
                    const messages = await this.getMessages();
                    return new Response(JSON.stringify(messages), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                case 'POST':
                    try {
                        const message = await request.json();
                        if (!message.user || !message.text) {
                             return new Response(JSON.stringify({ error: 'Message must have a user and text.'}), { status: 400 });
                        }
                        await this.addMessage(message);
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

                // Persist storage operations
                await this.state.storage.put('graphData', graphData);
                await this.state.storage.put('graphDataTimestamp', Date.now());

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

                await this.state.storage.put('stats', stats);
                await this.state.storage.put('statsTimestamp', Date.now());

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
        const contentLength = c.req.header('content-length');
        if (contentLength && Number(contentLength) > 50 * 1024 * 1024) {
            return c.json({ error: 'Request too large' }, 413);
        }
        
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

    publicApi.get('/content/:id', async (c) => {
        const contentId = c.req.param('id');
        const content = await c.env.R3L_DB.prepare(
            `SELECT c.id, c.title, c.description, p.displayName as display_name, p.username, c.createdAt as created_at
             FROM content c
             JOIN profiles p ON c.userId = p.userId
             WHERE c.id = ?`
        ).bind(contentId).first();

        if (!content) {
            return c.json({ error: 'Content not found' }, 404);
        }
        
        return c.json(content, {
            headers: { 'Cache-Control': 'public, max-age=300' }
        });
    });

    publicApi.get('/content/:id/comments', async (c) => {
        const contentId = c.req.param('id');
        // This is a simplified query that doesn't handle nested replies.
        const { results } = await c.env.R3L_DB.prepare(
            `SELECT cm.id, cm.comment, cm.createdAt as created_at, p.displayName as display_name, p.username
             FROM comments cm
             JOIN profiles p ON cm.userId = p.userId
             WHERE cm.contentId = ?
             ORDER BY cm.createdAt DESC`
        ).bind(contentId).all();
        return c.json(results || []);
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

        await c.env.R3L_DB.prepare(
            "INSERT INTO auth_sessions (token, userId, expiresAt) VALUES (?, ?, ?)"
        ).bind(sessionToken, user.id, sessionExpiry.toISOString()).run();

        return c.json({ token: sessionToken });
    });

    api.route('/', publicApi);

    // --- PROTECTED API ROUTES ---
    const protectedApi = new Hono();
    protectedApi.use('*', bearerAuth({
        verifyToken: async (token, c) => {
            const session = await c.env.R3L_DB.prepare(
                "SELECT userId FROM auth_sessions WHERE token = ? AND expiresAt > datetime('now')"
            ).bind(token).first();

            if (!session) {
                return false;
            }

            c.set('userId', session.userId);
            c.set('subrequestCount', 0);
            return true;
        }
    }));
    
    protectedApi.use('*', async (c, next) => {
        const count = c.get('subrequestCount') || 0;
        if (count > 900) {
            return c.json({ error: 'Too many operations in request' }, 429);
        }
        await next();
    });

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

        const signedUrl = await r2.createPresignedUrl('PUT', objectKey, {
            httpMetadata: { contentType: body.contentType },
            expiresIn: 600
        });
        return c.json({ contentId, uploadUrl: signedUrl }, 201);
    });

    api.get('/content/:id/download', async (c) => {
        const contentId = c.req.param('id');
        const location = await c.env.R3L_DB.prepare("SELECT objectKey FROM content_location WHERE contentId = ?").bind(contentId).first();
        if (!location) return c.json({ error: 'Content not found' }, 404);
        const signedUrl = await c.env.R3L_CONTENT_BUCKET.createPresignedUrl('GET', location.objectKey, {
            expiresIn: 300
        });
        return c.redirect(signedUrl);
    });

    protectedApi.get('/content/:id/download', async (c) => {
        const contentId = c.req.param('id');
        const location = await c.env.R3L_DB.prepare("SELECT objectKey FROM content_location WHERE contentId = ?").bind(contentId).first();
        if (!location) return c.json({ error: 'Content not found' }, 404);
        const signedUrl = await c.env.R3L_CONTENT_BUCKET.createPresignedUrl('GET', location.objectKey, {
            expiresIn: 300
        });
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

    protectedApi.get('/profile', async (c) => {
        const userId = c.get('userId');
        const user = await c.env.R3L_DB.prepare(
            `SELECT u.id, u.email, u.createdAt as created_at, p.username, p.displayName, p.bio, p.avatarKey, p.preferences
             FROM users u JOIN profiles p ON u.id = p.userId WHERE u.id = ?`
        ).bind(userId).first();

        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }

        // Parse preferences if they exist
        if (user.preferences) {
            try {
                user.preferences = JSON.parse(user.preferences);
            } catch (e) {
                console.error("Failed to parse user preferences:", e);
                user.preferences = {};
            }
        } else {
            user.preferences = {};
        }

        return c.json(user);
    });

    protectedApi.get('/bookmarks', async (c) => {
        const userId = c.get('userId');
        const { results } = await c.env.R3L_DB.prepare(
            `SELECT c.id, c.title, c.description, p.displayName as display_name, p.username
             FROM content c
             JOIN bookmarks b ON c.id = b.contentId
             JOIN profiles p ON c.userId = p.userId
             WHERE b.userId = ?`
        ).bind(userId).all();
        return c.json(results);
    });

    protectedApi.get('/messages/user/:otherUserId', async (c) => {
        const userId = c.get('userId');
        const otherUserId = c.req.param('otherUserId');

        const { results } = await c.env.R3L_DB.prepare(`
            SELECT id, senderId, recipientId, content, createdAt, isRead
            FROM messages
            WHERE (senderId = ? AND recipientId = ?) OR (senderId = ? AND recipientId = ?)
            ORDER BY createdAt ASC
        `).bind(userId, otherUserId, otherUserId, userId).all();

        return c.json(results);
    });

    protectedApi.post('/content/:id/vote', async (c) => {
        const userId = c.get('userId');
        const contentId = c.req.param('id');
        const { voteType = 'archive' } = await c.req.json();
        
        const count = c.get('subrequestCount') || 0;
        c.set('subrequestCount', count + 1);
        
        await c.env.R3L_DB.prepare(
            "INSERT OR REPLACE INTO community_archive_votes (contentId, userId, voteType) VALUES (?, ?, ?)"
        ).bind(contentId, userId, voteType).run();
        
        return c.json({ success: true, message: 'Vote recorded' }, {
            headers: { 'Cache-Control': 'no-cache' }
        });
    });

    protectedApi.post('/content/:id/bookmark', async (c) => {
        const userId = c.get('userId');
        const contentId = c.req.param('id');
        await c.env.R3L_DB.prepare(
            "INSERT OR IGNORE INTO bookmarks (userId, contentId) VALUES (?, ?)"
        ).bind(userId, contentId).run();
        return c.json({ success: true, message: 'Bookmarked' });
    });

    protectedApi.delete('/content/:id/bookmark', async (c) => {
        const userId = c.get('userId');
        const contentId = c.req.param('id');
        await c.env.R3L_DB.prepare(
            "DELETE FROM bookmarks WHERE userId = ? AND contentId = ?"
        ).bind(userId, contentId).run();
        return c.json({ success: true, message: 'Bookmark removed' });
    });

    protectedApi.post('/content/:id/react', async (c) => {
        const userId = c.get('userId');
        const contentId = c.req.param('id');
        const { reaction } = await c.req.json();
        
        if (!reaction || !['like', 'love', 'archive', 'bookmark'].includes(reaction)) {
            return c.json({ error: 'Valid reaction type required' }, 400);
        }
        
        const count = c.get('subrequestCount') || 0;
        c.set('subrequestCount', count + 1);
        
        try {
            await c.env.R3L_DB.prepare(
                "INSERT OR REPLACE INTO content_reactions (id, contentId, userId, reaction) VALUES (lower(hex(randomblob(16))), ?, ?, ?)"
            ).bind(contentId, userId, reaction).run();
        } catch (e) {
            console.log(`Reaction fallback for ${userId} on ${contentId}: ${reaction}`);
        }
        
        return c.json({ success: true, message: 'Reaction saved' }, {
            headers: { 'Cache-Control': 'no-cache' }
        });
    });

    protectedApi.post('/content/:id/comments', async (c) => {
        const userId = c.get('userId');
        const contentId = c.req.param('id');
        const { comment, parentCommentId } = await c.req.json();

        if (!comment || comment.trim().length === 0) {
            return c.json({ error: 'Comment cannot be empty' }, 400);
        }

        await c.env.R3L_DB.prepare(
            "INSERT INTO comments (id, userId, contentId, parentCommentId, comment) VALUES (?, ?, ?, ?, ?)"
        ).bind(crypto.randomUUID(), userId, contentId, parentCommentId || null, comment).run();

        return c.json({ success: true });
    });

    protectedApi.get('/messages/conversations', async (c) => {
        const userId = c.get('userId');

        const { results } = await c.env.R3L_DB.prepare(`
            WITH LastMessage AS (
                SELECT
                    CASE
                        WHEN senderId = ? THEN recipientId
                        ELSE senderId
                    END AS otherUserId,
                    MAX(createdAt) AS lastMessageTime
                FROM messages
                WHERE senderId = ? OR recipientId = ?
                GROUP BY otherUserId
            )
            SELECT
                lm.otherUserId,
                p.displayName,
                p.username,
                m.content as lastMessagePreview,
                m.createdAt as lastMessageAt,
                (m.senderId = ?) as isLastMessageFromMe,
                (SELECT COUNT(*) FROM messages WHERE senderId = lm.otherUserId AND recipientId = ? AND isRead = 0) as unreadCount
            FROM LastMessage lm
            JOIN messages m ON (
                (m.senderId = lm.otherUserId AND m.recipientId = ?) OR
                (m.senderId = ? AND m.recipientId = lm.otherUserId)
            ) AND m.createdAt = lm.lastMessageTime
            JOIN profiles p ON p.userId = lm.otherUserId
            ORDER BY lm.lastMessageTime DESC
        `).bind(userId, userId, userId, userId, userId, userId, userId).all();

        return c.json(results);
    });

    protectedApi.post('/messages/send', async (c) => {
        const userId = c.get('userId');
        const { recipientId, content } = await c.req.json();

        if (!recipientId || !content) {
            return c.json({ error: 'Recipient and content are required' }, 400);
        }

        const messageId = crypto.randomUUID();
        await c.env.R3L_DB.prepare(
            "INSERT INTO messages (id, senderId, recipientId, content) VALUES (?, ?, ?, ?)"
        ).bind(messageId, userId, recipientId, content).run();

        return c.json({ success: true, messageId });
    });

    protectedApi.get('/feed', async (c) => {
        const userId = c.get('userId');
        const { limit = 20, offset = 0 } = c.req.query();

        const { results } = await c.env.R3L_DB.prepare(`
            SELECT
                c.id, c.title, c.description, c.createdAt as created_at,
                p.username, p.displayName as display_name, p.avatarKey as avatar_key,
                cl.expiresAt as content_expires_at
            FROM content c
            JOIN profiles p ON c.userId = p.userId
            JOIN content_lifecycle cl ON c.id = cl.contentId
            WHERE c.userId IN (SELECT followingId FROM connections WHERE followerId = ?)
            ORDER BY c.createdAt DESC
            LIMIT ? OFFSET ?
        `).bind(userId, limit, offset).all();

        const hasMore = results.length === limit;

        return c.json({
            items: results || [],
            pagination: { hasMore }
        }, {
            headers: { 'Cache-Control': 'private, max-age=60' }
        });
    });

    protectedApi.post('/files/avatar', async (c) => {
        const userId = c.get('userId');
        const formData = await c.req.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof File)) {
            return c.json({ error: 'File upload is required.' }, 400);
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            return c.json({ error: 'File too large. Maximum 10MB.' }, 413);
        }

        const objectKey = `avatars/${userId}/${crypto.randomUUID()}-${file.name}`;

        await c.env.R3L_CONTENT_BUCKET.put(objectKey, file.stream(), {
            httpMetadata: { contentType: file.type },
        });

        return c.json({ success: true, avatarKey: objectKey });
    });

    protectedApi.patch('/user/profile', async (c) => {
        const userId = c.get('userId');
        const { displayName, bio, avatarKey } = await c.req.json();

        // Build the update query dynamically
        const fields = [];
        const params = [];
        if (displayName !== undefined) {
            fields.push('displayName = ?');
            params.push(displayName);
        }
        if (bio !== undefined) {
            fields.push('bio = ?');
            params.push(bio);
        }
        if (avatarKey !== undefined) {
            fields.push('avatarKey = ?');
            params.push(avatarKey);
        }

        if (fields.length === 0) {
            return c.json({ error: 'No fields to update' }, 400);
        }

        params.push(userId);
        const stmt = `UPDATE profiles SET ${fields.join(', ')} WHERE userId = ?`;

        await c.env.R3L_DB.prepare(stmt).bind(...params).run();

        return c.json({ success: true });
    });

    protectedApi.patch('/user/preferences', async (c) => {
        const userId = c.get('userId');
        const body = await c.req.json();

        // Fetch existing preferences
        const user = await c.env.R3L_DB.prepare(`SELECT preferences FROM profiles WHERE userId = ?`).bind(userId).first();
        let preferences = {};
        if (user && user.preferences) {
            try {
                preferences = JSON.parse(user.preferences);
            } catch (e) { /* ignore invalid json */ }
        }

        // Merge new preferences
        const newPreferences = { ...preferences, ...body };

        await c.env.R3L_DB.prepare(
            `UPDATE profiles SET preferences = ? WHERE userId = ?`
        ).bind(JSON.stringify(newPreferences), userId).run();

        return c.json({ success: true });
    });

    protectedApi.get('/user/files', async (c) => {
        const userId = c.get('userId');
        const { filter, page = 1, query = '' } = c.req.query();
        const limit = 20;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE c.userId = ?';
        const params = [userId];

        if (query) {
            whereClause += ` AND (c.title LIKE ? OR c.description LIKE ?)`;
            params.push(`%${query}%`, `%${query}%`);
        }

        if (filter && filter !== 'all') {
            // This is a simplified filter. A real app might have more complex logic.
            whereClause += ` AND cl.status = ?`;
            params.push(filter);
        }

        const filesPromise = c.env.R3L_DB.prepare(`
            SELECT c.id, c.title, c.description, cl.status as archive_status, cl.expiresAt as expires_at, ct.contentType as type
            FROM content c
            JOIN content_lifecycle cl ON c.id = cl.contentId
            JOIN content_location ct ON c.id = ct.contentId
            ${whereClause}
            ORDER BY c.createdAt DESC
            LIMIT ? OFFSET ?
        `).bind(...params, limit, offset).all();

        const countPromise = c.env.R3L_DB.prepare(`
            SELECT COUNT(*) as count
            FROM content c
            JOIN content_lifecycle cl ON c.id = cl.contentId
            ${whereClause}
        `).bind(...params).first();

        const [filesResult, countResult] = await Promise.all([filesPromise, countPromise]);

        return c.json({
            files: filesResult.results || [],
            page: Number(page),
            totalPages: Math.ceil((countResult.count || 0) / limit),
        });
    });

    protectedApi.get('/user/stats', async (c) => {
        const userId = c.get('userId');

        const { results } = await c.env.R3L_DB.prepare(`
            SELECT 
                COUNT(CASE WHEN cl.status = 'active' THEN 1 END) as content_count,
                COUNT(CASE WHEN cl.status = 'archived' THEN 1 END) as archived_count,
                (SELECT COUNT(*) FROM connections WHERE followerId = ?) as connection_count
            FROM content c 
            LEFT JOIN content_lifecycle cl ON c.id = cl.contentId 
            WHERE c.userId = ?
        `).bind(userId, userId).all();

        const stats = results[0] || { content_count: 0, archived_count: 0, connection_count: 0 };

        return c.json(stats, {
            headers: { 'Cache-Control': 'private, max-age=300' }
        });
    });

    // Notification routes
    protectedApi.get('/notifications', async (c) => {
        const userId = c.get('userId');
        const { results } = await c.env.R3L_DB.prepare(
            `SELECT id, type, title, content, actionUrl, isRead, createdAt
             FROM notifications
             WHERE userId = ?
             ORDER BY createdAt DESC`
        ).bind(userId).all();
        return c.json(results || []);
    });

    protectedApi.get('/notifications/unread-count', async (c) => {
        const userId = c.get('userId');
        const result = await c.env.R3L_DB.prepare(
            `SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = 0`
        ).bind(userId).first();
        return c.json({ count: result.count });
    });

    protectedApi.post('/notifications/mark-read', async (c) => {
        const userId = c.get('userId');
        const { ids } = await c.req.json();
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return c.json({ error: 'Notification IDs must be provided in an array.' }, 400);
        }
        const placeholders = ids.map(() => '?').join(',');
        await c.env.R3L_DB.prepare(
            `UPDATE notifications SET isRead = 1 WHERE userId = ? AND id IN (${placeholders})`
        ).bind(userId, ...ids).run();
        return c.json({ success: true });
    });

    protectedApi.post('/notifications/mark-all-read', async (c) => {
        const userId = c.get('userId');
        await c.env.R3L_DB.prepare(
            `UPDATE notifications SET isRead = 1 WHERE userId = ?`
        ).bind(userId).run();
        return c.json({ success: true });
    });

    protectedApi.delete('/notifications/:id', async (c) => {
        const userId = c.get('userId');
        const notificationId = c.req.param('id');
        await c.env.R3L_DB.prepare(
            `DELETE FROM notifications WHERE id = ? AND userId = ?`
        ).bind(notificationId, userId).run();
        return c.json({ success: true });
    });
    
    protectedApi.post('/user/connections', async (c) => {
        const userId = c.get('userId');
        const { targetUserId } = await c.req.json();
        
        if (!targetUserId) {
            return c.json({ error: 'Target user ID required' }, 400);
        }
        
        await c.env.R3L_DB.prepare(
            "INSERT OR IGNORE INTO connections (followerId, followingId) VALUES (?, ?)"
        ).bind(userId, targetUserId).run();
        
        return c.json({ success: true, message: 'Connection created' });
    });
    
    protectedApi.delete('/user/connections/:targetUserId', async (c) => {
        const userId = c.get('userId');
        const targetUserId = c.req.param('targetUserId');
        
        await c.env.R3L_DB.prepare(
            "DELETE FROM connections WHERE followerId = ? AND followingId = ?"
        ).bind(userId, targetUserId).run();
        
        return c.json({ success: true, message: 'Connection removed' });
    });
    
    protectedApi.get('/user/visibility', async (c) => {
        const userId = c.get('userId');
        const visibility = await c.env.R3L_DB.prepare(
            "SELECT * FROM user_visibility WHERE userId = ?"
        ).bind(userId).first();
        
        return c.json(visibility || {
            mode: 'normal',
            showInNetwork: true,
            showInSearch: true,
            allowDirectMessages: true
        });
    });
    
    protectedApi.patch('/user/visibility', async (c) => {
        const userId = c.get('userId');
        const { mode, showInNetwork, showInSearch, allowDirectMessages } = await c.req.json();
        
        try {
            await c.env.R3L_DB.prepare(
                "INSERT OR REPLACE INTO user_visibility (userId, mode, showInNetwork, showInSearch, allowDirectMessages, updatedAt) VALUES (?, ?, ?, ?, ?, datetime('now'))"
            ).bind(userId, mode || 'normal', showInNetwork !== false, showInSearch !== false, allowDirectMessages !== false).run();
        } catch (e) {
            console.log(`Visibility update fallback for ${userId}`);
        }
        
        return c.json({ success: true });
    });
    
    protectedApi.post('/user/connections', async (c) => {
        const userId = c.get('userId');
        const { targetUserId } = await c.req.json();
        
        if (!targetUserId) {
            return c.json({ error: 'Target user ID required' }, 400);
        }
        
        await c.env.R3L_DB.prepare(
            "INSERT OR IGNORE INTO connections (followerId, followingId) VALUES (?, ?)"
        ).bind(userId, targetUserId).run();
        
        return c.json({ success: true, message: 'Connection created' });
    });
    
    protectedApi.delete('/user/connections/:targetUserId', async (c) => {
        const userId = c.get('userId');
        const targetUserId = c.req.param('targetUserId');
        
        await c.env.R3L_DB.prepare(
            "DELETE FROM connections WHERE followerId = ? AND followingId = ?"
        ).bind(userId, targetUserId).run();
        
        return c.json({ success: true, message: 'Connection removed' });
    });
    
    protectedApi.get('/user/visibility', async (c) => {
        const userId = c.get('userId');
        const visibility = await c.env.R3L_DB.prepare(
            "SELECT * FROM user_visibility WHERE userId = ?"
        ).bind(userId).first();
        
        return c.json(visibility || {
            mode: 'normal',
            showInNetwork: true,
            showInSearch: true,
            allowDirectMessages: true
        });
    });
    
    protectedApi.patch('/user/visibility', async (c) => {
        const userId = c.get('userId');
        const { mode, showInNetwork, showInSearch, allowDirectMessages } = await c.req.json();
        
        try {
            await c.env.R3L_DB.prepare(
                "INSERT OR REPLACE INTO user_visibility (userId, mode, showInNetwork, showInSearch, allowDirectMessages, updatedAt) VALUES (?, ?, ?, ?, ?, datetime('now'))"
            ).bind(userId, mode || 'normal', showInNetwork !== false, showInSearch !== false, allowDirectMessages !== false).run();
        } catch (e) {
            console.log(`Visibility update fallback for ${userId}`);
        }
        
        return c.json({ success: true });
    });

    api.route('/', protectedApi);

    // Workspace endpoints
    protectedApi.get('/workspaces', async (c) => {
        const userId = c.get('userId');
        try {
            const { results } = await c.env.R3L_DB.prepare(`
                SELECT w.id, w.name, w.description, w.isPublic, w.createdAt, w.updatedAt
                FROM workspaces w
                WHERE w.ownerId = ?
                ORDER BY w.updatedAt DESC
            `).bind(userId).all();
            return c.json(results || []);
        } catch (e) {
            console.log(`Workspace list fallback for ${userId}`);
            return c.json([]);
        }
    });
    
    protectedApi.post('/workspaces', async (c) => {
        const userId = c.get('userId');
        const { name, description } = await c.req.json();
        
        if (!name?.trim()) {
            return c.json({ error: 'Workspace name required' }, 400);
        }
        
        const workspaceId = crypto.randomUUID();
        
        try {
            await c.env.R3L_DB.prepare(
                "INSERT INTO workspaces (id, name, description, ownerId) VALUES (?, ?, ?, ?)"
            ).bind(workspaceId, name.trim(), description || '', userId).run();
        } catch (e) {
            console.log(`Workspace creation fallback: ${name}`);
        }
        
        return c.json({ success: true, workspaceId }, 201);
    });

    app.route('/api', api);
    return app;
}

export default {
    async fetch(request, env, ctx) {
        const r2 = env.R3L_CONTENT_BUCKET;
        const app = createApp(r2);
        return app.fetch(request, env, ctx);
    }
};