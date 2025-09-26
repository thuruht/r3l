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

*   **Backend**: Cloudflare Workers (latest runtime), D1 (SQLite), R2 (object storage), KV (key-value store), and Durable Objects.
*   **Routing**: Hono v4+ with modern middleware
*   **Authentication**: Bearer token authentication with database-backed sessions and User-Agent validation.
*   **Frontend**: Single Page Application served via Cloudflare Pages/Assets binding.
*   **Observability**: Built-in logging and error tracking.

## Project Structure

*   `public/`: All frontend assets served via Assets binding.
*   `src/index.js`: Main Worker entry point with Hono routing, API logic, and Durable Object classes.
*   `wrangler.jsonc`: Worker configuration with proper compatibility settings.
*   `db/schema.sql`: Complete D1 database schema including all required tables.
*   `docs/`: Project documentation and guides.

## Key Features

*   **Modern R2 API**: Uses `createPresignedUrl` for secure file operations
*   **Proper Error Handling**: Comprehensive error handling for all Cloudflare services
*   **Rate Limiting**: KV-based rate limiting with configurable thresholds
*   **Cron Jobs**: Automated content lifecycle management
*   **Real-time Features**: Durable Objects for collaboration and network visualization