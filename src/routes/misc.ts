// src/routes/misc.ts
import { Hono } from 'hono';
import { Resend } from 'resend';
import { Env, Variables } from '../types';
import { checkRateLimit } from '../utils/helpers';

const misc = new Hono<{ Bindings: Env, Variables: Variables }>();

misc.post('/feedback', async (c) => {
  if (!await checkRateLimit(c, 'feedback', 3, 3600)) return c.json({ error: 'Too many' }, 429);
  const user_id = c.get('user_id');
  const { message, type, name, email } = await c.req.json();
  if (!message) return c.json({ error: 'Message required' }, 400);

  if (c.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(c.env.RESEND_API_KEY);
      let userInfo = 'Anonymous';
      if (user_id) {
          const user = await c.env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(user_id).first() as any;
          if (user) userInfo = user.username;
      }
      await resend.emails.send({
        from: 'Rel F Feedback <feedback@r3l.distorted.work>',
        to: 'lowlyserf@distorted.work',
        subject: `[Rel F] Feedback: ${type || 'General'}`,
        html: `<h3>Feedback from ${userInfo}</h3><p>${message}</p>`
      });
      return c.json({ message: 'Sent' });
    } catch (e) { return c.json({ error: 'Failed email' }, 500); }
  }
  return c.json({ message: 'Logged' });
});

export default misc;
