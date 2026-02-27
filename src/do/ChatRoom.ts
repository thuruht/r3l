export class ChatRoom {
  state: DurableObjectState;
  sessions: Map<WebSocket, { userId: number; username: string; typing: boolean }>;
  lastTimestamp: number;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Map();
    this.lastTimestamp = 0;

    this.state.getWebSockets().forEach((ws) => {
      const meta = ws.deserializeAttachment();
      this.sessions.set(ws, { ...meta, typing: false });
    });
  }

  async fetch(request: Request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

    const url = new URL(request.url);
    const userId = parseInt(url.searchParams.get("userId") || "0");
    const username = url.searchParams.get("username") || "Anonymous";

    const pair = new WebSocketPair();
    await this.handleSession(pair[1], userId, username);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async handleSession(ws: WebSocket, userId: number, username: string) {
    this.state.acceptWebSocket(ws);
    
    const session = { userId, username, typing: false };
    ws.serializeAttachment(session);
    this.sessions.set(ws, session);

    // Send online users
    const online = Array.from(this.sessions.values()).map(s => ({ userId: s.userId, username: s.username }));
    ws.send(JSON.stringify({ type: "online", users: online }));

    // Load history
    const storage = await this.state.storage.list({ reverse: true, limit: 100 });
    const history = [...storage.values()].reverse();
    ws.send(JSON.stringify({ type: "history", messages: history }));

    // Broadcast join
    this.broadcast({ type: "join", userId, username }, ws);

    // Ensure cleanup alarm is scheduled
    const currentAlarm = await this.state.storage.getAlarm();
    if (currentAlarm === null) {
      await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000); // 1 hour
    }
  }

  async alarm() {
    // 24-hour TTL: Delete messages older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // Since keys are ISO timestamps, we can range query up to cutoff
    const oldMessages = await this.state.storage.list({ end: cutoff });

    if (oldMessages.size > 0) {
      const keysToDelete = Array.from(oldMessages.keys());
      await this.state.storage.delete(keysToDelete);
      // Optional: Broadcast a 'cleanup' event if UI needs to know (not critical)
    }

    // Re-schedule alarm
    await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
  }

  async webSocketMessage(ws: WebSocket, msg: string) {
    const session = this.sessions.get(ws);
    if (!session) return;

    const data = JSON.parse(msg);

    if (data.type === "typing") {
      session.typing = data.typing;
      this.broadcast({ type: "typing", userId: session.userId, username: session.username, typing: data.typing }, ws);
    } else if (data.type === "message") {
      const timestamp = Math.max(Date.now(), this.lastTimestamp + 1);
      this.lastTimestamp = timestamp;

      const message = {
        userId: session.userId,
        username: session.username,
        content: data.content.substring(0, 1000),
        timestamp
      };

      const key = new Date(timestamp).toISOString();
      await this.state.storage.put(key, message);

      this.broadcast({ type: "message", ...message });
    }
  }

  async webSocketClose(ws: WebSocket) {
    const session = this.sessions.get(ws);
    this.sessions.delete(ws);
    if (session) {
      this.broadcast({ type: "leave", userId: session.userId, username: session.username });
    }
  }

  async webSocketError(ws: WebSocket) {
    this.webSocketClose(ws);
  }

  broadcast(message: any, exclude?: WebSocket) {
    const msg = JSON.stringify(message);
    this.sessions.forEach((_, ws) => {
      if (ws !== exclude && ws.readyState === 1) {
        try { ws.send(msg); } catch {}
      }
    });
  }
}
