import { DurableObject } from "cloudflare:workers";

interface Env {
  // Bindings will be added here by the runtime from wrangler.jsonc
  // For example, KV, D1, R2, and other Durable Objects.
  DO_NAMESPACE: DurableObjectNamespace;
}

// RelfDO for real-time collaboration (DMs, shared edits)
export class RelfDO extends DurableObject {
  private connectedSockets: WebSocket[] = [];

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // You can access storage here if needed: this.ctx.storage
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/websocket":
        if (request.headers.get("Upgrade") !== "websocket") {
          return new Response("Expected Upgrade: websocket", { status: 426 });
        }

        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);

        this.ctx.acceptWebSocket(server);
        this.connectedSockets.push(server); // Keep track of connected sockets

        return new Response(null, {
          status: 101,
          webSocket: client,
        });

      case "/broadcast":
        const message = await request.text();
        this.broadcast(message);
        return new Response("Broadcasted message", { status: 200 });

      default:
        return new Response("Not Found", { status: 404 });
    }
  }

  // Handle messages from connected WebSockets
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // For now, just echo the message back and broadcast to others
    if (typeof message === 'string') {
      ws.send(`[You said]: ${message}`);
      this.broadcast(`[Someone else said]: ${message}`, ws);
    } else {
      // Handle ArrayBuffer messages if necessary
      ws.send("Binary messages not yet supported.");
    }
  }

  // Handle WebSocket closure
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    console.log(`WebSocket closed: ${code} ${reason} ${wasClean}`);
    this.connectedSockets = this.connectedSockets.filter(socket => socket !== ws);
    this.broadcast(`A user disconnected. Total users: ${this.connectedSockets.length}`);
  }

  // Handle WebSocket errors
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error("WebSocket error:", error);
    this.connectedSockets = this.connectedSockets.filter(socket => socket !== ws);
    this.broadcast(`A user disconnected due to error. Total users: ${this.connectedSockets.length}`);
    ws.close(1011, "WebSocket error");
  }

  // Broadcast a message to all connected WebSockets, excluding the sender if provided
  private broadcast(message: string, sender?: WebSocket): void {
    this.connectedSockets.forEach(socket => {
      if (socket !== sender) {
        try {
          socket.send(message);
        } catch (err) {
          console.error("Failed to send message to socket:", err);
          // Handle broken connections, e.g., remove them from the list
          this.connectedSockets = this.connectedSockets.filter(s => s !== socket);
        }
      }
    });
  }
}
