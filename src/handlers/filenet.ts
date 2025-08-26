import { Env } from '../types/env';
import { ContentLifecycle } from './expiration';

interface File {
  name: string;
  type: string;
  size: number;
  stream: () => ReadableStream;
}

interface AuthenticatedRequest extends Request {
  userId: string;
  userRole: string;
  authenticated: boolean;
}

interface ContentRecord {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  type: string;
  size: number;
  file_key: string;
  tags?: string;
  is_public: number;
  created_at: number;
  expires_at: number;
  archive_status: string;
}

export class FilenetHandler {
  supportedFormats = {
    creative: ['image/', 'audio/', 'video/', 'application/pdf', 'application/zip'],
    technical: ['text/plain', 'application/json', 'text/csv', 'application/x-ipynb+json'],
    document: [
      'text/markdown',
      'text/html',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  };

  async handleFileUpload(request: AuthenticatedRequest, env: Env): Promise<Response> {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as unknown as File;
      const isPublic = formData.get('isPublic') === 'true';
      const description = (formData.get('description') as string) || '';
      const tags = (formData.get('tags') as string) || '';
      const userId = request.userId;

      if (!file) {
        return new Response('No file provided', { status: 400 });
      }

      const fileId = crypto.randomUUID();
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

      // Store in R2
      await env.R3L_CONTENT_BUCKET.put(fileId, file.stream());

      // Store metadata in D1
      await env.R3L_DB.prepare(
        `
        INSERT INTO content (
          id, user_id, title, description, type, size, file_key, tags, is_public, 
          created_at, expires_at, archive_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
        .bind(
          fileId,
          userId,
          file.name,
          description,
          file.type,
          file.size,
          fileId,
          tags,
          isPublic ? 1 : 0,
          Date.now(),
          expiresAt,
          'active'
        )
        .run();

      // Schedule expiration
      const lifecycle = new ContentLifecycle();
      await lifecycle.scheduleExpiry(fileId, env);

      return new Response(
        JSON.stringify({
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          isPublic,
          expiresAt,
          archivable: true,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error: any) {
      console.error('File upload error:', error);
      return new Response(`File upload failed: ${error?.message || 'Unknown error'}`, {
        status: 500,
      });
    }
  }

  async getFile(request: AuthenticatedRequest, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const fileId = url.pathname.split('/').pop();

      if (!fileId) {
        return new Response('Invalid file ID', { status: 400 });
      }

      // Check if this is a download request
      const isDownload = url.searchParams.get('download') === 'true';

      // Get file metadata
      const fileResult = await env.R3L_DB.prepare(
        `
        SELECT * FROM content WHERE id = ?
      `
      )
        .bind(fileId)
        .first<ContentRecord>();

      if (!fileResult) {
        return new Response('File not found', { status: 404 });
      }

      // Check access permissions
      if (fileResult.is_public !== 1 && fileResult.user_id !== request.userId) {
        return new Response('Access denied', { status: 403 });
      }

      // Get file from R2
      const object = await env.R3L_CONTENT_BUCKET.get(fileResult.file_key);

      if (!object) {
        return new Response('File not found in storage', { status: 404 });
      }

      // If user is authenticated and this is a download, record it
      if (request.authenticated && request.userId && isDownload) {
        // Import ContentHandler to record the download
        const { ContentHandler } = await import('./content');
        const contentHandler = new ContentHandler();

        // Record download asynchronously (don't await to speed up response)
        contentHandler
          .recordDownload(fileId, request.userId, env)
          .catch(err => console.error('Failed to record download:', err));
      }

      // Stream the file
      const disposition = isDownload ? 'attachment' : 'inline';

      return new Response(object.body, {
        headers: {
          'Content-Type': fileResult.type,
          'Content-Disposition': `${disposition}; filename="${fileResult.title}"`,
          'Cache-Control': isDownload ? 'no-cache' : 'public, max-age=3600',
        },
      });
    } catch (error: any) {
      console.error('File retrieval error:', error);
      return new Response(`File retrieval failed: ${error?.message || 'Unknown error'}`, {
        status: 500,
      });
    }
  }

  async listUserFiles(request: AuthenticatedRequest, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get('userId') || request.userId;
      const isPublic = url.searchParams.get('public') === 'true';
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      // Query for public or private files based on request
      let sql = `
        SELECT id, title, description, type, size, created_at, expires_at, archive_status, tags
        FROM content 
        WHERE user_id = ?
      `;

      const params: any[] = [userId];

      if (userId !== request.userId) {
        // If not the owner, can only see public files
        sql += ` AND is_public = 1`;
      } else if (isPublic !== undefined) {
        // If owner and specifying public/private
        sql += ` AND is_public = ?`;
        params.push(isPublic ? 1 : 0);
      }

      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const files = await env.R3L_DB.prepare(sql)
        .bind(...params)
        .all<ContentRecord>();
      const results = files.results || ([] as ContentRecord[]);

      return new Response(
        JSON.stringify({
          files: results,
          total: results.length,
          hasMore: results.length === limit,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error: any) {
      console.error('File listing error:', error);
      return new Response(`File listing failed: ${error?.message || 'Unknown error'}`, {
        status: 500,
      });
    }
  }
}
