// src/routes/collections.ts
import { Hono } from 'hono';
import JSZip from 'jszip';
import { Env, Variables } from '../types';
import { decryptData } from '../utils/security';

const collections = new Hono<{ Bindings: Env, Variables: Variables }>();

// GET /api/collections: List user's collections
collections.get('/', async (c) => {
  const user_id = c.get('user_id');

  try {
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

    const formattedCollections = results.map((r: any) => ({
      ...r,
      file_ids: r.file_ids_str ? r.file_ids_str.split(',').map(Number) : []
    }));

    return c.json({ collections: formattedCollections });
  } catch (e: any) {
    console.error("Error listing collections:", e);
    return c.json({ error: 'Failed to list collections' }, 500);
  }
});

// POST /api/collections: Create a new collection
collections.post('/', async (c) => {
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
collections.get('/:id', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));

  if (isNaN(collection_id)) return c.json({ error: 'Invalid collection ID' }, 400);

  try {
    const collection = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE id = ?'
    ).bind(collection_id).first() as any;

    if (!collection) return c.json({ error: 'Collection not found' }, 404);

    // Permission check
    if (collection.user_id !== user_id) {
        if (collection.visibility === 'private') {
            return c.json({ error: 'Unauthorized' }, 403);
        }
        if (collection.visibility === 'sym') {
             const mutual = await c.env.DB.prepare(
                'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
            ).bind(Math.min(user_id, collection.user_id), Math.max(user_id, collection.user_id), Math.min(user_id, collection.user_id), Math.max(user_id, collection.user_id)).first();
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
collections.put('/:id', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));
  const { name, description, visibility } = await c.req.json();

  if (isNaN(collection_id)) return c.json({ error: 'Invalid collection ID' }, 400);

  try {
    const collection = await c.env.DB.prepare('SELECT user_id FROM collections WHERE id = ?').bind(collection_id).first() as any;
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
collections.put('/:id/reorder', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));
  const { file_orders } = await c.req.json(); 

  if (isNaN(collection_id) || !Array.isArray(file_orders)) return c.json({ error: 'Invalid parameters' }, 400);

  try {
    const collection = await c.env.DB.prepare('SELECT user_id FROM collections WHERE id = ?').bind(collection_id).first() as any;
    if (!collection) return c.json({ error: 'Collection not found' }, 404);
    if (collection.user_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);

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
collections.delete('/:id', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));

  if (isNaN(collection_id)) return c.json({ error: 'Invalid collection ID' }, 400);

  try {
    const collection = await c.env.DB.prepare('SELECT user_id FROM collections WHERE id = ?').bind(collection_id).first() as any;
    if (!collection) return c.json({ error: 'Collection not found' }, 404);
    if (collection.user_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);

    await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM collections WHERE id = ?').bind(collection_id),
        c.env.DB.prepare('DELETE FROM collection_files WHERE collection_id = ?').bind(collection_id)
    ]);

    return c.json({ message: 'Collection deleted successfully' });
  } catch (e: any) {
    console.error("Error deleting collection:", e);
    return c.json({ error: 'Failed to delete collection' }, 500);
  }
});

// GET /api/collections/:id/zip: Download collection as ZIP
collections.get('/:id/zip', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));

  try {
    const collection = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE id = ?'
    ).bind(collection_id).first() as any;

    if (!collection) return c.json({ error: 'Collection not found' }, 404);

    if (collection.user_id !== user_id) {
        if (collection.visibility === 'private') return c.json({ error: 'Unauthorized' }, 403);
        if (collection.visibility === 'sym') {
            const mutual = await c.env.DB.prepare(
                'SELECT id FROM mutual_connections WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)'
            ).bind(Math.min(user_id, collection.user_id), Math.max(user_id, collection.user_id), Math.min(user_id, collection.user_id), Math.max(user_id, collection.user_id)).first();
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
    for (const file of files as any[]) {
      const object = await c.env.BUCKET.get(file.r2_key);
      if (object) {
        let body = await object.arrayBuffer();
        if (file.is_encrypted && file.iv && c.env.ENCRYPTION_SECRET) {
          body = await decryptData(body, file.iv, c.env.ENCRYPTION_SECRET);
        }
        zip.file(file.filename, body);
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
collections.post('/:id/files', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));
  const { file_id } = await c.req.json();

  if (isNaN(collection_id) || !file_id) return c.json({ error: 'Invalid parameters' }, 400);

  try {
    const collection = await c.env.DB.prepare('SELECT user_id FROM collections WHERE id = ?').bind(collection_id).first() as any;
    if (!collection) return c.json({ error: 'Collection not found' }, 404);
    if (collection.user_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);

    const maxOrder = await c.env.DB.prepare(
        'SELECT MAX(file_order) as max_order FROM collection_files WHERE collection_id = ?'
    ).bind(collection_id).first() as any;
    const nextOrder = (maxOrder?.max_order || 0) + 1;

    await c.env.DB.prepare(
      'INSERT INTO collection_files (collection_id, file_id, file_order) VALUES (?, ?, ?)'
    ).bind(collection_id, file_id, nextOrder).run();

    return c.json({ message: 'File added to collection' });
  } catch (e: any) {
    if (e.message && e.message.includes('UNIQUE constraint failed')) {
        return c.json({ error: 'File already in collection' }, 409);
    }
    console.error("Error adding file to collection:", e);
    return c.json({ error: 'Failed to add file to collection' }, 500);
  }
});

// DELETE /api/collections/:id/files/:file_id: Remove file from collection
collections.delete('/:id/files/:file_id', async (c) => {
  const user_id = c.get('user_id');
  const collection_id = Number(c.req.param('id'));
  const file_id = Number(c.req.param('file_id'));

  if (isNaN(collection_id) || isNaN(file_id)) return c.json({ error: 'Invalid parameters' }, 400);

  try {
    const collection = await c.env.DB.prepare('SELECT user_id FROM collections WHERE id = ?').bind(collection_id).first() as any;
    if (!collection) return c.json({ error: 'Collection not found' }, 404);
    if (collection.user_id !== user_id) return c.json({ error: 'Unauthorized' }, 403);

    await c.env.DB.prepare(
      'DELETE FROM collection_files WHERE collection_id = ? AND file_id = ?'
    ).bind(collection_id, file_id).run();

    return c.json({ message: 'File removed from collection' });
  } catch (e: any) {
    console.error("Error removing file from collection:", e);
    return c.json({ error: 'Failed to remove file from collection' }, 500);
  }
});

export default collections;
