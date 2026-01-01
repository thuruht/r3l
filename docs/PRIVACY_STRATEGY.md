# Privacy & Communication Strategy

Rel F is built on a philosophy of "digital impermanence" and "anti-surveillance". This document outlines how we communicate this to users and ensure our practices align with our promises.

## 1. Core Message: "Data Self-Destructs"

We do not just "protect" data; we actively destroy it. This is our strongest privacy feature.

*   ** tagline:** "The Void is a feature, not a bug."
*   **Visual Cue:** Expiration timers should be visible on all files.
*   **Terminology:** Use "Vitality" instead of "Engagement". Vitality keeps data alive; lack of it leads to the void.

## 2. Implementation Plan

### A. Strict Data Minimization (Technical)
*   **No Analytics:** We will NOT install Google Analytics, Facebook Pixels, or any client-side trackers. Rate limiting is handled via Cloudflare edge (IPs are transient).
*   **Database Pruning:** The `scheduled` cron job in `src/index.ts` is the heart of this policy. We must ensure it runs reliably.
    *   *Action:* Monitor cron execution logs.
*   **Encryption:** We have implemented server-side encryption for sensitive content.
    *   *Action:* Encourage users to use the "Encrypt" toggle for private artifacts.

### B. User Communication (UI/UX)
*   **Beta Badge:** Added to remind users that the system is experimental.
*   **Privacy Policy:** A dedicated, plain-language page (no legalese) explaining exactly what we store.
    *   *Location:* `/privacy` (Linked from About & Landing).
*   **Feedback Loop:** Direct line to the developer via `Resend` integration.
    *   *Action:* Respond to privacy concerns within 24 hours.

## 3. The "No Logs" Stance

We must be transparent about what "No Logs" means in a serverless context.
*   **Cloudflare:** We rely on Cloudflare Workers. While we don't application-log IPs to D1, Cloudflare maintains edge logs for security/DDoS protection. We should clarify this distinction in the full policy.

## 4. Future Enhancements
*   **E2EE:** Client-side encryption (Web Crypto API) is the ultimate goal. The server should eventually be blind to file contents.
*   **Burn-on-Read:** Implementing a "delete after viewing" mechanic for sensitive shared files.

---
*Drafted: 2025-12-20*
