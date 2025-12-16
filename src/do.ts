// This is the Durable Object (DO) code.
// It is separate from the Worker code and runs in its own isolated environment.

// In a production app, you would have logic here to manage WebSocket connections,
// send messages to connected clients, and potentially interact with D1 or KV.

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
        this.handleSession(pair.server, userId);

        return new Response(null, { status: 101, webSocket: pair.client });

      case '/notify': // Endpoint for the Worker to send notifications to the DO
        if (request.method !== 'POST') {
          return new Response("Method Not Allowed", { status: 405 });
        }
        try {
          const { userId: targetUserId, message } = await request.json();
          this.notifyUser(targetUserId, message);
          return new Response("Notification sent", { status: 200 });
        } catch (err: any) {
          console.error("Error processing notify request:", err);
          return new Response(`Error: ${err.message}`, { status: 500 });
        }

      default:
        return new Response("Not found", { status: 404 });
    }
  }

  handleSession(webSocket: WebSocket, userId: number) {
    webSocket.accept();
    this.sessions.push({ ws: webSocket, userId });

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

  // The original broadcast method, modified to only send to other users
  broadcast(message: any) {
    const jsonMessage = JSON.stringify(message);
    this.sessions = this.sessions.filter(session => {
      try {
        session.ws.send(jsonMessage);
        return true;
      } catch (err) {
        return false;
      }
    });
  }
}