// src/routes/auth.ts
import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { Resend } from 'resend';
import { Env, Variables } from '../types';
import { getR2PublicUrl, checkRateLimit, getAdminId } from '../utils/helpers';
import { hashPassword } from '../utils/security';

const auth = new Hono<{ Bindings: Env, Variables: Variables }>();

// Use imported hashPassword from security
const hashPasswordInternal = hashPassword;

auth.post('/register', async (c) => {
  if (!await checkRateLimit(c, 'register', 5, 3600)) {
    return c.json({ error: 'Too many registration attempts. Please try again later.' }, 429);
  }
  const { username, password, email, avatar_url, public_key, encrypted_private_key } = await c.req.json();
  if (!username || !password || !email) return c.json({ error: 'Missing fields' }, 400);
  if (typeof password !== 'string' || password.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400);

  try {
    const { hash, salt } = await hashPasswordInternal(password);
    const verificationToken = crypto.randomUUID();
    const defaultAvatar = 'https://pub-your-bucket-name.your-account-id.r2.dev/default-avatar.svg';
    
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
      }
      return c.json({ message: 'User created successfully. Please check your email to verify.' });
    } else {
      return c.json({ error: 'Failed to create user' }, 500);
    }
  } catch (e: any) {
    if (e.message && e.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Username or Email already taken' }, 409);
    }
    return c.json({ error: 'Registration failed' }, 500);
  }
});

auth.post('/login', async (c) => {
  if (!await checkRateLimit(c, 'login', 10, 600)) {
    return c.json({ error: 'Too many login attempts. Please wait.' }, 429);
  }
  const { username, password } = await c.req.json();
  if (!username || !password) return c.json({ error: 'Missing fields' }, 400);

  try {
    const user = await c.env.DB.prepare(
      'SELECT id, username, password, salt, avatar_url, public_key, encrypted_private_key, is_verified FROM users WHERE username = ?'
    ).bind(username).first() as any;

    if (!user) return c.json({ error: 'Invalid credentials' }, 401);

    const { hash: inputHash } = await hashPasswordInternal(password, user.salt as string);

    if (inputHash !== user.password) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    if (!user.is_verified) {
      return c.json({ error: 'Identity not verified. Check your inbox.', needs_verification: true }, 403);
    }

    if (!c.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }
    const token = await sign({
      id: user.id,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    }, c.env.JWT_SECRET, 'HS256');

    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        avatar_url: (user.avatar_url && typeof user.avatar_url === 'string' && user.avatar_url.startsWith('avatars/')) ? getR2PublicUrl(c.env, user.avatar_url as string) : user.avatar_url,
        public_key: user.public_key,
        encrypted_private_key: user.encrypted_private_key
      } 
    });

  } catch (e: any) {
    console.error(e);
    return c.json({ error: 'Login failed' }, 500);
  }
});

auth.post('/logout', (c) => {
  deleteCookie(c, 'auth_token');
  return c.json({ message: 'Logged out' });
});

auth.post('/forgot-password', async (c) => {
  if (!await checkRateLimit(c, 'forgot', 3, 3600)) {
    return c.json({ error: 'Too many attempts. Please try again later.' }, 429);
  }
  const { email } = await c.req.json();
  if (!email) return c.json({ error: 'Email is required' }, 400);

  try {
    const user = await c.env.DB.prepare(
      'SELECT id, username FROM users WHERE email = ?'
    ).bind(email).first() as any;

    if (!user) {
        return c.json({ message: 'If this email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

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

auth.post('/reset-password', async (c) => {
  if (!await checkRateLimit(c, 'reset', 3, 3600)) {
    return c.json({ error: 'Too many attempts.' }, 429);
  }
  const { token, newPassword } = await c.req.json();

  if (!token || !newPassword) return c.json({ error: 'Missing fields' }, 400);
  if (typeof newPassword !== 'string' || newPassword.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400);

  try {
    const user = await c.env.DB.prepare(
        'SELECT id, salt FROM users WHERE reset_token = ? AND reset_expires > ?'
    ).bind(token, new Date().toISOString()).first() as any;

    if (!user) {
        return c.json({ error: 'Invalid or expired token' }, 400);
    }

    const { hash } = await hashPasswordInternal(newPassword, user.salt as string);

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

auth.post('/resend-verification', async (c) => {
  if (!await checkRateLimit(c, 'resend-verify', 3, 3600)) {
    return c.json({ error: 'Too many attempts. Please wait.' }, 429);
  }
  const { email } = await c.req.json();
  if (!email) return c.json({ error: 'Email is required' }, 400);

  try {
    const user = await c.env.DB.prepare(
      'SELECT id, username, is_verified, verification_token FROM users WHERE email = ?'
    ).bind(email).first() as any;

    if (!user) return c.json({ message: 'If this email exists, a verification link has been sent.' });
    if (user.is_verified) return c.json({ message: 'Account is already verified. You can log in.' });

    const token = user.verification_token || crypto.randomUUID();
    await c.env.DB.prepare('UPDATE users SET verification_token = ? WHERE id = ?').bind(token, user.id).run();

    if (c.env.RESEND_API_KEY) {
      const resend = new Resend(c.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Rel F <lowlier_serf@r3l.distorted.work>',
        to: email,
        subject: 'Verify your Rel F account',
        html: `<p>Hi ${user.username},</p><p>Please <a href="https://r3l.distorted.work/verify?token=${token}">verify your email</a> to continue.</p>`
      });
    }

    return c.json({ message: 'If this email exists, a verification link has been sent.' });
  } catch (e) {
    console.error('Resend verification error:', e);
    return c.json({ error: 'Request failed' }, 500);
  }
});

auth.get('/verify-email', async (c) => {
  const token = c.req.query('token');
  if (!token) return c.json({ error: 'Missing token' }, 400);

  try {
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE verification_token = ?'
    ).bind(token).first() as any;

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

auth.get('/users/:id', async (c) => {
  const user_id = Number(c.req.param('id'));
  if (isNaN(user_id)) return c.json({ error: 'Invalid ID' }, 400);
  try {
    const user = await c.env.DB.prepare(
      'SELECT id, username, avatar_url, public_key FROM users WHERE id = ?'
    ).bind(user_id).first() as any;
    if (!user) return c.json({ error: 'Not found' }, 404);
    return c.json({ user: {
      ...user,
      avatar_url: (user.avatar_url && typeof user.avatar_url === 'string' && user.avatar_url.startsWith('avatars/')) ? getR2PublicUrl(c.env, user.avatar_url) : user.avatar_url
    }});
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

auth.get('/users/me', async (c) => {
  const user_id = c.get('user_id');
  if (!user_id) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const user = await c.env.DB.prepare(
      'SELECT id, username, avatar_url, public_key, encrypted_private_key, role, is_lurking FROM users WHERE id = ?'
    ).bind(user_id).first() as any;

    if (!user) return c.json({ error: 'User not found' }, 404);

    return c.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        avatar_url: (user.avatar_url && typeof user.avatar_url === 'string' && user.avatar_url.startsWith('avatars/')) ? getR2PublicUrl(c.env, user.avatar_url as string) : user.avatar_url,
        public_key: user.public_key,
        encrypted_private_key: user.encrypted_private_key,
        role: user.role,
        is_lurking: user.is_lurking
      } 
    });
  } catch (e) {
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

auth.put('/users/me/username', async (c) => {
  const user_id = c.get('user_id');
  const { username } = await c.req.json();
  if (!username || typeof username !== 'string' || !username.trim()) {
    return c.json({ error: 'Username is required' }, 400);
  }
  try {
    await c.env.DB.prepare('UPDATE users SET username = ? WHERE id = ?').bind(username.trim(), user_id).run();
    return c.json({ message: 'Username updated' });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) return c.json({ error: 'Username already taken' }, 409);
    return c.json({ error: 'Failed to update username' }, 500);
  }
});

auth.put('/users/me/password', async (c) => {
  const user_id = c.get('user_id');
  const { currentPassword, newPassword } = await c.req.json();
  if (!currentPassword || !newPassword) return c.json({ error: 'Missing fields' }, 400);
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400);
  }
  try {
    const user = await c.env.DB.prepare('SELECT password, salt FROM users WHERE id = ?').bind(user_id).first() as any;
    if (!user) return c.json({ error: 'User not found' }, 404);
    const { hash: currentHash } = await hashPasswordInternal(currentPassword, user.salt);
    if (currentHash !== user.password) return c.json({ error: 'Current password is incorrect' }, 403);
    const newSalt = crypto.randomUUID();
    const { hash: newHash } = await hashPasswordInternal(newPassword, newSalt);
    await c.env.DB.prepare('UPDATE users SET password = ?, salt = ? WHERE id = ?').bind(newHash, newSalt, user_id).run();
    return c.json({ message: 'Password updated' });
  } catch (e) {
    return c.json({ error: 'Failed to update password' }, 500);
  }
});

auth.delete('/users/me', async (c) => {
  const user_id = c.get('user_id');
  if (user_id === getAdminId(c.env)) return c.json({ error: 'Cannot delete admin account' }, 400);
  try {
    const { results: files } = await c.env.DB.prepare('SELECT r2_key FROM files WHERE user_id = ?').bind(user_id).all();
    const user = await c.env.DB.prepare('SELECT avatar_url FROM users WHERE id = ?').bind(user_id).first() as any;

    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM files WHERE user_id = ?').bind(user_id),
      c.env.DB.prepare('DELETE FROM relationships WHERE source_user_id = ? OR target_user_id = ?').bind(user_id, user_id),
      c.env.DB.prepare('DELETE FROM mutual_connections WHERE user_a_id = ? OR user_b_id = ?').bind(user_id, user_id),
      c.env.DB.prepare('DELETE FROM notifications WHERE user_id = ? OR actor_id = ?').bind(user_id, user_id),
      c.env.DB.prepare('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?').bind(user_id, user_id),
      c.env.DB.prepare('DELETE FROM communiques WHERE user_id = ?').bind(user_id),
      c.env.DB.prepare('DELETE FROM group_members WHERE user_id = ?').bind(user_id),
      c.env.DB.prepare(`
        DELETE FROM groups WHERE id IN (
          SELECT g.id FROM groups g
          JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ? AND gm.role = 'admin'
          WHERE (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND role = 'admin') = 1
        )
      `).bind(user_id),
      c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user_id),
    ]);

    const cleanupPromises = (files as any[]).map(f => c.env.BUCKET.delete(f.r2_key as string).catch(() => {}));
    if (user?.avatar_url && typeof user.avatar_url === 'string' && user.avatar_url.startsWith('avatars/')) {
      cleanupPromises.push(c.env.BUCKET.delete(user.avatar_url).catch(() => {}));
    }
    c.executionCtx.waitUntil(Promise.all(cleanupPromises));

    deleteCookie(c, 'auth_token');
    return c.json({ message: 'Account deleted' });
  } catch (e) {
    console.error('Account deletion error:', e);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

auth.put('/users/me/public-key', async (c) => {
  const user_id = c.get('user_id');
  const { public_key } = await c.req.json();
  await c.env.DB.prepare('UPDATE users SET public_key = ? WHERE id = ?').bind(public_key, user_id).run();
  return c.json({ success: true });
});

auth.put('/users/me/privacy', async (c) => {
  const user_id = c.get('user_id');
  const { is_lurking } = await c.req.json();
  try {
    await c.env.DB.prepare('UPDATE users SET is_lurking = ? WHERE id = ?').bind(is_lurking ? 1 : 0, user_id).run();
    return c.json({ message: 'Privacy settings updated', is_lurking: !!is_lurking });
  } catch (e) {
    return c.json({ error: 'Failed to update privacy settings' }, 500);
  }
});

auth.get('/customization', async (c) => {
  const user_id = c.get('user_id');
  try {
    const preferences = await c.env.DB.prepare('SELECT theme_preferences, node_primary_color, node_secondary_color, node_size FROM users WHERE id = ?').bind(user_id).first();
    return c.json(preferences);
  } catch (e) {
    return c.json({ error: 'Failed to fetch preferences' }, 500);
  }
});

const isValidHexColor = (color: string) => /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(color);

auth.put('/customization', async (c) => {
  const user_id = c.get('user_id');
  const body = await c.req.json();
  const { theme_preferences, node_primary_color, node_secondary_color, node_size } = body;
  let updateFields: string[] = [];
  let updateValues: (string | number)[] = [];

  if (theme_preferences !== undefined) {
      const current = await c.env.DB.prepare('SELECT theme_preferences FROM users WHERE id = ?').bind(user_id).first() as any;
      let currentPrefs = {};
      try { if (current?.theme_preferences) currentPrefs = JSON.parse(current.theme_preferences); } catch(e) {}
      let inputPrefs = {};
      try {
        inputPrefs = typeof theme_preferences === 'string' ? JSON.parse(theme_preferences) : theme_preferences;
        if (typeof inputPrefs !== 'object' || Array.isArray(inputPrefs)) throw new Error();
      } catch { return c.json({ error: 'Invalid theme_preferences' }, 400); }
      updateFields.push('theme_preferences = ?');
      updateValues.push(JSON.stringify({ ...currentPrefs, ...inputPrefs }));
  }
  if (node_primary_color && isValidHexColor(node_primary_color)) { updateFields.push('node_primary_color = ?'); updateValues.push(node_primary_color); }
  if (node_secondary_color && isValidHexColor(node_secondary_color)) { updateFields.push('node_secondary_color = ?'); updateValues.push(node_secondary_color); }
  if (node_size !== undefined) {
    const size = Number(node_size);
    if (isNaN(size) || size < 4 || size > 30) return c.json({ error: 'node_size must be between 4 and 30' }, 400);
    updateFields.push('node_size = ?');
    updateValues.push(size);
  }

  if (updateFields.length === 0) return c.json({ message: 'No updates' }, 400);
  try {
    await c.env.DB.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).bind(...updateValues, user_id).run();
    return c.json({ message: 'Customization updated' });
  } catch (e: any) {
    console.error("Customization update error:", e);
    return c.json({ error: 'Failed to update' }, 500);
  }
});

auth.post('/users/me/avatar', async (c) => {
  const user_id = c.get('user_id');
  try {
    const formData = await c.req.parseBody();
    const avatarFile = formData['avatar'] as File;
    if (!avatarFile) return c.json({ error: 'No avatar' }, 400);

    const r2_key = `avatars/${user_id}/${crypto.randomUUID()}-${avatarFile.name}`;
    await c.env.BUCKET.put(r2_key, avatarFile.stream(), { httpMetadata: { contentType: avatarFile.type } });
    await c.env.DB.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(r2_key, user_id).run();
    return c.json({ message: 'Avatar updated', avatar_url: getR2PublicUrl(c.env, r2_key) });
  } catch (e) {
    return c.json({ error: 'Avatar update failed' }, 500);
  }
});

export default auth;
