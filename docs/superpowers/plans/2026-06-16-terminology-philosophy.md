# Terminology, Philosophy & 3SPACE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the canonical R3L:F vocabulary across all docs, UI copy, and implement 3SPACE as a first-class connection type.

**Architecture:** Three independent phases — docs only, then frontend copy sweep, then backend + frontend 3SPACE feature. Each phase ships cleanly on its own. No DB field renames; internal names (`vitality`, `burn_on_read`, etc.) stay as-is.

**Tech Stack:** Cloudflare Worker (Hono), D1 (SQLite), React 18, TypeScript. No test suite — verification is `npm run build:client` (TypeScript errors) + manual check in `npm run dev`.

**Spec:** `docs/superpowers/specs/2026-06-16-terminology-philosophy-design.md`

---

## Phase 1 — Terminology & Docs

### Task 1: Write canonical glossary

**Files:**
- Create: `docs/terminology.md`

- [ ] **Step 1: Create the glossary**

```markdown
# R3L:F Terminology

The canonical reference for all terms used across the platform. Code internals
(DB fields, API routes) use legacy names and are not affected by this document.

## Register Rules

- **UI labels, badges, buttons, headings:** UPPERCASE (FILES, DRIFT, TTL)
- **Prose — tooltips, empty states, descriptions:** lowercase ("your files", "this file's lifespan")
- Never mix registers in one sentence. "Your files are organised by TTL" is correct.
  "Your FILES are organised by TTL" is wrong.

## Term Reference

| Term | Definition | UI form | Prose form | Replaces |
|---|---|---|---|---|
| **FILES** | Content shared on the platform | "Files", "Upload Files" | "your files", "this file" | Artifacts |
| **DRIFT** | Random discovery mode surfacing public files and users | "DRIFT", "Start Drifting" | "drifting", "while drifting" | Drift |
| **RELMAP** | The D3 force graph of your relational network | "RELMAP" | "the relmap", "your network" | RRC / Relational Construct |
| **COMMUNIQUE** | A user's public profile page | "COMMUNIQUE" | "their communique", "your communique" | RCC / Cache Communique |
| **3SPACE** | Private mode for file storage and ghost connections | "3SPACE" | "your 3space", "a 3space connection" | 3rd Space / Private Cache / RPC |
| **SYM** | Mutual public connection — both parties visible on RELMAP | "SYM" | "a sym connection", "your sym connections" | Sym |
| **A-SYM** | One-way public connection — observation without mutual acknowledgement | "A-SYM" | "an a-sym follow" | A-Sym |
| **TTL** | A file's remaining lifespan, decrements hourly toward deletion | "TTL", "72h TTL" (badge) | "this file's lifespan", "expires in 72 hours" | Vitality |
| **SYMTXT** | E2EE private messages between SYM or 3SPACE connections | "SYMTXT" | "send a symtxt", "your symtxts" | Whispers |
| **RESONANCE** | Organic connection suggestion when two unconnected users engage the same file | "RESONANCE" | "a resonance with @user" | Resonance |
| **FLARE** | File that self-destructs after one view by a non-owner | "FLARE", "Send as FLARE" | "a flare file", "self-destructs after one view" | Burn-on-Read |
| **ARCHIVE** | Permanent preservation of a file voted for by the community | "ARCHIVE", "Vote to ARCHIVE" | "archived files", "permanently preserved" | Community Archive |

## Three-Mode Framework

The philosophical spine of the platform. Every connection and every file belongs to one mode.

| Mode | Connection | File visibility | RELMAP | Communication |
|---|---|---|---|---|
| **SYM** | Mutual, public | Shared with sym connections | Visible — strong link | SYMTXT + public |
| **A-SYM** | One-way, public | Public — discoverable via DRIFT | Visible — directional | Public only |
| **3SPACE** | Mutual, private | Me-only or shared with 3space partner | Not visible | SYMTXT only, E2EE |

3SPACE connections are ghost connections: both parties know, no one else does.
No public acknowledgement, no RELMAP presence, no connection count.

## Philosophy Statement

> *Three ways to connect: openly with SYM, observationally with A-SYM, or invisibly
> with 3SPACE. Three ways to share: publicly into the DRIFT, with your network, or
> only with yourself. Files expire by default. Nothing is permanent unless the
> community makes it so.*
```

- [ ] **Step 2: Verify file created**

```bash
cat docs/terminology.md | head -5
```
Expected: `# R3L:F Terminology`

- [ ] **Step 3: Commit**

```bash
git add docs/terminology.md
git commit -m "docs: add canonical terminology glossary"
```

---

### Task 2: Update existing docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/README.md`
- Modify: `client/src/DESIGN_SYSTEM.md`
- Modify: `docs/SECURITY.md`

- [ ] **Step 1: Add terminology reference to CLAUDE.md**

In `CLAUDE.md`, find the Design System section and add after the sanitization block:

```markdown
### Terminology

Canonical vocabulary is in `docs/terminology.md`. Key rules:
- UPPERCASE in UI labels/badges/buttons/headings
- lowercase in prose (tooltips, empty states, descriptions)
- Internal DB/API names (`vitality`, `burn_on_read`, `asym_follow`) are unchanged
```

- [ ] **Step 2: Update docs/README.md philosophy statement**

Replace the closing tagline and Overview paragraph with:

```markdown
## Philosophy

> *Three ways to connect: openly with SYM, observationally with A-SYM, or invisibly
> with 3SPACE. Three ways to share: publicly into the DRIFT, with your network, or
> only with yourself. Files expire by default. Nothing is permanent unless the
> community makes it so.*
```

Also update the Core Concepts section: replace "Artifact" → "file/File", "Vitality" → "TTL", "Whisper" → "SYMTXT", "Burn-on-Read" → "FLARE".

- [ ] **Step 3: Add register rules to DESIGN_SYSTEM.md**

Add a new section before "Best Practices":

```markdown
## Terminology Register

Terms from `docs/terminology.md` follow a strict register rule:

- **In UI labels, badges, buttons, headings:** UPPERCASE — `FILES`, `DRIFT`, `TTL`, `RELMAP`
- **In prose (tooltips, empty states, descriptions):** lowercase — "your files", "this file's lifespan"

Never write "Your FILES have TTL" — write "Your files have a TTL."
Never write "drift" in a navigation button — write "DRIFT".
```

- [ ] **Step 4: Update docs/SECURITY.md**

Replace every instance of "Whispers" → "SYMTXT" and "Burn-on-Read" → "FLARE" in the file.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/README.md client/src/DESIGN_SYSTEM.md docs/SECURITY.md
git commit -m "docs: apply canonical terminology across all docs"
```

---

## Phase 2 — UI Copy Sweep

> No schema or API changes in this phase. `npm run build:client` must pass with zero TypeScript errors after each task.

### Task 3: Artifacts.tsx — TTL badge + BOOST TTL

**Files:**
- Modify: `client/src/components/Artifacts.tsx`

- [ ] **Step 1: Replace vitality number with TTL badge**

Find this block (~line 352):
```tsx
{/* Vitality */}
<div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-vitality)' }} onClick={e => e.stopPropagation()}>
  <span style={{ fontSize: '0.8em', minWidth: '16px', textAlign: 'center' }} aria-label={`${file.vitality || 0} vitality`}>{file.vitality || 0}</span>
  <button
    ...
    title={file.is_boosted ? 'Already boosted' : 'Boost Signal'}
    aria-label={file.is_boosted ? 'Already boosted' : 'Boost Signal'}
  >
```

Replace with:
```tsx
{/* TTL */}
<div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-vitality)' }} onClick={e => e.stopPropagation()}>
  <span
    style={{ fontSize: '0.75em', minWidth: '32px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
    aria-label={`${file.vitality || 0} hours TTL remaining`}
    title="This file's lifespan — boost to extend it"
  >{file.vitality || 0}h TTL</span>
  <button
    ...
    title={file.is_boosted ? 'Already boosted' : 'BOOST TTL'}
    aria-label={file.is_boosted ? 'Already boosted' : 'BOOST TTL'}
  >
```

- [ ] **Step 2: Update boost toast messages**

Find (~line 234):
```tsx
showToast('Signal boosted!', 'success');
```
Replace with:
```tsx
showToast('TTL extended.', 'success');
```

Find (~line 237, 239, 243):
```tsx
showToast('Already boosted this signal.', 'info');
showToast('Failed to boost signal.', 'error');
showToast('Error boosting signal.', 'error');
```
Replace with:
```tsx
showToast('Already boosted this file.', 'info');
showToast('Failed to boost TTL.', 'error');
showToast('Error boosting TTL.', 'error');
```

- [ ] **Step 3: Verify build**

```bash
npm run build:client 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 4: Commit**

```bash
git add client/src/components/Artifacts.tsx
git commit -m "ui: replace vitality badge with TTL display, BOOST TTL label"
```

---

### Task 4: UploadModal.tsx — FLARE toggle + visibility labels

**Files:**
- Modify: `client/src/components/UploadModal.tsx`

- [ ] **Step 1: Update FLARE toggle**

Find (~line 227):
```tsx
<input
  type="checkbox"
  id="burn-check"
  checked={isBurnOnRead}
  onChange={e => setIsBurnOnRead(e.target.checked)}
/>
<label htmlFor="burn-check" style={{ fontSize: '0.9rem', cursor: 'pointer', color: isBurnOnRead ? 'var(--accent-alert)' : 'inherit' }}>
  🔥 Burn on Read — self-destructs after first view
</label>
```

Replace with:
```tsx
<input
  type="checkbox"
  id="burn-check"
  checked={isBurnOnRead}
  onChange={e => setIsBurnOnRead(e.target.checked)}
/>
<label htmlFor="burn-check" style={{ fontSize: '0.9rem', cursor: 'pointer', color: isBurnOnRead ? 'var(--accent-alert)' : 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
  <IconFlame size={ICON_SIZES.md} />
  FLARE — <span style={{ fontWeight: 'normal', opacity: 0.8 }}>self-destructs after one view</span>
</label>
```

Add `IconFlame` to the import from `@tabler/icons-react` at the top of the file.

- [ ] **Step 2: Update visibility select labels**

Find (~line 196):
```tsx
<option value="public">Public (Drift)</option>
<option value="sym">Sym Only</option>
<option value="me">3rd Space (Me Only)</option>
```

Replace with:
```tsx
<option value="public">PUBLIC · DRIFT</option>
<option value="sym">SYM</option>
<option value="me">3SPACE</option>
```

- [ ] **Step 3: Verify build**

```bash
npm run build:client 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 4: Commit**

```bash
git add client/src/components/UploadModal.tsx
git commit -m "ui: FLARE toggle replaces Burn on Read, updated visibility labels"
```

---

### Task 5: Communique.tsx + AssociationWeb.tsx — drop acronym labels

**Files:**
- Modify: `client/src/components/Communique.tsx`
- Modify: `client/src/components/AssociationWeb.tsx`

- [ ] **Step 1: Update Communique.tsx profile header**

Find (~line 342):
```tsx
<div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7 }}>RCC — Cache Communique</div>
```

Replace with:
```tsx
<div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7 }}>COMMUNIQUE</div>
```

- [ ] **Step 2: Update AssociationWeb.tsx RELMAP label**

Find (~line 541):
```tsx
{/* RRC Label */}
<div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 'var(--z-overlay)', pointerEvents: 'none' }}>
  <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', opacity: 0.8, letterSpacing: '0.1em' }}>RRC</h2>
  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', opacity: 0.6 }}>Relational Construct</div>
</div>
```

Replace with:
```tsx
{/* RELMAP Label */}
<div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 'var(--z-overlay)', pointerEvents: 'none' }}>
  <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', opacity: 0.8, letterSpacing: '0.1em' }}>RELMAP</h2>
</div>
```

- [ ] **Step 3: Update AssociationWeb.tsx node group label**

Find (~line 142):
```tsx
node.group === 'asym' ? 'A-Sym' :
```

Replace with:
```tsx
node.group === 'asym' ? 'A-SYM' :
```

- [ ] **Step 4: Verify build**

```bash
npm run build:client 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Communique.tsx client/src/components/AssociationWeb.tsx
git commit -m "ui: COMMUNIQUE and RELMAP replace RCC/RRC acronym labels"
```

---

### Task 6: Inbox.tsx — SYMTXT + A-SYM labels

**Files:**
- Modify: `client/src/components/Inbox.tsx`

- [ ] **Step 1: Update message placeholder**

Find (~line 532):
```tsx
placeholder="Whisper..."
```
Replace with:
```tsx
placeholder="Send a SYMTXT..."
```

- [ ] **Step 2: Update A-Sym Signal label**

Find (~line 458):
```tsx
{isReq && <div style={{ fontSize: '0.7rem', color: 'var(--accent-alert)' }}>A-Sym Signal</div>}
```
Replace with:
```tsx
{isReq && <div style={{ fontSize: '0.7rem', color: 'var(--accent-alert)' }}>A-SYM</div>}
```

- [ ] **Step 3: Update sym_request notification copy**

Find (~line 294):
```tsx
case 'sym_request': return <>{actorLink} requests a signal connection.{n.payload?.file_id && <span style={{ marginLeft: '6px', fontSize: '0.8em', color: 'var(--accent-sym)', opacity: 0.8 }}>📎 artifact attached</span>}</>;
case 'sym_accepted': return <>Connection established with {actorLink}.</>;
```
Replace with:
```tsx
case 'sym_request': return <>{actorLink} wants to go SYM with you.{n.payload?.file_id && <span style={{ marginLeft: '6px', fontSize: '0.8em', color: 'var(--accent-sym)', opacity: 0.8 }}>📎 file attached</span>}</>;
case 'sym_accepted': return <>SYM connection established with {actorLink}.</>;
```

- [ ] **Step 4: Verify build**

```bash
npm run build:client 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Inbox.tsx
git commit -m "ui: SYMTXT placeholder, A-SYM label, updated notification copy"
```

---

### Task 7: LandingPage.tsx + About.tsx + FAQ.tsx — philosophy + terminology

**Files:**
- Modify: `client/src/components/LandingPage.tsx`
- Modify: `client/src/components/About.tsx`
- Modify: `client/src/components/FAQ.tsx`

- [ ] **Step 1: Update LandingPage feature cards**

Find the three feature card blocks (~line 52–66) and replace with:

```tsx
<div className="feature-card">
  <IconRadar2 size={ICON_SIZES['2xl']} color="var(--accent-sym)" />
  <h3>DRIFT</h3>
  <p>Tune your radar to detect signals from the void. Discover files and users floating in the digital ether.</p>
</div>
<div className="feature-card">
  <IconActivity size={ICON_SIZES['2xl']} color="var(--accent-alert)" />
  <h3>TTL</h3>
  <p>Files expire by default. Boost a file's TTL to keep it alive, or let it fade. The community decides what's worth preserving.</p>
</div>
<div className="feature-card">
  <IconCirclesRelation size={ICON_SIZES['2xl']} color="var(--accent-me)" />
  <h3>SYM · A-SYM · 3SPACE</h3>
  <p>Three ways to connect: openly with SYM, observationally with A-SYM, or invisibly with 3SPACE.</p>
</div>
```

- [ ] **Step 2: Update About.tsx philosophy paragraph**

Find (~line 32):
```tsx
In an era of permanent digital footprints and invasive algorithms, Rel F offers a space for <strong>ephemeral interaction</strong>. By enforcing data expiration and prioritizing consensual relationships — <strong>Sym</strong> (mutual) and <strong>A-Sym</strong> (one-way) — we return agency to the individual.
```

Replace with:
```tsx
Three ways to connect: openly with <strong>SYM</strong>, observationally with <strong>A-SYM</strong>, or invisibly with <strong>3SPACE</strong>. Three ways to share: publicly into the <strong>DRIFT</strong>, with your network, or only with yourself. Files expire by default. Nothing is permanent unless the community makes it so.
```

Find (~line 44):
```tsx
Privacy-first architecture with end-to-end encryption for Sym whispers.
```
Replace with:
```tsx
Privacy-first architecture with end-to-end encryption for SYMTXT messages.
```

- [ ] **Step 3: Update FAQ.tsx terminology**

Find and replace the following strings in `FAQ.tsx`:
- `"Artifact Decay"` → `"File TTL"`
- `"Files expire in 168 hours. Refresh them to reset the clock or boost them for vitality."` → `"Files expire in 168 hours (TTL: 168). Refresh to reset the clock or boost to extend it."`
- `"Attention provides life. High-vitality signals are archived permanently."` → `"Files with high community engagement are voted into the permanent ARCHIVE."`
- `"Sym & A-Sym"` → `"SYM, A-SYM & 3SPACE"`
- `"Sym connections are mutual and explicit — both parties agree. A-Sym connections are one-way observations. The Drift surfaces random strangers with no connection required."` → `"SYM connections are mutual and public. A-SYM connections are one-way observations. 3SPACE connections are mutual but invisible — ghost connections for maximum privacy. DRIFT surfaces random strangers with no connection required."`

- [ ] **Step 4: Verify build**

```bash
npm run build:client 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 5: Commit**

```bash
git add client/src/components/LandingPage.tsx client/src/components/About.tsx client/src/components/FAQ.tsx
git commit -m "ui: apply canonical terminology and philosophy statement to landing, about, FAQ"
```

---

### Task 8: App.tsx + remaining scattered strings

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/DriftHistory.tsx` (if contains old terms)
- Modify: `client/src/components/NetworkList.tsx` (if contains old terms)

- [ ] **Step 1: Update App.tsx Whisper toast**

Find (~line 195):
```tsx
showToast(`New Whisper from ${msg.sender_name || `user ${msg.sender_id}`}`, 'info');
```
Replace with:
```tsx
showToast(`New SYMTXT from ${msg.sender_name || `user ${msg.sender_id}`}`, 'info');
```

- [ ] **Step 2: Grep for any remaining old terms**

```bash
grep -rn "Artifact\|artifact\|[Vv]itality\|[Ww]hisper\|[Bb]urn.on.[Rr]ead\|RCC\|RRC\|RPC\|A-Sym\|A-sym\b" client/src/components/ --include="*.tsx" | grep -v "//\|aria-label.*Already\|className\|burn_on_read\|is_boosted"
```

Fix any remaining instances using the register rules from `docs/terminology.md`.

- [ ] **Step 3: Verify build**

```bash
npm run build:client 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 4: Deploy Phase 2**

```bash
npm run deploy 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add -p
git commit -m "ui: complete terminology sweep — FILES, TTL, SYMTXT, FLARE, RELMAP, COMMUNIQUE"
```

---

## Phase 3 — 3SPACE Connection Type

> New feature. Backend first, then frontend. Each task builds on the previous.

### Task 9: DB migration — add 3SPACE relationship types

**Files:**
- Create: `migrations/0029_3space_connections.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration 0029: Add 3SPACE connection type to relationships

-- SQLite requires table recreation to modify CHECK constraints
ALTER TABLE relationships RENAME TO relationships_old;

CREATE TABLE relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_user_id INTEGER NOT NULL,
  target_user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN (
    'asym_follow',
    'sym_request',
    'sym_accepted',
    '3space_request',
    '3space_accepted'
  )),
  status TEXT NOT NULL DEFAULT 'accepted' CHECK(status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_user_id, target_user_id)
);

INSERT INTO relationships
  SELECT id, source_user_id, target_user_id, type, status, created_at, updated_at
  FROM relationships_old;

DROP TABLE relationships_old;

CREATE INDEX IF NOT EXISTS idx_relationships_source_target_type
  ON relationships(source_user_id, target_user_id, type);
CREATE INDEX IF NOT EXISTS idx_relationships_target_source_type
  ON relationships(target_user_id, source_user_id, type);

-- Notifications need a new type for 3SPACE requests
-- (notifications table type column is TEXT with no CHECK constraint — no migration needed)
```

- [ ] **Step 2: Apply migration locally**

```bash
npx wrangler d1 migrations apply relf-db --local 2>&1 | tail -5
```
Expected: `✅ Applied 1 migrations`

- [ ] **Step 3: Commit**

```bash
git add migrations/0029_3space_connections.sql
git commit -m "db: add 3space_request and 3space_accepted relationship types"
```

---

### Task 10: Backend — 3SPACE relationship API endpoints

**Files:**
- Modify: `src/routes/social.ts`

- [ ] **Step 1: Add 3SPACE request endpoint**

After the `decline-sym-request` route (~line 65), add:

```typescript
// Send a 3SPACE connection request
social.post('/relationships/3space', async (c) => {
  const source_user_id = c.get('user_id');
  const { target_user_id } = await c.req.json();
  if (source_user_id === target_user_id) return c.json({ error: 'Cannot 3SPACE yourself' }, 400);

  const existing = await c.env.DB.prepare(
    `SELECT id, type FROM relationships
     WHERE source_user_id = ? AND target_user_id = ?`
  ).bind(source_user_id, target_user_id).first() as any;

  if (existing?.type === '3space_request') return c.json({ error: 'Already pending' }, 409);
  if (existing?.type === '3space_accepted') return c.json({ error: 'Already in 3SPACE' }, 409);

  await c.env.DB.prepare(
    `INSERT INTO relationships (source_user_id, target_user_id, type, status)
     VALUES (?, ?, '3space_request', 'pending')
     ON CONFLICT(source_user_id, target_user_id)
     DO UPDATE SET type = '3space_request', status = 'pending'`
  ).bind(source_user_id, target_user_id).run();

  await createNotification(c.env, c.env.DB, target_user_id, '3space_request', source_user_id, {});
  return c.json({ ok: true });
});

// Accept a 3SPACE request
social.post('/relationships/3space/accept', async (c) => {
  const target_user_id = c.get('user_id'); // the recipient accepts
  const { source_user_id } = await c.req.json();

  const request = await c.env.DB.prepare(
    `SELECT id FROM relationships
     WHERE source_user_id = ? AND target_user_id = ? AND type = '3space_request' AND status = 'pending'`
  ).bind(source_user_id, target_user_id).first() as any;

  if (!request) return c.json({ error: 'No pending 3SPACE request found' }, 404);

  const [userA, userB] = [Math.min(source_user_id, target_user_id), Math.max(source_user_id, target_user_id)];

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE relationships SET type = '3space_accepted', status = 'accepted' WHERE id = ?`
    ).bind(request.id),
    c.env.DB.prepare(
      `INSERT INTO relationships (source_user_id, target_user_id, type, status)
       VALUES (?, ?, '3space_accepted', 'accepted')
       ON CONFLICT(source_user_id, target_user_id)
       DO UPDATE SET type = '3space_accepted', status = 'accepted'`
    ).bind(target_user_id, source_user_id),
  ]);

  await createNotification(c.env, c.env.DB, source_user_id, '3space_accepted', target_user_id, {});
  return c.json({ ok: true });
});

// Decline a 3SPACE request
social.post('/relationships/3space/decline', async (c) => {
  const target_user_id = c.get('user_id');
  const { source_user_id } = await c.req.json();

  await c.env.DB.prepare(
    `UPDATE relationships SET status = 'rejected'
     WHERE source_user_id = ? AND target_user_id = ? AND type = '3space_request' AND status = 'pending'`
  ).bind(source_user_id, target_user_id).run();

  return c.json({ ok: true });
});

// Remove a 3SPACE connection
social.delete('/relationships/3space/:target_id', async (c) => {
  const source_user_id = c.get('user_id');
  const target_id = parseInt(c.req.param('target_id'));

  await c.env.DB.batch([
    c.env.DB.prepare(
      `DELETE FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type IN ('3space_request', '3space_accepted')`
    ).bind(source_user_id, target_id),
    c.env.DB.prepare(
      `DELETE FROM relationships WHERE source_user_id = ? AND target_user_id = ? AND type IN ('3space_request', '3space_accepted')`
    ).bind(target_id, source_user_id),
  ]);

  return c.json({ ok: true });
});
```

- [ ] **Step 2: Add 3SPACE status to connections endpoint**

Find the existing `/connections` route (~line 88) which returns `{ following, mutual }`. Add a `3space` field to the response:

```typescript
const threespace = await c.env.DB.prepare(
  `SELECT
     CASE WHEN source_user_id = ? THEN target_user_id ELSE source_user_id END as user_id,
     u.username, u.avatar_url
   FROM relationships r
   JOIN users u ON u.id = CASE WHEN r.source_user_id = ? THEN r.target_user_id ELSE r.source_user_id END
   WHERE (r.source_user_id = ? OR r.target_user_id = ?)
     AND r.type = '3space_accepted'`
).bind(user_id, user_id, user_id, user_id).all();

// Add to the return object:
return c.json({
  following: following.results.map(toPublicUrl),
  mutual: mutual.results.map(toPublicUrl),
  threespace: threespace.results.map(toPublicUrl),  // add this line
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build:client 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 4: Commit**

```bash
git add src/routes/social.ts
git commit -m "feat: 3SPACE connection API endpoints (request, accept, decline, remove)"
```

---

### Task 11: Backend — gate SYMTXT on SYM or 3SPACE connection

**Files:**
- Modify: `src/routes/messages.ts`

- [ ] **Step 1: Add relationship check to message send**

In `messages.post('/')` (~line 60), after parsing the body and before inserting, add a connection check:

```typescript
// Verify sender has SYM or 3SPACE connection with receiver (or is sending a request message)
const connection = await c.env.DB.prepare(
  `SELECT type FROM relationships
   WHERE ((source_user_id = ? AND target_user_id = ?) OR (source_user_id = ? AND target_user_id = ?))
     AND type IN ('sym_accepted', '3space_accepted')
   LIMIT 1`
).bind(sender_id, receiver_id, receiver_id, sender_id).first() as any;

// Allow first-contact messages (is_request flag) but gate ongoing messages
if (!connection && !is_request) {
  return c.json({ error: 'No SYM or 3SPACE connection' }, 403);
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build:client 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 3: Commit**

```bash
git add src/routes/messages.ts
git commit -m "feat: gate SYMTXT on SYM or 3SPACE connection"
```

---

### Task 12: Frontend — 3SPACE notifications in Inbox

**Files:**
- Modify: `client/src/components/Inbox.tsx`

- [ ] **Step 1: Add 3SPACE to notification type union**

Find (~line 18):
```typescript
type: 'sym_request' | 'sym_accepted' | 'file_shared' | 'system_alert';
```
Replace with:
```typescript
type: 'sym_request' | 'sym_accepted' | 'file_shared' | 'system_alert' | '3space_request' | '3space_accepted';
```

- [ ] **Step 2: Add 3SPACE notification icons**

Find (~line 267):
```tsx
case 'sym_request': return <IconPlugConnected size={18} color="var(--accent-sym)" />;
case 'sym_accepted': return <IconCheck size={18} color="var(--accent-sym)" />;
```
Add after:
```tsx
case '3space_request': return <IconEyeOff size={18} color="var(--accent-3space, #8b5cf6)" />;
case '3space_accepted': return <IconLock size={18} color="var(--accent-3space, #8b5cf6)" />;
```

Add `IconEyeOff` and `IconLock` to the `@tabler/icons-react` import.

- [ ] **Step 3: Add 3SPACE notification copy**

Find (~line 294):
```tsx
case 'sym_request': return ...
case 'sym_accepted': return ...
```
Add after:
```tsx
case '3space_request': return <>{actorLink} wants to open a 3SPACE connection with you.</>;
case '3space_accepted': return <>3SPACE connection established with {actorLink}.</>;
```

- [ ] **Step 4: Add 3SPACE accept/decline handlers**

Find the accept/decline button block (~line 328):
```tsx
if (n.type === 'sym_request') handleAction(n, 'accept');
...
if (n.type === 'sym_request') handleAction(n, 'decline');
```

Update to also handle 3SPACE:
```tsx
if (n.type === 'sym_request' || n.type === '3space_request') handleAction(n, 'accept');
...
if (n.type === 'sym_request' || n.type === '3space_request') handleAction(n, 'decline');
```

- [ ] **Step 5: Wire accept/decline to 3SPACE API endpoints**

Find the `handleAction` function (~line 230). After the `sym_request` accept/decline block, add:

```typescript
if (action === 'accept' && n.type === '3space_request') {
  await fetch('/api/relationships/3space/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_user_id: n.actor_id }),
  });
}
if (action === 'decline' && n.type === '3space_request') {
  await fetch('/api/relationships/3space/decline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_user_id: n.actor_id }),
  });
}
```

- [ ] **Step 6: Verify build**

```bash
npm run build:client 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 7: Commit**

```bash
git add client/src/components/Inbox.tsx
git commit -m "feat: 3SPACE request/accept/decline notifications in Inbox"
```

---

### Task 13: Frontend — 3SPACE request from SYMTXT thread

**Files:**
- Modify: `client/src/components/Inbox.tsx`

- [ ] **Step 1: Track 3SPACE connection status per conversation**

In the conversation list fetch (~line 87), the `feedType` already distinguishes `'whisper'` vs `'request'`. Add a `'3space'` type by checking the connections data. At the top of the Inbox component, fetch connections:

```typescript
const [connections, setConnections] = useState<{ mutual: any[]; threespace: any[] }>({ mutual: [], threespace: [] });

useEffect(() => {
  fetch('/api/connections')
    .then(r => r.json())
    .then(d => setConnections({ mutual: d.mutual || [], threespace: d.threespace || [] }));
}, []);
```

Then when computing `feedType`:
```typescript
const threespaceIds = new Set(connections.threespace.map((c: any) => c.user_id));
const mutualIds = new Set(connections.mutual.map((c: any) => c.user_id));

feedType: threespaceIds.has(c.partner_id) ? '3space' :
          mutualIds.has(c.partner_id) ? 'whisper' : 'request',
```

- [ ] **Step 2: Add "Propose 3SPACE" button in conversation view**

In the conversation header area (where the partner username is displayed), add:

```tsx
{feedType === 'whisper' && !threespaceIds.has(partnerId) && (
  <button
    onClick={async () => {
      await fetch('/api/relationships/3space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: partnerId }),
      });
      showToast('3SPACE request sent.', 'success');
    }}
    title="Propose a private 3SPACE connection"
    style={{
      fontSize: '0.7rem',
      padding: '4px 8px',
      background: 'transparent',
      border: '1px solid var(--accent-3space, #8b5cf6)',
      color: 'var(--accent-3space, #8b5cf6)',
      borderRadius: '4px',
      cursor: 'pointer',
    }}
  >
    + 3SPACE
  </button>
)}
{feedType === '3space' && (
  <span style={{ fontSize: '0.7rem', color: 'var(--accent-3space, #8b5cf6)', opacity: 0.8 }}>3SPACE</span>
)}
```

- [ ] **Step 3: Add --accent-3space CSS variable**

In `client/src/styles/design-tokens.css`, add to both theme blocks:
```css
--accent-3space: #8b5cf6; /* Purple — distinct from SYM green and A-SYM grey */
```

- [ ] **Step 4: Verify build**

```bash
npm run build:client 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Inbox.tsx client/src/styles/design-tokens.css
git commit -m "feat: 3SPACE connection proposal from SYMTXT thread, accent colour"
```

---

### Task 14: Deploy Phase 3 + apply remote migration

- [ ] **Step 1: Apply migration to production**

```bash
npx wrangler d1 migrations apply relf-db --remote 2>&1 | tail -5
```
Expected: `✅ Applied 1 migrations`

- [ ] **Step 2: Deploy**

```bash
npm run deploy 2>&1 | tail -5
```
Expected: `Deployed r3l triggers`

- [ ] **Step 3: Smoke test in production**
  - Open a SYMTXT conversation with a SYM connection
  - Verify "+ 3SPACE" button appears
  - Click it — verify toast "3SPACE request sent."
  - Log in as recipient — verify 3SPACE request appears in Inbox
  - Accept — verify "3SPACE connection established" notification fires
  - Verify the conversation now shows "3SPACE" label instead of the button
  - Verify the RELMAP shows no new link between the two users

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Canonical glossary at `docs/terminology.md` | Task 1 |
| Register rules (uppercase labels / lowercase prose) | Tasks 1, 2 |
| Update CLAUDE.md, README, DESIGN_SYSTEM.md, SECURITY.md | Task 2 |
| FILES replaces Artifacts | Tasks 3, 7, 8 |
| TTL badge replaces vitality number | Task 3 |
| BOOST TTL replaces Boost Signal | Task 3 |
| FLARE replaces Burn on Read | Task 4 |
| Visibility labels PUBLIC·DRIFT / SYM / 3SPACE | Task 4 |
| COMMUNIQUE replaces RCC — Cache Communique | Task 5 |
| RELMAP replaces RRC — Relational Construct | Task 5 |
| A-SYM (uppercase) throughout | Tasks 5, 6 |
| SYMTXT replaces Whispers | Tasks 6, 8 |
| Philosophy statement on landing, about, FAQ | Task 7 |
| 3SPACE FAQ entry including ghost connections | Task 7 |
| DB migration for 3space_request / 3space_accepted | Task 9 |
| 3SPACE API: request, accept, decline, remove | Task 10 |
| Connections endpoint returns threespace list | Task 10 |
| RELMAP excludes 3SPACE connections | Task 10 (mutual_connections not touched) |
| COMMUNIQUE connection count excludes 3SPACE | Task 10 (mutual_connections not touched) |
| SYMTXT gated on SYM or 3SPACE | Task 11 |
| Inbox: 3SPACE notification type, icons, copy | Task 12 |
| Inbox: accept/decline 3SPACE requests | Task 12 |
| 3SPACE proposal from SYMTXT thread | Task 13 |
| --accent-3space colour token | Task 13 |
| 3SPACE conversation label in SYMTXT inbox | Task 13 |
