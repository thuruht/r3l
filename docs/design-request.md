# R3L:F — Design Request

**Project:** R3L:F (Rel F) — `r3l.distorted.work`  
**Request type:** Branding + Landing Page  
**Priority areas:** Logo, wordmark, landing page layout, visual identity coherence

---

## What it is

R3L:F is a social network built around ephemeral file sharing and serendipitous discovery. It is not a social media platform in the conventional sense — it is closer to a digital ecosystem where files expire, connections are intentional, and nothing is permanent unless the community decides it is.

**Core philosophy (use this verbatim or riff on it):**
> *Three ways to connect: openly with SYM, observationally with A-SYM, or invisibly with 3SPACE. Three ways to share: publicly into the DRIFT, with your network, or only with yourself. Files expire by default. Nothing is permanent unless the community makes it so.*

The tone is: experimental, intimate, slightly cryptic. It should feel like something you stumbled across, not something that was advertised to you.

---

## Current state

The app is functional and deployed. The existing visual language:

- **Background:** Near-black (`#0a0b10`) — a dark blue-black, not pure black
- **Primary accent:** Neon green `#26de81` — used for SYM connections, primary actions, hover states
- **Secondary accents:** Alert red `#ff4b4b`, purple `#8b5cf6` (3SPACE/private), cyan `#00d2ff` (online presence), yellow `#ffeb3b` (TTL/boost)
- **Heading font:** Rajdhani (geometric, condensed, all-caps)
- **Body font:** Inter
- **Themes:** "Mist" (default — dark blue-black) and "Verdant" (dark green-black)
- **Effects:** CSS glitch text on main title, glow effects on accents, subtle grid overlay on landing

The landing page currently has a glitch-text `h1` ("Rel F"), subtitle ("Relational Ephemeral Filenet"), three feature cards (DRIFT / TTL / SYM · A-SYM · 3SPACE), and a login/register form — all in one screen.

---

## What we need

### 1. Logo / Wordmark

We do not have a proper logo. What exists: the text "REL F" in Rajdhani, glitch-animated.

We need something that can work:
- As a favicon (32×32)
- In the app header (small, ~40px tall)
- In a landing page hero
- On a dark background

The name is **REL F** or **R3L:F** — the colon and numeral-3 are part of the brand but don't need to dominate. A wordmark is probably enough; an icon mark is a bonus.

Feel: technical but not corporate. Experimental. The green (`#26de81`) is the brand colour. It should feel hand-made in a precise way — not polished to death.

### 2. Landing page redesign

The current landing is functional but not compelling. It needs:

**Hero section**
- The name and tagline should land with presence
- The philosophy statement (above) is the tagline — use it or a shorter version of it
- Three concepts to communicate: ephemeral files, intentional connections, serendipitous discovery

**Feature section**
Three pillars to make legible:
- **DRIFT** — random discovery. Files and people float into view without algorithms.
- **TTL** — everything expires. Files countdown from 168 hours. Community boosts can extend them.
- **SYM · A-SYM · 3SPACE** — three connection modes: public-mutual, public-one-way, and completely invisible.

**Auth**
Login/register form. Currently inline on the landing. Decide: keep it there (minimal, single page) or move to a modal. Either works.

**Tone references (do not copy these, just vibe):**
- Are.na (deliberate, quiet interface)
- Scuttlebutt (community-first, counterculture)
- Urbit (alien but self-consistent visual language)

**What to avoid:** startup glow-up aesthetics, hero illustrations of happy people, gradients that look like every SaaS from 2022.

### 3. Visual identity checklist

The following should exist by the end:
- [ ] Logo / wordmark (SVG) at multiple sizes
- [ ] Favicon (ICO or PNG 32×32 and 192×192)
- [ ] Updated landing page (HTML/CSS or React component)
- [ ] Colour palette confirmation (or proposed changes) with hex values
- [ ] Type specimen — Rajdhani for headings, Inter for body, usage rules

---

## Technical constraints

- Built in React 18 + Vite. Landing page is `client/src/components/LandingPage.tsx`.
- CSS design tokens live in `client/src/styles/design-tokens.css` and `global.css`. All colour changes go through CSS variables — do not hardcode hex values in components.
- Icons use `@tabler/icons-react`. Avoid other icon libraries.
- App is served on Cloudflare Workers — no server-side rendering, just a static SPA.
- The main "graph" view uses D3.js — any visual language changes should feel compatible with an abstract node graph in the same colour palette.

---

## Deliverables

| Item | Format |
|---|---|
| Logo / wordmark | SVG (+ PNG fallbacks at 32, 192, 512px) |
| Landing page | React component (`.tsx`) or Figma handoff with exact specs |
| Design tokens update | Edits to `design-tokens.css` and `global.css` |
| Favicon | `favicon.ico` + `apple-touch-icon.png` (lives in `client/public/`) |
| Brief style guide | One-page PDF or Figma page — colours, type, logo usage |

---

## Contact / access

- Live app: `https://r3l.distorted.work`
- Repo: https://github.com/thuruht/r3l.git
- Design spec: `docs/superpowers/specs/2026-06-16-terminology-philosophy-design.md` pasting here: # R3L:F Terminology, Philosophy & 3SPACE Design

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
