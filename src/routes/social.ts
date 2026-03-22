// src/routes/social.ts
import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { createNotification } from '../utils/notifications';

const social = new Hono<{ Bindings: Env, Variables: Variables }>();

// Helper: verify group membership
async function checkGroupMember(db: D1Database, group_id: number, user_id: number): Promise<{ role: string } | null> {
  return db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?')
    .bind(group_id, user_id).first() as Promise<{ role: string } | null>;
}

social.post('/relationships/follow', async (c) => {
  const source_user_id = c.get('user_id');
  const { target_user_id } = await c.req.json();
  if (!target_user_id || source_user_id === target_user_id) return c.json({ error: 'Invalid ID' }, 400);
  try {
    const existing = await c.env.DB.prepare('SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ?').bind(source_user_id, target_user_id).first();
    if (existing) return c.json({ error: 'Already exists' }, 409);
    await c.env.DB.prepare('INSERT INTO relationships (source_user_id, target_user_id, type, status) VALUES (?, ?, ?, ?)').bind(source_user_id, target_user_id, 'asym_follow', 'accepted').run();
    return c.json({ message: 'Followed' });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.post('/relationships/sym-request', async (c) => {
  const source_user_id = c.get('user_id');
  const { target_user_id, file_id } = await c.req.json();
  if (!target_user_id || source_user_id === target_user_id) return c.json({ error: 'Invalid ID' }, 400);
  try {
    const existingDirect = await c.env.DB.prepare('SELECT id, type, status FROM relationships WHERE source_user_id = ? AND target_user_id = ?').bind(source_user_id, target_user_id).first() as any;
    if (existingDirect) {
        if (existingDirect.type === 'sym_request') return c.json({ error: 'Already pending' }, 409);
        if (existingDirect.type === 'sym_accepted') return c.json({ error: 'Already connected' }, 409);
        if (existingDirect.type === 'asym_follow') {
            await c.env.DB.prepare('UPDATE relationships SET type = ?, status = ? WHERE id = ?').bind('sym_request', 'pending', existingDirect.id).run();
            await createNotification(c.env, c.env.DB, target_user_id, 'sym_request', source_user_id, file_id ? { file_id } : {});
            return c.json({ message: 'Request sent (upgraded)' });
        }
    }
    await c.env.DB.prepare('INSERT INTO relationships (source_user_id, target_user_id, type, status) VALUES (?, ?, ?, ?)').bind(source_user_id, target_user_id, 'sym_request', 'pending').run();
    await createNotification(c.env, c.env.DB, target_user_id, 'sym_request', source_user_id, file_id ? { file_id } : {});
    return c.json({ message: 'Request sent' });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.post('/relationships/accept-sym-request', async (c) => {
  const target_user_id = c.get('user_id');
  const { source_user_id } = await c.req.json();
  try {
    const request = await c.env.DB.prepare('SELECT id FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type = ? AND status = ?').bind(source_user_id, target_user_id, 'sym_request', 'pending').first() as any;
    if (!request) return c.json({ error: 'Not found' }, 404);
    const userA = Math.min(source_user_id, target_user_id);
    const userB = Math.max(source_user_id, target_user_id);
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE relationships SET type = ?, status = ? WHERE id = ?').bind('sym_accepted', 'accepted', request.id),
      c.env.DB.prepare('INSERT INTO relationships (source_user_id, target_user_id, type, status) VALUES (?, ?, ?, ?) ON CONFLICT(source_user_id, target_user_id) DO UPDATE SET type = \'sym_accepted\', status = \'accepted\'').bind(target_user_id, source_user_id, 'sym_accepted', 'accepted'),
      c.env.DB.prepare('INSERT INTO mutual_connections (user_a_id, user_b_id) VALUES (?, ?)').bind(userA, userB)
    ]);
    await createNotification(c.env, c.env.DB, source_user_id, 'sym_accepted', target_user_id);
    return c.json({ message: 'Accepted' });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.post('/relationships/decline-sym-request', async (c) => {
  const target_user_id = c.get('user_id');
  const { source_user_id } = await c.req.json();
  try {
    await c.env.DB.prepare('UPDATE relationships SET status = ? WHERE source_user_id = ? AND target_user_id = ? AND type = ? AND status = ?').bind('rejected', source_user_id, target_user_id, 'sym_request', 'pending').run();
    return c.json({ message: 'Declined' });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.delete('/relationships/:target_user_id', async (c) => {
  const source_user_id = c.get('user_id');
  const target_user_id = Number(c.req.param('target_user_id'));
  try {
    await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM relationships WHERE source_user_id = ? AND target_user_id = ?').bind(source_user_id, target_user_id),
        c.env.DB.prepare('DELETE FROM relationships WHERE source_user_id = ? AND target_user_id = ?').bind(target_user_id, source_user_id),
        c.env.DB.prepare('DELETE FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)').bind(source_user_id, target_user_id, target_user_id, source_user_id)
    ]);
    return c.json({ message: 'Removed' });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.get('/relationships', async (c) => {
  const user_id = c.get('user_id');
  try {
    const outgoing = await c.env.DB.prepare('SELECT r.target_user_id as user_id, r.type, r.status, u.username, u.avatar_url FROM relationships r JOIN users u ON r.target_user_id = u.id WHERE r.source_user_id = ?').bind(user_id).all();
    const incoming = await c.env.DB.prepare('SELECT r.source_user_id as user_id, r.type, r.status, u.username, u.avatar_url FROM relationships r JOIN users u ON r.source_user_id = u.id WHERE r.target_user_id = ?').bind(user_id).all();
    const mutual = await c.env.DB.prepare('SELECT CASE WHEN mc.user_a_id = ? THEN mc.user_b_id ELSE mc.user_a_id END as user_id, u.username, u.avatar_url FROM mutual_connections mc JOIN users u ON (u.id = CASE WHEN mc.user_a_id = ? THEN mc.user_b_id ELSE mc.user_a_id END) WHERE mc.user_a_id = ? OR mc.user_b_id = ?').bind(user_id, user_id, user_id, user_id).all();
    const toPublicUrl = (u: any) => ({
      ...u,
      avatar_url: (u.avatar_url && typeof u.avatar_url === 'string' && u.avatar_url.startsWith('avatars/'))
        ? `https://${c.env.R2_PUBLIC_DOMAIN}/${u.avatar_url}` : u.avatar_url
    });
    return c.json({
      outgoing: outgoing.results.map(toPublicUrl),
      incoming: incoming.results.map(toPublicUrl),
      mutual: mutual.results.map(toPublicUrl)
    });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.get('/notifications', async (c) => {
  const user_id = c.get('user_id');
  try {
    const { results } = await c.env.DB.prepare('SELECT n.*, u.username as actor_name, u.avatar_url as actor_avatar FROM notifications n LEFT JOIN users u ON n.actor_id = u.id WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50').bind(user_id).all();
    return c.json({ notifications: results });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.put('/notifications/:id/read', async (c) => {
  const user_id = c.get('user_id');
  const notification_id = Number(c.req.param('id'));
  await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').bind(notification_id, user_id).run();
  return c.json({ success: true });
});

social.put('/notifications/read-all', async (c) => {
  const user_id = c.get('user_id');
  await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').bind(user_id).run();
  return c.json({ success: true });
});

social.delete('/notifications/:id', async (c) => {
  const user_id = c.get('user_id');
  const notification_id = Number(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').bind(notification_id, user_id).run();
  return c.json({ message: 'Deleted' });
});

social.post('/groups', async (c) => {
    const user_id = c.get('user_id');
    const { name, member_ids } = await c.req.json();
    if (!name || !member_ids) return c.json({ error: 'Missing fields' }, 400);
    try {
        const { meta } = await c.env.DB.prepare('INSERT INTO groups (name, creator_id) VALUES (?, ?)').bind(name, user_id).run();
        const groupId = meta.last_row_id;
        const uniqueMemberIds = [...new Set([user_id, ...member_ids])];
        const stmts = uniqueMemberIds.map((mid: any) => c.env.DB.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').bind(groupId, mid, mid === user_id ? 'admin' : 'member'));
        await c.env.DB.batch(stmts);
        return c.json({ message: 'Group created', group: { id: groupId, name } });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.get('/groups', async (c) => {
    const user_id = c.get('user_id');
    try {
        const { results } = await c.env.DB.prepare('SELECT g.id, g.name, gm.role, (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count FROM groups g JOIN group_members gm ON g.id = gm.group_id WHERE gm.user_id = ?').bind(user_id).all();
        return c.json({ groups: results });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.get('/groups/:id/messages', async (c) => {
    const user_id = c.get('user_id');
    const group_id = Number(c.req.param('id'));
    const membership = await checkGroupMember(c.env.DB, group_id, user_id);
    if (!membership) return c.json({ error: 'Unauthorized' }, 403);
    try {
        const { results } = await c.env.DB.prepare('SELECT gm.id, gm.content, gm.sender_id, u.username as sender_name, gm.created_at FROM group_messages gm JOIN users u ON gm.sender_id = u.id WHERE gm.group_id = ? ORDER BY gm.created_at ASC LIMIT 200').bind(group_id).all();
        return c.json({ messages: results });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.post('/groups/:id/messages', async (c) => {
    const sender_id = c.get('user_id');
    const group_id = Number(c.req.param('id'));
    const { content } = await c.req.json();
    const membership = await checkGroupMember(c.env.DB, group_id, sender_id);
    if (!membership) return c.json({ error: 'Unauthorized' }, 403);
    try {
        await c.env.DB.prepare('INSERT INTO group_messages (group_id, sender_id, content) VALUES (?, ?, ?)').bind(group_id, sender_id, content).run();
        return c.json({ message: 'Sent' });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.get('/groups/:id/members', async (c) => {
    const group_id = Number(c.req.param('id'));
    const user_id = c.get('user_id');
    const membership = await checkGroupMember(c.env.DB, group_id, user_id);
    if (!membership) return c.json({ error: 'Unauthorized' }, 403);
    try {
        const { results } = await c.env.DB.prepare('SELECT u.id as user_id, u.username, gm.role FROM users u JOIN group_members gm ON u.id = gm.user_id WHERE gm.group_id = ?').bind(group_id).all();
        return c.json({ members: results });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.post('/groups/:id/members', async (c) => {
    const group_id = Number(c.req.param('id'));
    const user_id = c.get('user_id');
    const { user_id: new_member_id } = await c.req.json();
    const membership = await checkGroupMember(c.env.DB, group_id, user_id);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);
    try {
        await c.env.DB.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').bind(group_id, new_member_id, 'member').run();
        return c.json({ message: 'Added' });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.put('/groups/:id/members/:userId/role', async (c) => {
    const group_id = Number(c.req.param('id'));
    const user_id = c.get('user_id');
    const target_userId = Number(c.req.param('userId'));
    const { role } = await c.req.json();
    const membership = await checkGroupMember(c.env.DB, group_id, user_id);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);
    try {
        await c.env.DB.prepare('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?').bind(role, group_id, target_userId).run();
        return c.json({ message: 'Updated' });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.delete('/groups/:id/members/me', async (c) => {
    const group_id = Number(c.req.param('id'));
    const user_id = c.get('user_id');
    try {
        await c.env.DB.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').bind(group_id, user_id).run();
        return c.json({ message: 'Left' });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.delete('/groups/:id/members/:userId', async (c) => {
    const group_id = Number(c.req.param('id'));
    const user_id = c.get('user_id');
    const target_userId = Number(c.req.param('userId'));
    const membership = await checkGroupMember(c.env.DB, group_id, user_id);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);
    try {
        await c.env.DB.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').bind(group_id, target_userId).run();
        return c.json({ message: 'Removed' });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.get('/groups/:id/files', async (c) => {
    const group_id = Number(c.req.param('id'));
    const user_id = c.get('user_id');
    const membership = await checkGroupMember(c.env.DB, group_id, user_id);
    if (!membership) return c.json({ error: 'Unauthorized' }, 403);
    try {
        const { results } = await c.env.DB.prepare('SELECT f.id, f.filename, f.mime_type, gf.can_edit FROM files f JOIN group_files gf ON f.id = gf.file_id WHERE gf.group_id = ?').bind(group_id).all();
        return c.json({ files: results });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.post('/groups/:id/files', async (c) => {
    const group_id = Number(c.req.param('id'));
    const user_id = c.get('user_id');
    const { file_id, can_edit } = await c.req.json();
    const membership = await checkGroupMember(c.env.DB, group_id, user_id);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);
    try {
        const file = await c.env.DB.prepare('SELECT user_id FROM files WHERE id = ?').bind(file_id).first() as any;
        if (!file || file.user_id !== user_id) return c.json({ error: 'Unauthorized to share this file' }, 403);
        await c.env.DB.prepare('INSERT INTO group_files (group_id, file_id, shared_by, can_edit) VALUES (?, ?, ?, ?)').bind(group_id, file_id, user_id, can_edit ? 1 : 0).run();
        return c.json({ message: 'Shared' });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

social.delete('/groups/:id/files/:fileId', async (c) => {
    const group_id = Number(c.req.param('id'));
    const user_id = c.get('user_id');
    const file_id = Number(c.req.param('fileId'));
    const membership = await checkGroupMember(c.env.DB, group_id, user_id);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);
    try {
        await c.env.DB.prepare('DELETE FROM group_files WHERE group_id = ? AND file_id = ?').bind(group_id, file_id).run();
        return c.json({ message: 'Removed' });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default social;
