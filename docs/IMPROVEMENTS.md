# R3L:F Improvement Backlog

Each item includes context, the problem, and exact implementation steps.

---

## 1. Code Splitting — Reduce 5MB Bundle

**Context**: The main JS bundle is 5,019 kB (1,558 kB gzipped). Vite warns about this on every build. All routes and heavy modals are bundled together, meaning users download everything upfront even if they never open Admin, Workspaces, or Collections.

**Problem**: Slow initial load, especially on mobile. The PWA precache is also 5MB+.

**Implementation**:

In `client/src/App.tsx`, replace static imports with `React.lazy()` for all heavy components that are not needed on first render:

```ts
// Replace these static imports:
import CollectionsManager from './components/CollectionsManager';
import WorkspacesManager from './components/WorkspacesManager';
import AdminDashboard from './components/AdminDashboard';
import GroupChat from './components/GroupChat';
import GlobalChat from './components/GlobalChat';
import ArchiveVote from './components/ArchiveVote';
import FeedbackModal from './components/FeedbackModal';

// With lazy equivalents:
const CollectionsManager = React.lazy(() => import('./components/CollectionsManager'));
const WorkspacesManager = React.lazy(() => import('./components/WorkspacesManager'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const GroupChat = React.lazy(() => import('./components/GroupChat'));
const GlobalChat = React.lazy(() => import('./components/GlobalChat'));
const ArchiveVote = React.lazy(() => import('./components/ArchiveVote'));
const FeedbackModal = React.lazy(() => import('./components/FeedbackModal'));
```

Wrap each lazy-rendered component in a `<Suspense>` fallback:

```tsx
{isCollectionsOpen && (
  <Suspense fallback={<div className="loading-container"><div className="radar-scan" /></div>}>
    <CollectionsManager onClose={() => setIsCollectionsOpen(false)} />
  </Suspense>
)}
```

Also add `manualChunks` to `vite.config.ts` to split vendor libraries:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'd3': ['d3'],
        'gsap': ['gsap', '@gsap/react'],
        'codemirror': ['@uiw/react-codemirror'],
        'yjs': ['yjs', 'y-websocket', 'y-codemirror.next'],
        'plyr': ['plyr-react'],
        'wavesurfer': ['wavesurfer.js', '@wavesurfer/react'],
      }
    }
  }
}
```

**Expected outcome**: Initial bundle drops to ~800KB–1MB. D3, GSAP, CodeMirror, Yjs each become separate cached chunks.

---

## 2. Fix `crypto.ts` Dynamic Import Conflict

**Context**: Build warns: *"`crypto.ts` is dynamically imported by `Inbox.tsx` but also statically imported by `KeyManager.tsx` and `UploadModal.tsx` — dynamic import will not move module into another chunk."* This prevents crypto utilities from being split out.

**Problem**: `KeyManager` and `UploadModal` import `crypto.ts` at the top level, anchoring it to the main bundle. `Inbox.tsx` tries to lazy-load it but can't because it's already in the main chunk.

**Implementation**:

In `client/src/components/KeyManager.tsx` and `client/src/components/UploadModal.tsx`, convert the static crypto imports to dynamic:

```ts
// In UploadModal.tsx — inside the encrypt handler function:
const { encryptFile, generateKeyPair } = await import('../utils/crypto');

// In KeyManager.tsx — inside key generation/export handlers:
const { generateKeyPair, exportKey } = await import('../utils/crypto');
```

Since these are only called on user action (button clicks), there's no UX cost to loading them on demand.

**Expected outcome**: `crypto.ts` moves into its own lazy chunk, build warning disappears, and the main bundle shrinks further.

---

## 3. Artifact Pagination

**Context**: `GET /api/files` returns all of a user's files with no limit. `useNetworkData` adds every file as a node in the D3 graph. With 50+ files the graph becomes a dense, unnavigable cluster and the list view scrolls endlessly.

**Problem**: No pagination, no limit, no UX affordance for large collections.

**Implementation**:

Backend — add `limit` and `offset` query params to the files endpoint in `src/index.ts` (or wherever `GET /api/files` is defined):

```ts
app.get('/api/files', authMiddleware, async (c) => {
  const user_id = c.get('user_id');
  const limit = Math.min(Number(c.req.query('limit') || 50), 100);
  const offset = Number(c.req.query('offset') || 0);
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(user_id, limit, offset).all();
  const total = await c.env.DB.prepare('SELECT COUNT(*) as count FROM files WHERE user_id = ?').bind(user_id).first('count');
  return c.json({ files: results, total, limit, offset });
});
```

Frontend — in `useNetworkData.ts`, cap artifact nodes at 50 and expose a `loadMoreFiles` function:

```ts
const fileData = await fetch('/api/files?limit=50').then(r => r.json());
```

In `NetworkList.tsx`, add a "Load more" button at the bottom of the artifact section when `total > files.length`.

In `AssociationWeb.tsx`, consider only showing the 20 most recent artifacts as nodes to keep the graph readable, with a note in the UI.

---

## 4. File Expiry Tooltip in Graph

**Context**: Decaying artifacts already fade and blur in the graph based on `expires_at` (implemented in `AssociationWeb.tsx` via `getVitalityOpacity` and `getVitalityBlur`). However, there's no way to know *how long* a node has left without clicking it.

**Problem**: The visual decay is subtle and gives no precise information. Users can't tell if a node has 23 hours or 2 hours left.

**Implementation**:

In `AssociationWeb.tsx`, extend the `handleMouseOver` function to include expiry info in the tooltip for artifact nodes:

```ts
const handleMouseOver = (event: any, d: D3Node, allLinks: any, allNodes: any) => {
  let content = d.name;
  if (d.group === 'artifact' && d.data?.expires_at) {
    const hoursLeft = (new Date(d.data.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft < 48) {
      content += ` — ⏳ ${hoursLeft < 1 ? '<1h' : Math.floor(hoursLeft) + 'h'} left`;
    }
  }
  setTooltip({ x: event.clientX, y: event.clientY, content });
  // ... rest of highlight logic
};
```

Also add a small legend to the graph UI (near the zoom controls) explaining the decay visual:

```tsx
<div style={{ position: 'absolute', bottom: '20px', left: '20px', fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.6 }}>
  <span style={{ opacity: 1 }}>●</span> fresh &nbsp;
  <span style={{ opacity: 0.5 }}>●</span> expiring &nbsp;
  <span style={{ opacity: 0.2 }}>●</span> critical
</div>
```

---

## 5. Drift Auto-Refresh

**Context**: Drift mode is toggled on/off manually. Once enabled, `fetchDrift()` is called once and the data is static until the user re-toggles or the page refreshes. The "radar" metaphor implies continuous scanning.

**Problem**: Drift feels static. New public artifacts uploaded while you're drifting never appear without manual intervention.

**Implementation**:

In `App.tsx`, add an interval ref and start/stop it with drift state:

```ts
const driftIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

useEffect(() => {
  if (isDrifting) {
    driftIntervalRef.current = setInterval(() => fetchDrift(driftType), 60_000);
  } else {
    if (driftIntervalRef.current) clearInterval(driftIntervalRef.current);
  }
  return () => {
    if (driftIntervalRef.current) clearInterval(driftIntervalRef.current);
  };
}, [isDrifting, driftType, fetchDrift]);
```

60 seconds is safe given the rate limit of 20 requests per 600s (10 minutes = 10 refreshes, well within limit).

Optionally show a subtle "last scanned Xs ago" indicator in the drift controls.

---

## 6. Unread Badge on Groups Nav Button

**Context**: The Inbox nav button shows an `unread-badge` dot when `unreadCount > 0`. The Groups button has no equivalent, even though `GroupChat` fetches `unread_count` per group from the API.

**Problem**: Users have no signal that new group messages arrived without opening the panel.

**Implementation**:

In `App.tsx`, add a `groupUnreadCount` state:

```ts
const [groupUnreadCount, setGroupUnreadCount] = useState(0);
```

Fetch it alongside the existing unread notification count, or derive it from the WebSocket `new_group_message` event:

```ts
// In the WebSocket onmessage handler:
} else if (msg.type === 'new_group_message') {
  setGroupUnreadCount(prev => prev + 1);
}
```

Reset it when the Groups panel is opened:

```ts
<button onClick={() => { setIsGroupChatOpen(!isGroupChatOpen); setGroupUnreadCount(0); }} className="nav-button">
  Groups
  {groupUnreadCount > 0 && <span className="unread-badge" aria-hidden="true" />}
</button>
```

Also add the `new_group_message` broadcast to the Durable Object in `src/do.ts` if not already present.

---

## 7. Swipe-to-Dismiss for Modals

**Context**: `Inbox.tsx` already implements swipe gestures for individual notification items (`SwipeableNotificationItem`). However, the overlay panels themselves (`FilePreviewModal`, `GroupChat`, `GlobalChat`, `Inbox`) have no swipe-to-close on mobile.

**Problem**: On mobile, users must find and tap the close button. A downward swipe to dismiss is standard mobile UX.

**Implementation**:

Create a reusable hook `client/src/hooks/useSwipeToDismiss.ts`:

```ts
export const useSwipeToDismiss = (onDismiss: () => void, threshold = 80) => {
  const startY = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientY - startY.current > threshold) onDismiss();
  };
  return { onTouchStart, onTouchEnd };
};
```

Apply to the header drag handle of `FilePreviewModal` and the header bars of `Inbox`, `GroupChat`, `GlobalChat`:

```tsx
const swipe = useSwipeToDismiss(onClose);
<div onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd} style={{ cursor: 'grab', ... }}>
  {/* header content */}
</div>
```

---

## 8. Empty State for Drift in Graph View

**Context**: When drift mode is active but returns 0 results (brand new network, all users lurking, or type filter too narrow), the graph just shows the user's own nodes with no indication that the scan found nothing.

**Problem**: Silence is indistinguishable from "still loading" or "drift is broken."

**Implementation**:

In `App.tsx`, derive a `driftEmpty` boolean:

```ts
const driftEmpty = isDrifting &&
  !loading &&
  driftData.users.length === 0 &&
  driftData.files.length === 0 &&
  (driftData.collections?.length ?? 0) === 0;
```

Render an overlay message on the graph when true:

```tsx
{driftEmpty && (
  <div style={{
    position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
    background: 'var(--drawer-bg)', border: '1px solid var(--border-color)',
    padding: '10px 20px', borderRadius: '4px', fontSize: '0.85rem',
    color: 'var(--text-secondary)', zIndex: 'var(--z-overlay)', pointerEvents: 'none'
  }}>
    No signals on this frequency. Try a different filter or wait for the next scan.
  </div>
)}
```

---

## 9. Burn-on-Read Enforcement (Backend)

**Context**: `UploadModal.tsx` sends `burn_on_read=true` in the upload form data. `Artifacts.tsx` shows a 🔥 badge on burn-on-read files. However, the backend file content endpoint (`GET /api/files/:id/content`) does not actually delete the file after serving it.

**Problem**: The feature is purely cosmetic. Files marked burn-on-read persist indefinitely.

**Implementation**:

In the backend file content route (in `src/index.ts` or `src/routes/files.ts`), after successfully streaming the file to the client, check and act on the flag:

```ts
app.get('/api/files/:id/content', authMiddleware, async (c) => {
  const file_id = Number(c.req.param('id'));
  const user_id = c.get('user_id');

  const file = await c.env.DB.prepare('SELECT * FROM files WHERE id = ?').bind(file_id).first() as any;
  if (!file) return c.json({ error: 'Not found' }, 404);

  // ... existing visibility/auth checks and R2 fetch ...

  // After building the response, check burn_on_read
  // Only burn if the viewer is NOT the owner
  if (file.burn_on_read && file.user_id !== user_id) {
    c.executionCtx.waitUntil(Promise.all([
      c.env.BUCKET.delete(file.r2_key),
      c.env.DB.prepare('DELETE FROM files WHERE id = ?').bind(file_id).run()
    ]));
  }

  return response; // return the file content response
});
```

Using `waitUntil` ensures the deletion happens after the response is sent, so the user receives the file before it's gone.

Add a migration to ensure `burn_on_read` column exists with a default of `0`:

```sql
-- migrations/0026_burn_on_read.sql
ALTER TABLE files ADD COLUMN burn_on_read INTEGER NOT NULL DEFAULT 0;
```

---

## 10. Rate Limit Drift with Auto-Refresh Awareness

**Context**: The drift endpoint has a rate limit of 20 requests per 600 seconds. Improvement #5 adds a 60-second auto-refresh. At 1 request/minute, a user would hit the limit after 20 minutes of continuous drifting.

**Problem**: If the interval is ever shortened (e.g. for testing or future feature work), the rate limit becomes a silent failure — drift just stops updating with no user feedback.

**Implementation**:

In `App.tsx`, handle the 429 response from `fetchDrift`:

```ts
const fetchDrift = useCallback(async (type: string = '') => {
  try {
    const query = type ? `?type=${type}` : '';
    const res = await fetch(`/api/discovery/drift${query}`);
    if (res.status === 429) {
      showToast('Drift scanning too fast — slowing down.', 'info');
      return;
    }
    if (res.ok) setDriftData(await res.json());
  } catch (e) {
    console.error(e);
  }
}, [showToast]);
```

In `src/routes/discovery.ts`, increase the rate limit window to match the auto-refresh interval more generously:

```ts
// 30 requests per 30 minutes — allows 30 auto-refreshes before throttling
if (!await checkRateLimit(c, 'drift', 30, 1800)) return c.json({ error: 'Too fast' }, 429);
```

---

## 11. Fix `window.innerWidth` in Render

**Context**: `GlobalChat.tsx`, `FilePreviewModal.tsx`, and `CustomizationSettings.tsx` all call `window.innerWidth` directly inside JSX or render functions. `AssociationWeb.tsx` correctly uses a `winSize` state updated via a resize event listener.

**Problem**: Direct `window.innerWidth` calls in render:
- Return stale values after window resize (component doesn't re-render on resize)
- Will throw in any SSR or test environment
- Cause layout bugs on orientation change on mobile

**Implementation**:

Create a shared hook `client/src/hooks/useWindowSize.ts`:

```ts
import { useState, useEffect } from 'react';

export const useWindowSize = () => {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
};
```

Replace all `window.innerWidth` calls in render with the hook:

```ts
// In GlobalChat.tsx, FilePreviewModal.tsx, CustomizationSettings.tsx:
const { w: windowWidth } = useWindowSize();
const isMobile = windowWidth < 768;
```

Then replace all inline `window.innerWidth < 768` checks with `isMobile`.

---

## 12. Update AGENT_HANDOFF.md

**Context**: `AGENT_HANDOFF.md` describes the state of the project as of the layout/accessibility pass. It no longer reflects the current state after multiple sessions of improvements.

**Problem**: The next agent (or future session) will have outdated context about what's done and what's next.

**Implementation**:

Rewrite `AGENT_HANDOFF.md` to reflect:

- All z-index values now use CSS variables from `design-tokens.css`
- `100vw` replaced with `100%` throughout
- Touch targets enforced via `components.css` (`.btn-icon` min 44px)
- `IconPlus` and other icon import issues resolved in `AssociationWeb.tsx`
- Collection node clicks navigate to owner's communique
- Drift endpoint now returns public collections
- Burn-on-read is UI-only (backend enforcement is item #9 in this backlog)
- Bundle is 5MB — code splitting is the highest priority improvement (item #1)
- Point to this file (`docs/IMPROVEMENTS.md`) as the active backlog

---

*Last updated after: z-index cleanup, 100vw fixes, touch targets, collection nav, drift collections pass.*

---

## Spirit Realignment — Returning to the Original Beta

The following items are drawn from the original `rel_old_beta_slash_wiki_slash_proposal.html` — the founding document of Rel-F. Several core concepts from that document have either drifted in naming, been partially implemented, or were never built. These recommendations are about re-grounding the current codebase in the original spirit of the project.

---

### R1. Restore the Original Terminology Layer (RCC / RPC / RRC / R3C)

**Original vision**: The beta defined a precise vocabulary:
- **R3C** — *R3LF Cache* — the personal hub (what is now called "drawer" or profile)
- **RCC** — *R3LF Cache Communique* ("wrick") — the public-facing communique/profile page
- **RPC** — *R3LF Private Cache* — private file storage (visibility `me`)
- **RRC** — *Rel-F Relational Construct* ("wreck") — the association web/graph

**Current state**: The app uses "drawer", "Communique", "3rd Space", and "Association Web" inconsistently. The original shorthand (RCC, RPC, RRC) has been dropped entirely.

**Recommendation**: These terms don't need to replace the current UI labels wholesale, but they should be present as subtitles or tooltips to preserve the original identity. For example:
- The graph view title: `RRC — Relational Construct`
- The profile page subtitle: `RCC — Cache Communique`
- The private files section: `RPC — Private Cache`
- The settings/drawer section: `R3C — Your Cache`

Add these as small secondary labels in the relevant UI sections. This costs nothing technically and restores the original vocabulary.

---

### R2. Connection Strength Based on Interaction Frequency

**Original vision**: *"Connection strength is based on interaction frequency — stronger links mean more engagement."* The association web was meant to visually reflect how active a relationship is, not just whether it exists.

**Current state**: All Sym connections render with identical link weight (`stroke-width: 2.5`). There is no concept of a "stronger" or "weaker" Sym bond based on activity.

**Recommendation**: Track a simple interaction score per relationship. Increment it when:
- A file is shared between two Sym users
- A whisper is sent
- A vitality boost is given to the other's artifact

Store this as a `strength` column on the `mutual_connections` table:

```sql
-- migrations/0027_relationship_strength.sql
ALTER TABLE mutual_connections ADD COLUMN strength INTEGER NOT NULL DEFAULT 1;
```

In `AssociationWeb.tsx`, map strength to link thickness:

```ts
.attr('stroke-width', (d) => {
  if (d.type !== 'sym') return 1;
  const strength = d.strength || 1;
  return Math.min(2 + Math.log(strength), 6); // 2px base, up to 6px
})
```

This makes the graph a living map of actual relationships, not just a static list.

---

### R3. Organic Mutual Connection Prompts

**Original vision**: *"Mutual connection prompts occur when: users frequently engage with the same people, users repeatedly view each other's content, users co-archive 5–10 shared files."*

**Current state**: Sym connections are only initiated manually via the "Connect" button on a communique. There is no organic suggestion system.

**Recommendation**: Add a lightweight suggestion system in the cron job (`src/index.ts`, hourly trigger). Check for:

1. Two users who have both boosted (vitality) the same public file within 48 hours — send each a `system_alert`: *"You and [username] both resonated with the same artifact. Consider connecting."*
2. Two users who have each viewed the other's communique more than 3 times (requires a `communique_views` table or KV counter) — prompt a Sym request suggestion.

This is the original "serendipitous connection" mechanic and is central to the anti-algorithmic ethos — suggestions emerge from genuine shared interest, not from a recommendation engine.

---

### R4. Threaded Comments on Artifacts

**Original vision**: *"Threaded comments for focused, minimal discussions."* The original beta explicitly listed this as a core posting/engagement feature.

**Current state**: There is no comment system. Artifacts can be boosted (vitality), shared, and archived, but there is no way to respond to or discuss a specific file.

**Recommendation**: Add a minimal comment thread to `FilePreviewModal`. Keep it intentionally sparse — no nested replies, no likes on comments, just a flat thread of text responses attached to a file.

Backend: new `file_comments` table:

```sql
CREATE TABLE file_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Frontend: below the file content in `FilePreviewModal`, a collapsible comment section — input + flat list. Visibility follows the file's visibility rules (public file = anyone can comment, sym = only mutual connections).

---

### R5. Bookmarks (Save Without Tracking)

**Original vision**: *"Bookmarks let users save and revisit content (without tracking)."* This was listed as a core engagement feature distinct from archiving or vitality boosting.

**Current state**: There is no bookmark system. Users can add files to collections, but that's a curatorial/organizational action, not a personal "save for later."

**Recommendation**: Add a simple `bookmarks` table:

```sql
CREATE TABLE bookmarks (
  user_id INTEGER NOT NULL REFERENCES users(id),
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, file_id)
);
```

Add a bookmark toggle button (🔖) to `FilePreviewModal` alongside the existing action buttons. Add a "Bookmarks" section to `SettingsPage` or the drawer/communique. Crucially — bookmarks are private, never visible to others, and do not notify the file owner. This is the "without tracking" part of the original spec.

---

### R6. Undo Window for History Wipes

**Original vision**: *"Users have 24 hours to restore erased data. A final warning is issued in the last hour."*

**Current state**: `SettingsPage` has a "Clear History" option with a multi-step confirmation (typing "DELETE"), but deletion is immediate and permanent. There is no undo window.

**Recommendation**: Instead of immediately deleting, mark records as `pending_deletion` with a `delete_after` timestamp 24 hours in the future. The cron job handles actual deletion. Send a `system_alert` notification 1 hour before the window closes. Add a "Cancel deletion" button in `SettingsPage` if a pending deletion exists.

This is a meaningful privacy feature — it protects against accidental or coerced data wipes — and was explicitly part of the original design.

---

### R7. Mutual Contributor Opt-Out on Co-Archived Files

**Original vision**: *"Mutual Contributor Opt-Out: Users can hide their name from co-archived files."*

**Current state**: The community archive (`ArchiveVote`) shows files with their owner's username. There is no way for a contributor to a co-archived file to remove their name from the public record.

**Recommendation**: Add an `anonymous` boolean to the archive vote/record. When a file reaches the archive threshold, notify all users who voted to archive it and give them the option to be listed as a contributor or remain anonymous. Store this preference in a `archive_contributors` table with an `is_anonymous` flag.

---

### R8. "No Automated Ranking" in Search

**Original vision**: *"No automated ranking: Search results are driven solely by user input."* and *"No chasing likes or engagement metrics."*

**Current state**: The search in `UserDiscovery.tsx` returns users ordered by the database default (likely insertion order or ID). The community archive in `ArchiveVote` likely orders by vote count, which is a form of ranking.

**Recommendation**:
- User search results: order by `username ASC` (alphabetical) — purely deterministic, no engagement signal
- Community archive: default sort should be `created_at DESC` (newest first), with an explicit user-controlled sort toggle (newest / oldest / file type) — never by vote count as default
- Add a visible note in the archive UI: *"Sorted by date. No ranking."* — this is a philosophical statement as much as a UX choice, and it was important to the original vision

---

### R9. Restore "the rel" Branding Voice

**Original vision**: The beta document uses lowercase *"the rel"* consistently and deliberately. The tagline is: *"Rel how you want. Know what you share. Choose who you're sym with."* The tone is anti-corporate, grassroots, and human.

**Current state**: The app header says `REL F BETA` in all-caps. The landing page (`LandingPage.tsx`) uses marketing-style copy. The About page (`About.tsx`) is informational but doesn't carry the original manifesto voice.

**Recommendation**:
- `LandingPage.tsx`: Add the original tagline *"Rel how you want. Know what you share. Choose who you're sym with."* as a prominent subtitle
- `About.tsx`: Incorporate the ideological text from the original document — the sections on ephemerality as freedom, user-curated connections, mutual visibility, and rejecting engagement farming. This text is already written and just needs to be brought in.
- Consider lowercasing the logo to `rel f` or `the rel` in at least one context (the landing page hero) to match the original brand voice

---

*These recommendations are drawn directly from `rel_old_beta_slash_wiki_slash_proposal.html`. They represent the founding intent of the project and should be treated as first-class features, not nice-to-haves.*


---

# APPENDIX: Implementation Progress

*Started: Current Session*
*Goal: Complete highest-impact technical improvements + spirit realignment items*

## Session Log

### Phase 1: Code Splitting (Item #1)
**Status**: ✅ COMPLETE

#### Step 1.1: Convert heavy components to React.lazy()
- [x] CollectionsManager
- [x] WorkspacesManager  
- [x] AdminDashboard
- [x] GroupChat
- [x] GlobalChat
- [x] ArchiveVote
- [x] FeedbackModal
- [x] FAQ
- [x] About
- [x] PrivacyPolicy

#### Step 1.2: Add Suspense wrappers
- [x] Wrap all lazy components in App.tsx

#### Step 1.3: Configure Vite manual chunks
- [x] Add manualChunks to vite.config.ts
- [x] Test build output

**Results**:
- Main bundle: 5,019 KB → 3,976 KB (1,043 KB reduction, ~21%)
- Vendor chunks created: d3 (63KB), gsap (71KB), yjs (103KB), plyr (114KB), react-vendor (179KB), codemirror (403KB)
- Total chunks: 24 (up from 3)
- Initial load now only downloads main + react-vendor + necessary chunks
- Lazy-loaded modals (GroupChat, GlobalChat, Collections, etc.) only download when opened

**Deployed**: Version 30d6bec9-7898-4905-9809-99027d0461e9

---

### Phase 2: Fix crypto.ts Import Conflict (Item #2)
**Status**: NOT STARTED

---

### BUGFIX: File Edit Blank Content + D3 Hull Error
**Status**: ✅ COMPLETE

**Issue**: When clicking "Edit" on a text file, CodeMirror showed a single blank line and threw "Unexpected end of array" error from D3's polygonHull.

**Root Cause**: 
1. Yjs collaborative editing setup was starting before file content finished loading (race condition)
2. D3 polygonHull had insufficient error handling for edge cases (collinear points, empty arrays)

**Fix**:
1. Added guard in `FilePreviewModal.tsx` to defer Yjs setup until `content !== null`
2. Added `content` to useEffect dependencies so collab retries when content loads
3. Wrapped `d3.polygonHull()` in try-catch with hull length validation in `AssociationWeb.tsx`

**Files Modified**:
- `client/src/components/FilePreviewModal.tsx`
- `client/src/components/AssociationWeb.tsx`

**Deployed**: Version 30d6bec9-7898-4905-9809-99027d0461e9

---

### Phase 3: Spirit Realignment - Brand Voice (Item R9)
**Status**: NOT STARTED

---

### Phase 4: Connection Strength Tracking (Item R2)
**Status**: NOT STARTED

---

### Phase 5: Organic Connection Prompts (Item R3)
**Status**: NOT STARTED

---

*Progress will be updated as each phase completes.*
