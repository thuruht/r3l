# R3L:F Implementation Plan - July 19, 2025

## Overview of Completed Features

1. **Project Structure**: ✅ Directory structure created with proper organization
2. **Database Migrations**: ✅ All 8 migrations created including support for:
   - Ephemeral content (7-day expiry)
   - Content associations
   - Drawers
   - Content metadata
   - Users
   - Auth sessions
   - Content sharing
   - Archive voting and daily votes

3. **Backend Handlers**: ✅ Core handlers implemented:
   - Content handler
   - User handler
   - Auth handler
   - Drawer handler
   - Search handler
   - Association handler
   - Random drawer handler
   - Content copy handler
   - Router

4. **Frontend**: ✅ Main pages implemented:
   - Home
   - Drawer
   - Search
   - Random communique
   - All using relative URLs in the HTML

5. **CSS Consolidation**: ✅ Single global stylesheet created
   - All styles consolidated into `rel-f-global.css`
   - Using Bunny Fonts for privacy
   - Color scheme matching requirements

6. **Key Features**: ✅ All major features implemented:
   - Anti-algorithmic search
   - Ephemeral content with community archiving
   - Archive voting system
   - Daily explicit votes
   - Random communique/user button
   - Drawer customization
   - Tags and comprehensive search

## Todo List for Completion

### 1. Fix Relative URLs

All HTML pages currently have links with absolute paths like `/css/rel-f-global.css` and `/js/font-loader.js`. These need to be changed to relative paths so they'll work when the directory is moved.

```
Fix the following files:
- public/index.html
- public/drawer.html
- public/search.html
- public/random.html
```

**Solution**: Update all URL references to use relative paths instead of absolute:
- Change `/css/rel-f-global.css` to `./css/rel-f-global.css`
- Change `/js/font-loader.js` to `./js/font-loader.js`
- Change navigation links like `/drawer` to `./drawer.html`

### 2. Complete Content Copy Functionality

The content-copy handler is implemented but needs to be properly routed in the router.ts file to handle:
- Copy operations
- Download operations
- Explicit voting

**Solution**: Add the missing routes to router.ts in the handleContentRoutes method:

```typescript
// Inside handleContentRoutes method
if (path === '/api/content/copy' && request.method === 'POST') {
  // Attach user auth info to request
  (request as any).authenticated = !!authenticatedUserId;
  (request as any).userId = authenticatedUserId;
  
  const contentCopyHandler = new ContentCopyHandler();
  return await contentCopyHandler.handleCopyContent(request as any, env);
}

if (path === '/api/content/vote' && request.method === 'POST') {
  // Attach user auth info to request
  (request as any).authenticated = !!authenticatedUserId;
  (request as any).userId = authenticatedUserId;
  
  const contentCopyHandler = new ContentCopyHandler();
  return await contentCopyHandler.handleExplicitVote(request as any, env);
}

if (path.startsWith('/api/content/download/') && request.method === 'GET') {
  // Attach user auth info to request
  (request as any).authenticated = !!authenticatedUserId;
  (request as any).userId = authenticatedUserId;
  
  const contentCopyHandler = new ContentCopyHandler();
  return await contentCopyHandler.handleDownloadContent(request as any, env);
}
```

### 3. Add Random Drawer Routing

The random drawer handler is implemented but needs to be properly routed:

**Solution**: Add the missing route to router.ts:

```typescript
// In router.ts constructor
this.randomDrawerHandler = new RandomDrawerHandler();

// Add route handler
if (path === '/api/random-drawer' && request.method === 'GET') {
  return await this.randomDrawerHandler.getRandomDrawer(request, env);
}
```

### 4. Implement Tag Management

While search by tags is supported, we need to add functionality to manage tags:

**Solution**: Create a tag handler and add routes for:
- Adding tags to content
- Removing tags from content
- Fetching popular tags

### 5. Complete Search Implementation

The search handler has the methods but needs proper route handling:

**Solution**: Complete the handleSearchRoutes method in router.ts:

```typescript
private async handleSearchRoutes(request: Request, env: Env, path: string): Promise<Response> {
  // Basic search
  if (path === '/api/search' && request.method === 'GET') {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // Parse filters
    const type = url.searchParams.getAll('type');
    const dateStart = url.searchParams.get('date_start');
    const dateEnd = url.searchParams.get('date_end');
    
    const filters: any = {};
    if (type.length > 0) filters.type = type;
    if (dateStart || dateEnd) {
      filters.dateRange = {};
      if (dateStart) filters.dateRange.start = parseInt(dateStart);
      if (dateEnd) filters.dateRange.end = parseInt(dateEnd);
    }
    
    // Get user ID for visibility filtering
    const token = this.getAuthToken(request);
    let userId = null;
    if (token) {
      userId = await this.authHandler.validateToken(token, env);
      if (userId) {
        filters.userId = userId;
        filters.visibility = 'both';
      }
    }
    
    const results = await this.searchHandler.basicSearch(query, filters, limit, offset, env);
    return this.jsonResponse(results);
  }
  
  // Lurker search (randomized)
  if (path === '/api/search/lurker' && request.method === 'GET') {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const randomness = parseInt(url.searchParams.get('randomness') || '50');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    // Parse filters
    const type = url.searchParams.getAll('type');
    const dateStart = url.searchParams.get('date_start');
    const dateEnd = url.searchParams.get('date_end');
    
    const filters: any = {};
    if (type.length > 0) filters.type = type;
    if (dateStart || dateEnd) {
      filters.dateRange = {};
      if (dateStart) filters.dateRange.start = parseInt(dateStart);
      if (dateEnd) filters.dateRange.end = parseInt(dateEnd);
    }
    
    const results = await this.searchHandler.lurkerSearch(query, randomness, filters, limit, env);
    return this.jsonResponse(results);
  }
  
  // Popular tags
  if (path === '/api/search/tags' && request.method === 'GET') {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '30');
    
    // Implement fetching popular tags
    // This would need to be added to the SearchHandler class
    const popularTags = await this.searchHandler.getPopularTags(limit, env);
    return this.jsonResponse(popularTags);
  }
  
  return this.notFoundResponse();
}
```

### 6. Ensure Frontend Integration for Archive Voting

Add UI components for voting in content pages:

**Solution**: Add a voting section to the content detail page with:
- Vote button
- Vote counter
- Remaining daily votes indicator

### 7. Verify Routes in worker.ts

Ensure all API routes are properly delegated to the router in worker.ts:

**Solution**: Add import for random-drawer and content-copy handlers in router.ts:

```typescript
import { RandomDrawerHandler } from './handlers/random-drawer';
import { ContentCopyHandler } from './handlers/content-copy';
```

### 8. Fix Font Loading for Deployment

Update the font loader to use relative paths:

**Solution**: Modify the font-loader.js to use relative paths for all font resources.

### 9. Test Deployment-Ready Relative URLs

Create a simple test that verifies all URLs work when moved to the root of a domain:

**Solution**: Create a script that validates all URLs in HTML files are relative.

## Implementation Plan

1. First fix all relative URLs in HTML files
2. Complete the router implementation for all handlers
3. Add missing functionality for tag management
4. Ensure archive voting UI is integrated
5. Test all features work with relative paths
6. Verify all routing is correct for deployment

This plan ensures that all features are fully implemented and that the project will work correctly when moved to the root of r3l.distorted.work.

## Implementation Progress

### July 19, 2025
- Created implementation plan document
- Fixed relative URLs in HTML files:
  - Changed `/css/rel-f-global.css` to `./css/rel-f-global.css` in all HTML files
  - Changed `/js/font-loader.js` to `./js/font-loader.js` in all HTML files
  - Updated navigation links to use relative paths (`./page.html` instead of `/page`)
  - Updated API endpoint references to use relative paths (`./api/endpoint` instead of `/api/endpoint`)
- Updated router.ts to include missing handlers:
  - Added import and initialization for RandomDrawerHandler
  - Added import and methods for ContentCopyHandler
  - Implemented ContentCopyHandler routes in handleContentRoutes method
  - Added random-drawer endpoint in route method
  - Implemented complete handleSearchRoutes method for basic and lurker search
- Implemented tag management functionality:
  - Created tag.ts handler with methods for adding, removing, and retrieving tags
  - Added tag_usage table in new migration (009_tag_management.sql)
  - Added tag-related routes to router.ts for tag management
  - Implemented popular tags endpoint
- Created URL verification script:
  - Added scripts/check-relative-urls.sh to validate all HTML files use relative paths
  - Made script executable for pre-deployment verification

## Next Steps

1. Update drawer routes for customizable drawers
2. Add archive voting UI components
3. Run URL verification script to ensure all paths are relative
4. Final testing of all features
