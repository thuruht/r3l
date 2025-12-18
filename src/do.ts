// do.ts

1
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

interface Session {
  ws: WebSocket;
  userId: number; // The ID of the user connected to this session
}

export class RelfDO {
  state: DurableObjectState;
  sessions: Session[];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.sessions = [];
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
          return new Response("User ID missing from WebSocket upgrade request", { status: 400 });
        }
        const userId = parseInt(userIdHeader);
        if (isNaN(userId)) {
          return new Response("Invalid User ID from WebSocket upgrade request", { status: 400 });
        }

        const pair = new WebSocketPair();
        // The server socket is at index 1, client at index 0 for WebSocketPair
        // But WebSocketPair properties are actually '0' and '1' in Cloudflare Workers Types
        const [client, server] = Object.values(pair);
        this.handleSession(server, userId);

        return new Response(null, { status: 101, webSocket: client });

      case '/notify': // Endpoint for the Worker to send notifications to the DO
        if (request.method !== 'POST') {
          return new Response("Method Not Allowed", { status: 405 });
        }
        try {
          // Explicitly cast JSON body to unknown first, then to expected type
          const body = await request.json() as unknown as { userId: number; message: any };
          const { userId: targetUserId, message } = body;
          this.notifyUser(targetUserId, message);
          return new Response("Notification sent", { status: 200 });
        } catch (err: any) {
          console.error("Error processing notify request:", err);
          return new Response(`Error: ${err.message}`, { status: 500 });
        }

      case '/broadcast-signal': // Endpoint for the Worker to broadcast global signals (pulses)
        if (request.method !== 'POST') {
          return new Response("Method Not Allowed", { status: 405 });
        }
        try {
          const body = await request.json() as unknown as any;
          this.broadcast(body); // Broadcast raw body as the message
          return new Response("Signal broadcasted", { status: 200 });
        } catch (err: any) {
          console.error("Error processing signal broadcast:", err);
          return new Response(`Error: ${err.message}`, { status: 500 });
        }

      default:
        return new Response("Not found", { status: 404 });
    }
  }

  handleSession(webSocket: WebSocket, userId: number) {
    webSocket.accept();
    this.sessions.push({ ws: webSocket, userId });

    // 1. Send current online users to the new client
    const onlineUserIds = Array.from(new Set(this.sessions.map(s => s.userId)));
    webSocket.send(JSON.stringify({
      type: 'presence_sync',
      onlineUserIds
    }));

    // 2. Broadcast 'online' status to everyone else
    this.broadcast({
      type: 'presence_update',
      status: 'online',
      userId
    }, userId); // Exclude self from broadcast (optional, but cleaner)

    webSocket.addEventListener("message", async msg => {
      try {
        const data = JSON.parse(msg.data as string);
        // Client can send messages, e.g., to confirm receipt or update state
        // For now, let's echo or ignore client messages
        // webSocket.send(JSON.stringify({ type: 'echo', data: data }));
      } catch (err: any) {
        webSocket.send(JSON.stringify({ error: err.message }));
      }
    });

    webSocket.addEventListener("close", async evt => {
      console.log(`WebSocket closed for user ${userId}: ${evt.code} ${evt.reason}`);
      this.sessions = this.sessions.filter(s => s.ws !== webSocket);

      // Check if user is completely offline (no other sessions)
      const stillOnline = this.sessions.some(s => s.userId === userId);
      if (!stillOnline) {
        this.broadcast({
          type: 'presence_update',
          status: 'offline',
          userId
        });
      }
    });

    webSocket.addEventListener("error", async err => {
      console.error(`WebSocket error for user ${userId}:`, err);
    });
  }

  // Method to send messages to all connected sessions for a specific user
  notifyUser(targetUserId: number, message: any) {
    const jsonMessage = JSON.stringify(message);
    this.sessions = this.sessions.filter(session => {
      if (session.userId === targetUserId) {
        try {
          session.ws.send(jsonMessage);
          return true;
        } catch (err) {
          // This session is no longer active, remove it
          return false;
        }
      }
      return true; // Keep sessions for other users
    });
  }

  // Broadcast to all, optionally excluding a specific user ID
  broadcast(message: any, excludeUserId?: number) {
    const jsonMessage = JSON.stringify(message);
    this.sessions = this.sessions.filter(session => {
      if (excludeUserId && session.userId === excludeUserId) return true; // Skip sending, keep session
      try {
        session.ws.send(jsonMessage);
        return true;
      } catch (err) {
        return false;
      }
    });
  }
}