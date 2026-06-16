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
