# R3L:F Terminology, Philosophy & 3SPACE Design

**Date:** 2026-06-16
**Scope:** Unified vocabulary, philosophy clarity, UI translation, and 3SPACE connection type implementation.

---

## Problem Statement

R3L:F has accumulated inconsistent terminology across its UI, docs, and codebase. Users encounter "RCC — Cache Communique," "Artifacts," "Vitality," "Burn-on-Read," and "Whispers" without a coherent framework connecting them. The three-mode system (SYM / A-SYM / 3SPACE) — the philosophical spine of the platform — has never been fully implemented: 3SPACE exists only as a file visibility option, not as a connection type, despite being integral to the original philosophy.

---

## Canonical Vocabulary

Terms appear **uppercase** in UI labels, badges, and headings. They appear **lowercase in prose** (tooltips, empty states, descriptions). This register distinction lets the vocabulary feel distinctive without making explanatory text feel like jargon.

| Term | Definition | UI label form | Prose form | Replaces |
|---|---|---|---|---|
| **FILES** | Content shared on the platform | "Files", "Upload Files" | "your files", "this file" | Artifacts |
| **DRIFT** | Random discovery mode that surfaces public files and users | "DRIFT", "Start Drifting" | "drifting", "while drifting" | Drift (kept, formalised) |
| **RELMAP** | The D3 force graph showing your relational network | "RELMAP" | "the relmap", "your network" | RRC / Relational Construct |
| **COMMUNIQUE** | A user's public profile page | "COMMUNIQUE" | "their communique", "your communique" | RCC / Cache Communique |
| **3SPACE** | Private mode: file storage and connection type visible only to you and invited parties | "3SPACE" | "your 3space", "a 3space connection" | 3rd Space / Private Cache / RPC |
| **SYM** | Mutual, public connection — both parties acknowledge it, visible on RELMAP | "SYM" | "a sym connection", "your sym connections" | Sym |
| **A-SYM** | One-way, public connection — observation without mutual acknowledgement | "A-SYM" | "an a-sym follow", "following" | A-Sym |
| **TTL** | A file's remaining lifespan, decrements hourly | "TTL", "72h TTL" (badge) | "this file's lifespan", "expires in 72 hours" | Vitality |
| **SYMTXT** | End-to-end encrypted private messages between SYM or 3SPACE connections | "SYMTXT" | "send a symtxt", "your symtxts" | Whispers |
| **RESONANCE** | Organic connection suggestion triggered when two unconnected users engage with the same file independently | "RESONANCE" | "a resonance with @user", "resonance detected" | Resonance (kept, formalised) |
| **FLARE** | A file that self-destructs after one view by a non-owner | "FLARE", "Send as FLARE" | "a flare file", "self-destructs after one view" | Burn-on-Read |
| **ARCHIVE** | Permanent preservation of a file voted for by the community | "ARCHIVE", "Vote to ARCHIVE" | "archived files", "permanently preserved" | Community Archive |

---

## Philosophy Statement

Used verbatim on the landing page, About page, and onboarding empty state:

> *Three ways to connect: openly with SYM, observationally with A-SYM, or invisibly with 3SPACE. Three ways to share: publicly into the DRIFT, with your network, or only with yourself. Files expire by default. Nothing is permanent unless the community makes it so.*

This replaces scattered descriptions across the codebase that gesture at the philosophy without stating it clearly.

---

## The Three-Mode Framework

The core of the platform is a fully symmetric three-mode system. Each mode is a distinct privacy level for both connections and file sharing:

| Mode | Connection type | File visibility | RELMAP presence | Communication |
|---|---|---|---|---|
| **SYM** | Mutual, both parties public | Shared with sym connections | Visible — strong link | SYMTXT + public interaction |
| **A-SYM** | One-way, observer is public | Public (discoverable via DRIFT) | Visible — directional link | Public only |
| **3SPACE** | Mutual, completely private | Me-only (default) or shared with 3space partner | **Not visible** | SYMTXT only, E2EE |

3SPACE connections are ghost connections: both parties know, no one else does. No public acknowledgement, no RELMAP presence, no connection count. SYMTXT is the only channel.

---

## UI Application

### 1. Drop acronym labels
- "RCC — Cache Communique" → **COMMUNIQUE** (profile page header, no expansion)
- "RRC — Relational Construct" → **RELMAP** (graph label, small and subtle)

### 2. Three-mode visual consistency
SYM / A-SYM / 3SPACE must read as a unified set everywhere they appear: RELMAP legend, file visibility selector, profile connection counts, notifications. Each has a consistent colour:
- SYM → `--accent-sym` (neon green, existing)
- A-SYM → `--accent-asym` (muted, existing)
- 3SPACE → new third accent (to be decided in implementation — distinct from both)

### 3. TTL as a readable badge
- Current: bare number "72"
- New: **"72h TTL"** badge on each file
- Tooltip: *"this file's lifespan — boost to extend it"*
- Boost action button: **BOOST TTL**
- Owner reset action: **REFRESH** (resets to 7 days, distinct from community boost)

### 4. FLARE as a first-class upload mode
- Current: "Burn on Read" checkbox
- New: **FLARE** toggle with flare icon, description: *"self-destructs after one view"*
- Treated as a file mode on equal footing with visibility settings

### 5. Prose register discipline
Tooltips, empty states, and body copy always use lowercase prose forms. Uppercase labels appear only on badges, buttons, headings, and navigation. Never mix registers in the same sentence ("Your **FILES** are organised by TTL" is wrong; "Your files are organised by TTL" is right).

---

## Implementation Phases

### Phase 1 — Terminology & docs
*No code changes required.*

- Write `docs/terminology.md` (canonical glossary, full term register)
- Update `CLAUDE.md` — reference terminology doc, update stale usage
- Update `docs/README.md` — philosophy statement, updated terms
- Update `client/src/DESIGN_SYSTEM.md` — add register rules section
- Update `docs/SECURITY.md` — SYMTXT, FLARE
- Update `docs/UI_INTERACTION_MAP.md` — use new terms

### Phase 2 — UI copy sweep
*Frontend only. No schema or API changes.*

Files to update: `App.tsx`, `Artifacts.tsx`, `Communique.tsx`, `UploadModal.tsx`, `AssociationWeb.tsx`, `Sidebar.tsx`, `LandingPage.tsx`, `About.tsx`, `Inbox.tsx`, and any component containing user-facing strings with old terminology.

Changes:
- "Artifacts" → "Files" throughout
- "Vitality" number → "Xh TTL" badge
- "Boost Signal" → "BOOST TTL"
- "Burn on Read" → "FLARE"
- "Whisper..." → "Send a SYMTXT..."
- "Whispers" → "SYMTXT"
- "RCC — Cache Communique" → "COMMUNIQUE"
- "RRC" graph label → "RELMAP"
- "Community Archive" / "Archive Vote" → "ARCHIVE" / "VOTE TO ARCHIVE"
- Landing/About philosophy copy → canonical statement
- Upload modal visibility labels: "Public (Drift)" → "PUBLIC · DRIFT", "Sym Only" → "SYM", "3rd Space (Me Only)" → "3SPACE"

### Phase 3 — 3SPACE connection type
*New feature. Backend + frontend.*

**Backend:**
- Migration: add `3space` as valid type in `relationships` table (alongside `sym`, `asym_follow`)
- Ensure 3SPACE relationships are excluded from all public-facing relationship queries (RELMAP data, connection counts, profile stats)
- New API endpoints:
  - `POST /api/relationships/3space` — send a 3SPACE request
  - `PUT /api/relationships/3space/:id/accept` — accept
  - `DELETE /api/relationships/3space/:id` — remove
- 3SPACE request delivery: inbox notification only, no public signal
- SYMTXT (messages) must work for 3SPACE pairs, not just SYM pairs

**Frontend:**
- 3SPACE connection request UI: available from inbox or SYMTXT thread, not from public COMMUNIQUE page (keeping it invisible)
- Inbox: 3SPACE requests appear as a distinct notification type
- SYMTXT inbox: SYM and 3SPACE conversations are visually distinguished
- RELMAP: 3SPACE connections produce no node or link — confirmed absence
- COMMUNIQUE: connection counts exclude 3SPACE
- File sharing: 3SPACE visibility option allows sharing only with a specific 3SPACE partner (extension of current "me only" 3SPACE mode)

**Open questions for implementation:**
- Can you send a 3SPACE request to someone you're already SYM with? (Probably yes — different channel entirely)
- Does accepting a 3SPACE request require the same mutual flow as SYM, or is there a lighter acknowledgement?
- Should 3SPACE connections have their own section in the RELMAP toggle (show/hide) or be permanently invisible?

---

## Out of Scope

- DB field renames (`vitality`, `burn_on_read`, etc.) — internal names stay as-is
- API route renames — internal paths stay as-is
- RBAC / workgroups / moderation roles — separate future project
