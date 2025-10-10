import { Hono } from 'hono';
import bcrypt from 'bcryptjs';

const authRoutes = new Hono();

authRoutes.post('/register', async (c) => {
    const { username, password, displayName } = await c.req.json();
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const recoveryKey = crypto.randomUUID();
    const recoveryHash = await bcrypt.hash(recoveryKey, 10);

    await c.env.R3L_DB.prepare(
        "INSERT INTO users (id, username, passwordHash, recoveryHash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())"
    ).bind(userId, username, passwordHash, recoveryHash, displayName || username).run();

    const sessionToken = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await c.env.R3L_DB.prepare(
        "INSERT INTO auth_sessions (token, userId, expiresAt) VALUES (?, ?, ?)"
    ).bind(sessionToken, userId, sessionExpiry.toISOString()).run();

    c.header('Set-Cookie', `r3l_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`);

    return c.json({ success: true, userId, recoveryKey }, 201);
});

authRoutes.post('/login', async (c) => {
    const { username, password } = await c.req.json();
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

authRoutes.post('/logout', async (c) => {
    const cookieHeader = c.req.header('Cookie');
    let sessionToken = null;
    if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
        const sessionCookie = cookies.find(cookie => cookie.startsWith('r3l_session='));
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

export default authRoutes;