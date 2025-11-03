import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { CollaborationRoom } from './durable-objects/collaboration-room.js';
import { ConnectionsObject } from './durable-objects/connections-object.js';
import { VisualizationObject } from './durable-objects/visualization-object.js';

import { authMiddleware } from './middleware/auth.js';
import { rateLimiter } from './middleware/rate-limiter.js';

import authRoutes from './routes/auth.js';
import contentRoutes from './routes/content.js';
import filesRoutes from './routes/files.js';
import socialRoutes from './routes/social.js';
import userRoutes from './routes/user.js';
import workspaceRoutes from './routes/workspace.js';

export { CollaborationRoom, ConnectionsObject, VisualizationObject };

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
app.use('*', rateLimiter);

// Auth routes
app.route('/api', authRoutes);

// Protected routes
const protectedApi = new Hono();
protectedApi.use('*', authMiddleware);

protectedApi.route('/content', contentRoutes);
protectedApi.route('/user', userRoutes);
protectedApi.route('/social', socialRoutes);
protectedApi.route('/workspaces', workspaceRoutes);
protectedApi.route('/files', filesRoutes);

app.route('/api', protectedApi);

export default {
    async fetch(request, env, ctx) {
        return app.fetch(request, env, ctx);
    }
};