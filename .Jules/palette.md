# Palette's Journal

## 2025-02-18 - Modal Accessibility
**Learning:** Custom modals (like ConfirmModal) often lack standard accessibility features (role, focus management, keyboard support) which are critical for screen reader and keyboard users.
**Action:** Implemented WAI-ARIA pattern for modal dialogs (role="dialog", aria-modal, focus trap/management) in ConfirmModal as a reusable pattern.
