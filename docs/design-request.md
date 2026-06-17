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
- Repo: private (provide your GitHub handle for access)
- Design spec: `docs/superpowers/specs/2026-06-16-terminology-philosophy-design.md` — explains the full vocabulary and three-mode philosophy in depth
- Questions to: the repo owner
