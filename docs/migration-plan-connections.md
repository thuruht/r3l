# Connections Schema Migration Plan

Goal: Normalize the connections table to `user_id` and `connected_user_id` columns while preserving legacy ORCID-based data and ensuring the app remains functional during the transition.

## Current State
- Legacy connections may use `user_a_orcid` and `user_b_orcid` columns.
- Application code supports both normalized (`user_id`, `connected_user_id`) and legacy ORCID fallback during lookup and deletion.
- Migration 017 (`migrations/017_connections_table.sql`) creates `connections_normalized`, backfills from legacy `connections`, then promotes it to `connections`.

## Plan
1. Staging backup
   - Export D1 database or snapshot before migration.
2. Apply migration 017 on staging
   - Use `wrangler d1 execute` or the provided scripts to apply.
   - Verify new table structure and indexes exist.
3. Verification checklist
   - Create two test users A and B.
   - Create connection request A -> B (mutual); ensure status `pending`.
   - Accept request as B; ensure status `accepted` and presence in `/api/connections` for both users.
   - Verify `/api/connections/status/{userId}` returns `mutual` for both directions.
   - Verify `/api/feed` includes A/B items chronologically.
   - Verify deletion removes both directions.
4. Production rollout
   - Repeat backup and execution steps.
   - Tail logs for errors; if failures occur, rollback to snapshot.
5. Cleanup (post-stabilization)
   - Remove legacy ORCID fallbacks from code paths.
   - Drop legacy `user_a_orcid`/`user_b_orcid` columns in a later migration.

## Commands (reference)
These are illustrative; use your env values.

- Apply all migrations:
  - ./migrations/apply-migrations.sh
- Tail logs during verification:
  - wrangler tail

## Notes
- The router includes fallbacks to legacy schema to reduce risk during rollout.
- All new connections are written into normalized columns.
