# Rel F: "Meat on Bones" Implementation Roadmap

This document outlines the path from the current "Bones" implementation (v0.x) to a fully realized "Meat" version (v1.0), prioritizing robust engineering, security, and deep collaboration.

## 1. Robust Code Collaboration (The "Meat")
**Goal:** Replace the naive "overwrite" text syncing with a conflict-free, syntax-aware coding environment.
- [ ] **Editor Core:** Replace `<textarea>` in `FilePreviewModal` with `CodeMirror 6` or `Monaco Editor`.
    -   Must support syntax highlighting for common languages (JS, TS, Python, CSS, HTML, Markdown).
    -   Must support dark mode theming to match "Mist" aesthetic.
- [ ] **CRDT Binding:** Replace manual `yText.insert` with `y-codemirror` (or `y-monaco`) binding.
    -   Ensures cursor preservation and concurrent editing support.
    -   Implement "Awareness" (showing other users' cursors/names).
- [ ] **Persistence:** Ensure `DocumentRoom` DO persists Yjs updates to storage (D1 or R2 snapshots) periodically, so history isn't lost when all users disconnect.

## 2. True End-to-End Encryption (E2EE)
**Goal:** Move from "Client-Side Encryption with Manual Keys" to "Zero-Knowledge Key Sharing".
- [ ] **Key Management:**
    -   Generate a master RSA keypair for each user on registration.
    -   Store the Public Key in D1 (`users.public_key`).
    -   Store the Private Key in D1, *wrapped* (encrypted) with the user's password (AES-GCM).
- [ ] **File Encryption:**
    -   Generate a random AES-256 key for each file upload.
    -   Encrypt file blob with this key.
- [ ] **Key Sharing:**
    -   Encrypt the *file key* with the *uploader's* Public Key (for self-access).
    -   When sharing with User B, fetch User B's Public Key and encrypt the *file key* for them.
    -   Store these "Key Shares" in a `file_keys` table.
- [ ] **Decryption flow:**
    -   Client fetches file metadata + their specific Key Share.
    -   Client unwraps their Private Key (using password).
    -   Client decrypts the Key Share to get the File Key.
    -   Client decrypts the File Blob.

## 3. Deep Drift & Discovery
**Goal:** Expand "Drift" from a random list to an immersive spatial experience.
- [ ] **Spatial Audio:**
    -   Map graph node positions (x,y) to Web Audio API PannerNodes.
    -   As user pans the graph, volume/pan of "Drift Audio" nodes changes relative to the center.
- [ ] **Drift Visualization:**
    -   Render Drift nodes as "Ghost" particles in the background of the main graph, reacting to physics but not linking until interacted with.

## 4. Admin & Safety
**Goal:** Tools for moderation in a decentralized-feeling network.
- [ ] **Graph Health:** Admin view showing islands of disconnected users or "supernodes".
- [ ] **Ban Enforcement:**
    -   "Hellban" logic: Banned users see the network, but nobody sees them or their signals.
    -   Content hashing to prevent re-upload of banned files.

## 5. Mobile & PWA Polish
**Goal:** Native-app feel.
- [ ] **Gestures:** Swipe-to-dismiss on modals.
- [ ] **Share Target API:** Allow sharing files *to* Rel F from other mobile apps.
- [ ] **Notifications:** Push API integration for offline notifications (Sym requests, Whispers).
