
// src/do/ChatRoom.ts
import { DurableObject } from "cloudflare:workers";

interface Env {
  // Bindings
}

interface ChatSession {
  userId: number;
  username: string;
  typing: boolean;
}

/**
 * ChatRoom Durable Object
 * Handles real-time chat with message history and typing indicators.
 * Uses Hibernation API for efficient memory and duration usage.
 */
export class ChatRoom extends DurableObject {
  state: DurableObjectState;
  lastTimestamp: number = 0;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
  }

  async fetch(request: Request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

    const url = new URL(request.url);
    const userId = parseInt(url.searchParams.get("userId") || "0");
    const username = url.searchParams.get("username") || "Anonymous";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Initial session data stored as attachment
    const session: ChatSession = { userId, username, typing: false };
    
    // Accept and hibernate
    this.state.acceptWebSocket(server);
    server.serializeAttachment(session);

    // Send initial data (history and online users)
    const online = this.getOnlineUsers();
    server.send(JSON.stringify({ type: "online", users: online }));

    // history
    const storage = await this.state.storage.list({ reverse: true, limit: 100 });
    const history = [...storage.values()].reverse();
    server.send(JSON.stringify({ type: "history", messages: history }));

    // broadcast join
    this.broadcast({ type: "join", userId, username }, server);

    // ensure alarm
    if (await this.state.storage.getAlarm() === null) {
      await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  getOnlineUsers() {
    const users: { userId: number; username: string }[] = [];
    this.state.getWebSockets().forEach(ws => {
      const meta = this.getSession(ws);
      if (meta) users.push({ userId: meta.userId, username: meta.username });
    });
    return users;
  }

  getSession(ws: WebSocket): ChatSession | null {
    return ws.deserializeAttachment();
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    const session = this.getSession(ws);
    if (!session) return;

    let data: any;
    try {
      data = JSON.parse(message);
    } catch {
      return; // ignore malformed messages
    }

    if (data.type === "typing") {
      session.typing = data.typing;
      // Update attachment
      ws.serializeAttachment(session);
      this.broadcast({ type: "typing", userId: session.userId, username: session.username, typing: data.typing }, ws);
    } else if (data.type === "message") {
      const timestamp = Math.max(Date.now(), this.lastTimestamp + 1);
      this.lastTimestamp = timestamp;

      const msg = {
        userId: session.userId,
        username: session.username,
        content: data.content.substring(0, 1000),
        timestamp
      };

      await this.state.storage.put(new Date(timestamp).toISOString(), msg);
      this.broadcast({ type: "message", ...msg });
    }
  }

  async webSocketClose(ws: WebSocket) {
    const session = this.getSession(ws);
    if (session) {
      this.broadcast({ type: "leave", userId: session.userId, username: session.username });
    }
  }

  async webSocketError(ws: WebSocket) {
    this.webSocketClose(ws);
  }

  broadcast(message: any, exclude?: WebSocket) {
    const msg = JSON.stringify(message);
    this.state.getWebSockets().forEach(ws => {
      if (ws !== exclude) {
        try { ws.send(msg); } catch {}
      }
    });
  }

  async alarm() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oldMessages = await this.state.storage.list({ end: cutoff });
    if (oldMessages.size > 0) {
      await this.state.storage.delete(Array.from(oldMessages.keys()));
    }
    await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
  }
}
