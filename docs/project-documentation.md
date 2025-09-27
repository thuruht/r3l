# R3L:F Project Documentation

## Project Overview

R3L:F (Relational Ephemeral Filenet) is an anti-algorithmic, ephemeral, user-controlled file-sharing platform. The project uses a modern Cloudflare-native stack for its backend infrastructure.

## Technical Architecture

### Backend

*   **Runtime**: Cloudflare Workers
*   **API Framework**: Hono
*   **Database**: D1 for relational data (user profiles, content metadata, etc.).
*   **Storage**: R2 for file storage.
*   **Key-Value Storage**: KV for caching and rate limiting.
*   **State Management**: Durable Objects for real-time features like collaboration and visualizations.
*   **Authentication**: Username-based bearer token system with recovery keys, sessions stored in D1.

### Frontend

*   A Single Page Application (SPA) built with HTML, CSS, and JavaScript, served directly from the `/public` directory.

## Key Features

*   **Ephemeral Content**: Content expires after 7 days by default unless community-archived.
*   **User-Controlled Discovery**: The platform is free of algorithmic content ranking.
*   **Secure File Uploads**: Presigned R2 URLs for secure uploads.
*   **Recovery System**: Username-only registration with mandatory recovery key generation.

## Project Structure

*   `public/`: Contains all frontend assets.
*   `src/index.js`: The single entry point for the backend, containing all Hono routes, middleware, and Durable Object classes.
*   `wrangler.jsonc`: The configuration file for the Cloudflare Worker.
*   `db/schema.sql`: The single source of truth for the database schema.