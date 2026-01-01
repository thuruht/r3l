# Development Guidelines

## Code Quality Standards

### TypeScript Configuration
- **Strict Mode**: Enabled across the entire codebase
- **Target**: ES2020 for modern JavaScript features
- **Module System**: ESNext with bundler resolution
- **Type Safety**: All functions and variables are explicitly typed
- **No Implicit Any**: Strict type checking enforced

### Code Formatting Patterns
- **Indentation**: 2 spaces consistently used throughout
- **Line Length**: Generally kept under 120 characters for readability
- **Semicolons**: Always used to terminate statements
- **Quotes**: Single quotes for strings, double quotes for JSX attributes
- **Trailing Commas**: Used in multi-line objects and arrays
- **Arrow Functions**: Preferred over function expressions for callbacks

### Naming Conventions
- **Variables/Functions**: camelCase (e.g., `user_id`, `createNotification`, `handleMouseOver`)
- **Types/Interfaces**: PascalCase (e.g., `NetworkNode`, `D3Node`, `AssociationWebProps`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `FILE_EXPIRATION_HOURS`, `RATE_LIMITS`)
- **Database Fields**: snake_case (e.g., `user_id`, `created_at`, `is_encrypted`)
- **React Components**: PascalCase files and exports (e.g., `AssociationWeb.tsx`)
- **Hooks**: Prefixed with `use` (e.g., `useNetworkData`, `useSpatialAudio`, `useCustomization`)
- **Context**: Suffixed with `Context` (e.g., `CustomizationContext`, `ToastContext`)

### Documentation Standards
- **Function Comments**: JSDoc-style comments for complex functions explaining parameters and return values
- **Inline Comments**: Used sparingly to explain non-obvious logic or business rules
- **TODO Comments**: Marked with `TODO:` or `FIXME:` for future improvements
- **API Endpoints**: Documented with HTTP method and purpose (e.g., `// GET /api/files: List files`)

## Architectural Patterns

### Backend (Cloudflare Workers)

#### API Route Structure
```typescript
// Pattern: HTTP Method + Path + Auth Middleware
app.post('/api/endpoint', authMiddleware, async (c) => {
  const user_id = c.get('user_id');
  const { param } = await c.req.json();
  
  try {
    // 1. Validation
    if (!param) return c.json({ error: 'Missing param' }, 400);
    
    // 2. Authorization checks
    // 3. Database operations
    // 4. Side effects (notifications, WebSocket broadcasts)
    
    return c.json({ message: 'Success' });
  } catch (e) {
    console.error("Error:", e);
    return c.json({ error: 'Failed' }, 500);
  }
});
```

#### Authentication Middleware Pattern
- JWT tokens stored in httpOnly cookies
- Middleware extracts and verifies token, attaches `user_id` to context
- All protected routes use `authMiddleware` before handler
- Consistent error responses: `{ error: 'Unauthorized' }, 401`

#### Database Query Patterns
```typescript
// Single row fetch
const user = await c.env.DB.prepare(
  'SELECT id, username FROM users WHERE id = ?'
).bind(user_id).first();

// Multiple rows
const { results } = await c.env.DB.prepare(
  'SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC'
).bind(user_id).all();

// Batch operations for atomicity
await c.env.DB.batch([
  c.env.DB.prepare('UPDATE ...').bind(...),
  c.env.DB.prepare('DELETE ...').bind(...)
]);
```

#### Error Handling Strategy
- Try-catch blocks wrap all async operations
- Specific error messages for validation failures (400)
- Generic "Failed to..." messages for server errors (500)
- Constraint violations detected via error message inspection
- Console.error for debugging, never expose internals to client

#### Rate Limiting Pattern
```typescript
if (!await checkRateLimit(c, 'action', RATE_LIMITS.action.limit, RATE_LIMITS.action.window)) {
  return c.json({ error: 'Too many attempts. Please wait.' }, 429);
}
```

#### R2 Storage Patterns
- Keys follow format: `{user_id}/{uuid}-{filename}` or `avatars/{user_id}/{uuid}-{filename}`
- Public URLs generated via `getR2PublicUrl()` helper
- Metadata stored in D1, actual files in R2
- Atomicity: Delete R2 object if D1 insert fails
- Custom metadata includes `userId`, `originalName`, `isEncrypted`

#### Encryption Patterns
- Server-side: AES-GCM with 12-byte IV stored in database
- Client-side: RSA-OAEP for key exchange, AES-GCM for content
- IV stored as hex string in database
- Encrypted content base64-encoded for text storage
- Decryption happens on-demand during retrieval

#### WebSocket Integration
- Durable Objects handle persistent connections
- Notifications sent via `createNotification()` helper which also triggers WebSocket broadcast
- Signal broadcasts use `broadcastSignal()` for real-time updates
- Messages include type discriminator: `new_notification`, `new_message`, `signal_artifact`

### Frontend (React + TypeScript)

#### Component Structure
```typescript
interface ComponentProps {
  // Props with explicit types
  nodes: NetworkNode[];
  onNodeClick: (nodeId: string) => void;
  isDrifting: boolean;
}

const Component: React.FC<ComponentProps> = ({ nodes, onNodeClick, isDrifting }) => {
  // 1. Hooks (useState, useEffect, useRef, custom hooks)
  // 2. Derived state and callbacks
  // 3. Effects
  // 4. Event handlers
  // 5. Render helpers
  // 6. Return JSX
};

export default Component;
```

#### Custom Hook Patterns
```typescript
export const useCustomHook = (dependencies: any) => {
  const [state, setState] = useState<Type>(initialValue);
  
  const fetchData = useCallback(async () => {
    // Async logic
  }, [dependencies]);
  
  useEffect(() => { fetchData(); }, [fetchData]);
  
  return { state, loading, refresh: fetchData };
};
```

#### State Management
- **Local State**: useState for component-specific state
- **Context API**: For global state (auth, customization, toast notifications)
- **Refs**: For DOM access and persistent values across renders (useRef)
- **Derived State**: Computed from props/state, not stored separately

#### API Call Patterns
```typescript
try {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    showToast(result.error || 'Request failed', 'error');
    return;
  }
  
  // Success handling
  showToast('Success message', 'success');
} catch (e) {
  console.error(e);
  showToast('Network error', 'error');
}
```

#### D3.js Integration Patterns
- **Persistent Refs**: Store simulation, SVG selection, and zoom behavior in refs
- **Data Merging**: Preserve existing node positions when updating data
- **Separation of Concerns**: Initialization in one effect, updates in another
- **Force Simulation**: Configure forces once, update data dynamically
- **Enter-Update-Exit**: Standard D3 pattern for data binding
- **Tick Handler**: Update positions on each simulation tick

#### GSAP Animation Patterns
```typescript
const { contextSafe } = useGSAP();

const animate = contextSafe(() => {
  gsap.fromTo(element, 
    { opacity: 0 },
    { opacity: 1, duration: 0.5, ease: "power2.out" }
  );
});
```

#### Web Audio API Patterns
- **Lazy Initialization**: Create AudioContext on first user interaction
- **Spatial Audio**: Use PannerNode with HRTF for 3D positioning
- **Cleanup**: Disconnect and stop all nodes when component unmounts
- **State Checks**: Verify AudioContext state before operations

## Common Implementation Patterns

### Permission Checking
```typescript
// Owner check
if (file.user_id !== user_id) {
  return c.json({ error: 'Unauthorized' }, 403);
}

// Visibility check
if (file.visibility === 'sym') {
  const mutual = await c.env.DB.prepare(
    'SELECT id FROM mutual_connections WHERE ...'
  ).bind(...).first();
  if (!mutual) return c.json({ error: 'Unauthorized' }, 403);
}
```

### Notification Creation Pattern
```typescript
await createNotification(
  c.env,           // Environment bindings
  c.env.DB,        // Database
  target_user_id,  // Recipient
  'sym_request',   // Type
  source_user_id,  // Actor
  { /* payload */ }
);
```

### File Upload Pattern
```typescript
const formData = await c.req.parseBody();
const file = formData['file'] as File;

// Generate unique R2 key
const r2_key = `${user_id}/${crypto.randomUUID()}-${file.name}`;

// Upload to R2
await c.env.BUCKET.put(r2_key, file.stream(), {
  httpMetadata: { contentType: file.type },
  customMetadata: { originalName: file.name, userId: String(user_id) }
});

// Record in D1
await c.env.DB.prepare('INSERT INTO files ...').bind(...).run();
```

### Relationship Management Pattern
- **Sym Connections**: Bidirectional entries in `relationships` + entry in `mutual_connections`
- **Asym Follows**: Single entry in `relationships` with type `asym_follow`
- **Batch Operations**: Use `c.env.DB.batch()` for atomic multi-table updates
- **Normalization**: Store `user_a_id` < `user_b_id` in `mutual_connections`

### Expiration & Vitality Pattern
```typescript
// Default expiration
const expires_at = new Date(Date.now() + FILE_EXPIRATION_HOURS * 60 * 60 * 1000).toISOString();

// Vitality boost extends life
await c.env.DB.prepare(
  `UPDATE files 
   SET vitality = vitality + ?, 
       expires_at = datetime(expires_at, '+' || ? || ' hours')
   WHERE id = ?`
).bind(amount, amount, file_id).run();

// Visual decay based on time remaining
const getVitalityOpacity = (d: D3Node) => {
  const hoursLeft = (expiry - now) / (1000 * 60 * 60);
  if (hoursLeft > 24) return 1;
  if (hoursLeft <= 0) return 0.2;
  return 0.2 + (0.8 * (hoursLeft / 24));
};
```

### Collection Management Pattern
- **File Order**: Stored in `collection_files.file_order` for drag-and-drop
- **Visibility Inheritance**: Collections respect file visibility rules
- **ZIP Export**: Fetch files from R2, decrypt if needed, bundle with JSZip
- **Convex Hull**: D3.polygonHull for visual grouping in graph

## Security Best Practices

### Input Validation
- Always validate required fields before processing
- Type check with TypeScript and runtime validation
- Sanitize user input for SQL queries (use parameterized queries)
- Validate hex color codes with regex: `/^#[0-9A-Fa-f]{8}$/`
- Check numeric ranges (e.g., node_size between 4-30)

### Authorization Checks
- Verify ownership before mutations
- Check mutual connections for sym-only content
- Implement visibility rules: `public`, `sym`, `me`
- Admin-only routes check `user_id === ADMIN_USER_ID`

### Cryptography
- Use Web Crypto API for all cryptographic operations
- Generate random IVs for each encryption operation
- Store IVs alongside encrypted data
- Never expose encryption keys in responses
- Use secure key derivation (SHA-256 for AES key from secret)

### Rate Limiting
- Apply to all sensitive endpoints (login, register, forgot password)
- Use KV for distributed rate limit tracking
- Fail open if KV is unavailable (don't block legitimate users)
- Return 429 status with helpful error messages

## Testing & Debugging

### Console Logging Strategy
- Log errors with context: `console.error("Error context:", e)`
- Log important state changes in development
- Never log sensitive data (passwords, tokens, keys)
- Use structured logging for Durable Objects

### Error Messages
- User-facing: Generic and helpful ("Failed to upload file")
- Developer-facing: Specific and actionable (console.error with stack trace)
- Avoid exposing internal implementation details
- Use consistent error response format: `{ error: string }`

## Performance Considerations

### Database Optimization
- Use indexes on frequently queried columns (user_id, created_at)
- Limit query results (e.g., `LIMIT 50` for notifications)
- Use `GROUP_CONCAT` for aggregating related data
- Batch operations for multiple related updates

### Frontend Optimization
- Memoize expensive computations with useMemo
- Use useCallback for stable function references
- Lazy load routes with React.lazy
- Debounce user input for search
- Preserve D3 simulation state across renders

### Asset Optimization
- Use R2 CDN for static assets
- Compress images before upload
- Lazy load images in graph visualization
- Use SVG for icons (Tabler Icons)

## Frequently Used Code Idioms

### Ternary for Conditional Rendering
```typescript
{isLoading ? <Spinner /> : <Content />}
{error && <ErrorMessage />}
```

### Optional Chaining & Nullish Coalescing
```typescript
const value = data?.field ?? defaultValue;
const url = user.avatar_url || '/default-avatar.svg';
```

### Array Methods for Data Transformation
```typescript
const mapped = items.map(item => ({ ...item, processed: true }));
const filtered = items.filter(item => item.active);
const found = items.find(item => item.id === targetId);
```

### Async/Await with Promise.all
```typescript
const [relRes, fileRes, collRes] = await Promise.all([
  fetch('/api/relationships'),
  fetch('/api/files'),
  fetch('/api/collections')
]);
```

### Destructuring for Clean Code
```typescript
const { user_id, username, avatar_url } = user;
const { nodes, links, loading } = useNetworkData({ ... });
```

### Template Literals for Dynamic Strings
```typescript
const message = `User ${username} uploaded ${filename}`;
const url = `/api/users/${userId}/files`;
```

### Type Guards & Assertions
```typescript
if (typeof content !== 'string') return c.json({ error: 'Invalid' }, 400);
const file = formData['file'] as File;
```

## Common Annotations & Patterns

### TypeScript Utility Types
```typescript
Partial<Type>        // All properties optional
Required<Type>       // All properties required
Pick<Type, Keys>     // Subset of properties
Omit<Type, Keys>     // Exclude properties
```

### React Patterns
```typescript
React.FC<Props>                    // Functional component type
useState<Type>(initial)            // Typed state
useRef<HTMLElement>(null)          // DOM ref
useCallback(() => {}, [deps])      // Memoized callback
useEffect(() => { cleanup }, [])   // Effect with cleanup
```

### D3 Patterns
```typescript
d3.select<SVGElement, Datum>()     // Typed selection
.data(array, d => d.id)            // Key function for data binding
.enter().append('element')         // Enter selection
.merge(updateSelection)            // Merge enter + update
.exit().remove()                   // Exit selection
```

### Hono Patterns
```typescript
app.use('/path/*', middleware)     // Apply middleware to routes
c.get('variable')                  // Get context variable
c.set('variable', value)           // Set context variable
c.req.json()                       // Parse JSON body
c.req.parseBody()                  // Parse FormData
c.json({ data }, status)           // JSON response
```

## Project-Specific Conventions

### Visibility Modes
- `public`: Anyone can access
- `sym`: Only mutual connections
- `me` (or `private`): Owner only

### Relationship Types
- `sym_request`: Pending symmetric connection request
- `sym_accepted`: Accepted mutual connection
- `asym_follow`: One-way follow

### Node Groups (Graph Visualization)
- `me`: Current user (center node)
- `sym`: Mutual connections
- `asym`: One-way follows
- `drift_user`: Random discovered users
- `drift_file`: Random discovered files
- `artifact`: User's own files
- `collection`: File collections

### Notification Types
- `sym_request`: Connection request received
- `sym_accepted`: Connection request accepted
- `file_shared`: File shared with user
- `system_alert`: Admin broadcast

### WebSocket Message Types
- `new_notification`: Inbox notification
- `new_message`: Direct message (Whisper)
- `signal_communique`: Profile update signal
- `signal_artifact`: File upload signal
- `presence_update`: User online/offline status
