# Rel F – Relational Ephemeral Filenet

## Overview
Rel F is a **decentralized, ephemeral, Cloudflare-native social file-sharing platform** that prioritizes **user control, organic discovery, and community-driven archiving**. It is **non-corporate, minimalist, and free of algorithmic engagement farming**, focusing instead on **peer-to-peer interaction, temporary content, and personal archives**.

## Core Concepts
- **Relational** – Users are connected **visually in an association web** but only through **explicit, mutually agreed relationships**.
- **Ephemeral** – Content **expires unless archived**, ensuring that data **remains fresh and relevant** rather than accumulating indefinitely.
- **Filenet** – A **social file-sharing system** where **documents, audio, video, and creative works** are the foundation of interaction.

## Features
### 🗃 Personal Archive ("Drawer") & Communique
- Each user has a **"drawer"** (profile) with a **customizable communique**—a **themeable, linkable window into their stored content**.
- Content **expires after one week** unless **archived or designated as community content**.
- **Unconfigured drawers** only show an **anonymous avatar & display name** and **cannot join the association web**.

### 📂 File & Archive System
- Users can **upload and share** any file format (zines, code, music, books, documents).
- **Expiration System:**  
  - **Week active → Marked for deletion → Auto-deleted (unless archived)**.
  - Non-archived content is **appended to the last communique before deletion**.
- **Community Archiving:** Content **exceeding reaction/share thresholds** can be **flagged by the user for permanent community storage**.

### 🔗 Association Web (D3.js Visualization)
- **Automatically generated** from **public contact lists**.
- **Branching structure shows degrees of connection** (stronger links for frequent interactions).
- **Clicking a node opens the user’s profile**.
- **Low-visibility users appear muted and have no clear associations**.

### 📢 Posting & Engagement
- **Markdown/WYSIWYG editor** for long-form posts, thoughts, and creative work.
- **Threaded comments** (minimal, non-disruptive).
- **Bookmarking** for content discovery (public count only, no user tracking).
- **Voting/Reactions** only count toward **community archiving eligibility**.

### 👥 Contacts & Social Features
- **Contacts are private or public:**  
  - **Public contacts appear in the association web**.  
  - **Private contacts remain hidden**.
- **Collaborative Workspaces** (agreed upon between users, likely tied to DMs).
- **“Lurker in the Mist” mode** (low-visibility status for users who prefer minimal presence).

### ✉️ Inbox & Notifications
- **All notifications sent via inbox (no pop-ups)**.
- **Mutual connection prompts** are triggered by:  
  - **Frequent viewing of the same user’s content**.
  - **Repeated engagement with the same group or files**.
  - **Co-archiving 5 or 10 shared files**.
- **Undo Window for History Wipes:**  
  - **24-hour recovery before deletion is final**.
  - **Final notification sent in the last hour**.

### 🔍 Search & Discovery
- **Global Community Archive** for browsing **community-archived content**.
- **Filtering by**:
  - **File type (MIME/extension)**
  - **User-defined tags/categories**
  - **Match “all” or “any” criteria**
- **No Algorithmic Feed:** Everything is **searchable but not ranked**.

### 🛑 Privacy & Moderation
- **Mutual Contributor Opt-Out:** Users can **hide their name from shared files**.
- **No Unwanted Labels:** All mutual relationships must be **explicitly agreed upon**.
- **Permanent Hide List for the Association Web:** Users can **ignore specific connections indefinitely** unless manually revisited.
- **Manual Clearing of History:**  
  - **Multi-step confirmation required** (including text input like “Type DELETE”).
- **Anonymous Profiles Are Not Supported:**  
  - **Pseudonymous users fully participate**.
  - **Unconfigured drawers remain limited (only a communique, no web presence)**.

## Technical Stack
This project is **built entirely on Cloudflare-native technologies**:
- **Cloudflare Pages** → Frontend hosting (HTML/CSS/JS)
- **Cloudflare Workers** → API logic & processing
- **Cloudflare KV** → Fast lookups (sessions, visibility settings)
- **Cloudflare R2** → File storage (archives, shared content)
- **Cloudflare D1** → SQL database (profiles, posts, associations)
- **Cloudflare Durable Objects** → Real-time collaboration (DMs, shared edits)
- **D3.js** → **Association web visualization**
- **Inbox & Messaging System** → Built within Workers & Durable Objects

## Development Roadmap
### 🔹 Backend (Cloudflare Workers + D1/KV/R2)
**1️⃣ User Profiles & Authentication**
   - Worker-based **JWT authentication**
   - D1 for **user profile storage**
   - KV for **sessions & quick lookups**

**2️⃣ File Storage & Archiving**
   - R2 for **user-uploaded content**
   - D1 for **post metadata, expiration tracking**
   - Workers handle **archival & community content designation**

**3️⃣ Inbox & Notifications**
   - D1 for **messages & system notifications**
   - KV for **fast access to pending notifications**
   - Workers to **expire ignored prompts automatically**

**4️⃣ Association Web & Mutual Connections**
   - D1 for **public contact lists**
   - Workers to **generate network graph data**
   - D3.js **frontend for interactive web visualization**

### 🔹 Frontend (Cloudflare Pages + HTML/CSS/JS)
**1️⃣ User “Drawer” UI**
   - Profiles as **modular, themeable containers**
   - Communique **embedded & linked**

**2️⃣ Association Web (D3.js)**
   - Interactive visualization of **connections & degrees of association**
   - **Faint links for ignored past connections**

**3️⃣ Inbox & Notifications**
   - UI for **DMs, mutual connection requests, expiring prompts**
   - **Manual triggers for reminders & notifications**

**4️⃣ File & Archive System**
   - UI for **uploads, archival selection, & expiration tracking**
   - **Bookmarking & filtering system**

## Contributing
This project is **heavily conceptual and focused on DIY ethos**. Contributions are welcome if they align with **the guiding principles**:
- **No engagement optimization**
- **No corporate/capitalist manipulation**
- **Minimalist, user-controlled interactions**
- **Privacy-first, ephemeral but intentional**  

---

Rel F **exists outside of traditional social media structures**. It is a **social file-sharing network**, not a **clout-driven platform**. Users **interact through shared content, association, and voluntary archival** rather than likes and followers.

🚀 **More coming soon. First, we code.**  
