# **Rel F: Project Audit & Tactical Roadmap**

This document compiles all findings from the current code audit and provides clear instructions for the implementation of roadmapped features.

## **1\. Bug Audit & Security Findings**

### **Critical Security**

* **JWT Secret Fallback:** src/index.ts currently uses a hardcoded string if the environment variable is missing.  
  * *Fix:* Remove the string fallback and throw a 500 error if c.env.JWT\_SECRET is undefined.  
* **Encrypted Message Leak:** The /api/messages endpoint broadcasts the cleartext content via WebSockets even if the encrypt flag is set for DB storage.  
  * *Fix:* Ensure the WebSocket payload is also encrypted using the recipient's public key (part of E2EE phase) or restricted to the active session's transport security.  
* **Unauthenticated R2 URLs:** getR2PublicUrl exposes r2.dev domains which could be enumerated.  
  * *Fix:* Remove public access to the bucket. Route all content through the /api/files/:id/content authenticated proxy.

### **Code & Logic Bugs**

* **Syntax Error:** src/do.ts has a stray 1 on line 3\.  
  * *Fix:* Delete the character.  
* **Typo:** src/index.ts contains wildcart instead of wildcard.  
  * *Fix:* Rename comments/variables for clarity.  
* **Missing Bindings:** DocumentRoom is defined but not bound in wrangler.jsonc.  
  * *Fix:* Add the class to durable\_objects.bindings.

## **2\. Roadmapped Feature Instructions**

### **Multiplayer Text Editing (Phase 9\)**

1. **DO Binding:** Add DOCUMENT\_ROOM to wrangler.jsonc.  
2. **Route:** Enable app.get('/api/collab/:fileId', ...) in src/index.ts.  
3. **Library:** Install yjs and y-websocket.  
4. **Integration:** In FilePreviewModal.tsx, if the file is text, initialize a Y.Doc and connect it to the WebSocket provider.

### **Burn-on-Read**

1. **Schema:** Create 0014\_add\_burn\_on\_read.sql adding burn\_on\_read INTEGER DEFAULT 0\.  
2. **Trigger:** In src/index.ts GET /api/files/:id/content, check the flag. If true, use c.executionCtx.waitUntil() to delete the R2 object and DB row after the stream starts.

### **Presence Markers**

1. **DO Update:** Extend RelfDO to store Map\<UserId, NodeId\>.  
2. **Hook:** Create usePresence in React to send periodic "heartbeats" via WS when viewing a specific communique or artifact.  
3. **D3 Visualization:** In AssociationWeb.tsx, render a pulsating ring around nodes present in the DO's location map.

## **3\. Advanced Security & Recovery**

### **Robust E2EE (Zero Knowledge)**

To maintain Zero-Knowledge integrity, the server must never see cleartext files or private keys.

1. **Schema Update:** Add public\_key column to users table.  
2. **Client-Side Cryptography:**  
   * **Generation:** On first login or via Settings, generate an RSA-OAEP keypair.  
   * **Storage:** Export Public Key (SPKI) to the server. Export Private Key (PKCS8) to localStorage (wrapped with a key derived from the user's password using PBKDF2).  
3. **Key Management UI:**  
   * **Backup:** Provide a "Download Recovery Key" button that exports the raw Private Key.  
   * **Regeneration:** Allow generating a new pair. *Warning:* Old files will become unreadable unless the user still has the old key.  
4. **Sharing Flow:** To share an encrypted file, fetch the recipient's Public Key, encrypt the file's AES key with it, and store this in a key\_shares table.

### **Verified Access & Account Recovery**

1. **Email Verification (Complete):**  
   * Ensure is\_verified is checked during login.  
   * Add resend-verification endpoint for users who missed the initial email.  
2. **Lost Password Flow:**  
   * **Request:** POST /api/forgot-password generates a reset\_token and reset\_expires.  
   * **Email:** Send a link to /reset-password?token=....  
   * **Reset:** POST /api/reset-password validates the token and updates the hashed password.  
   * **Security Note:** Changing the password makes localStorage keys unreadable (since they are wrapped by the old password). The UI must prompt the user to re-import their "Recovery Key" after a password reset.

## **4\. Maintenance Instructions**

* **Cron Jobs:** Ensure the 0 \* \* \* \* trigger in wrangler.jsonc remains active to purge expired artifacts.  
* **Migrations:** Always apply migrations to both local and remote environments using npx wrangler d1 migrations apply relf-db.