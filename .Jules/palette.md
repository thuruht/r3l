# Palette's Journal

## 2025-02-18 - Modal Accessibility
**Learning:** Custom modals (like ConfirmModal) often lack standard accessibility features (role, focus management, keyboard support) which are critical for screen reader and keyboard users.
**Action:** Implemented WAI-ARIA pattern for modal dialogs (role="dialog", aria-modal, focus trap/management) in ConfirmModal as a reusable pattern.

## 2025-05-21 - Artifact List Accessibility & Data Constraints
**Learning:** Interactive lists using `div`s must handle keyboard events (Enter/Space) and focus (`tabIndex=0`, `role="button"`) manually. Additionally, frontend UI constants (like `private`) must align exactly with database constraints (e.g. `me`), otherwise operations fail silently or with generic errors, confusing users.
**Action:** Standardized list item accessibility in `Artifacts.tsx` and aligned visibility constants with DB schema.
