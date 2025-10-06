import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import bcrypt from 'bcryptjs';
import { loginSchema, registerSchema, validationErrorHandler } from '../schemas/validation.js';

export const authRoutes = new Hono();

authRoutes.post('/register', zValidator('json', registerSchema, validationErrorHandler), async (c) => {
    const body = c.req.valid('json');
    const userId = crypto.randomUUID();
    const recoveryKey = crypto.randomUUID() + '-' + crypto.randomUUID();

    try {
        const passwordHash = await bcrypt.hash(body.password, 10);
        const recoveryHash = await bcrypt.hash(recoveryKey, 10);
        await c.env.R3L_DB.prepare(
            "INSERT INTO users (id, username, passwordHash, recoveryHash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())"
        ).bind(userId, body.username, passwordHash, recoveryHash, body.displayName || body.username).run();
        
        const sessionToken = crypto.randomUUID();
        const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        await c.env.R3L_DB.prepare(
            "INSERT INTO auth_sessions (token, userId, expiresAt) VALUES (?, ?, ?)"
        ).bind(sessionToken, userId, sessionExpiry.toISOString()).run();
        
        c.header('Set-Cookie', `r3l_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`);
        
        return c.json({ success: true, userId: userId, recoveryKey: recoveryKey }, 201);
    } catch (e) {
         if (e.message && e.message.includes('UNIQUE constraint failed')) {
            return c.json({ error: 'This username is already taken.' }, 409);
        }
        console.error("Registration failed:", e);
        return c.json({ error: 'Registration failed due to a server error.' }, 500);
    }
});

authRoutes.post('/login', zValidator('json', loginSchema, validationErrorHandler), async (c) => {
    const body = c.req.valid('json');
    
    try {
        const user = await c.env.R3L_DB.prepare("SELECT id, passwordHash FROM users WHERE username = ?")
            .bind(body.username)
            .first();

        if (!user) {
            return c.json({ error: 'Invalid username or password.' }, 401);
        }

        const passwordMatch = await bcrypt.compare(body.password, user.passwordHash);

        if (!passwordMatch) {
            return c.json({ error: 'Invalid username or password.' }, 401);
        }

        const sessionToken = crypto.randomUUID();
        const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await c.env.R3L_DB.prepare(
            "INSERT INTO auth_sessions (token, userId, expiresAt) VALUES (?, ?, ?)"
        ).bind(sessionToken, user.id, sessionExpiry.toISOString()).run();

        c.header('Set-Cookie', `r3l_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`);
        
        return c.json({ success: true });
    } catch (e) {
        console.error('Login failed:', e);
        return c.json({ error: 'Login service unavailable' }, 503);
    }
});

authRoutes.post('/logout', async (c) => {
    c.header('Set-Cookie', 'r3l_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
    return c.json({ success: true, message: 'Logged out successfully' });
});