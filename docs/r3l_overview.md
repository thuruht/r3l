# **R3L:F (Relational Relativity & Random Ephemerality File-net)**

**Rel F** is an experiment in serendipitous social networking. It fosters connections through guided randomness and ephemeral artifact sharing rather than algorithmic feed matching.

## **Overview**

Rel F is a decentralized, Cloudflare-native platform prioritizing user agency, organic discovery, and "digital drift." It stands as a counter-concept to permanent social media: data is temporary, connections are consensual, and the primary unit of interaction is the **Artifact**.

## **Core Philosophies**

* **Sym vs. A-Sym**:  
  * **Sym (Symmetric)**: Explicit, mutual relationships requiring consent.  
  * **A-Sym (Asymmetric)**: One-way follows or incidental proximity.  
* **The Drift**: A discovery mode that samples the void for random public artifacts and "ghost" nodes.  
* **Vitality**: Data requires energy. Artifacts expire in 7 days unless "Refreshed" or "Boosted" (Vitality) by the community.

## **Feature Set**

### **🛰 Discovery & The Drift**

* **Interactive Graph**: A D3-powered association web visualizing your social reach.  
* **Ghost Pulsing**: Real-time signals broadcast when users update their Communique or share artifacts.  
* **Radar Scanning**: Toggle "Drift Mode" to pull random public signals into your view.

### **🗃 Artifacts & Files**

* **Ephemeral Storage**: All files are temporary by default.  
* **Keep Alive**: Use the "Refresh" button to reset the 7-day expiration timer.  
* **Vitality Voting**: "Boost" an artifact to increase its visibility and life span. At high vitality, items are archived permanently.  
* **In-Place Editing**: Collaborative real-time editing for text and markdown artifacts (Powered by Durable Objects).

### **✉️ Whispers & Signal**

* **Inbox**: Centralized hub for connection requests and shared artifacts.  
* **Whispers**: End-to-end encrypted private messaging between Sym connections.

## **Technical Stack**

* **Runtime**: Cloudflare Workers (Hono)  
* **Database**: Cloudflare D1 (Relational)  
* **Storage**: Cloudflare R2 (Object)  
* **Real-time**: Cloudflare Durable Objects (WebSockets)  
* **Frontend**: React \+ Vite \+ D3.js \+ GSAP

*“We are adrift in mist, looking for the glow.”*