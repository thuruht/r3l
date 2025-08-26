/**
 * Collaboration functionality for R3L
 * Implements Durable Object classes for real-time connections, visualization, and collaboration
 */

import { Env } from './types/env';

/**
 * ConnectionsObject - Manages real-time user connections and presence
 */
export class ConnectionsObject {
  state: DurableObjectState;
  env: Env;
  connections: Map<string, WebSocket>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();
  }

  /**
   * Handle HTTP requests to the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket connections
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();

      // Accept the WebSocket connection
      server.accept();

      // Store the connection with a unique ID
      const connectionId = url.searchParams.get('connectionId') || crypto.randomUUID();
      this.connections.set(connectionId, server);

      // Clean up when the connection closes
      server.addEventListener('close', () => {
        this.connections.delete(connectionId);
        this.broadcastUserStatus(connectionId, 'disconnected');
      });

      // Handle messages from clients
      server.addEventListener('message', async event => {
        try {
          const message = JSON.parse(event.data as string);

          if (message.type === 'presence') {
            this.broadcastUserStatus(connectionId, 'connected', message.userData);
          }

          if (message.type === 'activity') {
            this.broadcastActivity(connectionId, message.activityData);
          }
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // Handle HTTP API endpoints
    if (url.pathname.endsWith('/api/connections/status')) {
      return new Response(
        JSON.stringify({
          connections: this.connections.size,
          status: 'active',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Not found', { status: 404 });
  }

  /**
   * Broadcast user status changes to all connected clients
   */
  broadcastUserStatus(connectionId: string, status: string, userData?: any) {
    const message = JSON.stringify({
      type: 'user_status',
      connectionId,
      status,
      userData,
      timestamp: new Date().toISOString(),
    });

    for (const connection of this.connections.values()) {
      try {
        connection.send(message);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }

  /**
   * Broadcast user activity to all connected clients
   */
  broadcastActivity(connectionId: string, activityData: any) {
    const message = JSON.stringify({
      type: 'activity',
      connectionId,
      activityData,
      timestamp: new Date().toISOString(),
    });

    for (const connection of this.connections.values()) {
      try {
        connection.send(message);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }
}

/**
 * VisualizationObject - Manages real-time visualization state
 */
export class VisualizationObject {
  state: DurableObjectState;
  env: Env;
  connections: Map<string, WebSocket>;
  visualizationState: any;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();
    this.visualizationState = { nodes: [], links: [] };

    // Load initial state from storage
    this.state.blockConcurrencyWhile(async () => {
      const storedState = await this.state.storage.get('visualizationState');
      if (storedState) {
        this.visualizationState = storedState;
      }
    });
  }

  /**
   * Handle HTTP requests to the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket connections
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();

      // Accept the WebSocket connection
      server.accept();

      // Store the connection with a unique ID
      const connectionId = url.searchParams.get('connectionId') || crypto.randomUUID();
      this.connections.set(connectionId, server);

      // Send current state to new connection
      server.send(
        JSON.stringify({
          type: 'visualization_state',
          state: this.visualizationState,
        })
      );

      // Clean up when the connection closes
      server.addEventListener('close', () => {
        this.connections.delete(connectionId);
      });

      // Handle messages from clients
      server.addEventListener('message', async event => {
        try {
          const message = JSON.parse(event.data as string);

          if (message.type === 'update_visualization') {
            await this.updateVisualization(message.state, connectionId);
          }

          if (message.type === 'node_interaction') {
            this.broadcastNodeInteraction(connectionId, message.nodeData);
          }
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // Handle HTTP API endpoints
    if (url.pathname.endsWith('/api/visualization/state')) {
      return new Response(JSON.stringify(this.visualizationState), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  /**
   * Update the visualization state and persist to storage
   */
  async updateVisualization(newState: any, connectionId: string) {
    this.visualizationState = newState;

    // Persist to storage
    await this.state.storage.put('visualizationState', this.visualizationState);

    // Broadcast to all connections except the sender
    const message = JSON.stringify({
      type: 'visualization_state',
      state: this.visualizationState,
      updatedBy: connectionId,
      timestamp: new Date().toISOString(),
    });

    for (const [id, connection] of this.connections.entries()) {
      if (id !== connectionId) {
        try {
          connection.send(message);
        } catch (error) {
          console.error('Error sending message:', error);
        }
      }
    }
  }

  /**
   * Broadcast node interaction events to all connected clients
   */
  broadcastNodeInteraction(connectionId: string, nodeData: any) {
    const message = JSON.stringify({
      type: 'node_interaction',
      connectionId,
      nodeData,
      timestamp: new Date().toISOString(),
    });

    for (const connection of this.connections.values()) {
      try {
        connection.send(message);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }
}

/**
 * CollaborationRoom - Manages real-time collaboration on content
 */
export class CollaborationRoom {
  state: DurableObjectState;
  env: Env;
  connections: Map<string, WebSocket>;
  contentState: any;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();
    this.contentState = { version: 0, content: null, participants: [] };

    // Load initial state from storage
    this.state.blockConcurrencyWhile(async () => {
      const storedState = await this.state.storage.get('contentState');
      if (storedState) {
        this.contentState = storedState;
      }
    });
  }

  /**
   * Handle HTTP requests to the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket connections
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();

      // Accept the WebSocket connection
      server.accept();

      // Extract room ID and user info from URL
      const roomId = url.searchParams.get('roomId') || 'default';
      const userId = url.searchParams.get('userId') || 'anonymous';
      const userName = url.searchParams.get('userName') || 'Anonymous User';

      // Create a connection ID that includes the room and user
      const connectionId = `${roomId}:${userId}:${crypto.randomUUID()}`;
      this.connections.set(connectionId, server);

      // Add user to participants if not already present
      if (!this.contentState.participants.some((p: any) => p.userId === userId)) {
        this.contentState.participants.push({
          userId,
          userName,
          joinedAt: new Date().toISOString(),
        });

        // Persist updated participant list
        await this.state.storage.put('contentState', this.contentState);
      }

      // Send current state to new connection
      server.send(
        JSON.stringify({
          type: 'collaboration_state',
          state: this.contentState,
        })
      );

      // Notify others that user joined
      this.broadcastMessage(
        {
          type: 'user_joined',
          userId,
          userName,
          timestamp: new Date().toISOString(),
        },
        connectionId
      );

      // Clean up when the connection closes
      server.addEventListener('close', async () => {
        this.connections.delete(connectionId);

        // Check if this was the last connection for this user
        const userHasOtherConnections = Array.from(this.connections.keys()).some(id =>
          id.includes(`${roomId}:${userId}:`)
        );

        if (!userHasOtherConnections) {
          // Remove user from participants
          this.contentState.participants = this.contentState.participants.filter(
            (p: any) => p.userId !== userId
          );

          // Persist updated participant list
          await this.state.storage.put('contentState', this.contentState);

          // Notify others that user left
          this.broadcastMessage(
            {
              type: 'user_left',
              userId,
              userName,
              timestamp: new Date().toISOString(),
            },
            connectionId
          );
        }
      });

      // Handle messages from clients
      server.addEventListener('message', async event => {
        try {
          const message = JSON.parse(event.data as string);

          if (message.type === 'content_update') {
            await this.updateContent(message.content, userId, userName, connectionId);
          }

          if (message.type === 'chat_message') {
            this.broadcastMessage(
              {
                type: 'chat_message',
                userId,
                userName,
                message: message.text,
                timestamp: new Date().toISOString(),
              },
              connectionId
            );
          }

          if (message.type === 'cursor_position') {
            this.broadcastMessage(
              {
                type: 'cursor_position',
                userId,
                userName,
                position: message.position,
                timestamp: new Date().toISOString(),
              },
              connectionId
            );
          }
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // Handle HTTP API endpoints
    if (url.pathname.endsWith('/api/collaboration/state')) {
      return new Response(JSON.stringify(this.contentState), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  /**
   * Update the content state and persist to storage
   */
  async updateContent(newContent: any, userId: string, userName: string, connectionId: string) {
    // Update content and increment version
    this.contentState.content = newContent;
    this.contentState.version += 1;
    this.contentState.lastModified = new Date().toISOString();
    this.contentState.lastModifiedBy = { userId, userName };

    // Persist to storage
    await this.state.storage.put('contentState', this.contentState);

    // Broadcast to all connections except the sender
    this.broadcastMessage(
      {
        type: 'content_update',
        content: newContent,
        version: this.contentState.version,
        userId,
        userName,
        timestamp: new Date().toISOString(),
      },
      connectionId
    );
  }

  /**
   * Broadcast a message to all connected clients except the sender
   */
  broadcastMessage(message: any, senderConnectionId: string) {
    const messageString = JSON.stringify(message);

    for (const [id, connection] of this.connections.entries()) {
      if (id !== senderConnectionId) {
        try {
          connection.send(messageString);
        } catch (error) {
          console.error('Error sending message:', error);
        }
      }
    }
  }
}
