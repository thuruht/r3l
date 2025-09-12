import { Env } from '../types/env.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class FileHandler {
  constructor() {}

  /**
   * Create a presigned URL for direct file upload from the client to R2
   * @param userId The ID of the user uploading the file
   * @param fileName The name of the file
   * @param contentType The MIME type of the file
   * @param env Environment variables
   * @returns A JSON response with the presigned URL and the generated file key
   */
  async createPresignedUploadUrl(
    userId: string,
    fileName: string,
    contentType: string,
    env: Env
  ): Promise<Response> {
    try {
      const sanitizedFileName = this.sanitizeFileName(fileName);
      const fileExtension = sanitizedFileName.split('.').pop() || 'bin';
      const randomStr = Math.random().toString(36).substring(2, 12);
      const fileKey = `uploads/${userId}/${Date.now()}-${randomStr}.${fileExtension}`;

      const s3 = new S3Client({
        region: 'auto',
        endpoint: env.R2_ENDPOINT,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });

      const presignedUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: fileKey,
          ContentType: contentType,
          Metadata: {
            userId,
            originalName: sanitizedFileName,
          },
        }),
        { expiresIn: 3600 } // URL expires in 1 hour
      );

      return new Response(JSON.stringify({ url: presignedUrl, key: fileKey }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error creating presigned URL:', error);
      return new Response(JSON.stringify({ error: 'Could not create upload URL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Sanitize a filename to prevent security issues
   * @param fileName Original file name
   * @returns Sanitized file name
   */
  private sanitizeFileName(fileName: string): string {
    // Remove any path components
    const baseName = fileName.replace(/^.*[\\\/]/, '');

    // Replace any potentially dangerous characters
    const sanitized = baseName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.{2,}/g, '.'); // Prevent directory traversal

    // Limit length
    return sanitized.substring(0, 255);
  }

  /**
   * Upload a file to R2 storage
   * @param fileData The file data buffer
   * @param fileName Original file name
   * @param contentType MIME type of the file
   * @param metadata Additional metadata to store with the file
   * @param env Environment variables
   * @returns Object with the file key and URL
   */
  async uploadFile(
    fileData: ArrayBuffer,
    fileName: string,
    contentType: string,
    metadata: { [key: string]: string },
    env: Env
  ): Promise<{ key: string; url: string }> {
    try {
      // Validate file size
      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit
      if (fileData.byteLength > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 25MB limit`);
      }

      // Validate file name
      if (!fileName || fileName.trim() === '') {
        throw new Error('File name is required');
      }

      // Sanitize file name to prevent path traversal and other security issues
      const sanitizedFileName = this.sanitizeFileName(fileName);

      // Generate a unique file key based on timestamp and random string
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 12);
      const fileExtension = sanitizedFileName.split('.').pop();
      const fileKey = `${timestamp}-${randomStr}.${fileExtension}`;

      // Add some standard metadata
      const fullMetadata = {
        ...metadata,
        originalName: sanitizedFileName,
        uploadedAt: timestamp.toString(),
      };

      // Upload to R2 bucket
      await env.R3L_CONTENT_BUCKET.put(fileKey, fileData, {
        httpMetadata: {
          contentType: contentType,
        },
        customMetadata: fullMetadata,
      });

      // Return the file key and a URL that can be used to access the file
      return {
        key: fileKey,
        url: `/api/files/${fileKey}`,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error; // Re-throw the error with more context if needed
    }
  }

  /**
   * Upload an avatar image for a user
   * @param userId User ID
   * @param fileData File data buffer
   * @param fileName Original file name
   * @param contentType MIME type of the file
   * @param env Environment variables
   * @returns Object with the avatar key and URL
   */
  async uploadAvatar(
    userId: string,
    fileData: ArrayBuffer,
    fileName: string,
    contentType: string,
    env: Env
  ): Promise<{ avatarKey: string; avatarUrl: string }> {
    try {
      // Validate file size
      const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB limit for avatars
      if (fileData.byteLength > MAX_AVATAR_SIZE) {
        throw new Error(`Avatar image exceeds 5MB limit`);
      }

      // Validate that this is an image file
      if (!contentType.startsWith('image/')) {
        throw new Error('Only image files are allowed for avatars');
      }

      // Sanitize file name
      const sanitizedFileName = this.sanitizeFileName(fileName);

      // Get the file extension
      const fileExtension = sanitizedFileName.split('.').pop()?.toLowerCase();

      // Validate file extension
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        throw new Error('Invalid image file format. Allowed formats: JPG, PNG, GIF, WebP, SVG');
      }

      // Set the avatar metadata
      const metadata = {
        type: 'avatar',
        userId,
      };

      // Create a avatar-specific file key
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 12);
      const avatarKey = `avatars/${userId}/${timestamp}-${randomStr}.${fileExtension}`;

      // Upload to R2 bucket
      await env.R3L_CONTENT_BUCKET.put(avatarKey, fileData, {
        httpMetadata: {
          contentType: contentType,
          cacheControl: 'public, max-age=31536000', // Cache for 1 year
        },
        customMetadata: {
          ...metadata,
          originalName: sanitizedFileName,
          uploadedAt: timestamp.toString(),
        },
      });

      // Update the user's avatar key in the database
      const updateResult = await env.R3L_DB.prepare(
        `
        UPDATE users
        SET avatar_key = ?, updated_at = ?
        WHERE id = ?
      `
      )
        .bind(avatarKey, Date.now(), userId)
        .run();

      if (!updateResult) {
        throw new Error('Failed to update user avatar in database');
      }

      // Return the avatar key and URL
      return {
        avatarKey,
        avatarUrl: `/api/files/avatars/${avatarKey}`,
      };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  }

  /**
   * Get a file from R2 storage
   * @param fileKey The file key in R2
   * @param env Environment variables
   * @returns Response with the file data
   */
  async getFile(fileKey: string, env: Env): Promise<Response> {
    try {
      // Get the file from R2
      const file = await env.R3L_CONTENT_BUCKET.get(fileKey);

      if (!file) {
        return new Response('File not found', { status: 404 });
      }

      // Get the file data and headers
      const data = await file.arrayBuffer();

      // Create response with appropriate headers
      return new Response(data, {
        headers: {
          'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': file.httpMetadata?.cacheControl || 'public, max-age=86400',
          'Content-Disposition': `inline; filename="${encodeURIComponent(
            file.customMetadata?.originalName || fileKey
          )}"`,
        },
      });
    } catch (error) {
      console.error('Error getting file:', error);
      return new Response('Error retrieving file', { status: 500 });
    }
  }

  /**
   * Delete a file from R2 storage
   * @param fileKey The file key in R2
   * @param env Environment variables
   * @returns True if the file was deleted successfully
   */
  async deleteFile(fileKey: string, env: Env): Promise<boolean> {
    try {
      await env.R3L_CONTENT_BUCKET.delete(fileKey);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }
}
