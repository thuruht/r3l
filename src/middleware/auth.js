export const authMiddleware = async (c, next) => {
    const cookieHeader = c.req.header('Cookie');
    let sessionToken = null;
    
    if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
        const sessionCookie = cookies.find(cookie => cookie.startsWith('r3l_session='));
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
};