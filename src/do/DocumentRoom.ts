
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

    // Yjs websocket provider usually connects to root, or room-specific path
    // We'll support /collab/:docName pattern if needed, but DO ID is unique per doc anyway
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.handleSession(server);

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("DO Not Found", { status: 404 });
  }

  handleSession(webSocket: WebSocket) {
    webSocket.accept();
    this.sessions.push(webSocket);

    webSocket.addEventListener("message", async (msg) => {
      try {
        // Broadcast message to all other sessions
        // This is sufficient for Yjs 'y-websocket' provider which handles the sync protocol over the wire.
        // We just act as a relay for the binary blobs.
        this.sessions.forEach((session) => {
          if (session !== webSocket && session.readyState === WebSocket.READY_STATE_OPEN) {
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
