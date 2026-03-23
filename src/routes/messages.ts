// src/routes/messages.ts
import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { getR2PublicUrl } from '../utils/helpers';
import { decryptData, encryptData } from '../utils/security';

const messages = new Hono<{ Bindings: Env, Variables: Variables }>();

messages.get('/conversations', async (c) => {
  const user_id = c.get('user_id');
  try {
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
    const { results } = await c.env.DB.prepare(query).bind(user_id, user_id, user_id, user_id, user_id).all();
    return c.json({ conversations: results.map((conv: any) => ({ ...conv, partner_avatar: (conv.partner_avatar?.startsWith('avatars/')) ? getR2PublicUrl(c.env, conv.partner_avatar) : conv.partner_avatar })) });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

messages.get('/:partner_id', async (c) => {
  const user_id = c.get('user_id');
  const partner_id = Number(c.req.param('partner_id'));
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at ASC LIMIT 100').bind(user_id, partner_id, partner_id, user_id).all();
    
    const decryptedResults = await Promise.all(results.map(async (msg: any) => {
        if (msg.is_encrypted && msg.iv && c.env.ENCRYPTION_SECRET) {
            try {
                const encryptedBuffer = Uint8Array.from(atob(msg.content), c => c.charCodeAt(0)).buffer;
                const decryptedBuffer = await decryptData(encryptedBuffer, msg.iv, c.env.ENCRYPTION_SECRET);
                const decryptedText = new TextDecoder().decode(decryptedBuffer);
                return { ...msg, content: decryptedText };
            } catch (e) { return { ...msg, content: '[Decryption Error]' }; }
        }
        return msg;
    }));

    return c.json({ messages: decryptedResults });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

messages.post('/', async (c) => {
  const sender_id = c.get('user_id');
  const { receiver_id, content, encrypt, encrypted_key, iv: client_iv } = await c.req.json();
  if (!receiver_id || !content) return c.json({ error: 'Missing fields' }, 400);

  try {
    const userA = Math.min(sender_id, receiver_id);
    const userB = Math.max(sender_id, receiver_id);
    const mutual = await c.env.DB.prepare('SELECT id FROM mutual_connections WHERE user_a_id = ? AND user_b_id = ?').bind(userA, userB).first();
    const is_request = mutual ? 0 : 1;

    let finalContent = content;
    let is_encrypted = 0;
    let iv: string | null = client_iv || null;
    let final_encrypted_key: string | null = encrypted_key || null;

    if (encrypted_key && client_iv) {
        is_encrypted = 1;
    } else if (encrypt === true && c.env.ENCRYPTION_SECRET) {
        const encryptedData = await encryptData(content, c.env.ENCRYPTION_SECRET);
        finalContent = btoa(String.fromCharCode(...new Uint8Array(encryptedData.encrypted)));
        iv = encryptedData.iv;
        is_encrypted = 1;
    }

    const stmts = [
        c.env.DB.prepare('INSERT INTO messages (sender_id, receiver_id, content, is_encrypted, iv, encrypted_key, is_request) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(sender_id, receiver_id, finalContent, is_encrypted, iv, final_encrypted_key, is_request)
    ];

    if (mutual) {
        stmts.push(c.env.DB.prepare('UPDATE mutual_connections SET strength = strength + 1 WHERE id = ?').bind(mutual.id));
    }

    const { success } = (await c.env.DB.batch(stmts))[0];

    if (success) {
      // Notify Recipient via WebSocket
      const sender = await c.env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(sender_id).first() as any;
      const doId = c.env.DO_NAMESPACE.idFromName('relf-do-instance');
      const doStub = c.env.DO_NAMESPACE.get(doId);
      await doStub.fetch('http://do-stub/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: receiver_id, message: { type: 'new_message', sender_id, sender_name: sender?.username, is_encrypted } }),
      });
      return c.json({ message: 'Sent' });
    }
    return c.json({ error: 'Failed' }, 500);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

messages.put('/:partner_id/read', async (c) => {
  const user_id = c.get('user_id');
  const partner_id = Number(c.req.param('partner_id'));
  try {
    await c.env.DB.prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?').bind(partner_id, user_id).run();
    return c.json({ success: true });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default messages;
