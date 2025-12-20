
// src/do/DocumentRoom.ts
import { DurableObject } from "cloudflare:workers";

interface Env {
  // Add environment bindings here if needed
}

export class DocumentRoom extends DurableObject {
  state: DurableObjectState;
  sessions: WebSocket[] = [];

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === "/websocket") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.handleSession(server);

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  handleSession(webSocket: WebSocket) {
    webSocket.accept();
    this.sessions.push(webSocket);

    webSocket.addEventListener("message", async (msg) => {
      try {
        // Broadcast message to all other sessions
        // In Phase 9 proper, this will be replaced by Yjs awareness/sync protocol
        this.sessions.forEach((session) => {
          if (session !== webSocket) {
            session.send(msg.data);
          }
        });
      } catch (err) {
        // Handle error
      }
    });

    webSocket.addEventListener("close", () => {
      this.sessions = this.sessions.filter((s) => s !== webSocket);
    });
  }
}
