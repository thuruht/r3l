# **R3L:F (Relational Relativity & Random Ephemerality File-net)**

**Master Project Document**  
Project Identity: Rel F (r3l.distorted.work)  
Codename: Mist Architecture  
Status: Phase 9 (Security & Collaboration)  
Technology: Cloudflare Workers, D1, R2, Durable Objects, KV, React (Vite)

## **I. Project Vision & Identity**

Rel F is a decentralized experiment in reclaiming the serendipity of the early web. It is a counter-concept to the "Permanent Web," built on the belief that social interaction should be serendipitous, consensual, and finite. We prioritize user agency and organic discovery over algorithmic manipulation.

### **Core Philosophy**

* **Digital Drift**: Inspired by Situationalist theory, "The Drift" allows users to wander through random public signals, breaking the echo chambers created by algorithmic recommendation engines.  
* **Ephemerality**: Data is transient. By default, content is designed to fade, encouraging current relevance over the accumulation of historical digital footprints.  
* **Consensual Discovery**: No feed. You find what you look for, or what happens to drift into your frequency.

## **II. Theoretical Underpinnings**

### **1\. Relational Sociology & Actor-Network Theory**

* **Agency & Explicit Choice**: Users determine who is part of their curated, high-trust network versus those they encounter through organic interactions.  
* **The Artifact as Participant**: In Rel F, the "Artifact" (file) is an active participant in the social web. Its "Vitality" (energy) determines its visibility and lifespan.

### **2\. Dual Modes of Connection**

* **Sym (Symmetric)**: Explicit, mutual relationships. These are "strong ties" where both parties consciously agree to a relationship. This mutuality builds a robust framework of trust.  
* **A-Sym (Asymmetric)**: Implicit, proximity-based associations. These are "weak ties" that provide bridging social capital—introducing users to new ideas and communities.  
* **Private Layer (\*3)**: Relationships that exist entirely outside the public graph, respecting absolute privacy and supporting confidential interactions.

## **III. Infrastructure & Technical Stack**

Built entirely on the **Cloudflare Developer Platform** for zero-latency edge execution.

* **Runtime**: Cloudflare Workers (Hono Framework).  
* **Database**: Cloudflare D1 (Relational SQL).  
* **Storage**: Cloudflare R2 (S3-compatible Object Storage).  
* **Real-time Layer**: Cloudflare Durable Objects (Stateful WebSockets).  
* **Caching/Rate-Limiting**: Cloudflare KV (Session management & strict windowed limits).  
* **Frontend**: React (Vite), D3.js (Graph Physics), GSAP (Motion Aesthetics), @tabler/icons-react.

## **IV. Comprehensive Data Schema (D1)**

### **1\. User Management (users)**

|  
| Column | Type | Description |  
| id | INTEGER | Primary Key |  
| username | TEXT | Unique Identifier |  
| password | TEXT | Hashed Password |  
| salt | TEXT | Cryptographic Salt |  
| email | TEXT | Unique, used for verification/recovery |  
| is\_verified | BOOLEAN | Verification status |  
| verification\_token | TEXT | UUID for email verification |  
| reset\_token | TEXT | Password reset identifier |  
| reset\_expires | DATETIME | Expiry for reset token |  
| avatar\_url | TEXT | R2 Key or external URL |  
| theme\_preferences | TEXT | JSON string (density, colors) |  
| public\_key | TEXT | RSA Public Key (SPKI) for E2EE |  
| node\_primary\_color | TEXT | Hex \#RRGGBBAA |  
| node\_secondary\_color | TEXT | Hex \#RRGGBBAA |

### **2\. Social Graph (relationships & mutual\_connections)**

* **relationships**: Tracks asym\_follow, sym\_request, and sym\_accepted statuses.  
* **mutual\_connections**: Optimized table for Sym-link lookups (user\_a\_id, user\_b\_id).

### **3\. Artifact Lifecycle (files)**

| Column | Type | Description |  
| id | INTEGER | Primary Key |  
| user\_id | INTEGER | Owner ID |  
| r2\_key | TEXT | Key in R2 bucket |  
| filename | TEXT | Original name |  
| size | INTEGER | File size in bytes |  
| mime\_type | TEXT | MIME type |  
| visibility | TEXT | private, sym, or public |  
| vitality | INTEGER | Signal strength (boosts) |  
| is\_archived | BOOLEAN | If true, ignore expiration |  
| is\_encrypted | BOOLEAN | Flag for E2EE content |  
| burn\_on\_read | BOOLEAN | Purge on first access |  
| expires\_at | DATETIME | Default: created\_at \+ 7 days |

## **V. Technical Audit & Security Report**

### **1\. Discovered Bugs & Fixed Vulnerabilities**

| Issue | Severity | Status | Resolution |  
| JWT Secret Fallback | Critical | FIXED | Removed hardcoded secret; system now fails-safe and throws 500 if environment variable is missing. |  
| R2 Key Exposure | High | FIXED | Replaced getR2PublicUrl with authenticated proxying via /api/files/:id/content to enforce visibility logic. |  
| WS Cleartext Leak | High | FIXED | WebSocket signals for whispers are now limited to metadata; content requires client-side E2EE decryption. |  
| Stray Syntax | Low | FIXED | Purged literal 1 from src/do.ts preventing successful builds. |  
| Messaging Purge | Medium | FIXED | Scheduled cron job updated to respect is\_archived status for messages and artifacts. |

### **2\. Zero-Knowledge E2EE Strategy**

The server never sees cleartext artifacts or private keys.

* **Generation**: Client generates an RSA-OAEP keypair (2048-bit) on registration/first login.  
* **Public Key**: Uploaded to the server (D1) to allow other users to encrypt symmetric keys for the user.  
* **Private Key**: Wrapped (encrypted) using AES-GCM with a key derived from the user's password via PBKDF2 (100,000 iterations). Stored only in localStorage.  
* **Backup/Recovery**: Users download a raw PKCS8 "Recovery Key" JSON file. If a user resets their password, they must re-import this file to unwrap their identity.

## **VI. Implementation Roadmap**

### **Phase 7: Deep Customization (Complete)**

* **Theme Engine**: "Mist" parameters (color shifts, fog density) adjustable via CustomizationSettings.tsx.  
* **Profile Aesthetics**: Custom hex codes (\#RRGGBBAA) for node colors and sizes.

### **Phase 8: Collections & Curated Chaos (Functional)**

* **Backend**: CRUD /api/collections and membership management.  
* **Frontend**: CollectionsManager.tsx UI for creating sets and adding artifacts.

### **Phase 9: Collaboration & Security (In Progress)**

* **Multiplayer Text Editing**: Integrating Yjs with a new DocumentRoom Durable Object.  
* **Account Recovery Flow**:  
  * forgot-password: Generates UUID token, sends link via Resend.  
  * reset-password: Validates token, updates hash/salt in D1.  
* **Burn-on-Read**: Server-side cleanup triggered via c.executionCtx.waitUntil immediately after serving the file stream.

### **Phase 10: Media & Discovery (Planned)**

* **Spatial Audio**: Attaching Web Audio PannerNode to audio artifacts in the D3 graph relative to the central "Me" node.  
* **Presence Markers**: Real-time "Ghost Rings" on nodes indicating current viewers.

## **VII. User Manual & Documentation**

### **1\. FAQ (Signal Calibration)**

* **What is "The Drift"?** Our discovery engine. It samples the network void for random public signals. No algorithms; just digital wandering.  
* **Vitality**: Data requires energy. Artifacts expire in 7 days (168h). Use **Refresh** to reset the clock, or gather **Boosts** from the community. At vitality 10, an item is permanently archived.  
* **Sym vs. Asym**: **Sym** connections are mutual and allow for encrypted whispers. **Asym** connections are one-way follows or incidental discoveries.

### **2\. Account & Identity**

* **Lost Password**: You can reset your password via email, but your **Recovery Key** is required to regain access to your previously encrypted artifacts.  
* **Verification**: You must verify your email address before your node can broadcast signals or upload artifacts.

## **VIII. Maintenance & Infrastructure**

* **Cron Job**: 0 \* \* \* \* (Hourly) handles expiration of unarchived artifacts, old notifications, and ephemeral signals.  
* **Styling Constraints**: All UI elements must use the \#RRGGBBAA hex-only format to maintain the "Mist" aesthetic.  
* **Build Configuration**: Production builds use npm run build (Vite) and npx wrangler deploy.

*“We are adrift in mist. The signal is what we make of it.”*