import { z } from 'zod';

export const loginSchema = z.object({
    username: z.string(),
    password: z.string(),
});

export const registerSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters long.'),
    username: z.string().min(3, 'Username must be at least 3 characters long.'),
    displayName: z.string().min(1, 'Display name is required.').optional(),
});

export const contentCreateSchema = z.object({
  filename: z.string().min(1, 'Filename is required.'),
  contentType: z.string().refine(
      (value) => ['image/', 'video/', 'application/'].some(prefix => value.startsWith(prefix)),
      { message: 'Invalid content type. Must start with image/, video/, or application/.' }
  ),
  fileSize: z.number().int().positive('File size must be a positive integer.'),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export const validationErrorHandler = (result, c) => {
    if (!result.success) {
        return c.json({
            error: 'Validation failed',
            messages: result.error.flatten().fieldErrors
        }, 422);
    }
};