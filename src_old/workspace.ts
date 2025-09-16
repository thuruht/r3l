import { Env } from './types/env';

// Define the structure of a document within a workspace
interface WorkspaceDocument {
  id: string;
  name: string;
  content: string;
  version: number;
}

// Define the structure of the workspace state
interface WorkspaceState {
  name: string;
  documents: WorkspaceDocument[];
  participants: any[];
  permissions: Map<string, 'read' | 'write' | 'admin'>;
}

export class Workspace {
  state: DurableObjectState;
  env: Env;
  connections: Map<string, WebSocket>;
  workspaceState: WorkspaceState;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();
    this.workspaceState = {
      name: 'New Workspace',
      documents: [],
      participants: [],
      permissions: new Map(),
    };

    // Load initial state from storage
    this.state.blockConcurrencyWhile(async () => {
      const storedState: WorkspaceState | undefined = await this.state.storage.get('workspaceState');
      if (storedState) {
        this.workspaceState = storedState;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/initialize' && request.method === 'POST') {
        const { name } = await request.json();
        this.workspaceState.name = name;
        await this.state.storage.put('workspaceState', this.workspaceState);
        return new Response(null, { status: 200 });
    }

    // Upgrade to WebSocket for real-time collaboration
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();
      this.handleWebSocket(server, url);
      return new Response(null, { status: 101, webSocket: client });
    }

    // API endpoints for managing the workspace
    if (url.pathname.startsWith('/api/workspaces/')) {
        return this.handleApiRequest(request, url);
    }

    return new Response('Not found', { status: 404 });
  }

  handleWebSocket(server: any, url: URL) {
    server.accept();

    const userId = url.searchParams.get('userId') || 'anonymous';
    const userName = url.searchParams.get('userName') || 'Anonymous User';
    const connectionId = crypto.randomUUID();
    server.userId = userId;
    this.connections.set(connectionId, server);

    // Add user to participants list
    if (!this.workspaceState.participants.some((p: any) => p.userId === userId)) {
        this.workspaceState.participants.push({ userId, userName, joinedAt: new Date().toISOString() });
    }

    // Send current state to the new connection
    server.send(JSON.stringify({ type: 'workspace_state', state: this.workspaceState }));

    // Announce user joined
    this.broadcast({ type: 'user_joined', userId, userName, timestamp: new Date().toISOString() }, connectionId);

    server.addEventListener('message', async (event) => {
        try {
          const message = JSON.parse(event.data as string);
          // Handle different message types (e.g., document updates, chat)
          this.handleWebSocketMessage(message, connectionId, userId, userName);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
    });

    server.addEventListener('close', () => {
        this.connections.delete(connectionId);
        // Remove user from participants if it's their last connection
        const userHasOtherConnections = Array.from(this.connections.values()).some(
            (ws: any) => ws.userId === userId
        );
        if(!userHasOtherConnections) {
            this.workspaceState.participants = this.workspaceState.participants.filter(
                (p: any) => p.userId !== userId
            );
        }
        this.broadcast({ type: 'user_left', userId, userName, timestamp: new Date().toISOString() });
    });
  }

  async handleWebSocketMessage(message: any, connectionId: string, userId: string, userName: string) {
    switch (message.type) {
        case 'document_update':
            // Logic to update a document's content
            await this.updateDocument(message.documentId, message.content, userId, userName);
            break;
        case 'chat_message':
            // The messaging handler will store and broadcast the message
            const { MessagingHandler } = await import('./handlers/messaging.js');
            const messagingHandler = new MessagingHandler();
            await messagingHandler.sendMessage(
                userId,
                `ws-${this.state.id.toString()}`, // Use workspace ID as the recipient
                message.text,
                [],
                this.env
            );

            // Also broadcast to the local workspace connections
            this.broadcast({
                type: 'chat_message',
                userId,
                userName,
                message: message.text,
                timestamp: new Date().toISOString()
            }, connectionId);
            break;
        // Add other cases as needed
    }
  }

  async handleApiRequest(request: Request, url: URL): Promise<Response> {
    const pathSegments = url.pathname.split('/');
    const action = pathSegments[3]; // e.g., 'documents'

    if (request.method === 'POST' && action === 'documents') {
        const { name } = await request.json();
        const newDoc = await this.createDocument(name);
        return new Response(JSON.stringify(newDoc), { status: 201 });
    }

    if (request.method === 'GET' && action === 'state') {
        return new Response(JSON.stringify(this.workspaceState), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Invalid API request', { status: 400 });
  }

  async createDocument(name: string): Promise<WorkspaceDocument> {
    const newDoc: WorkspaceDocument = {
        id: crypto.randomUUID(),
        name,
        content: '',
        version: 1,
    };
    this.workspaceState.documents.push(newDoc);
    await this.state.storage.put('workspaceState', this.workspaceState);
    this.broadcast({ type: 'document_created', document: newDoc });
    return newDoc;
  }

  async updateDocument(documentId: string, content: string, userId: string, userName: string) {
    const doc = this.workspaceState.documents.find(d => d.id === documentId);
    if (doc) {
        doc.content = content;
        doc.version += 1;
        await this.state.storage.put('workspaceState', this.workspaceState);
        this.broadcast({
            type: 'document_updated',
            documentId,
            content,
            version: doc.version,
            updatedBy: { userId, userName }
        });
    }
  }

  broadcast(message: any, excludeConnectionId?: string) {
    const messageString = JSON.stringify(message);
    for (const [id, connection] of this.connections.entries()) {
      if (id !== excludeConnectionId) {
        try {
          connection.send(messageString);
        } catch (error) {
          console.error('Error broadcasting message:', error);
        }
      }
    }
  }
}
