
// src/do/DocumentRoom.ts
import { DurableObject } from "cloudflare:workers";
import { Env } from '../types';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

/**
 * DocumentRoom Durable Object
 * Handles real-time Yjs synchronization for collaborative editing with full state persistence.
 * Uses the Hibernation API for efficiency.
 */
export class DocumentRoom extends DurableObject {
  state: DurableObjectState;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    this.awareness.setLocalState(null);

    this.awareness.on('update', ({ added, updated, removed }: any) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 1); // messageAwareness
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);
      this.broadcast(buff);
    });

    // Load initial state from storage if it exists
    this.state.blockConcurrencyWhile(async () => {
      const savedState = await this.state.storage.get<Uint8Array>("content");
      if (savedState) {
        Y.applyUpdate(this.doc, savedState);
      }
    });
  }

    broadcast(message: Uint8Array, excludeWs?: WebSocket) {
    this.state.getWebSockets().forEach((client) => {
      if (client !== excludeWs) {
        try {
          client.send(message);
        } catch (e) {}
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

      // Send initial awareness state
      if (this.awareness.getStates().size > 0) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 1); // messageAwareness
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys()))
        );
        server.send(encoding.toUint8Array(encoder));
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("DO Not Found", { status: 404 });
  }

  /**
   * Helper to construct y-websocket protocol messages using proper lib0 encoding.
   * Format: varUint(messageSync=0), varUint(type), writeVarUint8Array(data)
   */
  constructSyncMessage(type: number, data: Uint8Array): Uint8Array {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0); // messageSync
    encoding.writeVarUint(encoder, type); // syncStep type
    encoding.writeVarUint8Array(encoder, data);
    return encoding.toUint8Array(encoder);
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
    
    const decoder = decoding.createDecoder(uint8Message);
    const messageType = decoding.readVarUint(decoder);

    // messageSync = 0, messageAwareness = 1
    if (messageType === 0) {
        const syncType = decoding.readVarUint(decoder);
        const syncData = decoding.readVarUint8Array(decoder);

        if (syncType === 0) { // SyncStep1: Client sending their state vector
            const update = Y.encodeStateAsUpdate(this.doc, syncData);
            ws.send(this.constructSyncMessage(1, update));
        } else if (syncType === 1 || syncType === 2) { // SyncStep2 or Update
            try {
                Y.applyUpdate(this.doc, syncData);
                await this.state.storage.put("content", Y.encodeStateAsUpdate(this.doc));
            } catch (e) {
                console.error("Yjs update failed:", e);
            }
        }
    } else if (messageType === 1) { // messageAwareness
       const update = decoding.readVarUint8Array(decoder);
       awarenessProtocol.applyAwarenessUpdate(this.awareness, update, ws);
    }

    // Broadcast the message to all other connected clients
    this.broadcast(uint8Message, ws);
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
