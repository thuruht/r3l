import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { sign, verify } from 'hono/jwt';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { Resend } from 'resend';

// Import the Durable Object class (only for type inference, not for instantiation here)
import { RelfDO } from './do';
export { RelfDO } from './do';

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
  JWT_SECRET: string; // Ensure this is set in .dev.vars or wrangler.toml
  RESEND_API_KEY: string;
  R2_ACCOUNT_ID: string; // Added
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
    return `https://pub-${c.env.BUCKET.name}.${c.env.R2_ACCOUNT_ID}.r2.dev/${r2_key}`;
}

// --- Auth Routes ---

app.post('/api/register', async (c) => {
  if (!await checkRateLimit(c, 'register', 5, 3600)) { // 5 per hour
    return c.json({ error: 'Too many registration attempts. Please try again later.' }, 429);
  }
  const { username, password, email, avatar_url } = await c.req.json();
  if (!username || !password || !email) return c.json({ error: 'Missing fields' }, 400);

  try {
    const { hash, salt } = await hashPassword(password);
    const verificationToken = crypto.randomUUID();
    
    // Store the hash, salt, email, and verification token
    // Store the hash, salt, email, and verification token
    const { success } = await c.env.DB.prepare(
      'INSERT INTO users (username, password, salt, email, verification_token, avatar_url) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(username, hash, salt, email, verificationToken, avatar_url || 'https://pub-your-bucket-name.your-account-id.r2.dev/default-avatar.svg').run();
    
    if (success) {
      // Send verification email
      const resend = new Resend(c.env.RESEND_API_KEY);
      try {
        await resend.emails.send({
          from: 'Rel F <lowlier_serf@r3l.distorted.work>',
          to: email,
          subject: 'Verify your Rel F account',
          html: `<p>Welcome to Rel F!</p><p>Please <a href="https://r3l.distorted.work/verify-email?token=${verificationToken}">verify your email</a> to continue.</p>`
        });
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
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
    // 1. Fetch user (including secret salt)
    const user = await c.env.DB.prepare(
      'SELECT id, username, password, salt, avatar_url FROM users WHERE username = ?'
    ).bind(username).first();

    if (!user) return c.json({ error: 'Invalid credentials' }, 401);

    // 2. Hash input password with stored salt
    const { hash: inputHash } = await hashPassword(password, user.salt as string);

    // 3. Compare hashes
    if (inputHash !== user.password) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // 4. Generate JWT
    // Use a fallback secret for dev if not provided (warn in logs)
    const secret = c.env.JWT_SECRET || 'fallback_dev_secret_do_not_use_in_prod'; 
    const token = await sign({
      id: user.id,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    }, secret);

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
        avatar_url: user.avatar_url && user.avatar_url.startsWith('avatars/') ? getR2PublicUrl(c, user.avatar_url as string) : user.avatar_url 
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
      'SELECT id, username, avatar_url FROM users WHERE id = ?'
    ).bind(payload.id).first();

    if (!user) return c.json({ error: 'User not found' }, 404);

    return c.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        avatar_url: user.avatar_url && user.avatar_url.startsWith('avatars/') ? getR2PublicUrl(c, user.avatar_url as string) : user.avatar_url 
      } 
    });
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Durable Object WebSocket endpoint
app.get('/api/do-websocket', authMiddleware, upgradeWebSocket((c) => {
  try {
    // Get a Durable Object instance
    const doId = c.env.DO_NAMESPACE.idFromName('relf-do-instance');
    const doStub = c.env.DO_NAMESPACE.get(doId);

    // Pass user_id to DO in a custom header
    const newRequest = new Request(c.req.url, {
        headers: c.req.raw.headers, // Copy existing headers
        method: c.req.raw.method,
        body: c.req.raw.body,
        // ... and other properties of c.req.raw as needed
    });
    newRequest.headers.set('X-User-ID', c.get('user_id').toString());

    // Forward the WebSocket request to the Durable Object
    // The DO's fetch method will handle the websocket upgrade
    return doStub.fetch(newRequest);
  } catch (error) {
    console.error("Error upgrading WebSocket to DO:", error);
    return c.text('WebSocket upgrade failed', 500);
  }
}));

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

// Apply middleware to protected routes
app.use('/api/drift', authMiddleware);
app.use('/api/relationships/*', authMiddleware);
app.use('/api/notifications', authMiddleware);
app.use('/api/files/*', authMiddleware);
app.use('/api/communiques', authMiddleware);
app.use('/api/communiques/*', authMiddleware);


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
app.put('/api/notifications/read-all', authMiddleware, async (c) => {
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

// --- Relationship Routes ---

// POST /api/relationships/follow: Create an asym_follow relationship
app.post('/api/relationships/follow', async (c) => {
  const source_user_id = c.get('user_id');
  const { target_user_id } = await c.req.json();

  if (!target_user_id) {
    return c.json({ error: 'Missing target_user_id' }, 400);
  }
  if (source_user_id === target_user_id) {
    return c.json({ error: 'Cannot follow yourself' }, 400);
  }

  try {
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
app.post('/api/relationships/sym-request', async (c) => {
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
    const existingAsym = await c.env.DB.prepare(
      'SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type = ?'
    ).bind(target_user_id, source_user_id, 'asym_follow').first();

    // Check if there's already a pending request from source to target
    const existingRequest = await c.env.DB.prepare(
      'SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type = ? AND status = ?'
    ).bind(source_user_id, target_user_id, 'sym_request', 'pending').first();

    if (existingRequest) {
      return c.json({ error: 'Sym request already pending for this user' }, 409);
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
app.post('/api/relationships/accept-sym-request', async (c) => {
  const target_user_id = c.get('user_id'); // Current user is the target
  const { source_user_id } = await c.req.json(); // User who sent the request

  if (!source_user_id) {
    return c.json({ error: 'Missing source_user_id' }, 400);
  }

  try {
    // Start a transaction for atomicity
    await c.env.DB.prepare('BEGIN;').run();

    // 1. Find the pending request from source_user_id to target_user_id
    const request = await c.env.DB.prepare(
      'SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type = ? AND status = ?'
    ).bind(source_user_id, target_user_id, 'sym_request', 'pending').first();

    if (!request) {
      await c.env.DB.prepare('ROLLBACK;').run();
      return c.json({ error: 'Sym request not found or not pending' }, 404);
    }

    // 2. Update the existing request to 'sym_accepted'
    const updateReq = await c.env.DB.prepare(
      'UPDATE relationships SET type = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('sym_accepted', 'accepted', request.id).run();

    if (!updateReq.success) {
      await c.env.DB.prepare('ROLLBACK;').run();
      return c.json({ error: 'Failed to update sym request' }, 500);
    }

    // 3. Create the inverse 'sym_accepted' relationship from target_user_id to source_user_id
    const insertInverse = await c.env.DB.prepare(
      'INSERT INTO relationships (source_user_id, target_user_id, type, status) VALUES (?, ?, ?, ?)'
    ).bind(target_user_id, source_user_id, 'sym_accepted', 'accepted').run();

    if (!insertInverse.success) {
      await c.env.DB.prepare('ROLLBACK;').run();
      return c.json({ error: 'Failed to create inverse sym relationship' }, 500);
    }

    // 4. Insert into mutual_connections table
    const userA = Math.min(source_user_id, target_user_id);
    const userB = Math.max(source_user_id, target_user_id);
    const insertMutual = await c.env.DB.prepare(
      'INSERT INTO mutual_connections (user_a_id, user_b_id) VALUES (?, ?)'
    ).bind(userA, userB).run();
    
    if (!insertMutual.success) {
      await c.env.DB.prepare('ROLLBACK;').run();
      return c.json({ error: 'Failed to create mutual connection' }, 500);
    }

    await c.env.DB.prepare('COMMIT;').run();
    // Trigger notification for the source user (who sent the request originally)
    await createNotification(c.env, c.env.DB, source_user_id, 'sym_accepted', target_user_id);
    
    return c.json({ message: 'Sym request accepted and mutual connection established' });

  } catch (e: any) {
    await c.env.DB.prepare('ROLLBACK;').run();
    console.error("Error accepting sym request:", e);
    return c.json({ error: 'Failed to accept sym request' }, 500);
  }
});

// DELETE /api/relationships/:target_user_id: Remove a relationship
app.delete('/api/relationships/:target_user_id', async (c) => {
  const source_user_id = c.get('user_id');
  const target_user_id = Number(c.req.param('target_user_id'));

  if (isNaN(target_user_id)) {
    return c.json({ error: 'Invalid target_user_id' }, 400);
  }

  try {
    await c.env.DB.prepare('BEGIN;').run();

    // Check if it's an asym_follow
    const asymFollow = await c.env.DB.prepare(
      'SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type = ?'
    ).bind(source_user_id, target_user_id, 'asym_follow').first();

    if (asymFollow) {
      await c.env.DB.prepare(
        'DELETE FROM relationships WHERE id = ?'
      ).bind(asymFollow.id).run();
      await c.env.DB.prepare('COMMIT;').run();
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
      // Delete both directed relationships
      await c.env.DB.prepare('DELETE FROM relationships WHERE id = ?').bind(symRel1.id).run();
      await c.env.DB.prepare('DELETE FROM relationships WHERE id = ?').bind(symRel2.id).run();

      // Delete from mutual_connections
      const userA = Math.min(source_user_id, target_user_id);
      const userB = Math.max(source_user_id, target_user_id);
      await c.env.DB.prepare(
        'DELETE FROM mutual_connections WHERE user_a_id = ? AND user_b_id = ?'
      ).bind(userA, userB).run();

      await c.env.DB.prepare('COMMIT;').run();
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
        await c.env.DB.prepare('COMMIT;').run();
        return c.json({ message: 'Pending sym request cancelled successfully' });
    }


    await c.env.DB.prepare('ROLLBACK;').run();
    return c.json({ error: 'Relationship not found or not removable by current user' }, 404);

  } catch (e: any) {
    await c.env.DB.prepare('ROLLBACK;').run();
    console.error("Error removing relationship:", e);
    return c.json({ error: 'Failed to remove relationship' }, 500);
  }
});

// GET /api/relationships: List relationships for the authenticated user
app.get('/api/relationships', async (c) => {
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

    return c.json({
      outgoing: outgoing.results,
      incoming: incoming.results,
      mutual: mutual.results,
    });
  } catch (e: any) {
    console.error("Error listing relationships:", e);
    return c.json({ error: 'Failed to list relationships' }, 500);
  }
});

// GET /api/drift: Fetch a random sample of public data (users and files)
app.get('/api/drift', async (c) => {
    if (!await checkRateLimit(c, 'drift', 20, 600)) { // 20 per 10 mins
        return c.json({ error: 'Drifting too fast. Please wait.' }, 429);
    }
    const user_id = c.get('user_id');

    try {
        // Optimization Note: ORDER BY RANDOM() can be slow on very large tables.
        // For the current scale of Rel F, this is acceptable.
        // If performance degrades, consider fetching a random ID range or using a reservoir sampling strategy implemented in the application layer.

        const driftUsers = await c.env.DB.prepare(
            `SELECT u.id, u.username, u.avatar_url 
             FROM users u
             LEFT JOIN mutual_connections mc ON (u.id = mc.user_a_id AND mc.user_b_id = ?) OR (u.id = mc.user_b_id AND mc.user_a_id = ?)
             WHERE u.id != ? AND mc.id IS NULL
             ORDER BY RANDOM()
             LIMIT 10`
        ).bind(user_id, user_id, user_id).all();

        const driftFiles = await c.env.DB.prepare(
            `SELECT f.id, f.filename, f.user_id, u.username as owner_username
             FROM files f
             JOIN users u ON f.user_id = u.id
             LEFT JOIN mutual_connections mc ON (f.user_id = mc.user_a_id AND mc.user_b_id = ?) OR (f.user_id = mc.user_b_id AND mc.user_a_id = ?)
             WHERE f.visibility = 'public' AND f.user_id != ? AND mc.id IS NULL
             ORDER BY RANDOM()
             LIMIT 10`
        ).bind(user_id, user_id, user_id).all();

        return c.json({
            users: driftUsers.results,
            files: driftFiles.results
        });

    } catch (e: any) {
        console.error("Error fetching drift data:", e);
        return c.json({ error: 'Failed to fetch drift data' }, 500);
    }
});


// --- Communique Routes ---

// GET /api/communiques/:user_id: Fetch a user's communique
app.get('/api/communiques/:user_id', async (c) => {
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
      return c.json({ message: 'Communique updated successfully' });
    } else {
      return c.json({ error: 'Failed to update communique' }, 500);
    }
  } catch (e: any) {
    console.error("Error updating communique:", e);
    return c.json({ error: 'Failed to update communique' }, 500);
  }
});


// Placeholder API routes
app.get('/api/kv/:key', async (c) => {
  const { key } = c.req.param();
  const value = await c.env.KV.get(key);
  return c.json({ key, value });
});

app.post('/api/kv/:key', async (c) => {
  const { key } = c.req.param();
  const { value } = await c.req.json();
  await c.env.KV.put(key, value);
  return c.json({ message: `Key '${key}' set with value '${value}'` });
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

    if (!file) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    // Generate a unique key for R2
    const r2_key = `${user_id}/${crypto.randomUUID()}-${file.name}`;
    
    // Upload to R2
    await c.env.BUCKET.put(r2_key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        userId: String(user_id)
      }
    });

    // Record in D1
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default 24h life
    const { success } = await c.env.DB.prepare(
      `INSERT INTO files (user_id, r2_key, filename, size, mime_type, visibility, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(user_id, r2_key, file.name, file.size, file.type, visibility, expires_at).run();

    if (success) {
      return c.json({ message: 'File uploaded successfully', r2_key, expires_at });
    } else {
      // If DB insert fails, we might want to delete the orphan file from R2
      // For now, we'll just report error
      return c.json({ error: 'Failed to record file metadata' }, 500);
    }

  } catch (e: any) {
    console.error("Error uploading file:", e);
    return c.json({ error: 'File upload failed' }, 500);
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
    const object = await c.env.BUCKET.get(file.r2_key as string);

    if (!object) {
      return c.json({ error: 'File content missing in storage' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Content-Disposition', `attachment; filename="${file.filename}"`);

    return new Response(object.body, {
      headers,
    });

  } catch (e: any) {
    console.error("Error downloading file:", e);
    return c.json({ error: 'Failed to download file' }, 500);
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

// POST /api/users/me/avatar: Upload user avatar to R2
app.post('/api/users/me/avatar', authMiddleware, async (c) => {
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


// Serve static assets for all other requests
// This will effectively route all non-/api requests to the ASSETS binding
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log("Cron Triggered:", event.cron, event.scheduledTime);
    
    // Find expired files
    const now = new Date().toISOString();
    try {
      const { results } = await env.DB.prepare(
        'SELECT id, r2_key FROM files WHERE is_archived = 0 AND expires_at < ?'
      ).bind(now).all();

      console.log(`Found ${results.length} expired files to delete.`);

      for (const file of results) {
        // Delete from R2
        if (file.r2_key) {
            await env.BUCKET.delete(file.r2_key as string);
        }
        // Delete from D1
        await env.DB.prepare('DELETE FROM files WHERE id = ?').bind(file.id).run();
        console.log(`Deleted expired file ID: ${file.id}`);
      }

    } catch (e) {
      console.error("Error in scheduled handler:", e);
    }
  }
};

