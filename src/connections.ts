// User Connections Durable Object
// Manages real-time connections for notifications and messaging

/**
 * UserConnections Durable Object
 * Maintains websocket connections for a user across devices/tabs
 * and handles delivering real-time notifications and messages
 */
export class UserConnections {
  state: DurableObjectState;
  env: any;
  connections: Set<WebSocket>;
  userId: string;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.connections = new Set();
    this.userId = '';
  }

  /**
   * Handle requests to the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Extract user ID from DO name
    this.userId = this.state.id.name;

    // Handle websocket connection
    if (url.pathname === '/connect') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected websocket', { status: 400 });
      }

      const { 0: client, 1: server } = new WebSocketPair();

      // Accept the websocket connection
      server.accept();

      // Add to active connections
      this.connections.add(server);

      // Set up event handlers
      server.addEventListener('message', async event => {
        try {
          const data = JSON.parse(event.data as string);

          // Handle different message types
          if (data.type === 'ping') {
            server.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('Error handling websocket message:', error);
        }
      });

      // Handle connection close
      server.addEventListener('close', () => {
        this.connections.delete(server);
      });

      // Handle connection error
      server.addEventListener('error', () => {
        this.connections.delete(server);
      });

      // Send initial message
      server.send(
        JSON.stringify({
          type: 'connected',
          userId: this.userId,
          timestamp: Date.now(),
        })
      );

      // Return the client websocket
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // Handle notification delivery
    if (url.pathname === '/notify') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const data = await request.json();

        // Broadcast to all connections
        for (const connection of this.connections) {
          connection.send(
            JSON.stringify({
              type: 'notification',
              notification: data.notification,
            })
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            connections: this.connections.size,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('Error sending notification:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to send notification',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Handle new message notification
    if (url.pathname === '/message') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const data = await request.json();

        // Broadcast to all connections
        for (const connection of this.connections) {
          connection.send(
            JSON.stringify({
              type: 'new_message',
              message: data,
            })
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            connections: this.connections.size,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('Error sending message notification:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to send message notification',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Default response for unknown paths
    return new Response('Not found', { status: 404 });
  }

  /**
   * Called when the DO is activated from hibernation
   */
  async activate() {
    console.log(`UserConnections DO activated for ${this.userId}`);
  }

  /**
   * Called periodically to allow the DO to save state before hibernation
   */
  async alarm() {
    console.log(`UserConnections DO alarm for ${this.userId}`);

    // If no active connections, we can return and let the DO hibernate
    if (this.connections.size === 0) {
      console.log(`No active connections for ${this.userId}, allowing hibernation`);
      return;
    }

    // Otherwise, reschedule the alarm to keep the DO active
    this.state.storage.setAlarm(Date.now() + 60000); // 1 minute
  }
}
