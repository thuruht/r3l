# **R3L:F (Relational Relativity & Random Ephemerality File-net)**

**Rel F** is an experiment in serendipitous social networking. It fosters connections through guided randomness and ephemeral file sharing rather than algorithmic feed matching.

## **Overview**

Rel F is a decentralized, Cloudflare-native platform prioritizing user agency, organic discovery, and "digital drift." It stands as a counter-concept to permanent social media: data is temporary, connections are consensual, and the primary unit of interaction is the **file**.

## **Core Philosophies**

* **SYM vs. A-SYM vs. 3SPACE**:  
  * **SYM (Symmetric)**: Explicit, mutual relationships requiring consent, visible on the RELMAP.  
  * **A-SYM (Asymmetric)**: One-way follows or incidental proximity, visible on the RELMAP.  
  * **3SPACE**: Mutual but invisible ghost connections — no RELMAP presence, no connection count.
* **The Drift**: A discovery mode that samples the void for random public files and "ghost" nodes.  
* **TTL**: Files expire in 7 days unless Refreshed or Boosted (TTL extended) by the community.

## **Feature Set**

### **🛰 Discovery & The Drift**

* **Interactive Graph**: A D3-powered RELMAP visualizing your social reach.  
* **Ghost Pulsing**: Real-time signals broadcast when users update their COMMUNIQUE or share files.  
* **Radar Scanning**: Toggle "Drift Mode" to pull random public signals into your view.

### **🗃 Files**

* **Ephemeral Storage**: All files are temporary by default.  
* **Keep Alive**: Use the "REFRESH" button to reset the 7-day expiration timer.  
* **TTL Boosting**: "BOOST TTL" to extend a file's lifespan. At high community engagement, items are archived permanently.  
* **In-Place Editing**: Collaborative real-time editing for text and markdown files (Powered by Durable Objects).

### **✉️ SYMTXT & Signal**

* **Inbox**: Centralized hub for connection requests and shared files.  
* **SYMTXT**: End-to-end encrypted private messaging between SYM or 3SPACE connections.

## **Technical Stack**

* **Runtime**: Cloudflare Workers (Hono)  
* **Database**: Cloudflare D1 (Relational)  
* **Storage**: Cloudflare R2 (Object)  
* **Real-time**: Cloudflare Durable Objects (WebSockets)  
* **Frontend**: React + Vite + D3.js + GSAP

*"We are adrift in mist, looking for the glow."*
