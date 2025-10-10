export class ConnectionsObject {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/network') {
            try {
                const cached = await this.state.storage.get('graphData');
                const cacheTime = await this.state.storage.get('graphDataTimestamp');
                const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

                if (cached && cacheTime && (Date.now() - cacheTime < CACHE_TTL)) {
                    return new Response(JSON.stringify(cached), {
                        headers: { 'Content-Type': 'application/json', 'X-Cache-Hit': 'true' },
                    });
                }

                const { results } = await this.env.R3L_DB.prepare(`
                    SELECT json_object(
                        'nodes', (SELECT json_group_array(json_object('id', 'user-' || id, 'label', display_name, 'type', 'user')) FROM users),
                        'links', (SELECT json_group_array(json_object('source', 'user-' || followerId, 'target', 'user-' || followingId, 'type', 'follows')) FROM connections)
                    ) AS graphData
                `).all();

                const graphData = results?.[0]?.graphData ? JSON.parse(results[0].graphData) : { nodes: [], links: [] };

                await this.state.storage.put('graphData', graphData);
                await this.state.storage.put('graphDataTimestamp', Date.now());

                return new Response(JSON.stringify(graphData), {
                    headers: { 'Content-Type': 'application/json' },
                });
            } catch (e) {
                console.error('Failed to fetch network data:', e);
                return new Response(JSON.stringify({ error: 'Failed to fetch network data' }), { status: 500 });
            }
        }
        return new Response('Not Found', { status: 404 });
    }
}