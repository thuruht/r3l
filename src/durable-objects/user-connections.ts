import { Env } from '../types/env.js';

/**
 * UserConnections Durable Object
 * Manages WebSocket connections for a single user
 * Enables real-time notifications and messaging
 */
export class UserConnections {
  private state: DurableObjectState;
  private env: Env;
  private userId: string | null = null;
  private websockets: WebSocket[] = [];
  private hibernationTimeout: number | null = null;
  private lastMessageTime = Date.now();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Set up a periodic alarm to clean inactive connections
    // This will run even during hibernation
    if (typeof (this.state as any).setAlarm === 'function') {
      (this.state as any).setAlarm(Date.now() + 60 * 1000); // Every minute
    }
  }

  /**
   * Handle a fetch request to the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Extract user ID from URL or headers
    this.userId = url.searchParams.get('userId') || request.headers.get('X-User-Id') || this.userId;

    if (!this.userId) {
      return new Response('User ID is required', { status: 400 });
    }

    // Check for WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request);
    }

    // Handle specific API endpoints
    switch (path) {
      case '/notify':
        return this.handleNotify(request);
      case '/message':
        return this.handleMessage(request);
      case '/ping':
        return new Response('pong', { status: 200 });
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  /**
   * Handle WebSocket connection upgrade
   */
  private handleWebSocketUpgrade(request: Request): Response {
    // Create a new WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the connection
    server.accept();

    // Store the connection
    this.websockets.push(server);

    // Set up event handlers
    server.addEventListener('message', async event => {
      try {
        this.lastMessageTime = Date.now();

        // Parse the message
        const data = JSON.parse(event.data as string);

        // Handle specific message types
        switch (data.type) {
          case 'ping':
            server.send(JSON.stringify({ type: 'pong', time: Date.now() }));
            break;
          default:
            console.log(`Received unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    // Handle disconnection
    server.addEventListener('close', () => {
      // Remove this WebSocket from our list
      const index = this.websockets.indexOf(server);
      if (index !== -1) {
        this.websockets.splice(index, 1);
      }

      // If no more connections, schedule hibernation
      if (this.websockets.length === 0) {
        this.scheduleHibernation();
      }
    });

    // Send welcome message
    server.send(
      JSON.stringify({
        type: 'connected',
        userId: this.userId,
        time: Date.now(),
      })
    );

    // Cancel any pending hibernation
    this.cancelHibernation();

    // Return the client WebSocket
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle notification delivery
   */
  private async handleNotify(request: Request): Promise<Response> {
    try {
      // Parse notification data
      const data = (await request.json()) as {
        userId: string;
        notification: {
          id: string;
          type: string;
          title: string;
          content: string;
          actionUrl?: string;
          createdAt: number;
        };
      };

      if (!data.userId || !data.notification) {
        return new Response('Invalid notification data', { status: 400 });
      }

      // Broadcast to all connected WebSockets
      this.broadcast({
        type: 'notification',
        notification: data.notification,
      });

      return new Response('Notification sent', { status: 200 });
    } catch (error) {
      console.error('Error handling notification:', error);
      return new Response('Error processing notification', { status: 500 });
    }
  }

  /**
   * Handle direct message delivery
   */
  private async handleMessage(request: Request): Promise<Response> {
    try {
      // Parse message data
      const data = (await request.json()) as {
        type: string;
        userId: string;
        fromUserId: string;
        messageId: string;
        content: string;
        createdAt: number;
      };

      if (!data.userId || !data.fromUserId || !data.messageId) {
        return new Response('Invalid message data', { status: 400 });
      }

      // Broadcast to all connected WebSockets
      this.broadcast({
        type: 'new_message',
        fromUserId: data.fromUserId,
        messageId: data.messageId,
        content: data.content,
        createdAt: data.createdAt,
      });

      return new Response('Message delivered', { status: 200 });
    } catch (error) {
      console.error('Error handling message delivery:', error);
      return new Response('Error delivering message', { status: 500 });
    }
  }

  /**
   * Broadcast a message to all connected WebSockets
   */
  private broadcast(message: any): void {
    const messageStr = JSON.stringify(message);

    // Send to all connected WebSockets
    for (const ws of this.websockets) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      } catch (error) {
        console.error('Error sending message to WebSocket:', error);
      }
    }
  }

  /**
   * Schedule hibernation if inactive
   */
  private scheduleHibernation(): void {
    // Cancel any existing timeout
    this.cancelHibernation();

    // Schedule hibernation after 5 minutes of inactivity
    this.hibernationTimeout = setTimeout(
      () => {
        // Only hibernate if we still have no WebSockets
        if (this.websockets.length === 0) {
          console.log(`Hibernating UserConnections for user ${this.userId}`);
        }
        this.hibernationTimeout = null;
      },
      5 * 60 * 1000
    ) as unknown as number;
  }

  /**
   * Cancel scheduled hibernation
   */
  private cancelHibernation(): void {
    if (this.hibernationTimeout !== null) {
      clearTimeout(this.hibernationTimeout as unknown as NodeJS.Timeout);
      this.hibernationTimeout = null;
    }
  }

  /**
   * Handle periodic alarm to clean inactive connections
   */
  async alarm(): Promise<void> {
    try {
      const now = Date.now();

      // Check for stale WebSockets (no messages for 5 minutes)
      if (now - this.lastMessageTime > 5 * 60 * 1000) {
        // Close and remove all stale WebSockets
        for (const ws of this.websockets) {
          try {
            ws.close(1000, 'Connection timeout due to inactivity');
          } catch (error) {
            console.error('Error closing stale WebSocket:', error);
          }
        }

        // Clear the WebSockets array
        this.websockets = [];
      }

      // Schedule the next alarm
      if (typeof (this.state as any).setAlarm === 'function') {
        (this.state as any).setAlarm(Date.now() + 60 * 1000);
      }
    } catch (error) {
      console.error('Error in alarm handler:', error);
      // Make sure we set the next alarm even if there's an error
      if (typeof (this.state as any).setAlarm === 'function') {
        (this.state as any).setAlarm(Date.now() + 60 * 1000);
      }
    }
  }
}
