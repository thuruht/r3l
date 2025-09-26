# R3L:F - Relational Ephemeral Filenet

R3L:F is a decentralized, ephemeral, anti-algorithmic social file-sharing platform that prioritizes user control, organic discovery, and community-driven archiving.

## Quick Start

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Configure Cloudflare**:
    - Log in to Wrangler: `wrangler login`
    - Apply database migrations: `wrangler d1 execute r3l-db --file=./db/schema.sql`
3.  **Run the Development Server**:
    ```bash
    npm run dev
    ```

## Technology Stack

*   **Backend**: Cloudflare Workers, D1, R2, KV, and Durable Objects.
*   **Routing**: Hono
*   **Authentication**: Bearer token authentication with database-backed sessions.
*   **Frontend**: A Single Page Application served from the `/public` directory.

## Project Structure

*   `public/`: All frontend assets (HTML, CSS, JS).
*   `src/index.js`: The main Cloudflare Worker, containing all backend logic, API routes, and Durable Object definitions.
*   `wrangler.jsonc`: The configuration file for the Cloudflare Worker.
*   `db/schema.sql`: The schema for the D1 database.