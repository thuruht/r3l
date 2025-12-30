// index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { sign, verify } from 'hono/jwt';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { Resend } from 'resend';
import JSZip from 'jszip';

// Import the Durable Object class (only for type inference, not for instantiation here)
import { RelfDO } from './do';
import { DocumentRoom } from './do/DocumentRoom';
export { RelfDO } from './do';
export { DocumentRoom } from './do/DocumentRoom';

// Define a new Hono variable type to include user_id in c.var
type Variables = {
  user_id: number;
};

interface Env {
  ASSETS: Fetcher;
  KV: KVNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
  DO_NAMESPACE: DurableObjectNamespace;
  DOCUMENT_ROOM: DurableObjectNamespace;
  JWT_SECRET: string; // Ensure this is set in .dev.vars or wrangler.toml
  RESEND_API_KEY: string;
  ENCRYPTION_SECRET: string;
  R2_ACCOUNT_ID: string; // Added
  R2_BUCKET_NAME: string; // Added
  R2_PUBLIC_DOMAIN?: string; // Optional: Custom domain for R2
}

const app = new Hono<{ Bindings: Env, Variables: Variables }>();

// Enable CORS for API routes
app.use('/api/*', cors({
  origin: (origin) => {
    return origin.endsWith('r3l.distorted.work') || origin.includes('localhost') ? origin : 'https://r3l.distorted.work';
  },
  credentials: true, // Allow cookies
}));

// --- Security Helpers ---

/**
 * Generates a random salt and hashes the password using SHA-256.
 * In a high-security production env, consider PBKDF2 or Argon2 if available/performant.
 */
async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const mySalt = salt || crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(password + mySalt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash: hashHex, salt: mySalt };
}

// --- Encryption Helpers ---

async function getEncryptionKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(data: ArrayBuffer | string, secret: string): Promise<{ encrypted: ArrayBuffer, iv: string }> {
  const key = await getEncryptionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedData
  );
  
  return { 
    encrypted, 
    iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('') 
  };
}

async function decryptData(encrypted: ArrayBuffer, ivHex: string, secret: string): Promise<ArrayBuffer> {
  const key = await getEncryptionKey(secret);
  const ivMatch = ivHex.match(/.{1,2}/g);
  if (!ivMatch) throw new Error("Invalid IV");
  const iv = new Uint8Array(ivMatch.map(byte => parseInt(byte, 16)));
  
  return await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encrypted
  );
}

// --- Rate Limiting Helper ---
async function checkRateLimit(c: any, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const kvKey = `ratelimit:${key}:${ip}`;
  
  try {
    const current = await c.env.KV.get(kvKey);
    const count = current ? parseInt(current) : 0;
    
    if (count >= limit) {
      return false;
    }
    
    // Increment
    await c.env.KV.put(kvKey, (count + 1).toString(), { expirationTtl: windowSeconds });
    return true;
  } catch (e) {
    console.error("Rate limit check failed", e);
    // Fail open if KV is down to avoid blocking legit users
    return true; 
  }
}

// --- R2 Helper ---
function getR2PublicUrl(c: any, r2_key: string): string {
    // If a custom R2 public domain is configured (e.g., via wrangler.toml vars or secrets), use it.
    if (c.env.R2_PUBLIC_DOMAIN) {
      return `https://${c.env.R2_PUBLIC_DOMAIN}/${r2_key}`;
    }

    // Fallback to the standard Cloudflare R2.dev URL format if no custom domain is set.
    // Note: Public access must be enabled on the bucket for this to work.
    return `https://pub-${c.env.R2_BUCKET_NAME}.${c.env.R2_ACCOUNT_ID}.r2.dev/${r2_key}`;
}

// --- Authentication Middleware ---
const authMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, 'auth_token');
  if (!token) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  try {
    const secret = c.env.JWT_SECRET || 'fallback_dev_secret_do_not_use_in_prod';
    const payload = await verify(token, secret);

    if (!payload || !payload.id) {
      return c.json({ error: 'Unauthorized: Invalid token payload' }, 401);
    }

    // Attach user ID to context variables for downstream routes
    c.set('user_id', payload.id as number);
    await next();
  } catch (e) {
    console.error("JWT verification failed:", e);
    return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
  }
};

// --- Auth Routes ---

app.post('/api/register', async (c) => {
  if (!await checkRateLimit(c, 'register', 5, 3600)) { // 5 per hour
    return c.json({ error: 'Too many registration attempts. Please try again later.' }, 429);
  }
  const { username, password, email, avatar_url, public_key, encrypted_private_key } = await c.req.json();
  if (!username || !password || !email) return c.json({ error: 'Missing fields' }, 400);

  try {
    const { hash, salt } = await hashPassword(password);
    const verificationToken = crypto.randomUUID();
    const defaultAvatar = 'https://pub-your-bucket-name.your-account-id.r2.dev/default-avatar.svg';
    
    // Store the hash, salt, email, verification token, and E2EE keys
    const { success } = await c.env.DB.prepare(
      'INSERT INTO users (username, password, salt, email, verification_token, avatar_url, public_key, encrypted_private_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      username,
      hash,
      salt,
      email,
      verificationToken,
      avatar_url || defaultAvatar,
      public_key || null,
      encrypted_private_key || null
    ).run();
    
    if (success) {
      // Send verification email
      if (c.env.RESEND_API_KEY) {
        try {
          const resend = new Resend(c.env.RESEND_API_KEY);
          await resend.emails.send({
            from: 'Rel F <lowlier_serf@r3l.distorted.work>',
            to: email,
            subject: 'Verify your Rel F account',
            html: `<p>Welcome to Rel F!</p><p>Please <a href="https://r3l.distorted.work/verify?token=${verificationToken}">verify your email</a> to continue.</p>`
          });
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }
      } else {
        console.log("Skipping email verification (RESEND_API_KEY missing)");
      }

      return c.json({ message: 'User created successfully. Please check your email to verify.' });
    } else {
      return c.json({ error: 'Failed to create user' }, 500);
    }
  } catch (e: any) {
    if (e.message && e.message.includes('UNIQUE constraint failed: users.username')) {
      return c.json({ error: 'Username already taken' }, 409);
    }
    if (e.message && e.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Username or Email already taken' }, 409);
    }
    return c.json({ error: 'Registration failed' }, 500);
  }
});

app.post('/api/login', async (c) => {
  if (!await checkRateLimit(c, 'login', 10, 600)) { // 10 per 10 mins
    return c.json({ error: 'Too many login attempts. Please wait.' }, 429);
  }
  const { username, password } = await c.req.json();
  if (!username || !password) return c.json({ error: 'Missing fields' }, 400);

  try {
    // 1. Fetch user (including secret salt and E2EE keys)
    const user = await c.env.DB.prepare(
      'SELECT id, username, password, salt, avatar_url, public_key, encrypted_private_key FROM users WHERE username = ?'
    ).bind(username).first();

    if (!user) return c.json({ error: 'Invalid credentials' }, 401);

    // 2. Hash input password with stored salt
    const { hash: inputHash } = await hashPassword(password, user.salt as string);

    // 3. Compare hashes
    if (inputHash !== user.password) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // 4. Generate JWT
    if (!c.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }
    const token = await sign({
      id: user.id,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    }, c.env.JWT_SECRET);

    // 5. Set HttpOnly Cookie
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true, // Requires HTTPS (or localhost)
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        avatar_url: (user.avatar_url && typeof user.avatar_url === 'string' && user.avatar_url.startsWith('avatars/')) ? getR2PublicUrl(c, user.avatar_url as string) : user.avatar_url,
        public_key: user.public_key,
        encrypted_private_key: user.encrypted_private_key
      } 
    });

  } catch (e: any) {
    console.error(e);
    return c.json({ error: 'Login failed' }, 500);
  }
});

app.post('/api/logout', (c) => {
  deleteCookie(c, 'auth_token');
  return c.json({ message: 'Logged out' });
});

app.post('/api/forgot-password', async (c) => {
  if (!await checkRateLimit(c, 'forgot', 3, 3600)) { // 3 per hour
    return c.json({ error: 'Too many attempts. Please try again later.' }, 429);
  }
  const { email } = await c.req.json();
  if (!email) return c.json({ error: 'Email is required' }, 400);

  try {
    const user = await c.env.DB.prepare(
      'SELECT id, username FROM users WHERE email = ?'
    ).bind(email).first();

    if (!user) {
        // Return success to prevent email enumeration
        return c.json({ message: 'If this email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    const { success } = await c.env.DB.prepare(
        'UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?'
    ).bind(resetToken, expiresAt, user.id).run();

    if (success && c.env.RESEND_API_KEY) {
        try {
            const resend = new Resend(c.env.RESEND_API_KEY);
            await resend.emails.send({
                from: 'Rel F Recovery <recovery@r3l.distorted.work>',
                to: email,
                subject: 'Reset your Rel F password',
                html: `<p>Hi ${user.username},</p><p>Click <a href="https://r3l.distorted.work/reset-password?token=${resetToken}">here</a> to reset your password.</p><p>This link expires in 1 hour.</p>`
            });
        } catch (emailError) {
             console.error("Failed to send reset email:", emailError);
        }
    }

    return c.json({ message: 'If this email exists, a reset link has been sent.' });

  } catch (e) {
    console.error("Forgot password error:", e);
    return c.json({ error: 'Request failed' }, 500);
  }
});

app.post('/api/reset-password', async (c) => {
  if (!await checkRateLimit(c, 'reset', 3, 3600)) { // 3 per hour
    return c.json({ error: 'Too many attempts.' }, 429);
  }
  const { token, newPassword } = await c.req.json();

  if (!token || !newPassword) return c.json({ error: 'Missing fields' }, 400);

  try {
    const user = await c.env.DB.prepare(
        'SELECT id, salt FROM users WHERE reset_token = ? AND reset_expires > ?'
    ).bind(token, new Date().toISOString()).first();

    if (!user) {
        return c.json({ error: 'Invalid or expired token' }, 400);
    }

    const { hash } = await hashPassword(newPassword, user.salt as string); // Keep same salt

    const { success } = await c.env.DB.prepare(
        'UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?'
    ).bind(hash, user.id).run();

    if (success) {
        return c.json({ message: 'Password reset successfully. You can now login.' });
    } else {
        return c.json({ error: 'Failed to reset password' }, 500);
    }
  } catch (e) {
     console.error("Reset password error:", e);
     return c.json({ error: 'Reset failed' }, 500);
  }
});

app.get('/api/verify-email', async (c) => {
  const token = c.req.query('token');
  if (!token) return c.json({ error: 'Missing token' }, 400);

  try {
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE verification_token = ?'
    ).bind(token).first();

    if (!user) return c.json({ error: 'Invalid or expired token' }, 400);

    const { success } = await c.env.DB.prepare(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = ?'
    ).bind(user.id).run();

    if (success) {
       return c.json({ message: 'Email verified successfully' });
    } else {
       return c.json({ error: 'Failed to verify email' }, 500);
    }
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Verification failed' }, 500);
  }
});

app.get('/api/users/me', async (c) => {
  const token = getCookie(c, 'auth_token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const secret = c.env.JWT_SECRET || 'fallback_dev_secret_do_not_use_in_prod';
    const payload = await verify(token, secret);
    
    // Optional: Fetch fresh data from DB to ensure user still exists
    const user = await c.env.DB.prepare(
      'SELECT id, username, avatar_url, public_key, encrypted_private_key FROM users WHERE id = ?'
    ).bind(payload.id).first();

    if (!user) return c.json({ error: 'User not found' }, 404);

    return c.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        avatar_url: (user.avatar_url && typeof user.avatar_url === 'string' && user.avatar_url.startsWith('avatars/')) ? getR2PublicUrl(c, user.avatar_url as string) : user.avatar_url,
        public_key: user.public_key,
        encrypted_private_key: user.encrypted_private_key
      } 
    });
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

app.get('/api/customization', authMiddleware, async (c) => {
  const user_id = c.get('user_id');

  try {
    const preferences = await c.env.DB.prepare(
      'SELECT theme_preferences, node_primary_color, node_secondary_color, node_size FROM users WHERE id = ?'
    ).bind(user_id).first();

    if (!preferences) return c.json({ error: 'User preferences not found' }, 404);

    return c.json(preferences);
  } catch (e) {
    console.error("Error fetching user preferences:", e);
    return c.json({ error: 'Failed to fetch user preferences' }, 500);
  }
});

// Helper for hex validation (Strict 8-digit hex for #RRGGBBAA)
const isValidHexColor = (color: string) => /^#[0-9A-Fa-f]{8}$/.test(color);

app.put('/api/customization', authMiddleware, async (c) => {
  const user_id = c.get('user_id');
  const body = await c.req.json();
  const { theme_preferences, node_primary_color, node_secondary_color, node_size } = body;

  let updateFields: string[] = [];
  let updateValues: (string | number)[] = [];

  // Theme Preferences
  if (theme_preferences !== undefined) {
      let themePrefsJson = typeof theme_preferences === 'string' ? theme_preferences : JSON.stringify(theme_preferences);
      updateFields.push('theme_preferences = ?');
      updateValues.push(themePrefsJson);
  }

  // Aesthetics
  if (node_primary_color !== undefined) {
    if (!isValidHexColor(node_primary_color)) return c.json({ error: 'Invalid node_primary_color format' }, 400);
    updateFields.push('node_primary_color = ?');
    updateValues.push(node_primary_color);
  }
  if (node_secondary_color !== undefined) {
    if (!isValidHexColor(node_secondary_color)) return c.json({ error: 'Invalid node_secondary_color format' }, 400);
    updateFields.push('node_secondary_color = ?');
    updateValues.push(node_secondary_color);
  }
  if (node_size !== undefined) {
    if (typeof node_size !== 'number' || node_size < 4 || node_size > 30) return c.json({ error: 'Invalid node_size' }, 400);
    updateFields.push('node_size = ?');
    updateValues.push(node_size);
  }

  if (updateFields.length === 0) {
    return c.json({ message: 'No customization updates provided' }, 400);
  }

  try {
    const { success } = await c.env.DB.prepare(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`
    ).bind(...updateValues, user_id).run();

    if (success) {
      return c.json({ message: 'Customization updated successfully' });
    } else {
      return c.json({ error: 'Failed to update customization' }, 500);
    }
  } catch (e) {
    console.error("Error updating customization:", e);
    return c.json({ error: 'Failed to update customization' }, 500);
  }
});


// Deprecated routes kept for backward compat if needed (redirecting logic internally)
app.get('/api/users/me/preferences', authMiddleware, async (c) => {
    // Reuse new logic
    const user_id = c.get('user_id');
    const preferences = await c.env.DB.prepare('SELECT theme_preferences, node_primary_color, node_secondary_color, node_size FROM users WHERE id = ?').bind(user_id).first();
    return c.json(preferences);
});

app.put('/api/users/me/profile-aesthetics', authMiddleware, async (c) => {
  const user_id = c.get('user_id');
  const { node_primary_color, node_secondary_color, node_size } = await c.req.json();

  let updateFields: string[] = [];
  let updateValues: (string | number)[] = [];

  if (node_primary_color !== undefined) {
    if (!isValidHexColor(node_primary_color)) return c.json({ error: 'Invalid node_primary_color format' }, 400);
    updateFields.push('node_primary_color = ?');
    updateValues.push(node_primary_color);
  }
  if (node_secondary_color !== undefined) {
    if (!isValidHexColor(node_secondary_color)) return c.json({ error: 'Invalid node_secondary_color format' }, 400);
    updateFields.push('node_secondary_color = ?');
    updateValues.push(node_secondary_color);
  }
  if (node_size !== undefined) {
    if (typeof node_size !== 'number' || node_size < 4 || node_size > 30) return c.json({ error: 'Invalid node_size' }, 400);
    updateFields.push('node_size = ?');
    updateValues.push(node_size);
  }

  if (updateFields.length === 0) {
    return c.json({ message: 'No profile aesthetics to update' }, 400);
  }

  try {
    const { success } = await c.env.DB.prepare(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`
    ).bind(...updateValues, user_id).run();

    if (success) {
      return c.json({ message: 'Profile aesthetics updated successfully' });
    } else {
      return c.json({ error: 'Failed to update profile aesthetics' }, 500);
    }
  } catch (e) {
    console.error("Error updating profile aesthetics:", e);
    return c.json({ error: 'Failed to update profile aesthetics' }, 500);
  }
});

// Apply middleware to protected routes
app.use('/api/drift', authMiddleware);
app.use('/api/relationships', authMiddleware); // Ensure root /api/relationships is protected
app.use('/api/relationships/*', authMiddleware);
app.use('/api/notifications', authMiddleware);
app.use('/api/notifications/*', authMiddleware); // Added wildcart
app.use('/api/files', authMiddleware); // Ensure root /api/files is protected
app.use('/api/files/*', authMiddleware);
app.use('/api/communiques', authMiddleware);
app.use('/api/communiques/*', authMiddleware);
app.use('/api/collections', authMiddleware);
app.use('/api/collections/*', authMiddleware);
app.use('/api/messages', authMiddleware); // Ensure root /api/messages is protected
app.use('/api/messages/*', authMiddleware); // Added messages middleware
app.use('/api/users/*', authMiddleware); // Ensure user routes are authenticated


// Durable Object WebSocket endpoint
app.get('/api/do-websocket', authMiddleware, async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }

  try {
    const doId = c.env.DO_NAMESPACE.idFromName('relf-do-instance');
    const doStub = c.env.DO_NAMESPACE.get(doId);

    // Rewrite URL to match what DO expects
    const url = new URL(c.req.url);
    url.pathname = '/websocket';

    const newRequest = new Request(url.toString(), c.req.raw);
    newRequest.headers.set('X-User-ID', c.get('user_id').toString());

    return doStub.fetch(newRequest);
  } catch (error) {
    console.error("Error proxying WebSocket to DO:", error);
    return c.text('WebSocket proxy failed', 500);
  }
});

// Document Collaboration WebSocket endpoint
app.get('/api/collab/:fileId', authMiddleware, async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }
  const fileId = c.req.param('fileId');

  try {
    // Map fileId to a unique DocumentRoom DO instance
    const doId = c.env.DOCUMENT_ROOM.idFromName(fileId);
    const doStub = c.env.DOCUMENT_ROOM.get(doId);

    return doStub.fetch(c.req.raw);
  } catch (error) {
    console.error("Error proxying Collab WebSocket:", error);
    return c.text('Collab WebSocket proxy failed', 500);
  }
});

// GET /api/admin/stats: System statistics (Admin only)
app.get('/api/admin/stats', authMiddleware, async (c) => {
  const user_id = c.get('user_id');
  // Simple admin check: assume user ID 1 is the admin
  if (user_id !== 1) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  try {
    const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first('count');
    const fileCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM files').first('count');
    const activeFiles = await c.env.DB.prepare('SELECT COUNT(*) as count FROM files WHERE is_archived = 0').first('count');
    const archivedFiles = await c.env.DB.prepare('SELECT COUNT(*) as count FROM files WHERE is_archived = 1').first('count');

    return c.json({
      users: userCount,
      total_files: fileCount,
      active_files: activeFiles,
      archived_files: archivedFiles
    });
  } catch (e) {
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// GET /api/admin/users: List users (Admin only)
app.get('/api/admin/users', authMiddleware, async (c) => {
  const user_id = c.get('user_id');
  if (user_id !== 1) return c.json({ error: 'Unauthorized' }, 403);

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, username, email, created_at, is_verified FROM users ORDER BY created_at DESC LIMIT 100'
    ).all();
    return c.json({ users: results });
  } catch (e) {
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// DELETE /api/admin/users/:id: Delete user (Admin only)
app.delete('/api/admin/users/:id', authMiddleware, async (c) => {
  const user_id = c.get('user_id');
  if (user_id !== 1) return c.json({ error: 'Unauthorized' }, 403);
  const targetId = Number(c.req.param('id'));

  if (targetId === 1) return c.json({ error: 'Cannot delete admin' }, 400);

  try {
    // Cascade delete manually if foreign keys aren't set
    await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId),
        c.env.DB.prepare('DELETE FROM files WHERE user_id = ?').bind(targetId),
        c.env.DB.prepare('DELETE FROM relationships WHERE source_user_id = ? OR target_user_id = ?').bind(targetId, targetId),
        c.env.DB.prepare('DELETE FROM communiques WHERE user_id = ?').bind(targetId)
    ]);
    return c.json({ message: 'User deleted' });
  } catch (e) {
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// POST /api/admin/broadcast: System broadcast (Admin only)
app.post('/api/admin/broadcast', authMiddleware, async (c) => {
  const user_id = c.get('user_id');
  if (user_id !== 1) return c.json({ error: 'Unauthorized' }, 403);

  const { message } = await c.req.json();
  if (!message) return c.json({ error: 'Message required' }, 400);

  try {
      // 1. Create system notification for all users? Too expensive for DB.
      // Instead, just use WebSocket broadcast via DO
      await broadcastSignal(c.env, 'system_alert', 1, { message });
      return c.json({ message: 'Broadcast sent' });
  } catch (e) {
      return c.json({ error: 'Broadcast failed' }, 500);
  }
});

// --- User Discovery Routes ---

// GET /api/users/search: Search users by username
app.get('/api/users/search', authMiddleware, async (c) => {
  const query = c.req.query('q');
  if (!query || query.length < 2) return c.json({ users: [] });

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, username, avatar_url FROM users WHERE username LIKE ? LIMIT 10'
    ).bind(`%${query}%`).all();

    const users = results.map((u: any) => ({
      ...u,
      avatar_url: (u.avatar_url && typeof u.avatar_url === 'string' && u.avatar_url.startsWith('avatars/')) 
        ? getR2PublicUrl(c, u.avatar_url) 
        : u.avatar_url
    }));

    return c.json({ users });
  } catch (e) {
    console.error("Search error:", e);
    return c.json({ error: 'Search failed' }, 500);
  }
});

// GET /api/users/random: Get a random user profile
app.get('/api/users/random', authMiddleware, async (c) => {
  const user_id = c.get('user_id');
  try {
    const user = await c.env.DB.prepare(
      'SELECT id, username, avatar_url FROM users WHERE id != ? ORDER BY RANDOM() LIMIT 1'
    ).bind(user_id).first();

    if (!user) return c.json({ error: 'No other users found' }, 404);

    const avatarUrl = (user.avatar_url && typeof user.avatar_url === 'string' && user.avatar_url.startsWith('avatars/')) 
      ? getR2PublicUrl(c, user.avatar_url as string) 
      : user.avatar_url;

    return c.json({ user: { id: user.id, username: user.username, avatar_url: avatarUrl } });
  } catch (e) {
    console.error("Random user error:", e);
    return c.json({ error: 'Failed to fetch random user' }, 500);
  }
});

// GET /api/users/:id: Get public user profile
app.get('/api/users/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const user = await c.env.DB.prepare(
      'SELECT id, username, avatar_url FROM users WHERE id = ?'
    ).bind(id).first();

    if (!user) return c.json({ error: 'User not found' }, 404);

    const avatarUrl = (user.avatar_url && typeof user.avatar_url === 'string' && user.avatar_url.startsWith('avatars/')) 
      ? getR2PublicUrl(c, user.avatar_url as string) 
      : user.avatar_url;

    return c.json({ user: { id: user.id, username: user.username, avatar_url: avatarUrl } });
  } catch (e) {
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});


// --- Notification Helpers ---

async function createNotification(
  env: Env, // Pass env to access DO_NAMESPACE
  db: D1Database, 
  user_id: number, 
  type: 'sym_request' | 'sym_accepted' | 'file_shared' | 'system_alert', 
  actor_id?: number, 
  payload: any = {}
) {
  try {
    await db.prepare(
      'INSERT INTO notifications (user_id, actor_id, type, payload) VALUES (?, ?, ?, ?)'
    ).bind(user_id, actor_id || null, type, JSON.stringify(payload)).run();

    // Notify the user via Durable Object WebSocket
    const doId = env.DO_NAMESPACE.idFromName('relf-do-instance');
    const doStub = env.DO_NAMESPACE.get(doId);
    
    await doStub.fetch('http://do-stub/notify', { // URL is arbitrary, DO fetch uses path
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user_id, 
        message: { type: 'new_notification', notificationType: type, actorId: actor_id, payload } 
      }),
    });

  } catch (e) {
    console.error("Failed to create notification or notify via DO:", e);
  }
}

async function broadcastSignal(
  env: Env,
  type: 'signal_communique' | 'signal_artifact',
  userId: number,
  payload: any = {}
) {
  try {
    const doId = env.DO_NAMESPACE.idFromName('relf-do-instance');
    const doStub = env.DO_NAMESPACE.get(doId);
    
    await doStub.fetch('http://do-stub/broadcast-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        type, 
        userId, 
        payload 
      }),
    });
  } catch (e) {
    console.error("Failed to broadcast signal:", e);
  }
}

// --- Notification Routes ---

// GET /api/notifications: List notifications
app.get('/api/notifications', async (c) => {
  const user_id = c.get('user_id');
  
  try {
    // Fetch notifications with actor details
    const { results } = await c.env.DB.prepare(
      `SELECT n.*, u.username as actor_name, u.avatar_url as actor_avatar 
       FROM notifications n 
       LEFT JOIN users u ON n.actor_id = u.id 
       WHERE n.user_id = ? 
       ORDER BY n.created_at DESC 
       LIMIT 50`
    ).bind(user_id).all();

    return c.json({ notifications: results });
  } catch (e: any) {
    console.error("Error fetching notifications:", e);
    return c.json({ error: 'Failed to fetch notifications' }, 500);
  }
});

// PUT /api/notifications/:id/read: Mark as read
app.put('/api/notifications/:id/read', async (c) => {
  const user_id = c.get('user_id');
  const notification_id = Number(c.req.param('id'));

  try {
    await c.env.DB.prepare(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
    ).bind(notification_id, user_id).run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to update notification' }, 500);
  }
});

// PUT /api/notifications/read-all: Mark all notifications as read
app.put('/api/notifications/read-all', async (c) => {
  const user_id = c.get('user_id');

  try {
    await c.env.DB.prepare(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?'
    ).bind(user_id).run();
    return c.json({ success: true });
  } catch (e) {
    console.error("Error marking all notifications as read:", e);
    return c.json({ error: 'Failed to mark all notifications as read' }, 500);
  }
});

// DELETE /api/notifications/:id: Delete a notification
app.delete('/api/notifications/:id', async (c) => {
  const user_id = c.get('user_id');
  const notification_id = Number(c.req.param('id'));

  if (isNaN(notification_id)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const { success } = await c.env.DB.prepare(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?'
    ).bind(notification_id, user_id).run();

    if (success) {
        return c.json({ message: 'Notification deleted' });
    } else {
        return c.json({ error: 'Failed to delete notification' }, 500);
    }
  } catch (e) {
    console.error("Error deleting notification:", e);
    return c.json({ error: 'Failed to delete notification' }, 500);
  }
});

// --- Relationship Routes ---

// POST /api/relationships/follow: Create an asym_follow relationship
app.post('/api/relationships/follow', authMiddleware, async (c) => {
  const source_user_id = c.get('user_id');
  const { target_user_id } = await c.req.json();

  if (!target_user_id) {
    return c.json({ error: 'Missing target_user_id' }, 400);
  }
  if (source_user_id === target_user_id) {
    return c.json({ error: 'Cannot follow yourself' }, 400);
  }

  try {
    // Check if any relationship exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ?'
    ).bind(source_user_id, target_user_id).first();

    if (existing) {
       return c.json({ error: 'Relationship already exists' }, 409);
    }

    const { success } = await c.env.DB.prepare(
      'INSERT INTO relationships (source_user_id, target_user_id, type, status) VALUES (?, ?, ?, ?)'
    ).bind(source_user_id, target_user_id, 'asym_follow', 'accepted').run();

    if (success) {
      return c.json({ message: 'User followed successfully' });
    } else {
      return c.json({ error: 'Failed to follow user' }, 500);
    }
  } catch (e: any) {
    if (e.message && e.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Already following this user' }, 409);
    }
    console.error("Error following user:", e);
    return c.json({ error: 'Failed to establish relationship' }, 500);
  }
});

// POST /api/relationships/sym-request: Send a sym_request
app.post('/api/relationships/sym-request', authMiddleware, async (c) => {
  const source_user_id = c.get('user_id');
  const { target_user_id } = await c.req.json();

  if (!target_user_id) {
    return c.json({ error: 'Missing target_user_id' }, 400);
  }
  if (source_user_id === target_user_id) {
    return c.json({ error: 'Cannot request sym link with yourself' }, 400);
  }

  try {
    // Check if an asym_follow exists from target_user_id to source_user_id
    // This could indicate an existing connection or a reciprocal interest
    const existingAsymReverse = await c.env.DB.prepare(
      'SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type = ?'
    ).bind(target_user_id, source_user_id, 'asym_follow').first();

    // Check if there's already a relationship from source to target
    const existingDirect = await c.env.DB.prepare(
      'SELECT id, type, status FROM relationships WHERE source_user_id = ? AND target_user_id = ?'
    ).bind(source_user_id, target_user_id).first();

    if (existingDirect) {
        if (existingDirect.type === 'sym_request') {
             return c.json({ error: 'Sym request already pending for this user' }, 409);
        }
        if (existingDirect.type === 'sym_accepted') {
             return c.json({ error: 'Already connected' }, 409);
        }
        if (existingDirect.type === 'asym_follow') {
            // Upgrade follow to sym_request
            const { success } = await c.env.DB.prepare(
                'UPDATE relationships SET type = ?, status = ? WHERE id = ?'
            ).bind('sym_request', 'pending', existingDirect.id).run();
            
            if (success) {
                 await createNotification(c.env, c.env.DB, target_user_id, 'sym_request', source_user_id);
                 return c.json({ message: 'Sym request sent (upgraded from follow)' });
            } else {
                 return c.json({ error: 'Failed to upgrade to sym request' }, 500);
            }
        }
    }
    
    // Check if a mutual connection already exists
    const mutual = await c.env.DB.prepare(
      'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
    ).bind(Math.min(source_user_id, target_user_id), Math.max(source_user_id, target_user_id), Math.min(source_user_id, target_user_id), Math.max(source_user_id, target_user_id)).first();

    if (mutual) {
        return c.json({ error: 'Already have a mutual (sym) connection with this user' }, 409);
    }


    const { success } = await c.env.DB.prepare(
      'INSERT INTO relationships (source_user_id, target_user_id, type, status) VALUES (?, ?, ?, ?)'
    ).bind(source_user_id, target_user_id, 'sym_request', 'pending').run();

    if (success) {
      // Trigger notification for target
      await createNotification(c.env, c.env.DB, target_user_id, 'sym_request', source_user_id);
      return c.json({ message: 'Sym request sent successfully' });
    } else {
      return c.json({ error: 'Failed to send sym request' }, 500);
    }
  } catch (e: any) {
    console.error("Error sending sym request:", e);
    return c.json({ error: 'Failed to send sym request' }, 500);
  }
});

// POST /api/relationships/accept-sym-request: Accept a sym_request
app.post('/api/relationships/accept-sym-request', authMiddleware, async (c) => {
  const target_user_id = c.get('user_id'); // Current user is the target
  const { source_user_id } = await c.req.json(); // User who sent the request

  if (!source_user_id) {
    return c.json({ error: 'Missing source_user_id' }, 400);
  }

  try {
    // 1. Find the pending request from source_user_id to target_user_id
    const request = await c.env.DB.prepare(
      'SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type = ? AND status = ?'
    ).bind(source_user_id, target_user_id, 'sym_request', 'pending').first();

    if (!request) {
      return c.json({ error: 'Sym request not found or not pending' }, 404);
    }

    const userA = Math.min(source_user_id, target_user_id);
    const userB = Math.max(source_user_id, target_user_id);

    // Use batch() for atomic transaction
    await c.env.DB.batch([
      // 2. Update the existing request to 'sym_accepted'
      c.env.DB.prepare(
        'UPDATE relationships SET type = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind('sym_accepted', 'accepted', request.id),

      // 3. Create the inverse 'sym_accepted' relationship from target_user_id to source_user_id
      c.env.DB.prepare(
        'INSERT INTO relationships (source_user_id, target_user_id, type, status) VALUES (?, ?, ?, ?)'
      ).bind(target_user_id, source_user_id, 'sym_accepted', 'accepted'),

      // 4. Insert into mutual_connections table
      c.env.DB.prepare(
        'INSERT INTO mutual_connections (user_a_id, user_b_id) VALUES (?, ?)'
      ).bind(userA, userB)
    ]);

    // Trigger notification for the source user (who sent the request originally)
    await createNotification(c.env, c.env.DB, source_user_id, 'sym_accepted', target_user_id);
    
    return c.json({ message: 'Sym request accepted and mutual connection established' });

  } catch (e: any) {
    console.error("Error accepting sym request:", e);
    return c.json({ error: 'Failed to accept sym request' }, 500);
  }
});

// POST /api/relationships/decline-sym-request: Decline a sym_request
app.post('/api/relationships/decline-sym-request', authMiddleware, async (c) => {
  const target_user_id = c.get('user_id'); // Current user is the target
  const { source_user_id } = await c.req.json(); // User who sent the request

  if (!source_user_id) {
    return c.json({ error: 'Missing source_user_id' }, 400);
  }

  try {
    const request = await c.env.DB.prepare(
      'SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type = ? AND status = ?'
    ).bind(source_user_id, target_user_id, 'sym_request', 'pending').first();

    if (!request) {
      return c.json({ error: 'Sym request not found or not pending' }, 404);
    }

    const { success } = await c.env.DB.prepare(
      'UPDATE relationships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('rejected', request.id).run();

    if (success) {
      return c.json({ message: 'Sym request declined' });
    } else {
      return c.json({ error: 'Failed to decline sym request' }, 500);
    }
  } catch (e: any) {
    console.error("Error declining sym request:", e);
    return c.json({ error: 'Failed to decline sym request' }, 500);
  }
});

// DELETE /api/relationships/:target_user_id: Remove a relationship
app.delete('/api/relationships/:target_user_id', authMiddleware, async (c) => {
  const source_user_id = c.get('user_id');
  const target_user_id = Number(c.req.param('target_user_id'));

  if (isNaN(target_user_id)) {
    return c.json({ error: 'Invalid target_user_id' }, 400);
  }

  try {
    // Check if it's an asym_follow
    const asymFollow = await c.env.DB.prepare(
      'SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type = ?'
    ).bind(source_user_id, target_user_id, 'asym_follow').first();

    if (asymFollow) {
      await c.env.DB.prepare(
        'DELETE FROM relationships WHERE id = ?'
      ).bind(asymFollow.id).run();
      return c.json({ message: 'User unfollowed successfully' });
    }

    // Check if it's a sym_accepted relationship (either direction)
    const symRel1 = await c.env.DB.prepare(
      'SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type = ?'
    ).bind(source_user_id, target_user_id, 'sym_accepted').first();
    const symRel2 = await c.env.DB.prepare(
      'SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type = ?'
    ).bind(target_user_id, source_user_id, 'sym_accepted').first();

    if (symRel1 && symRel2) { // Mutual 'sym_accepted' relationship exists
      const userA = Math.min(source_user_id, target_user_id);
      const userB = Math.max(source_user_id, target_user_id);
      
      // Use batch for atomicity
      await c.env.DB.batch([
          c.env.DB.prepare('DELETE FROM relationships WHERE id = ?').bind(symRel1.id),
          c.env.DB.prepare('DELETE FROM relationships WHERE id = ?').bind(symRel2.id),
          c.env.DB.prepare('DELETE FROM mutual_connections WHERE user_a_id = ? AND user_b_id = ?').bind(userA, userB)
      ]);

      return c.json({ message: 'Mutual (sym) connection removed successfully' });
    }
    
    // Check if it's a pending sym_request sent by the current user
    const pendingSymRequest = await c.env.DB.prepare(
        'SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type = ? AND status = ?'
    ).bind(source_user_id, target_user_id, 'sym_request', 'pending').first();

    if (pendingSymRequest) {
        await c.env.DB.prepare(
            'DELETE FROM relationships WHERE id = ?'
        ).bind(pendingSymRequest.id).run();
        return c.json({ message: 'Pending sym request cancelled successfully' });
    }

    return c.json({ error: 'Relationship not found or not removable by current user' }, 404);

  } catch (e: any) {
    console.error("Error removing relationship:", e);
    return c.json({ error: 'Failed to remove relationship' }, 500);
  }
});

// GET /api/relationships: List relationships for the authenticated user
app.get('/api/relationships', authMiddleware, async (c) => {
  const user_id = c.get('user_id');

  try {
    // Relationships where current user is the source (following, sent sym requests)
    const outgoing = await c.env.DB.prepare(
      `SELECT r.target_user_id as user_id, r.type, r.status, u.username, u.avatar_url 
       FROM relationships r
       JOIN users u ON r.target_user_id = u.id
       WHERE r.source_user_id = ?`
    ).bind(user_id).all();

    // Relationships where current user is the target (followers, received sym requests)
    const incoming = await c.env.DB.prepare(
      `SELECT r.source_user_id as user_id, r.type, r.status, u.username, u.avatar_url 
       FROM relationships r
       JOIN users u ON r.source_user_id = u.id
       WHERE r.target_user_id = ?`
    ).bind(user_id).all();

    // Mutual connections (We need to find the "other" user)
    // Case 1: user_id is A, we want B. Case 2: user_id is B, we want A.
    // We can do this with a UNION or by fetching and post-processing.
    // Let's do a smarter query.
    const mutual = await c.env.DB.prepare(
      `SELECT 
         CASE WHEN mc.user_a_id = ? THEN mc.user_b_id ELSE mc.user_a_id END as user_id,
         u.username, u.avatar_url
       FROM mutual_connections mc
       JOIN users u ON (u.id = CASE WHEN mc.user_a_id = ? THEN mc.user_b_id ELSE mc.user_a_id END)
       WHERE mc.user_a_id = ? OR mc.user_b_id = ?`
    ).bind(user_id, user_id, user_id, user_id).all();

    const processAvatar = (u: any) => ({
        ...u,
        avatar_url: (u.avatar_url && typeof u.avatar_url === 'string' && u.avatar_url.startsWith('avatars/'))
          ? getR2PublicUrl(c, u.avatar_url)
          : u.avatar_url
    });

    return c.json({
      outgoing: outgoing.results.map(processAvatar),
      incoming: incoming.results.map(processAvatar),
      mutual: mutual.results.map(processAvatar),
    });
  } catch (e: any) {
    console.error("Error listing relationships:", e);
    return c.json({ error: 'Failed to list relationships' }, 500);
  }
});

// GET /api/drift: Fetch a random sample of public data (users and files)
app.get('/api/drift', authMiddleware, async (c) => {
    if (!await checkRateLimit(c, 'drift', 20, 600)) { // 20 per 10 mins
        return c.json({ error: 'Drifting too fast. Please wait.' }, 429);
    }
    const user_id = c.get('user_id');
    const type = c.req.query('type'); // 'image', 'audio', 'text', or undefined

    try {
        // Optimization Note: ORDER BY RANDOM() can be slow on very large tables.
        // For the current scale of Rel F, this is acceptable.

        const driftUsers = await c.env.DB.prepare(
            `SELECT u.id, u.username, u.avatar_url 
             FROM users u
             LEFT JOIN mutual_connections mc ON (u.id = mc.user_a_id AND mc.user_b_id = ?) OR (u.id = mc.user_b_id AND mc.user_a_id = ?)
             WHERE u.id != ? AND mc.id IS NULL
             ORDER BY RANDOM()
             LIMIT 10`
        ).bind(user_id, user_id, user_id).all();

        let fileQuery = `
             SELECT f.id, f.filename, f.mime_type, f.user_id, u.username as owner_username
             FROM files f
             JOIN users u ON f.user_id = u.id
             LEFT JOIN mutual_connections mc ON (f.user_id = mc.user_a_id AND mc.user_b_id = ?) OR (f.user_id = mc.user_b_id AND mc.user_a_id = ?)
             WHERE f.visibility = 'public' AND f.user_id != ? AND mc.id IS NULL
        `;
        const fileParams: (string | number)[] = [user_id, user_id, user_id];

        if (type) {
            fileQuery += ` AND f.mime_type LIKE ?`;
            fileParams.push(`${type}/%`);
        }

        fileQuery += ` ORDER BY RANDOM() LIMIT 10`;

        const driftFiles = await c.env.DB.prepare(fileQuery).bind(...fileParams).all();

        const processAvatar = (u: any) => ({
            ...u,
            avatar_url: (u.avatar_url && typeof u.avatar_url === 'string' && u.avatar_url.startsWith('avatars/'))
              ? getR2PublicUrl(c, u.avatar_url)
              : u.avatar_url
        });

        return c.json({
            users: driftUsers.results.map(processAvatar),
            files: driftFiles.results
        });

    } catch (e: any) {
        console.error("Error fetching drift data:", e);
        return c.json({ error: 'Failed to fetch drift data' }, 500);
    }
});


// --- Communique Routes ---

// GET /api/communiques/:user_id: Fetch a user's communique
app.get('/api/communiques/:user_id', authMiddleware, async (c) => {
  const user_id = Number(c.req.param('user_id'));
  if (isNaN(user_id)) return c.json({ error: 'Invalid user ID' }, 400);

  try {
    const communique = await c.env.DB.prepare(
      'SELECT content, theme_prefs, updated_at FROM communiques WHERE user_id = ?'
    ).bind(user_id).first();

    if (!communique) {
      // Return default empty state if not found, rather than 404, so UI can render "Empty"
      return c.json({ content: '', theme_prefs: '{}', updated_at: null });
    }

    return c.json(communique);
  } catch (e: any) {
    console.error("Error fetching communique:", e);
    return c.json({ error: 'Failed to fetch communique' }, 500);
  }
});

// PUT /api/communiques: Update the current user's communique
app.put('/api/communiques', async (c) => {
  const user_id = c.get('user_id'); // From auth middleware
  if (!user_id) return c.json({ error: 'Unauthorized' }, 401);

  const { content, theme_prefs } = await c.req.json();

  if (typeof content !== 'string') {
    return c.json({ error: 'Invalid content format' }, 400);
  }

  // Validate JSON for theme_prefs if provided
  let themePrefsStr = '{}';
  if (theme_prefs) {
    if (typeof theme_prefs === 'string') {
      themePrefsStr = theme_prefs; // Assume valid JSON string if passed as string
    } else {
      themePrefsStr = JSON.stringify(theme_prefs);
    }
  }

  try {
    const { success } = await c.env.DB.prepare(
      `INSERT INTO communiques (user_id, content, theme_prefs, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET 
       content = excluded.content, 
       theme_prefs = excluded.theme_prefs, 
       updated_at = excluded.updated_at`
    ).bind(user_id, content, themePrefsStr).run();

    if (success) {
      // Trigger Pulse Signal
      await broadcastSignal(c.env, 'signal_communique', user_id, {
          updated_at: new Date().toISOString()
      });
      return c.json({ message: 'Communique updated successfully' });
    } else {
      return c.json({ error: 'Failed to update communique' }, 500);
    }
  } catch (e: any) {
    console.error("Error updating communique:", e);
    return c.json({ error: 'Failed to update communique' }, 500);
  }
});


// --- Files Routes ---

// GET /api/files: List files for the authenticated user (My Files)
app.get('/api/files', async (c) => {
  const user_id = c.get('user_id');

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM files WHERE user_id = ? AND is_archived = 0 ORDER BY created_at DESC'
    ).bind(user_id).all();

    return c.json({ files: results });
  } catch (e: any) {
    console.error("Error listing files:", e);
    return c.json({ error: 'Failed to list files' }, 500);
  }
});

// GET /api/users/:target_user_id/files: List files for another user (Shared/Public)
app.get('/api/users/:target_user_id/files', async (c) => {
  const user_id = c.get('user_id'); // Me
  const target_user_id = Number(c.req.param('target_user_id'));

  if (isNaN(target_user_id)) return c.json({ error: 'Invalid user ID' }, 400);

  try {
    // 1. Check relationship
    // If I am the target, redirect to /api/files logic (or just return same)
    if (user_id === target_user_id) {
       const { results } = await c.env.DB.prepare(
        'SELECT * FROM files WHERE user_id = ? AND is_archived = 0 ORDER BY created_at DESC'
      ).bind(user_id).all();
      return c.json({ files: results });
    }

    // Check for mutual connection
    const mutual = await c.env.DB.prepare(
      'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
    ).bind(Math.min(user_id, target_user_id), Math.max(user_id, target_user_id), Math.min(user_id, target_user_id), Math.max(user_id, target_user_id)).first();

    let query = 'SELECT * FROM files WHERE user_id = ? AND is_archived = 0 AND visibility = "public"';
    
    // If mutual, allow 'sym' visibility too
    if (mutual) {
        query = 'SELECT * FROM files WHERE user_id = ? AND is_archived = 0 AND (visibility = "public" OR visibility = "sym")';
    }

    const { results } = await c.env.DB.prepare(query + ' ORDER BY created_at DESC').bind(target_user_id).all();
    return c.json({ files: results });

  } catch (e: any) {
    console.error("Error listing user files:", e);
    return c.json({ error: 'Failed to list files' }, 500);
  }
});

// POST /api/files/upload-url: Get a presigned URL for uploading a file
// Note: Since standard R2 bindings don't support getSignedUrl directly without AWS SDK, 
// we will implement a direct upload via Worker for simplicity in this phase, 
// verifying auth and quota.
// For larger files, we would use the S3 compatible API with aws-sdk-js-v3.

// POST /api/files: Upload a file
app.post('/api/files', async (c) => {
  const user_id = c.get('user_id');
  
  // Parse form data to get file and metadata
  // We expect a FormData with 'file' and optional 'visibility'
  try {
    const formData = await c.req.parseBody();
    const file = formData['file'] as File;
    const visibility = (formData['visibility'] as string) || 'private';
    const parent_id = formData['parent_id'] ? Number(formData['parent_id']) : null;
    const shouldEncrypt = formData['encrypt'] === 'true';

    if (!file) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    // Encryption logic
    let body: ReadableStream | ArrayBuffer = file.stream();
    let is_encrypted = 0;
    let iv: string | null = null;
    let size = file.size;

    if (shouldEncrypt && c.env.ENCRYPTION_SECRET) {
      const arrayBuffer = await file.arrayBuffer();
      const encryptedData = await encryptData(arrayBuffer, c.env.ENCRYPTION_SECRET);
      body = encryptedData.encrypted;
      iv = encryptedData.iv;
      is_encrypted = 1;
      size = encryptedData.encrypted.byteLength;
    }

    // Generate a unique key for R2
    const r2_key = `${user_id}/${crypto.randomUUID()}-${file.name}`;
    
    // Upload to R2
    await c.env.BUCKET.put(r2_key, body, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        userId: String(user_id),
        isEncrypted: String(is_encrypted)
      }
    });

    // Record in D1
    const expires_at = new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString(); // Default 168h (7 days) life

    // Check for burn_on_read flag in formData (default false)
    const burn_on_read = formData['burn_on_read'] === 'true';

    // Map allowed visibility values
    // DB Constraint: visibility IN ('public', 'sym', 'me')
    // Frontend currently sends 'private', so map it to 'me'.
    let dbVisibility = visibility;
    if (dbVisibility === 'private') {
      dbVisibility = 'me';
    } else if (!['public', 'sym', 'me'].includes(dbVisibility)) {
      dbVisibility = 'me'; // Default safe fallback
    }

    const { success } = await c.env.DB.prepare(
      `INSERT INTO files (user_id, r2_key, filename, size, mime_type, visibility, expires_at, parent_id, is_encrypted, iv, burn_on_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(user_id, r2_key, file.name, size, file.type, dbVisibility, expires_at, parent_id, is_encrypted, iv, burn_on_read).run();

    if (success) {
      // Trigger Pulse Signal if public or sym
      // IMPORTANT: Non-blocking to prevent upload failure if DO is busy
      if (visibility === 'public' || visibility === 'sym') {
         c.executionCtx.waitUntil(
             broadcastSignal(c.env, 'signal_artifact', user_id, {
                 filename: file.name,
                 mime_type: file.type,
                 visibility
             }).catch(err => console.error("Pulse signal failed:", err))
         );
      }
      return c.json({ message: 'File uploaded successfully', r2_key, expires_at });
    } else {
      // If DB insert fails, we must delete the orphan file from R2 (Atomicity)
      try {
        await c.env.BUCKET.delete(r2_key);
        console.log(`Atomicity: Deleted orphan file ${r2_key} after DB failure.`);
      } catch (cleanupErr) {
        console.error(`Failed to cleanup orphan file ${r2_key}:`, cleanupErr);
      }
      return c.json({ error: 'Failed to record file metadata' }, 500);
    }

  } catch (e: any) {
    console.error("Error uploading file:", e);
    return c.json({ error: 'File upload failed' }, 500);
  }
});

// GET /api/files/:id/metadata: Get file metadata
app.get('/api/files/:id/metadata', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));

  if (isNaN(file_id)) return c.json({ error: 'Invalid file ID' }, 400);

  try {
    const file = await c.env.DB.prepare(
      'SELECT id, filename, size, mime_type, visibility, vitality, expires_at, created_at, user_id FROM files WHERE id = ?'
    ).bind(file_id).first();

    if (!file) return c.json({ error: 'File not found' }, 404);

    // Permission check (same as download)
    if (file.user_id !== user_id && file.visibility === 'private') {
         return c.json({ error: 'Unauthorized' }, 403);
    }
    // If 'sym', check mutual (omitted for brevity, but ideally should be here or frontend handles it via error on content fetch)
    // For metadata, we can be slightly more lenient or just strictly follow visibility.
    // Let's check mutual if sym.
    if (file.user_id !== user_id && file.visibility === 'sym') {
         const mutual = await c.env.DB.prepare(
            'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
        ).bind(Math.min(user_id, file.user_id as number), Math.max(user_id, file.user_id as number), Math.min(user_id, file.user_id as number), Math.max(user_id, file.user_id as number)).first();
        
        if (!mutual) return c.json({ error: 'Unauthorized' }, 403);
    }

    return c.json(file);
  } catch (e) {
    console.error("Error fetching file metadata:", e);
    return c.json({ error: 'Failed to fetch metadata' }, 500);
  }
});

// GET /api/files/:id/content: Download a file
app.get('/api/files/:id/content', async (c) => {
  const user_id = c.get('user_id'); // Current user
  const file_id = Number(c.req.param('id'));

  if (isNaN(file_id)) return c.json({ error: 'Invalid file ID' }, 400);

  try {
    // 1. Get file metadata
    const file = await c.env.DB.prepare(
      'SELECT * FROM files WHERE id = ?'
    ).bind(file_id).first();

    if (!file) return c.json({ error: 'File not found' }, 404);

    // 2. Check permissions
    // Owner can always download
    // 'public' files can be downloaded by anyone (authenticated for now)
    
    if (file.user_id !== user_id) {
        if (file.visibility === 'private') {
            return c.json({ error: 'Unauthorized access to file' }, 403);
        }
        if (file.visibility === 'sym') {
            // Check mutual connection
            const mutual = await c.env.DB.prepare(
                'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
            ).bind(Math.min(user_id, file.user_id as number), Math.max(user_id, file.user_id as number), Math.min(user_id, file.user_id as number), Math.max(user_id, file.user_id as number)).first();
            
            if (!mutual) {
                 return c.json({ error: 'Unauthorized: Sym connection required' }, 403);
            }
        }
    }

    // 3. Fetch from R2
  const object = await c.env.BUCKET.get(file.r2_key, {
    range: c.req.header('Range') // Pass Range header for seeking
  });

    if (!object) {
      return c.json({ error: 'File content missing in storage' }, 404);
    }

    let body = await object.arrayBuffer();

    // Decrypt if needed (Server-side fallback)
    if (file.is_encrypted && file.iv && c.env.ENCRYPTION_SECRET) {
        try {
            body = await decryptData(body, file.iv as string, c.env.ENCRYPTION_SECRET);
        } catch (e) {
            console.error("Decryption failed:", e);
            return c.json({ error: 'Failed to decrypt file' }, 500);
        }
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Content-Disposition', `attachment; filename="${file.filename}"`);

    // Handle Burn On Read (Ephemeral)
    if (file.burn_on_read) {
        // Schedule deletion after response (or immediately if we trust the buffer is in memory)
        // Since this is a Worker, we can use waitUntil to perform background tasks
        c.executionCtx.waitUntil(async function() {
            await c.env.BUCKET.delete(file.r2_key as string);
            await c.env.DB.prepare('DELETE FROM files WHERE id = ?').bind(file_id).run();
            console.log(`Burned file ${file_id} after read.`);
        }());
    }

    return new Response(body, {
      headers,
    });

  } catch (e: any) {
    console.error("Error downloading file:", e);
    return c.json({ error: 'Failed to download file' }, 500);
  }
});

// PUT /api/files/:id/content: Update file content (Text only)
app.put('/api/files/:id/content', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  const { content } = await c.req.json();

  if (isNaN(file_id)) return c.json({ error: 'Invalid file ID' }, 400);
  if (typeof content !== 'string') return c.json({ error: 'Content must be string' }, 400);

  try {
    const file = await c.env.DB.prepare('SELECT * FROM files WHERE id = ?').bind(file_id).first();
    if (!file) return c.json({ error: 'File not found' }, 404);
    if (file.user_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);

    // Update R2
    await c.env.BUCKET.put(file.r2_key as string, content, {
        httpMetadata: { contentType: file.mime_type as string } // Preserve mime type
    });

    // Update D1 (size, updated_at if exists, or just ensure vitality bumps?)
    // Let's bump vitality slightly on edit to keep it alive
    await c.env.DB.prepare(
        'UPDATE files SET size = ?, vitality = vitality + 1 WHERE id = ?'
    ).bind(content.length, file_id).run();

    // Notify via DO (Optimization: broadcast to anyone watching this file?)
    // For now, we just notify the user themselves as confirmation, or maybe collaborators later.
    // Ideally we broadcast to a "file room". Since we don't have file rooms yet, we skip broadcasting
    // specific file updates to others unless we track "subscribers".
    
    return c.json({ message: 'File updated successfully' });

  } catch (e: any) {
    console.error("Error updating file:", e);
    return c.json({ error: 'Failed to update file' }, 500);
  }
});

// POST /api/files/:id/share: Share a file with a connection
app.post('/api/files/:id/share', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  const { target_user_id } = await c.req.json();

  if (isNaN(file_id) || !target_user_id) return c.json({ error: 'Invalid parameters' }, 400);

  try {
    // 1. Get file
    const file = await c.env.DB.prepare('SELECT * FROM files WHERE id = ?').bind(file_id).first();
    if (!file) return c.json({ error: 'File not found' }, 404);
    if (file.user_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);

    // 2. Check relationship (must be mutual 'sym_accepted')
    const mutual = await c.env.DB.prepare(
      'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
    ).bind(Math.min(user_id, target_user_id), Math.max(user_id, target_user_id), Math.min(user_id, target_user_id), Math.max(user_id, target_user_id)).first();

    if (!mutual) return c.json({ error: 'Must be mutually connected to share' }, 403);

    // 3. Ensure file is visible (upgrade to 'sym' if 'private')
    if (file.visibility === 'private') {
      await c.env.DB.prepare("UPDATE files SET visibility = 'sym' WHERE id = ?").bind(file_id).run();
    }

    // 4. Send Notification
    await createNotification(c.env, c.env.DB, target_user_id, 'file_shared', user_id, {
      file_id: file.id,
      filename: file.filename
    });

    return c.json({ message: 'Artifact shared successfully' });

  } catch (e: any) {
    console.error("Error sharing file:", e);
    return c.json({ error: 'Failed to share file' }, 500);
  }
});

// DELETE /api/files/:id: Delete a file
app.delete('/api/files/:id', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));

  if (isNaN(file_id)) return c.json({ error: 'Invalid file ID' }, 400);

  try {
    const file = await c.env.DB.prepare(
      'SELECT r2_key, user_id FROM files WHERE id = ?'
    ).bind(file_id).first();

    if (!file) return c.json({ error: 'File not found' }, 404);

    if (file.user_id !== user_id) {
      return c.json({ error: 'Unauthorized to delete this file' }, 403);
    }

    // Delete from R2
    await c.env.BUCKET.delete(file.r2_key as string);

    // Delete from D1 (or soft delete)
    await c.env.DB.prepare(
      'DELETE FROM files WHERE id = ?'
    ).bind(file_id).run();

    return c.json({ message: 'File deleted successfully' });

  } catch (e: any) {
    console.error("Error deleting file:", e);
    return c.json({ error: 'Failed to delete file' }, 500);
  }
});


// POST /api/files/:id/refresh: Reset expiration timer (Keep Alive)
app.post('/api/files/:id/refresh', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));

  if (isNaN(file_id)) return c.json({ error: 'Invalid file ID' }, 400);

  try {
    const file = await c.env.DB.prepare('SELECT user_id FROM files WHERE id = ?').bind(file_id).first();
    if (!file) return c.json({ error: 'File not found' }, 404);
    
    // Allow owner or mutuals (if we checked mutuals) to refresh? 
    // For now, let's allow owner only, or anyone with access if public/sym.
    // Simplest: Check if user has access.
    
    // Update expires_at to 7 days from now
    const new_expires_at = new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString();
    
    const { success } = await c.env.DB.prepare(
      'UPDATE files SET expires_at = ? WHERE id = ?'
    ).bind(new_expires_at, file_id).run();

    if (success) {
      return c.json({ message: 'File expiration reset to 7 days.', expires_at: new_expires_at });
    } else {
      return c.json({ error: 'Failed to refresh file' }, 500);
    }
  } catch (e: any) {
    console.error("Error refreshing file:", e);
    return c.json({ error: 'Failed to refresh file' }, 500);
  }
});

// POST /api/files/:id/vitality: Vote on a file (increase vitality)
app.post('/api/files/:id/vitality', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));
  const { amount } = await c.req.json().catch(() => ({ amount: 1 })); // Default +1

  if (isNaN(file_id)) return c.json({ error: 'Invalid file ID' }, 400);

  try {
    // 1. Increment vitality
    // 2. Extend expiration by 1 hour per vitality point? (Example logic)
    const { success } = await c.env.DB.prepare(
      `UPDATE files 
       SET vitality = vitality + ?, 
           expires_at = datetime(expires_at, '+' || ? || ' hours')
       WHERE id = ?`
    ).bind(amount, amount, file_id).run();

    if (success) {
      // Check if threshold reached for auto-archive
      const file = await c.env.DB.prepare('SELECT vitality FROM files WHERE id = ?').bind(file_id).first();
      if (file && (file.vitality as number) >= 10) { // Threshold 10
         await c.env.DB.prepare('UPDATE files SET is_archived = 1 WHERE id = ?').bind(file_id).run();
         return c.json({ message: 'Vitality boosted. File archived due to high vitality!' });
      }
      return c.json({ message: 'Vitality boosted', new_vitality: file?.vitality });
    } else {
      return c.json({ error: 'Failed to boost vitality' }, 500);
    }
  } catch (e: any) {
    console.error("Error boosting vitality:", e);
    return c.json({ error: 'Failed to boost vitality' }, 500);
  }
});

// POST /api/files/:id/archive: Manually archive a file (Owner only)
app.post('/api/files/:id/archive', async (c) => {
  const user_id = c.get('user_id');
  const file_id = Number(c.req.param('id'));

  if (isNaN(file_id)) return c.json({ error: 'Invalid file ID' }, 400);

  try {
    const { success } = await c.env.DB.prepare(
      'UPDATE files SET is_archived = 1 WHERE id = ? AND user_id = ?'
    ).bind(file_id, user_id).run();

    if (success) {
      return c.json({ message: 'File archived permanently' });
    } else {
      return c.json({ error: 'Failed to archive file (or unauthorized)' }, 403);
    }
  } catch (e: any) {
    console.error("Error archiving file:", e);
    return c.json({ error: 'Failed to archive file' }, 500);
  }
});

// --- Collection Routes ---

// GET /api/collections: List user's collections
app.get('/api/collections', async (c) => {
  const user_id = c.get('user_id');

  try {
    // Single query using LEFT JOIN to aggregate file data
    // D1/SQLite Group Concat approach
    const { results } = await c.env.DB.prepare(
      `SELECT
          c.*,
          COUNT(cf.file_id) as file_count,
          GROUP_CONCAT(cf.file_id) as file_ids_str
       FROM collections c
       LEFT JOIN collection_files cf ON c.id = cf.collection_id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.updated_at DESC`
    ).bind(user_id).all();

    const collections = results.map((r: any) => ({
      ...r,
      file_ids: r.file_ids_str ? r.file_ids_str.split(',').map(Number) : []
    }));

    return c.json({ collections });
  } catch (e: any) {
    console.error("Error listing collections:", e);
    return c.json({ error: 'Failed to list collections' }, 500);
  }
});

// POST /api/collections: Create a new collection
app.post('/api/collections', async (c) => {
  const user_id = c.get('user_id');
  const { name, description, visibility } = await c.req.json();

  if (!name) return c.json({ error: 'Name is required' }, 400);

  try {
    const { success, meta } = await c.env.DB.prepare(
      'INSERT INTO collections (user_id, name, description, visibility) VALUES (?, ?, ?, ?)'
    ).bind(user_id, name, description || '', visibility || 'private').run();

    if (success) {
      return c.json({ 
          message: 'Collection created successfully', 
          collection: { id: meta.last_row_id, user_id, name, description, visibility, file_count: 0 } 
      });
    } else {
      return c.json({ error: 'Failed to create collection' }, 500);
    }
  } catch (e: any) {
    console.error("Error creating collection:", e);
    return c.json({ error: 'Failed to create collection' }, 500);
  }
});

// GET /api/collections/:id: Get collection details and files
app.get('/api/collections/:id', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));

  if (isNaN(collection_id)) return c.json({ error: 'Invalid collection ID' }, 400);

  try {
    const collection = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE id = ?'
    ).bind(collection_id).first();

    if (!collection) return c.json({ error: 'Collection not found' }, 404);

    // Permission check
    if (collection.user_id !== user_id) {
        if (collection.visibility === 'private') {
            return c.json({ error: 'Unauthorized' }, 403);
        }
        if (collection.visibility === 'sym') {
             const mutual = await c.env.DB.prepare(
                'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
            ).bind(Math.min(user_id, collection.user_id as number), Math.max(user_id, collection.user_id as number), Math.min(user_id, collection.user_id as number), Math.max(user_id, collection.user_id as number)).first();
            if (!mutual) return c.json({ error: 'Unauthorized' }, 403);
        }
    }

    // Fetch files in collection
    const { results: files } = await c.env.DB.prepare(
        `SELECT f.*, cf.file_order
         FROM files f
         JOIN collection_files cf ON f.id = cf.file_id
         WHERE cf.collection_id = ?
         ORDER BY cf.file_order ASC`
    ).bind(collection_id).all();

    return c.json({ collection, files });
  } catch (e: any) {
    console.error("Error fetching collection:", e);
    return c.json({ error: 'Failed to fetch collection' }, 500);
  }
});

// PUT /api/collections/:id: Update collection
app.put('/api/collections/:id', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));
  const { name, description, visibility } = await c.req.json();

  if (isNaN(collection_id)) return c.json({ error: 'Invalid collection ID' }, 400);

  try {
    // Verify ownership
    const collection = await c.env.DB.prepare('SELECT user_id FROM collections WHERE id = ?').bind(collection_id).first();
    if (!collection) return c.json({ error: 'Collection not found' }, 404);
    if (collection.user_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);

    const { success } = await c.env.DB.prepare(
      'UPDATE collections SET name = ?, description = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(name, description, visibility, collection_id).run();

    if (success) {
      return c.json({ message: 'Collection updated successfully' });
    } else {
      return c.json({ error: 'Failed to update collection' }, 500);
    }
  } catch (e: any) {
    console.error("Error updating collection:", e);
    return c.json({ error: 'Failed to update collection' }, 500);
  }
});

// PUT /api/collections/:id/reorder: Reorder files in a collection
app.put('/api/collections/:id/reorder', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));
  const { file_orders } = await c.req.json(); // Array of { file_id: number, order: number }

  if (isNaN(collection_id) || !Array.isArray(file_orders)) return c.json({ error: 'Invalid parameters' }, 400);

  try {
     // Verify ownership
    const collection = await c.env.DB.prepare('SELECT user_id FROM collections WHERE id = ?').bind(collection_id).first();
    if (!collection) return c.json({ error: 'Collection not found' }, 404);
    if (collection.user_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);

    // Use batch to update orders
    const statements = file_orders.map((item: any) =>
        c.env.DB.prepare('UPDATE collection_files SET file_order = ? WHERE collection_id = ? AND file_id = ?')
        .bind(item.order, collection_id, item.file_id)
    );

    await c.env.DB.batch(statements);

    return c.json({ message: 'Collection files reordered' });

  } catch (e) {
      console.error("Error reordering collection:", e);
      return c.json({ error: 'Failed to reorder collection' }, 500);
  }
});


// DELETE /api/collections/:id: Delete collection
app.delete('/api/collections/:id', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));

  if (isNaN(collection_id)) return c.json({ error: 'Invalid collection ID' }, 400);

  try {
    const collection = await c.env.DB.prepare('SELECT user_id FROM collections WHERE id = ?').bind(collection_id).first();
    if (!collection) return c.json({ error: 'Collection not found' }, 404);
    if (collection.user_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);

    await c.env.DB.prepare('DELETE FROM collections WHERE id = ?').bind(collection_id).run();
    // Cascade delete handles collection_files cleanup (if supported/configured), 
    // but D1 support for FK constraints needs to be ensured PRAGMA foreign_keys = ON;
    // Explicit cleanup is safer:
    await c.env.DB.prepare('DELETE FROM collection_files WHERE collection_id = ?').bind(collection_id).run();

    return c.json({ message: 'Collection deleted successfully' });
  } catch (e: any) {
    console.error("Error deleting collection:", e);
    return c.json({ error: 'Failed to delete collection' }, 500);
  }
});

// GET /api/collections/:id/zip: Download collection as ZIP
app.get('/api/collections/:id/zip', authMiddleware, async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));

  try {
    const collection = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE id = ?'
    ).bind(collection_id).first();

    if (!collection) return c.json({ error: 'Collection not found' }, 404);

    // Permission Check
    if (collection.user_id !== user_id) {
        if (collection.visibility === 'private') return c.json({ error: 'Unauthorized' }, 403);
        if (collection.visibility === 'sym') {
            const mutual = await c.env.DB.prepare(
                'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
            ).bind(Math.min(user_id, collection.user_id as number), Math.max(user_id, collection.user_id as number), Math.min(user_id, collection.user_id as number), Math.max(user_id, collection.user_id as number)).first();
            if (!mutual) return c.json({ error: 'Unauthorized' }, 403);
        }
    }

    const { results: files } = await c.env.DB.prepare(
        `SELECT f.* FROM files f
         JOIN collection_files cf ON f.id = cf.file_id
         WHERE cf.collection_id = ?
         ORDER BY cf.file_order ASC`
    ).bind(collection_id).all();

    if (!files || files.length === 0) return c.json({ error: 'Collection is empty' }, 400);

    const zip = new JSZip();
    for (const file of files) {
      const object = await c.env.BUCKET.get(file.r2_key as string);
      if (object) {
        let body = await object.arrayBuffer();
        // Decrypt on-the-fly using existing helper
        if (file.is_encrypted && file.iv && c.env.ENCRYPTION_SECRET) {
          body = await decryptData(body, file.iv as string, c.env.ENCRYPTION_SECRET);
        }
        zip.file(file.filename as string, body);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${collection.name}.zip"`,
      },
    });
  } catch (e) {
    console.error("ZIP creation failed:", e);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// POST /api/collections/:id/files: Add file to collection
app.post('/api/collections/:id/files', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));
  const { file_id } = await c.req.json();

  if (isNaN(collection_id) || !file_id) return c.json({ error: 'Invalid parameters' }, 400);

  try {
    // Verify ownership of collection
    const collection = await c.env.DB.prepare('SELECT user_id FROM collections WHERE id = ?').bind(collection_id).first();
    if (!collection) return c.json({ error: 'Collection not found' }, 404);
    if (collection.user_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);

    // Verify file exists (and maybe access?)
    // For now, assume if you have the ID you can add it, 
    // but ideally we check if user has read access to the file.
    const file = await c.env.DB.prepare('SELECT id FROM files WHERE id = ?').bind(file_id).first();
    if (!file) return c.json({ error: 'File not found' }, 404);

    // Get current max order
    const maxOrder = await c.env.DB.prepare(
        'SELECT MAX(file_order) as max_order FROM collection_files WHERE collection_id = ?'
    ).bind(collection_id).first();
    const nextOrder = ((maxOrder?.max_order as number) || 0) + 1;

    const { success } = await c.env.DB.prepare(
      'INSERT INTO collection_files (collection_id, file_id, file_order) VALUES (?, ?, ?)'
    ).bind(collection_id, file_id, nextOrder).run();

    if (success) {
      return c.json({ message: 'File added to collection' });
    } else {
      return c.json({ error: 'Failed to add file to collection' }, 500);
    }
  } catch (e: any) {
    if (e.message && e.message.includes('UNIQUE constraint failed')) {
        return c.json({ error: 'File already in collection' }, 409);
    }
    console.error("Error adding file to collection:", e);
    return c.json({ error: 'Failed to add file to collection' }, 500);
  }
});

// DELETE /api/collections/:id/files/:file_id: Remove file from collection
app.delete('/api/collections/:id/files/:file_id', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));
  const file_id = Number(c.req.param('file_id'));

  if (isNaN(collection_id) || isNaN(file_id)) return c.json({ error: 'Invalid parameters' }, 400);

  try {
    const collection = await c.env.DB.prepare('SELECT user_id FROM collections WHERE id = ?').bind(collection_id).first();
    if (!collection) return c.json({ error: 'Collection not found' }, 404);
    if (collection.user_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);

    const { success } = await c.env.DB.prepare(
      'DELETE FROM collection_files WHERE collection_id = ? AND file_id = ?'
    ).bind(collection_id, file_id).run();

    if (success) {
      return c.json({ message: 'File removed from collection' });
    } else {
      return c.json({ error: 'Failed to remove file from collection' }, 500);
    }
  } catch (e: any) {
    console.error("Error removing file from collection:", e);
    return c.json({ error: 'Failed to remove file from collection' }, 500);
  }
});


// --- Messaging Routes (Phase 9) ---

// GET /api/messages/conversations: List active conversations
app.get('/api/messages/conversations', async (c) => {
  const user_id = c.get('user_id');

  try {
    // Complex query to get latest message for each conversation partner
    const query = `
      SELECT 
        CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as partner_id,
        u.username as partner_name,
        u.avatar_url as partner_avatar,
        MAX(m.created_at) as last_message_at,
        m.content as last_message_snippet,
        SUM(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) as unread_count
      FROM messages m
      JOIN users u ON (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) = u.id
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY partner_id
      ORDER BY last_message_at DESC
    `;

    const { results } = await c.env.DB.prepare(query)
      .bind(user_id, user_id, user_id, user_id, user_id)
      .all();

    const conversations = results.map((conv: any) => ({
      ...conv,
      partner_avatar: (conv.partner_avatar && typeof conv.partner_avatar === 'string' && conv.partner_avatar.startsWith('avatars/')) 
        ? getR2PublicUrl(c, conv.partner_avatar) 
        : conv.partner_avatar
    }));

    return c.json({ conversations });
  } catch (e: any) {
    console.error("Error fetching conversations:", e);
    return c.json({ error: 'Failed to fetch conversations' }, 500);
  }
});

// GET /api/messages/:partner_id: Get history
app.get('/api/messages/:partner_id', async (c) => {
  const user_id = c.get('user_id');
  const partner_id = Number(c.req.param('partner_id'));

  if (isNaN(partner_id)) return c.json({ error: 'Invalid partner ID' }, 400);

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC 
       LIMIT 100` // Cap at 100 for now
    ).bind(user_id, partner_id, partner_id, user_id).all();

    const decryptedResults = await Promise.all(results.map(async (msg: any) => {
        if (msg.is_encrypted && msg.iv && c.env.ENCRYPTION_SECRET) {
            try {
                const encryptedBuffer = Buffer.from(msg.content, 'base64');
                const decryptedBuffer = await decryptData(encryptedBuffer, msg.iv, c.env.ENCRYPTION_SECRET);
                const decryptedText = new TextDecoder().decode(decryptedBuffer);
                return { ...msg, content: decryptedText };
            } catch (e) {
                return { ...msg, content: '[Decryption Error]' };
            }
        }
        return msg;
    }));

    return c.json({ messages: decryptedResults });
  } catch (e: any) {
    console.error("Error fetching messages:", e);
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

// POST /api/messages: Send a message
app.post('/api/messages', async (c) => {
  const sender_id = c.get('user_id');
  const { receiver_id, content, encrypt } = await c.req.json();

  if (!receiver_id || !content) return c.json({ error: 'Missing fields' }, 400);

  try {
    // Verify mutual connection (Optional: Rel F allows messaging anyone? 
    // Let's restrict to Sym connections for anti-spam/safety, matching the ethos)
    const mutual = await c.env.DB.prepare(
      'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
    ).bind(Math.min(sender_id, receiver_id), Math.max(sender_id, receiver_id), Math.min(sender_id, receiver_id), Math.max(sender_id, receiver_id)).first();

    if (!mutual) return c.json({ error: 'Must be mutually connected (Sym) to whisper.' }, 403);

    let finalContent = content;
    let is_encrypted = 0;
    let iv: string | null = null;

    if (encrypt === true && c.env.ENCRYPTION_SECRET) {
        const encryptedData = await encryptData(content, c.env.ENCRYPTION_SECRET);
        // Store as base64 string
        finalContent = Buffer.from(encryptedData.encrypted).toString('base64');
        iv = encryptedData.iv;
        is_encrypted = 1;
    }

    const { success, meta } = await c.env.DB.prepare(
      'INSERT INTO messages (sender_id, receiver_id, content, is_encrypted, iv) VALUES (?, ?, ?, ?, ?)'
    ).bind(sender_id, receiver_id, finalContent, is_encrypted, iv).run();

    if (success) {
      const messageId = meta.last_row_id;
      // Send the ORIGINAL content via WebSocket so the recipient sees it immediately without needing to decrypt
      // (WSS provides transport security). The DB stores it encrypted.
      const messagePayload = {
        id: messageId,
        sender_id,
        receiver_id,
        content: content, // Send clear text to active session
        created_at: new Date().toISOString()
      };

      // Notify Recipient via WebSocket
      // We use the existing 'new_notification' type or a dedicated 'new_message' type.
      // Let's use 'new_message' for cleaner frontend handling.
      const doId = c.env.DO_NAMESPACE.idFromName('relf-do-instance');
      const doStub = c.env.DO_NAMESPACE.get(doId);
      
      await doStub.fetch('http://do-stub/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: receiver_id, 
          message: { type: 'new_message', ...messagePayload } 
        }),
      });

      return c.json({ message: 'Whisper sent', data: messagePayload });
    } else {
      return c.json({ error: 'Failed to send message' }, 500);
    }
  } catch (e: any) {
    console.error("Error sending message:", e);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// PUT /api/messages/:partner_id/read: Mark conversation as read
app.put('/api/messages/:partner_id/read', async (c) => {
  const user_id = c.get('user_id');
  const partner_id = Number(c.req.param('partner_id'));

  try {
    await c.env.DB.prepare(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?'
    ).bind(partner_id, user_id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: 'Failed to update read status' }, 500);
  }
});


// POST /api/users/me/avatar: Upload user avatar to R2
app.post('/api/users/me/avatar', async (c) => {
  const user_id = c.get('user_id');

  try {
    const formData = await c.req.parseBody();
    const avatarFile = formData['avatar'] as File;

    if (!avatarFile) {
      return c.json({ error: 'No avatar file uploaded' }, 400);
    }

    // Generate a unique key for R2 for avatars
    const r2_key = `avatars/${user_id}/${crypto.randomUUID()}-${avatarFile.name}`;
    
    // Upload to R2
    await c.env.BUCKET.put(r2_key, avatarFile.stream(), {
      httpMetadata: {
        contentType: avatarFile.type,
      },
      customMetadata: {
        originalName: avatarFile.name,
        userId: String(user_id)
      }
    });

    // Update user's avatar_url in D1
    const { success } = await c.env.DB.prepare(
      'UPDATE users SET avatar_url = ? WHERE id = ?'
    ).bind(r2_key, user_id).run(); // Store R2 key as avatar_url

    if (success) {
      const public_avatar_url = getR2PublicUrl(c, r2_key);
      return c.json({ message: 'Avatar uploaded successfully', avatar_url: public_avatar_url }); 
    } else {
      return c.json({ error: 'Failed to update avatar URL in database' }, 500);
    }

  } catch (e: any) {
    console.error("Error uploading avatar:", e);
    return c.json({ error: 'Avatar upload failed' }, 500);
  }
});


// POST /api/feedback: Send feedback to admin
app.post('/api/feedback', async (c) => {
  if (!await checkRateLimit(c, 'feedback', 3, 3600)) { // 3 per hour
    return c.json({ error: 'Too many feedback attempts. Please try again later.' }, 429);
  }
  
  const user_id = c.get('user_id'); // Optional: could be anonymous if we allow it, but let's require auth for now
  const { message, type, name, email } = await c.req.json();

  if (!message) return c.json({ error: 'Message is required' }, 400);

  if (c.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(c.env.RESEND_API_KEY);
      
      // Fetch user details if authenticated
      let userInfo = 'Anonymous';
      let userDetails = '';

      if (user_id) {
          const user = await c.env.DB.prepare('SELECT id, username, email FROM users WHERE id = ?').bind(user_id).first();
          if (user) {
              userInfo = `${user.username} (ID: ${user.id})`;
              userDetails = `
                <p><strong>Registered Email:</strong> ${user.email}</p>
                <p><strong>Username:</strong> ${user.username}</p>
                <p><strong>User ID:</strong> ${user.id}</p>
              `;
          }
      }

      const manualContact = (name || email) ? `<p><strong>Provided Contact:</strong> ${name || 'N/A'} &lt;${email || 'N/A'}&gt;</p>` : '';

      await resend.emails.send({
        from: 'Rel F Feedback <feedback@r3l.distorted.work>',
        to: 'lowlyserf@distorted.work',
        subject: `[Rel F Beta] Feedback: ${type || 'General'}`,
        html: `
            <h3>New Feedback Received</h3>
            <p><strong>Type:</strong> ${type || 'General'}</p>
            ${userDetails}
            ${manualContact}
            <hr />
            <p><strong>Message:</strong></p>
            <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${message}</pre>
        `
      });
      return c.json({ message: 'Feedback sent successfully' });
    } catch (emailError) {
      console.error("Failed to send feedback email:", emailError);
      return c.json({ error: 'Failed to send feedback email' }, 500);
    }
  } else {
    console.log("Skipping feedback email (RESEND_API_KEY missing)");
    return c.json({ message: 'Feedback logged (Email skipped)' });
  }
});

// Serve static assets for all other requests
// This will effectively route all non-/api requests to the ASSETS binding
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log("Cron Triggered:", event.cron, event.scheduledTime);
    
    const now = new Date().toISOString();
    try {
      // 1. Purge Expired Files
      const { results } = await env.DB.prepare(
        'SELECT id, r2_key FROM files WHERE is_archived = 0 AND expires_at < ?'
      ).bind(now).all();

      console.log(`Found ${results.length} expired files to delete.`);

      for (const file of results) {
        if (file.r2_key) {
            await env.BUCKET.delete(file.r2_key as string);
        }
        await env.DB.prepare('DELETE FROM files WHERE id = ?').bind(file.id).run();
        console.log(`Deleted expired file ID: ${file.id}`);
      }

      // 2. Purge Old Messages (Inbox/Outgoing unarchived > 30 days)
      const messagePurgeThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { meta: msgMeta } = await env.DB.prepare(
        'DELETE FROM messages WHERE is_archived = 0 AND created_at < ?'
      ).bind(messagePurgeThreshold).run();
      
      console.log(`Purged ${msgMeta.changes} old messages.`);

    } catch (e) {
      console.error("Error in scheduled handler:", e);
    }
  }
};
