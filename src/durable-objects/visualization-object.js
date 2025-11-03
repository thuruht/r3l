export class VisualizationObject {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/stats') {
            try {
                const [userResult, contentResult, connectionResult] = await Promise.all([
                    this.env.R3L_DB.prepare("SELECT COUNT(*) as count FROM users").first(),
                    this.env.R3L_DB.prepare("SELECT COUNT(*) as count FROM content").first(),
                    this.env.R3L_DB.prepare("SELECT COUNT(*) as count FROM connections").first(),
                ]);

                const stats = {
                    users: userResult?.count || 0,
                    content: contentResult?.count || 0,
                    connections: connectionResult?.count || 0,
                };

                return new Response(JSON.stringify(stats), {
                    headers: { 'Content-Type': 'application/json' },
                });
            } catch (e) {
                console.error('Failed to fetch stats:', e);
                return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), { status: 500 });
            }
        }
        return new Response('Not Found', { status: 404 });
    }
}