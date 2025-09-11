// fix-orcid-cookies.js
// This script was a one-off helper for migrating cookie handling from legacy
// OAuth callback handlers. The underlying fixer and its helpers were removed
// because cookie handling is now implemented in `src/cookie-helper.ts` and
// handled by production auth handlers. Keep this file as a historical note.

// If you need to perform repository-wide automated edits, re-implement the
// fixer logic here or use a proper code-mod tool. Deleted the old fixer to
// avoid accidental invocation.
