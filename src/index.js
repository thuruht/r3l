import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { serveStatic } from 'hono/cloudflare-workers';

// --- DURABLE OBJECTS (Placeholders) ---
export class CollaborationRoom { constructor(state, env) { this.state = state; } async fetch(request) { return new Response('Not Implemented', { status: 501 }); } }
export class ConnectionsObject { constructor(state, env) { this.state = state; } async fetch(request) { return new Response('Not Implemented', { status: 501 }); } }
export class VisualizationObject { constructor(state, env) { this.state = state; } async fetch(request) { return new Response('Not Implemented', { status: 501 }); } }

// --- ZOD VALIDATION SCHEMA ---
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

// --- HONO APP FACTORY ---
function createApp(r2) {
    const app = new Hono();

    // Serve static assets from 'public' directory first
    app.use('*', serveStatic({ root: './' }));

    app.onError((err, c) => {
        console.error(`Hono App Error: ${err}`, err.stack);
        return c.json({ error: 'Internal Server Error' }, 500);
    });

    // The API routes are grouped and have their own middleware
    const api = new Hono();

    api.use('*', async (c, next) => {
        const allowedOrigins = (c.env.ALLOWED_ORIGINS || "").split(',');
        const corsMiddleware = cors({
            origin: (origin) => (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
            allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization'],
            maxAge: 600,
        });
        return corsMiddleware(c, next);
    });

    api.use('*', async (c, next) => {
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

    api.use('*', bearerAuth({
        verifyToken: async (token, c) => {
            const session = await c.env.R3L_DB.prepare(
                "SELECT userId FROM auth_sessions WHERE token = ? AND expiresAt > datetime('now')"
            ).bind(token).first();
            if (!session) return false;
            c.set('userId', session.userId);
            return true;
        }
    }));

    api.post('/content', zValidator('json', contentCreateSchema), async (c) => {
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
