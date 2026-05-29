
// src/do.ts
import { DurableObject } from "cloudflare:workers";
import { Env } from './types';

interface UserSession {
  userId: number;
}

/**
 * RelfDO Durable Object
 * Primary DO for managing global presence and notifications.
 * Uses the Hibernation API for efficient duration and memory scaling.
 *
 * Communication model:
 * - WebSocket upgrade: via fetch() handler (required for Hibernation API)
 * - Notify/Broadcast: via RPC methods (type-safe, no HTTP overhead)
 */
export class RelfDO extends DurableObject {
  state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
  }

  // ─── fetch: WebSocket upgrade only ────────────────────────────────
  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === '/websocket') {
      if (request.headers.get("Upgrade") != "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const userIdHeader = request.headers.get('X-User-ID');
      if (!userIdHeader) {
        return new Response("User ID missing", { status: 400 });
      }
      const userId = parseInt(userIdHeader);

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Store session data in attachment (survives hibernation)
      const session: UserSession = { userId };
      this.state.acceptWebSocket(server);
      server.serializeAttachment(session);

      // 1. Initial presence sync
      const onlineUserIds = this.getOnlineUserIds();
      server.send(JSON.stringify({ type: 'presence_sync', onlineUserIds }));

      // 2. Broadcast 'online' to others
      this.broadcast({ type: 'presence_update', status: 'online', userId }, server);

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  // ─── RPC methods (called directly from Worker, no HTTP overhead) ──

  /**
   * Send a notification to a specific user via their WebSocket connection(s).
   */
  async notify(targetUserId: number, message: any): Promise<void> {
    this.notifyUser(targetUserId, message);
  }

  /**
   * Broadcast a signal to all connected WebSocket clients.
   */
  async broadcastSignal(signal: any): Promise<void> {
    this.broadcast(signal);
  }

  // ─── Hibernation API handlers ─────────────────────────────────────

  async webSocketMessage(ws: WebSocket, message: string) {
    // Current app mostly uses Worker -> DO for communication,
    // but we can handle client messages here if needed.
  }

  async webSocketClose(ws: WebSocket) {
    const session = this.getSession(ws);
    if (session) {
      // Only broadcast offline if this was the last session for this user
      const stillOnline = this.getOnlineUserIds().includes(session.userId);
      if (!stillOnline) {
        this.broadcast({ type: 'presence_update', status: 'offline', userId: session.userId });
      }
    }
  }

  async webSocketError(ws: WebSocket) {
    this.webSocketClose(ws);
  }

  // ─── Private helpers ──────────────────────────────────────────────

  private getOnlineUserIds(): number[] {
    const ids = new Set<number>();
    this.state.getWebSockets().forEach(ws => {
      const session = this.getSession(ws);
      if (session) ids.add(session.userId);
    });
    return Array.from(ids);
  }

  private getSession(ws: WebSocket): UserSession | null {
    return ws.deserializeAttachment();
  }

  private notifyUser(targetUserId: number, message: any) {
    const msg = JSON.stringify(message);
    this.state.getWebSockets().forEach(ws => {
      const session = this.getSession(ws);
      if (session?.userId === targetUserId) {
        try { ws.send(msg); } catch {}
      }
    });
  }

  private broadcast(message: any, exclude?: WebSocket) {
    const msg = JSON.stringify(message);
    this.state.getWebSockets().forEach(ws => {
      if (ws !== exclude) {
        try { ws.send(msg); } catch {}
      }
    });
  }
}
