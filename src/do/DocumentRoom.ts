
// src/do/DocumentRoom.ts
import { DurableObject } from "cloudflare:workers";
import * as Y from 'yjs';

interface Env {
  // Add environment bindings here if needed
}

/**
 * DocumentRoom Durable Object
 * Handles real-time Yjs synchronization for collaborative editing with full state persistence.
 * Uses the Hibernation API for efficiency.
 */
export class DocumentRoom extends DurableObject {
  state: DurableObjectState;
  doc: Y.Doc;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.doc = new Y.Doc();

    // Load initial state from storage if it exists
    this.state.blockConcurrencyWhile(async () => {
      const savedState = await this.state.storage.get<Uint8Array>("content");
      if (savedState) {
        Y.applyUpdate(this.doc, savedState);
      }
    });
  }

  async fetch(request: Request) {
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.state.acceptWebSocket(server);

      // Send initial sync step 1
      const syncStep1 = Y.encodeStateVector(this.doc);
      // y-websocket protocol: messageSync = 0, messageSyncStep1 = 0
      const reply = this.constructSyncMessage(0, syncStep1);
      server.send(reply);

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("DO Not Found", { status: 404 });
  }

  /**
   * Helper to construct y-websocket protocol messages
   */
  constructSyncMessage(type: number, data: Uint8Array): Uint8Array {
    const msg = new Uint8Array(data.length + 2);
    msg[0] = 0; // messageSync
    msg[1] = type; // syncStep
    msg.set(data, 2);
    return msg;
  }

  /**
   * webSocketMessage handler (Hibernation API)
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    let uint8Message: Uint8Array;
    
    if (message instanceof ArrayBuffer) {
        uint8Message = new Uint8Array(message);
    } else if (typeof message === 'string') {
        uint8Message = new TextEncoder().encode(message);
    } else {
        // Handle Blob or other types
        const buffer = await (message as any).arrayBuffer();
        uint8Message = new Uint8Array(buffer);
    }
    
    // Simple protocol check for y-websocket
    // messageSync = 0, messageAwareness = 1
    if (uint8Message[0] === 0) {
        const syncType = uint8Message[1];
        const syncData = uint8Message.subarray(2);

        if (syncType === 0) { // SyncStep1: Client sending their state vector
            // Reply with SyncStep2: Send our updates
            const update = Y.encodeStateAsUpdate(this.doc, syncData);
            ws.send(this.constructSyncMessage(1, update));
        } else if (syncType === 1 || syncType === 2) { // SyncStep2 or Update
            // Apply update to our server-side doc
            try {
                Y.applyUpdate(this.doc, syncData);
                // Persist to storage
                await this.state.storage.put("content", Y.encodeStateAsUpdate(this.doc));
            } catch (e) {
                console.error("Yjs update failed:", e);
            }
        }
    }

    // Broadcast the message to all other connected clients
    this.state.getWebSockets().forEach((client) => {
      if (client !== ws) {
        try {
          client.send(message);
        } catch (e) {}
      }
    });
  }

  /**
   * webSocketClose handler (Hibernation API)
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // Cleanup is handled automatically
  }

  /**
   * webSocketError handler (Hibernation API)
   */
  async webSocketError(ws: WebSocket, error: any) {
    // Cleanup is handled automatically
  }
}
