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
*   **Authentication**: A custom bearer token system with sessions stored in the D1 database.

### Frontend

*   A Single Page Application (SPA) built with HTML, CSS, and JavaScript, served directly from the `/public` directory.

## Key Features

*   **Ephemeral Content**: Content expires after 30 days by default, as configured in `wrangler.jsonc`.
*   **User-Controlled Discovery**: The platform is free of algorithmic content ranking.
*   **Secure File Uploads**: Presigned R2 URLs are used for secure and direct file uploads.

## Project Structure

*   `public/`: Contains all frontend assets.
*   `src/index.js`: The single entry point for the backend, containing all Hono routes, middleware, and Durable Object classes.
*   `wrangler.jsonc`: The configuration file for the Cloudflare Worker.
*   `db/schema.sql`: The single source of truth for the database schema.