import { Router } from '../router';
import { Env } from '../types/env';

// Mock the crypto.randomUUID function
const mockUUID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
global.crypto = {
  ...global.crypto,
  randomUUID: () => mockUUID,
};

describe('Connection Routes', () => {
  let router: Router;
  let env: Env;
  let request: Request;

  beforeEach(() => {
    router = new Router();
    const db = {
      prepare: jest.fn(() => ({
        bind: jest.fn(() => ({
          first: jest.fn(),
          all: jest.fn(() => Promise.resolve({ results: [] })),
          run: jest.fn(),
        })),
      })),
    };
    const connections = {
      get: jest.fn(() => ({
        fetch: jest.fn(),
      })),
      idFromName: jest.fn(),
    };
    env = {
      R3L_DB: db,
      R3L_CONNECTIONS: connections,
      JWT_SECRET: 'test-secret',
    } as any;
  });

  it('should be true', () => {
    expect(true).toBe(true);
  });

  describe('GET /api/connections', () => {
    it('should return a list of connections', async () => {
      const mockConnections = [
        {
          id: 'conn1',
          user_id: 'user1',
          connected_user_id: 'user2',
          type: 'mutual',
          status: 'accepted',
          visibility: 'private',
          created_at: Date.now(),
          updated_at: Date.now(),
          connected_username: 'user2',
          connected_display_name: 'User Two',
          connected_avatar_url: 'avatar2.png',
        },
      ];

      const mockDb = env.R3L_DB as any;
      const mockAll = jest.fn().mockResolvedValue({ results: mockConnections });
      const mockBind = jest.fn(() => ({ all: mockAll }));
      mockDb.prepare.mockReturnValue({ bind: mockBind });

      // Mock the getAuthenticatedUser to return a user ID
      (router as any).getAuthenticatedUser = jest.fn().mockResolvedValue('user1');

      request = new Request('https://example.com/api/connections', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await router.handle(request, env);
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
      expect(data[0].id).toBe('conn1');
      expect(data[0].otherUser.username).toBe('user2');
    });
  });


  describe('PATCH /api/connections/:connectionId/visibility', () => {
    it('should update the visibility of a connection', async () => {
      const connectionId = 'conn1';
      const visibility = 'public';

      const mockDb = env.R3L_DB as any;
      const mockRun = jest.fn().mockResolvedValue({ success: true });
      const mockFirst = jest.fn().mockResolvedValue({ user_id: 'user1', connected_user_id: 'user2' });
      const mockBind = jest.fn(() => ({ run: mockRun, first: mockFirst }));
      mockDb.prepare.mockImplementation((query: string) => {
        if (query.trim().startsWith('SELECT')) {
          return { bind: () => ({ first: mockFirst }) };
        }
        return { bind: mockBind };
      });

      // Mock the getAuthenticatedUser to return a user ID
      (router as any).getAuthenticatedUser = jest.fn().mockResolvedValue('user1');

      request = new Request(`https://example.com/api/connections/${connectionId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });

      const response = await router.handle(request, env);
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE connections'));
      expect(mockBind).toHaveBeenCalledWith(visibility, expect.any(Number), connectionId);
    });
  });

  describe('POST /api/connections', () => {
    it('should create a new connection request', async () => {
      const targetUserId = 'user2';
      const type = 'mutual';
      const message = 'Hello!';

      const mockDb = env.R3L_DB as any;
      const mockRun = jest.fn().mockResolvedValue({ success: true });
      const mockBind = jest.fn(() => ({ run: mockRun }));
      mockDb.prepare.mockReturnValue({ bind: mockBind });

      // Mock the getAuthenticatedUser to return a user ID
      (router as any).getAuthenticatedUser = jest.fn().mockResolvedValue('user1');

      request = new Request('https://example.com/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, type, message }),
      });

      const response = await router.handle(request, env);
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.id).toBe(mockUUID);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO connections'));
      expect(mockBind).toHaveBeenCalledWith(
        mockUUID,
        'user1',
        targetUserId,
        type,
        'pending',
        message,
        expect.any(Number),
        expect.any(Number)
      );
    });
  });
});
