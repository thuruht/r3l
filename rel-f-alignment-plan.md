# R3L:F Alignment Plan

This document outlines the steps needed to bring the codebase in line with the philosophy and requirements described in `/public/reMDE.md`.

## Core Features to Implement/Enhance

### 1. "Lurker in the Mist" Mode
- **Current State**: 
  - Basic preference setting (`lurkerModeRandomness`) exists in UserPreferences
  - SearchHandler has `lurkerSearch` method that implements randomized results
  - Missing UI controls for toggling/adjusting mode
  - Missing visibility status in association web

- **Implementation Plan**:
  1. Add UI controls in user settings page for "Lurker Mode" toggle and randomness slider
  2. Add low-visibility status for users in the association web visualization
  3. Implement node opacity/visibility based on lurker mode setting
  4. Extend UserHandler to track and enforce visibility rules
  5. Add missing endpoints in router.ts to handle visibility preferences

### 2. Association Web (D3.js Visualization)
- **Current State**:
  - AssociationHandler class exists for creating/managing content associations
  - Network visualization HTML template (network.html) exists with D3.js
  - Missing implementation of user-to-user connections with mutual agreement
  - Missing endpoints in router.ts for association routes
  - Public/private contact lists not fully implemented

- **Implementation Plan**:
  1. Complete `handleAssociationRoutes` in router.ts with endpoints for:
     - Getting user's public contacts
     - Requesting connection between users
     - Accepting/rejecting connection requests
     - Setting public/private status for connections
  2. Add contact management UI to user profile page
  3. Enhance the D3.js visualization to show degrees of connection and connection strength
  4. Add permanent hide list for the association web
  5. Implement privacy controls for network visualization

### 3. Ephemeral Content System
- **Current State**:
  - ContentLifecycle class handles expiration and archiving backend logic
  - Content has expiration tracking
  - Missing UI indicators for content expiration status
  - Missing clear warning system before deletion

- **Implementation Plan**:
  1. Add visual indicators for content expiration status
  2. Implement countdown for content about to expire
  3. Add expiration notification UI in the inbox
  4. Enhance ContentLifecycle to provide more granular expiration states
  5. Implement one-click archiving in UI for expiring content

### 4. Community Archiving
- **Current State**:
  - Basic voting logic exists in ContentHandler
  - Missing frontend integration for community archive voting
  - Missing thresholds and UI indicators for archive status

- **Implementation Plan**:
  1. Add UI for voting on content for community archiving
  2. Implement visual indicators for archive eligibility and vote count
  3. Create community archive browsing page
  4. Add filters for community archived content in search
  5. Implement notification when user content reaches archive threshold

### 5. Inbox & Notifications
- **Current State**:
  - NotificationHandler implements basic notification system
  - Missing mutual connection prompts based on activity
  - Missing 24-hour recovery window for history wipes

- **Implementation Plan**:
  1. Implement algorithm to detect common interests and suggest connections
  2. Add system for tracking user activity patterns
  3. Create notification types for mutual content interests
  4. Implement 24-hour recovery window for deleted content
  5. Add final hour notification before permanent deletion

### 6. Contact & Social Features
- **Current State**:
  - Basic user profiles exist
  - Missing contact management system
  - Missing collaboration workspaces

- **Implementation Plan**:
  1. Create contact management UI
  2. Implement public/private contact lists
  3. Add collaborative workspaces tied to DMs
  4. Implement mutual opt-out for content attribution
  5. Add permanent hide list management

## Implementation Priorities

1. **First Priority**: Lurker in the Mist Mode
   - This affects user privacy and is a core part of the philosophy

2. **Second Priority**: Association Web (D3.js Visualization)
   - This is the visual representation of the relational aspect

3. **Third Priority**: Ephemeral Content System
   - This is the core mechanic of the platform

4. **Fourth Priority**: Community Archiving
   - Ensures valuable content is preserved

5. **Fifth Priority**: Inbox & Notifications
   - Enhances user experience and interaction

6. **Sixth Priority**: Contact & Social Features
   - Completes the social aspect of the platform

## Technical Implementation Notes

- Use existing handlers where possible, extending them as needed
- Ensure consistent approach to authentication across all endpoints
- Maintain separation of concerns between data, business logic, and presentation
- Use the existing event-based notification system for real-time updates
- Leverage D1, KV, and Durable Objects appropriately for different data needs
