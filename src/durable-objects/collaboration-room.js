export class CollaborationRoom {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.sessions = new Set();
        this.state.blockConcurrencyWhile(async () => {
            try {
                const stored = await this.state.storage.get('sessions');
                if (stored) this.sessions = new Set(stored);
            } catch (e) {
                console.error('Failed to load sessions from storage:', e);
            }
        });
    }

    async fetch(request) {
        const url = new URL(request.url);

        if (request.headers.get('Upgrade') === 'websocket') {
            const pair = new WebSocketPair();
            await this.handleSession(pair[1]);
            return new Response(null, { status: 101, webSocket: pair[0] });
        }

        if (url.pathname === '/messages') {
            switch (request.method) {
                case 'GET': {
                    const messages = await this.state.storage.get('messages') || [];
                    return new Response(JSON.stringify(messages), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                case 'POST': {
                    try {
                        const message = await request.json();
                        if (!message.user || !message.text) {
                             return new Response(JSON.stringify({ error: 'Message must have a user and text.'}), { status: 400 });
                        }
                        await this.broadcast({ type: 'chat', ...message });
                        return new Response(JSON.stringify({ success: true }), { status: 201 });
                    } catch (e) {
                        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
                    }
                }
            }
        }
        return new Response('Not Found', { status: 404 });
    }

    async handleSession(webSocket) {
        webSocket.accept();
        this.sessions.add(webSocket);

        webSocket.addEventListener('message', async (event) => {
            try {
                const message = JSON.parse(event.data);
                await this.broadcast({ type: 'chat', ...message });
            } catch (e) {
                webSocket.send(JSON.stringify({ error: 'Invalid message' }));
            }
        });

        webSocket.addEventListener('close', () => {
            this.sessions.delete(webSocket);
            this.broadcast({ type: 'system', message: 'A user has disconnected' });
        });

        webSocket.addEventListener('error', () => {
            this.sessions.delete(webSocket);
            this.broadcast({ type: 'system', message: 'A user has disconnected due to an error' });
        });
    }

    async broadcast(message) {
        const messageList = await this.state.storage.get('messages') || [];
        const timestampedMessage = { ...message, id: crypto.randomUUID(), timestamp: Date.now() };
        messageList.push(timestampedMessage);
        if (messageList.length > 100) messageList.shift();
        await this.state.storage.put('messages', messageList);

        const messageString = JSON.stringify(timestampedMessage);
        for (const session of this.sessions) {
            try {
                session.send(messageString);
            } catch (e) {
                this.sessions.delete(session);
            }
        }
    }
}