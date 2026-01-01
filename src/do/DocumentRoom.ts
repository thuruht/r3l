// src/do/DocumentRoom.ts
import { DurableObject } from "cloudflare:workers";
import * as Y from 'yjs';

// Yjs Websocket Message Types
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

// Yjs Sync Protocol Types
const SYNC_STEP_1 = 0;
const SYNC_STEP_2 = 1;
const SYNC_UPDATE = 2;

interface Env { }

export class DocumentRoom extends DurableObject {
  doc: Y.Doc;
  sessions: Map<WebSocket, { userId: string }> = new Map();
  private debounceTimeout: any = null; // Store timeout ID for debouncing

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.doc = new Y.Doc();
    
    this.ctx.blockConcurrencyWhile(async () => {
        const storedState = await this.ctx.storage.get<Uint8Array>('doc_state');
        if (storedState) {
            Y.applyUpdate(this.doc, storedState);
        }
    });
  }

  async fetch(request: Request) {
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      
      const userId = request.headers.get("X-User-ID") || "anonymous";
      
      this.ctx.acceptWebSocket(server);
      this.sessions.set(server, { userId });

      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    if (typeof message === 'string') return;
    const data = new Uint8Array(message);
    
    const messageType = data[0]; 
    const content = data.subarray(1);

    switch (messageType) {
        case MESSAGE_SYNC:
            await this.handleSyncMessage(ws, content);
            break;
        case MESSAGE_AWARENESS:
            this.broadcast(message, ws);
            break;
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws);
    // Clear any pending save for this session's updates if it was the last active one
    // Not strictly necessary as debounce is global per DO instance, but good for clarity.
  }

  async webSocketError(ws: WebSocket) {}

  // --- Sync Protocol ---
  
  async handleSyncMessage(ws: WebSocket, data: Uint8Array) {
      const syncType = data[0];
      const payload = data.subarray(1);

      switch (syncType) {
          case SYNC_STEP_1:
              const update = Y.encodeStateAsUpdate(this.doc, payload);
              this.sendSyncMessage(ws, SYNC_STEP_2, update);
              break;
          
          case SYNC_STEP_2:
              await this.applyAndPersistUpdate(payload, ws);
              break;
          
          case SYNC_UPDATE:
              await this.applyAndPersistUpdate(payload, ws);
              break;
      }
  }

  async applyAndPersistUpdate(update: Uint8Array, origin: WebSocket) {
      Y.applyUpdate(this.doc, update);
      
      // Debounce saving the snapshot
      this.debounceSaveSnapshot();

      // Broadcast update to others
      const msg = new Uint8Array(2 + update.length);
      msg[0] = MESSAGE_SYNC;
      msg[1] = SYNC_UPDATE;
      msg.set(update, 2);
      
      this.broadcast(msg, origin);
  }

  // Debounces the actual storage write operation
  private debounceSaveSnapshot() {
      if (this.debounceTimeout) {
          clearTimeout(this.debounceTimeout);
      }
      this.debounceTimeout = setTimeout(async () => {
          // blockConcurrencyWhile ensures no other requests run while saving
          await this.ctx.blockConcurrencyWhile(async () => {
              const snapshot = Y.encodeStateAsUpdate(this.doc);
              await this.ctx.storage.put('doc_state', snapshot);
          });
          this.debounceTimeout = null;
      }, 2000); // Save after 2 seconds of inactivity
  }

  sendSyncMessage(ws: WebSocket, type: number, payload: Uint8Array) {
      const msg = new Uint8Array(2 + payload.length);
      msg[0] = MESSAGE_SYNC;
      msg[1] = type;
      msg.set(payload, 2);
      ws.send(msg);
  }

  broadcast(message: Uint8Array | ArrayBuffer, exclude?: WebSocket) {
      for (const ws of this.ctx.getWebSockets()) {
          if (ws !== exclude && ws.readyState === 1) { // WebSocket.OPEN
              ws.send(message);
          }
      }
  }
}
