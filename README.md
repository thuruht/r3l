# R3L:F - Relational Ephemeral Filenet

R3L:F is a decentralized, ephemeral, anti-algorithmic social file-sharing platform that prioritizes user control, organic discovery, and community-driven archiving.

## Core Philosophy

- **Relational**: Users are connected visually in an association web but only through explicit, mutually agreed relationships
- **Ephemeral by default**: Content expires after 7 days unless explicitly preserved through personal or community archiving
- **User-controlled**: Users have full control over their content, connections, and visibility
- **Privacy-focused**: Uses privacy-respecting technologies throughout the stack
- **Community-driven archiving**: Important content can be preserved through explicit voting
- **Anti-algorithmic**: No engagement optimization or content ranking - pure user-controlled discovery

## Key Features

- **Personal Archive ("Drawer") & Communique**: Customizable public profile with themeable interface
- **File & Archive System**: Upload and share any file format with natural expiration cycle
- **Avatar Management**: Upload custom profile images or use default icons
- **Association Web**: D3.js visualization of user connections with degrees of separation
- **Lurker in the Mist Mode**: Low-visibility status for privacy-conscious browsing
- **Inbox & Notifications**: Centralized system for messages, alerts, and connection prompts
- **Search & Discovery**: Non-algorithmic content discovery through multiple criteria
- **Chronological Feed**: A strictly latest-first feed from the people you connect with (no ranking)
- **Real-time Messaging**: Secure direct messaging with end-to-end encryption
- **Community Archiving**: Democratic content preservation through voting
- **HTML/CSS Customization**: Safe content embedding and styling in communiques

## Technology Stack

- **Backend**: Cloudflare Workers, D1, R2, KV, Durable Objects
- **Frontend**: HTML, CSS, JavaScript with consolidated global styling
- **Fonts**: Bunny Fonts (privacy-respecting alternative to Google Fonts)
- **Visualization**: D3.js for Association Web and geographic mapping
- **Authentication**: JWT-based secure authentication (legacy OAuth pages archived)

## Deployment

This project is designed to be deployed to Cloudflare Workers. All file paths are relative to support deployment to r3l.distorted.work.

### Prerequisites

1. Node.js 18+
2. Cloudflare account with Workers, D1, R2, KV, and Durable Objects
3. Wrangler CLI installed globally

### Deployment Steps

1. Clone this repository
2. Install dependencies: `npm install`
3. Configure your Cloudflare account in wrangler.jsonc
4. Set up required secrets (DO NOT add these to your code or wrangler.jsonc):

   ```
   wrangler secret put R3L_APP_SECRET
   wrangler secret put CLOUDFLARE_ACCOUNT_ID
   ```

5. Deploy with these steps:

   a. Deploy the database migrations:

   ```
   # Apply migrations to the main database
   ./migrations/apply-migrations.sh
   ```

   b. Deploy the main application:

   ```
   npm run build
   npm run deploy
   ```

## Project Structure

The project follows a modular architecture:

- `public/`: Frontend assets (HTML, CSS, JS)
- `src/`: Backend code (TypeScript)
  - `handlers/`: Request handlers for different features
  - `core/`: Core functionality and utilities
  - `types/`: TypeScript type definitions
- `migrations/`: Database schema and migrations

## Documentation

- [Project Documentation](./project-documentation.md): Detailed technical documentation
- [Connections & Feed](./public/feed.html): Minimal feed UI powered by `/api/feed`
- [Help & FAQ](./public/help.html): Comprehensive user guide and frequently asked questions
- [Philosophy & Motivation](./public/reMDE.md): In-depth explanation of project principles

## Contributing

Contributions are welcome if they align with the guiding principles:

- No engagement optimization
- No corporate/capitalist manipulation
- Minimalist, user-controlled interactions
- Privacy-first, ephemeral but intentional

## License

&copy; 2025 R3L:F Project - All Rights Reserved
