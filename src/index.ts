// src/index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';

import { Env, Variables } from './types';
import { RelfDO } from './do';
import { DocumentRoom } from './do/DocumentRoom';
import { ChatRoom } from './do/ChatRoom';

import authRoutes from './routes/auth';
import socialRoutes from './routes/social';
import artifactRoutes from './routes/artifacts';
import discoveryRoutes from './routes/discovery';
import messageRoutes from './routes/messages';
import adminRoutes from './routes/admin';
import communiqueRoutes from './routes/communiques';
import workspaceRoutes from './routes/workspaces';
import collectionRoutes from './routes/collections';
import miscRoutes from './routes/misc';

import { createNotification } from './utils/notifications';

export { RelfDO, DocumentRoom, ChatRoom };

const app = new Hono<{ Bindings: Env, Variables: Variables }>();

// Auth Middleware
const authMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, 'auth_token');
  const secret = c.env.JWT_SECRET;
  
  if (!token || !secret) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verify(token, secret, 'HS256');
    c.set('user_id', payload.id as number);
    await next();
  } catch (e) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

// CORS
app.use('/api/*', cors({
  origin: (origin) => {
    return origin.endsWith('r3l.distorted.work') || origin.includes('localhost') ? origin : 'https://r3l.distorted.work';
  },
  credentials: true,
}));

// WebSockets
app.get('/api/collab/:fileId', authMiddleware, async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }
  const fileId = c.req.param('fileId');
  const doId = c.env.DOCUMENT_ROOM.idFromName(fileId);
  const doStub = c.env.DOCUMENT_ROOM.get(doId);
  return doStub.fetch(c.req.raw);
});

app.get('/api/chat/:room', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }
  const room = c.req.param('room');
  const token = getCookie(c, 'auth_token');
  let userId = 0;
  let username = 'Anonymous';

  if (token && c.env.JWT_SECRET) {
      try {
          const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
          if (payload.id) {
             userId = payload.id as number;
             username = payload.username as string;
          }
      } catch (e) {}
  }

  const doId = c.env.CHAT_ROOM.idFromName(room);
  const doStub = c.env.CHAT_ROOM.get(doId);
  const url = new URL(c.req.url);
  url.searchParams.set('userId', userId.toString());
  url.searchParams.set('username', username);
  return doStub.fetch(new Request(url.toString(), c.req.raw));
});

app.get('/api/do-websocket', authMiddleware, async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') return c.text('Expected Upgrade: websocket', 426);
  const doId = c.env.DO_NAMESPACE.idFromName('relf-do-instance');
  const doStub = c.env.DO_NAMESPACE.get(doId);
  const url = new URL(c.req.url);
  url.pathname = '/websocket';
  const newRequest = new Request(url.toString(), c.req.raw);
  newRequest.headers.set('X-User-ID', c.get('user_id').toString());
  return doStub.fetch(newRequest);
});

// Public API paths that don't require auth
const PUBLIC_PATHS = [
  '/api/login', '/api/register', '/api/logout',
  '/api/verify-email', '/api/forgot-password', '/api/reset-password',
  '/api/resend-verification', '/api/chat/',
  '/api/discovery/users/search', '/api/discovery/users/random',
  '/api/communiques/',
];

// Single auth middleware covering all /api/* routes, skipping public paths
app.use('/api/*', async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) return next();
  // GET /api/users/:id (numeric) is public
  if (/^\/api\/users\/\d+$/.test(path) && c.req.method === 'GET') return next();
  return authMiddleware(c, next);
});

// Routes
app.route('/api', authRoutes);
app.route('/api', socialRoutes);
app.route('/api/files', artifactRoutes);
app.route('/api/discovery', discoveryRoutes);
app.route('/api/messages', messageRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/communiques', communiqueRoutes);
app.route('/api/workspaces', workspaceRoutes);
app.route('/api/collections', collectionRoutes);
app.route('/api', miscRoutes);

// Static Assets
app.all('*', (c) => {
  const url = new URL(c.req.url);
  if (url.pathname.startsWith('/api/')) return c.json({ error: 'Not Found' }, 404);
  return c.env.ASSETS.fetch(c.req.raw);
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const now = new Date().toISOString();
    try {
      await env.DB.prepare('UPDATE files SET vitality = MAX(0, vitality - 1) WHERE is_archived = 0 AND vitality > 0').run();
      const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { results: expiringFiles } = await env.DB.prepare('SELECT id, user_id, filename FROM files WHERE is_archived = 0 AND last_chance_notified = 0 AND expires_at > ? AND expires_at < ?').bind(now, soon).all();
      for (const file of expiringFiles) {
        await createNotification(env, env.DB, file.user_id as number, 'system_alert', undefined, { message: `Your artifact "${file.filename}" expires in < 24h.` });
        await env.DB.prepare('UPDATE files SET last_chance_notified = 1 WHERE id = ?').bind(file.id).run();
      }
      const { results } = await env.DB.prepare('SELECT id, r2_key FROM files WHERE is_archived = 0 AND expires_at < ?').bind(now).all();
      for (const file of results) {
        if (file.r2_key) await env.BUCKET.delete(file.r2_key as string);
        await env.DB.prepare('DELETE FROM files WHERE id = ?').bind(file.id).run();
      }
    } catch (e) { console.error("Cron error:", e); }
  }
};
