export const rateLimiter = async (c, next) => {
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
};