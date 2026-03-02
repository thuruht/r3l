import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';

// Mock hono/cookie and hono/jwt BEFORE importing the app or authMiddleware
vi.mock('hono/cookie', () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));

vi.mock('hono/jwt', () => ({
  verify: vi.fn(),
  sign: vi.fn(),
}));

import { authMiddleware } from './index';

describe('authMiddleware', () => {
  const mockNext = vi.fn();
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      json: vi.fn((data, status) => ({ data, status })),
      set: vi.fn(),
      env: {
        JWT_SECRET: 'test_secret',
      },
    };
  });

  it('should return 401 if no token provided', async () => {
    vi.mocked(getCookie).mockReturnValue(undefined);

    const result = await authMiddleware(mockContext, mockNext);

    expect(result).toEqual({ data: { error: 'Unauthorized: No token provided' }, status: 401 });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token payload is invalid', async () => {
    vi.mocked(getCookie).mockReturnValue('valid_token');
    vi.mocked(verify).mockResolvedValue(null as any);

    const result = await authMiddleware(mockContext, mockNext);

    expect(result).toEqual({ data: { error: 'Unauthorized: Invalid token payload' }, status: 401 });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token payload missing id', async () => {
    vi.mocked(getCookie).mockReturnValue('valid_token');
    vi.mocked(verify).mockResolvedValue({ username: 'test' });

    const result = await authMiddleware(mockContext, mockNext);

    expect(result).toEqual({ data: { error: 'Unauthorized: Invalid token payload' }, status: 401 });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token verification fails', async () => {
    vi.mocked(getCookie).mockReturnValue('invalid_token');
    vi.mocked(verify).mockRejectedValue(new Error('Verification failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await authMiddleware(mockContext, mockNext);

    expect(result).toEqual({ data: { error: 'Unauthorized: Invalid or expired token' }, status: 401 });
    expect(mockNext).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should call next() and set user_id if token is valid', async () => {
    vi.mocked(getCookie).mockReturnValue('valid_token');
    vi.mocked(verify).mockResolvedValue({ id: 123 });

    await authMiddleware(mockContext, mockNext);

    expect(mockContext.set).toHaveBeenCalledWith('user_id', 123);
    expect(mockNext).toHaveBeenCalled();
  });
});
