# Product Overview

## Project Identity
**R3L:F (Relational Relativity & Random Ephemerality File-net)** - A serendipitous social networking platform that prioritizes user agency, organic discovery, and ephemeral content over algorithmic feeds and permanent data storage.

## Core Value Proposition
Rel F is a counter-concept to permanent, corporate social media where:
- Data is temporary by default (7-day expiration)
- Connections are consensual or random, never algorithmic
- The primary unit of interaction is the **Artifact** (file)
- Discovery happens through "digital drift" rather than curated feeds

## Key Features

### Social Connection Models
- **Sym (Symmetric)**: Explicit, mutual relationships requiring both parties' agreement
- **A-Sym (Asymmetric)**: One-way follows or proximity-based connections
- **The Drift**: Radar-like discovery mode sampling random public artifacts and users, visualized as pulsating "ghost nodes"

### Artifact System (File Sharing)
- **Universal Uploads**: Support for any file type (images, text, code, audio, video)
- **Ephemerality**: 7-day default lifespan with refresh and vitality mechanisms
- **Refresh**: Reset the 7-day timer to keep content alive
- **Vitality**: Boost signal to increase visibility and extend life
- **In-Place Editing**: Browser-based editing for text artifacts
- **Remix**: Create derivative works from existing artifacts
- **Burn-on-Read**: Self-destructing files after viewing
- **Client-Side Encryption**: Optional E2EE for sensitive files

### Discovery & Visualization
- **Association Web**: Interactive D3.js graph visualization of social connections
  - Center node (Me) with Sym (glowing), A-Sym (dashed), and Drift (pulsating) nodes
  - Real-time presence indicators
  - Collection grouping
- **Drift Mode**: Toggle to scan network for random public artifacts with media type filters
- **Random User Discovery**: Serendipitous user connections
- **Search**: Username-based user search

### Communication
- **Inbox**: Unified notification system for connection requests, file shares, and alerts
- **Whispers**: Direct messaging with Sym connections
- **Real-Time**: WebSocket integration for instant delivery
- **Swipe Gestures**: Mobile-friendly interaction patterns

### Personalization
- **The Communique**: Personal profile/manifesto with custom CSS support
- **Theme Toggle**: Dark/Light mode
- **Node Aesthetics**: Customizable graph visualization
- **Avatar Uploads**: Personal identity expression

### Organization
- **Collections**: Group related artifacts with public/sym-only/private visibility
- **ZIP Export**: Download entire collections
- **Drag-and-Drop Reordering**: Organize collection contents

### Security & Privacy
- **JWT Authentication**: Secure, httpOnly cookie-based sessions
- **Email Verification**: Required account activation
- **Password Reset**: Token-based recovery
- **Rate Limiting**: Abuse protection on all endpoints
- **E2EE Support**: RSA key pairs for client-side encryption
- **Admin Controls**: System statistics, user management, broadcast alerts

## Target Users
- Users seeking authentic, non-algorithmic social connections
- Privacy-conscious individuals who value ephemeral content
- Creative communities interested in artifact-based sharing
- People tired of permanent, corporate social media platforms
- Users who value serendipity and organic discovery over curated feeds

## Use Cases
- Ephemeral file sharing with expiration controls
- Building intentional social networks through Sym connections
- Discovering random content and users through Drift mode
- Organizing and sharing collections of related artifacts
- Secure, encrypted communication with trusted connections
- Real-time collaborative document editing
- Expressing identity through customizable profiles and CSS
