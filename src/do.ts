
// src/do.ts
import { DurableObject } from "cloudflare:workers";

interface Env {
  ASSETS: Fetcher;
  KV: KVNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
  DO_NAMESPACE: DurableObjectNamespace;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_PUBLIC_DOMAIN?: string;
}

interface UserSession {
  userId: number;
}

/**
 * RelfDO Durable Object
 * Primary DO for managing global presence and notifications.
 * Uses the Hibernation API for efficient duration and memory scaling.
 */
export class RelfDO extends DurableObject {
  state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/websocket':
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

        // Store session data in tags/attachment
        const session: UserSession = { userId };
        this.state.acceptWebSocket(server, [JSON.stringify(session)]);

        // 1. Initial presence sync
        const onlineUserIds = this.getOnlineUserIds();
        server.send(JSON.stringify({ type: 'presence_sync', onlineUserIds }));

        // 2. Broadcast 'online' to others
        this.broadcast({ type: 'presence_update', status: 'online', userId }, server);

        return new Response(null, { status: 101, webSocket: client });

      case '/notify':
        try {
          const { userId: targetUserId, message } = await request.json() as { userId: number; message: any };
          this.notifyUser(targetUserId, message);
          return new Response("OK");
        } catch (err: any) {
          return new Response(err.message, { status: 500 });
        }

      case '/broadcast-signal':
        try {
          const body = await request.json();
          this.broadcast(body);
          return new Response("OK");
        } catch (err: any) {
          return new Response(err.message, { status: 500 });
        }

      default:
        return new Response("Not found", { status: 404 });
    }
  }

  getOnlineUserIds(): number[] {
    const ids = new Set<number>();
    this.state.getWebSockets().forEach(ws => {
      const session = this.getSession(ws);
      if (session) ids.add(session.userId);
    });
    return Array.from(ids);
  }

  getSession(ws: WebSocket): UserSession | null {
    const tags = this.state.getTags(ws);
    if (tags.length > 0) {
      try { return JSON.parse(tags[0]); } catch(e) {}
    }
    return null;
  }

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

  notifyUser(targetUserId: number, message: any) {
    const msg = JSON.stringify(message);
    this.state.getWebSockets().forEach(ws => {
      const session = this.getSession(ws);
      if (session?.userId === targetUserId) {
        try { ws.send(msg); } catch {}
      }
    });
  }

  broadcast(message: any, exclude?: WebSocket) {
    const msg = JSON.stringify(message);
    this.state.getWebSockets().forEach(ws => {
      if (ws !== exclude) {
        try { ws.send(msg); } catch {}
      }
    });
  }
}
