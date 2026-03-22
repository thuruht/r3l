// src/routes/workspaces.ts
import { Hono } from 'hono';
import { Env, Variables } from '../types';

const workspaces = new Hono<{ Bindings: Env, Variables: Variables }>();

// Helper: verify workspace membership
async function checkWorkspaceMember(db: D1Database, workspace_id: number, user_id: number): Promise<{ role: string } | null> {
  return db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .bind(workspace_id, user_id).first() as Promise<{ role: string } | null>;
}

// GET /api/workspaces: List user's workspaces
workspaces.get('/', async (c) => {
  const user_id = c.get('user_id');
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT w.*, wm.role 
       FROM workspaces w 
       JOIN workspace_members wm ON w.id = wm.workspace_id 
       WHERE wm.user_id = ?
       ORDER BY w.updated_at DESC`
    ).bind(user_id).all();
    return c.json({ workspaces: results });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// POST /api/workspaces: Create workspace
workspaces.post('/', async (c) => {
  const user_id = c.get('user_id');
  const { name, description } = await c.req.json();
  if (!name) return c.json({ error: 'Name is required' }, 400);
  try {
    const { meta } = await c.env.DB.prepare(
      'INSERT INTO workspaces (name, description, owner_id) VALUES (?, ?, ?)'
    ).bind(name, description || '', user_id).run();
    const workspaceId = meta.last_row_id;
    await c.env.DB.prepare(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)'
    ).bind(workspaceId, user_id, 'admin').run();
    return c.json({ message: 'Workspace created', workspace_id: workspaceId });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// GET /api/workspaces/:id: Get workspace details
workspaces.get('/:id', async (c) => {
  const workspace_id = Number(c.req.param('id'));
  const user_id = c.get('user_id');
  const membership = await checkWorkspaceMember(c.env.DB, workspace_id, user_id);
  if (!membership) return c.json({ error: 'Unauthorized' }, 403);
  try {
    const workspace = await c.env.DB.prepare('SELECT * FROM workspaces WHERE id = ?').bind(workspace_id).first();
    return c.json({ workspace, role: membership.role });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// PUT /api/workspaces/:id: Update workspace
workspaces.put('/:id', async (c) => {
  const workspace_id = Number(c.req.param('id'));
  const user_id = c.get('user_id');
  const { name, description } = await c.req.json();
  const membership = await checkWorkspaceMember(c.env.DB, workspace_id, user_id);
  if (!membership || membership.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);
  try {
    await c.env.DB.prepare('UPDATE workspaces SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(name, description, workspace_id).run();
    return c.json({ message: 'Updated' });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// DELETE /api/workspaces/:id: Delete workspace
workspaces.delete('/:id', async (c) => {
  const workspace_id = Number(c.req.param('id'));
  const user_id = c.get('user_id');
  const workspace = await c.env.DB.prepare('SELECT owner_id FROM workspaces WHERE id = ?').bind(workspace_id).first() as any;
  if (!workspace || workspace.owner_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);
  try {
    await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM workspaces WHERE id = ?').bind(workspace_id),
        c.env.DB.prepare('DELETE FROM workspace_members WHERE workspace_id = ?').bind(workspace_id),
        c.env.DB.prepare('UPDATE files SET workspace_id = NULL WHERE workspace_id = ?').bind(workspace_id)
    ]);
    return c.json({ message: 'Deleted' });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// GET /api/workspaces/:id/files: List files in workspace
workspaces.get('/:id/files', async (c) => {
  const workspace_id = Number(c.req.param('id'));
  const user_id = c.get('user_id');
  const membership = await checkWorkspaceMember(c.env.DB, workspace_id, user_id);
  if (!membership) return c.json({ error: 'Unauthorized' }, 403);
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM files WHERE workspace_id = ?'
    ).bind(workspace_id).all();
    return c.json({ files: results });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// POST /api/workspaces/:id/files: Add file to workspace
workspaces.post('/:id/files', async (c) => {
  const workspace_id = Number(c.req.param('id'));
  const user_id = c.get('user_id');
  const { file_id } = await c.req.json();
  const membership = await checkWorkspaceMember(c.env.DB, workspace_id, user_id);
  if (!membership) return c.json({ error: 'Unauthorized' }, 403);
  try {
    // Check file ownership
    const file = await c.env.DB.prepare('SELECT user_id FROM files WHERE id = ?').bind(file_id).first() as any;
    if (!file || file.user_id !== user_id) return c.json({ error: 'Unauthorized to move this file' }, 403);

    await c.env.DB.prepare(
      'UPDATE files SET workspace_id = ? WHERE id = ?'
    ).bind(workspace_id, file_id).run();
    return c.json({ message: 'File added' });
  } catch (e) {
    return c.json({ error: 'Failed' }, 500);
  }
});

// DELETE /api/workspaces/:id/files/:file_id: Remove file from workspace
workspaces.delete('/:id/files/:file_id', async (c) => {
    const workspace_id = Number(c.req.param('id'));
    const file_id = Number(c.req.param('file_id'));
    const user_id = c.get('user_id');
    const membership = await checkWorkspaceMember(c.env.DB, workspace_id, user_id);
    if (!membership) return c.json({ error: 'Unauthorized' }, 403);
    try {
        await c.env.DB.prepare('UPDATE files SET workspace_id = NULL WHERE id = ? AND workspace_id = ?').bind(file_id, workspace_id).run();
        return c.json({ message: 'Removed' });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// GET /api/workspaces/:id/members: List members
workspaces.get('/:id/members', async (c) => {
    const workspace_id = Number(c.req.param('id'));
    const user_id = c.get('user_id');
    const membership = await checkWorkspaceMember(c.env.DB, workspace_id, user_id);
    if (!membership) return c.json({ error: 'Unauthorized' }, 403);
    try {
        const { results } = await c.env.DB.prepare('SELECT u.id as user_id, u.username, wm.role FROM users u JOIN workspace_members wm ON u.id = wm.user_id WHERE wm.workspace_id = ?').bind(workspace_id).all();
        return c.json({ members: results });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// POST /api/workspaces/:id/members: Add member
workspaces.post('/:id/members', async (c) => {
    const workspace_id = Number(c.req.param('id'));
    const user_id = c.get('user_id');
    const { user_id: new_member_id, role } = await c.req.json();
    const membership = await checkWorkspaceMember(c.env.DB, workspace_id, user_id);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);
    try {
        await c.env.DB.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)').bind(workspace_id, new_member_id, role || 'member').run();
        return c.json({ message: 'Added' });
    } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default workspaces;
