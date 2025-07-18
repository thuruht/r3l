# R3L:F Project Documentation

## Project Overview

R3L:F (Relational Ephemeral Filenet) is a reimagined version of the original R3L project, focused on creating an anti-algorithmic, ephemeral, user-controlled file-sharing platform with a strong emphasis on privacy and user agency. The project uses Cloudflare's technologies (Workers, D1, R2, KV, Durable Objects) for its backend infrastructure, with a focus on ephemeral content that expires after 7 days unless archived through community action.

## Core Philosophy

- **Anti-algorithmic**: Content discovery is based on direct connections and explicit user actions rather than recommendation algorithms.
- **Ephemeral by default**: Content expires after 7 days unless explicitly archived by community vote.
- **User-controlled**: Users have full control over their content and connections.
- **Privacy-focused**: Uses privacy-respecting technologies (e.g., Bunny Fonts instead of Google Fonts).
- **Community-driven archiving**: Important content can be preserved beyond the 7-day window through explicit community voting.

## Technical Architecture

### Backend (Cloudflare-based)

- **Cloudflare Workers**: Serverless JavaScript execution environment for the application logic
- **D1 Database**: SQL database for structured data (user profiles, content metadata, associations, votes)
- **R2 Storage**: Object storage for files and content
- **KV**: Key-value storage for fast access to cached data and session management
- **Durable Objects**: Used for maintaining state and coordinating real-time features
- **RealtimeKit**: For real-time collaboration and messaging features

### Frontend

- **HTML/CSS/JavaScript**: Standard web technologies for the frontend
- **Single Global CSS**: Consolidated styling in `rel-f-global.css`
- **Bunny Fonts**: Privacy-respecting font delivery (alternative to Google Fonts)
- **D3.js**: For visualizing the Association Web

## Key Features

1. **Ephemeral Content System**
   - Content expires after 7 days by default
   - Community voting for archiving valuable content
   - Daily explicit votes for content preservation

2. **Drawer/RCC System**
   - Public profiles with customizable interfaces
   - Personal content organization

3. **Private Cache**
   - Secure storage for personal files
   - Selective sharing capabilities

4. **Association Web**
   - Visualization of connections between users, content, and topics
   - D3.js-powered interactive network graph

5. **Anti-algorithmic Search**
   - Tag-based and direct content discovery
   - "Lurker in the Mist" mode for privacy-conscious browsing

6. **Archive Voting System**
   - Democratic content preservation
   - Daily vote allocation to prevent gaming the system

7. **Comprehensive Search and Tags**
   - Robust content discovery through search and tagging
   - Nominatim integration for location-based search

8. **Random Content Discovery**
   - Random communique/user button for serendipitous discovery
   - Alternative to algorithmic recommendations

## Project Structure

```
r3l-realigned/
├── public/             # Public-facing web assets
│   ├── css/            # CSS styles
│   │   └── rel-f-global.css  # Global stylesheet
│   ├── js/             # JavaScript files
│   │   └── font-loader.js    # Bunny Fonts loader
│   ├── index.html      # Main page
│   ├── drawer.html     # Drawer/RCC page
│   ├── network.html    # Association web visualization
│   ├── search.html     # Search interface
│   ├── random.html     # Random content discovery
│   └── upload.html     # Content upload interface
├── src/                # Source code
│   ├── handlers/       # Request handlers
│   │   ├── auth.ts     # Authentication
│   │   ├── content.ts  # Content management
│   │   ├── drawer.ts   # Drawer functionality
│   │   ├── expiration.ts  # Content expiration
│   │   ├── search.ts   # Search functionality
│   │   ├── tag.ts      # Tag management
│   │   ├── user.ts     # User management
│   │   ├── associations.ts # Association web
│   │   ├── content-copy.ts # Content copying
│   │   ├── drawer-copy.ts # Drawer copying
│   │   ├── random-drawer.ts # Random content
│   │   └── filenet.ts  # File network
│   └── types/          # TypeScript type definitions
│       └── env.ts      # Environment interface
├── migrations/         # Database migrations
│   ├── 001_ephemeral_content.sql
│   ├── 002_user_profiles.sql
│   ├── 003_associations.sql
│   ├── 004_archive_voting.sql
│   ├── 005_daily_votes.sql
│   ├── 006_search_index.sql
│   ├── 007_content_copy.sql
│   ├── 008_drawer_customization.sql
│   └── 009_tag_management.sql
└── scripts/           # Utility scripts
    └── check-relative-urls.sh  # Verify all URLs are relative
```

## Current Project Status

### Completed

- ✅ Project structure setup
- ✅ Configuration files
- ✅ Philosophy definition
- ✅ Database migrations
- ✅ Core backend handlers
- ✅ Global CSS consolidation
- ✅ Font loading utility
- ✅ Random content discovery
- ✅ Archive voting system
- ✅ Daily vote tracking
- ✅ Tag management system
- ✅ Relative path configuration (for deployment)

### In Progress

- 🔄 Frontend polish (SVG height, card layout)
- 🔄 CSS updates and layout fixes
- 🔄 File copying implementation
- 🔄 Drawer customization

### Pending

- ⏳ ORCID authentication implementation
- ⏳ Final deployment preparation
- ⏳ Testing of all user flows
- ⏳ Documentation completion

## Color Scheme

The project uses a vibrant, dark theme with the following color palette:

- **Background**: Deep dark green-tinted backgrounds (`var(--bg-deep)`: `#0e1f1c`)
- **Container backgrounds**: Deep green (`var(--bg-container)`: `#1a2c2a`)
- **Container alt**: Darker green (`var(--bg-container-alt)`: `#1f2f1f`)
- **Secondary background**: (`var(--bg-secondary)`: `#1f3f33`)
- **Accent**: Electric lavender (`var(--accent-lavender)`: `#a278ff`)
- **Accent hover**: Brighter lavender (`var(--accent-lavender-hover)`: `#b68fff`)
- **Accent muted**: Muted lavender (`var(--accent-lavender-muted)`: `#8a5eff`)
- **Text accent**: Light green (`var(--accent-green)`: `#d0efb0`)
- **Links**: Cyan (`var(--accent-cyan)`: `#7fdcd8`)
- **Text primary**: Light gray (`var(--text-primary)`: `#e0e0e0`)
- **Text secondary**: Medium gray (`var(--text-secondary)`: `#aaaaaa`)

## Browser Compatibility

The application is designed to work on modern browsers with the following features:
- CSS Variables
- Flexbox and Grid layout
- ES6+ JavaScript
- SVG support

## Next Steps for Completion

1. Complete the remaining handler implementations
2. Finish frontend polish and layout fixes
3. Implement comprehensive testing
4. Prepare deployment scripts
5. Complete user documentation
6. Ensure all paths are relative for deployment

## Additional Notes

- All routing and linking must be relative for deployment to r3l.distorted.work
- The project emphasizes privacy, ephemerality, and user control
- The absence of algorithmic recommendations is a feature, not a limitation
