import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { contentCreateSchema, validationErrorHandler } from '../schemas/validation.js';

export const contentRoutes = new Hono();

// Public routes
contentRoutes.get('/:id', async (c) => {
    const contentId = c.req.param('id');
    const content = await c.env.R3L_DB.prepare(
        `SELECT c.id, c.title, c.description, u.display_name, u.username, c.createdAt as created_at
         FROM content c
         JOIN users u ON c.userId = u.id
         WHERE c.id = ?`
    ).bind(contentId).first();

    if (!content) {
        return c.json({ error: 'Content not found' }, 404);
    }
    
    return c.json(content, {
        headers: { 'Cache-Control': 'public, max-age=300' }
    });
});

contentRoutes.get('/:id/comments', async (c) => {
    const contentId = c.req.param('id');
    const { results } = await c.env.R3L_DB.prepare(
        `SELECT cm.id, cm.comment, cm.createdAt as created_at, u.display_name, u.username
         FROM comments cm
         JOIN users u ON cm.userId = u.id
         WHERE cm.contentId = ?
         ORDER BY cm.createdAt DESC`
    ).bind(contentId).all();
    return c.json(results || []);
});

// Protected routes (require auth middleware)
export const protectedContentRoutes = new Hono();

protectedContentRoutes.post('/', zValidator('json', contentCreateSchema, validationErrorHandler), async (c) => {
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

    const signedUrl = await c.env.R3L_CONTENT_BUCKET.createPresignedUrl('PUT', objectKey, {
        httpMetadata: { contentType: body.contentType },
        expiresIn: 600
    });
    return c.json({ contentId, uploadUrl: signedUrl }, 201);
});

protectedContentRoutes.get('/:id/download', async (c) => {
    const contentId = c.req.param('id');
    const location = await c.env.R3L_DB.prepare("SELECT objectKey FROM content_location WHERE contentId = ?").bind(contentId).first();
    if (!location) return c.json({ error: 'Content not found' }, 404);
    const signedUrl = await c.env.R3L_CONTENT_BUCKET.createPresignedUrl('GET', location.objectKey, {
        expiresIn: 300
    });
    return c.redirect(signedUrl);
});

protectedContentRoutes.post('/:id/vote', async (c) => {
    const userId = c.get('userId');
    const contentId = c.req.param('id');
    
    try {
        const { voteType = 'archive' } = await c.req.json();
        
        const count = c.get('subrequestCount') || 0;
        c.set('subrequestCount', count + 1);
        
        await c.env.R3L_DB.prepare(
            "INSERT OR REPLACE INTO community_archive_votes (contentId, userId, voteType) VALUES (?, ?, ?)"
        ).bind(contentId, userId, voteType).run();
        
        return c.json({ success: true, message: 'Vote recorded' }, {
            headers: { 'Cache-Control': 'no-cache' }
        });
    } catch (e) {
        return c.json({ error: 'Invalid request body' }, 400);
    }
});

protectedContentRoutes.post('/:id/bookmark', async (c) => {
    const userId = c.get('userId');
    const contentId = c.req.param('id');
    await c.env.R3L_DB.prepare(
        "INSERT OR IGNORE INTO bookmarks (userId, contentId) VALUES (?, ?)"
    ).bind(userId, contentId).run();
    return c.json({ success: true, message: 'Bookmarked' });
});

protectedContentRoutes.delete('/:id/bookmark', async (c) => {
    const userId = c.get('userId');
    const contentId = c.req.param('id');
    await c.env.R3L_DB.prepare(
        "DELETE FROM bookmarks WHERE userId = ? AND contentId = ?"
    ).bind(userId, contentId).run();
    return c.json({ success: true, message: 'Bookmark removed' });
});

protectedContentRoutes.post('/:id/comments', async (c) => {
    const userId = c.get('userId');
    const contentId = c.req.param('id');
    
    try {
        const { comment, parentCommentId } = await c.req.json();

        if (!comment || comment.trim().length === 0) {
            return c.json({ error: 'Comment cannot be empty' }, 400);
        }

        await c.env.R3L_DB.prepare(
            "INSERT INTO comments (id, userId, contentId, parentCommentId, comment) VALUES (?, ?, ?, ?, ?)"
        ).bind(crypto.randomUUID(), userId, contentId, parentCommentId || null, comment).run();

        return c.json({ success: true });
    } catch (e) {
        return c.json({ error: 'Invalid request body' }, 400);
    }
});