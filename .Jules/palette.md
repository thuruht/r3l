# Palette's Journal

## 2025-02-18 - Modal Accessibility
**Learning:** Custom modals (like ConfirmModal) often lack standard accessibility features (role, focus management, keyboard support) which are critical for screen reader and keyboard users.
**Action:** Implemented WAI-ARIA pattern for modal dialogs (role="dialog", aria-modal, focus trap/management) in ConfirmModal as a reusable pattern.

## 2025-05-21 - Artifact List Accessibility & Data Constraints
**Learning:** Interactive lists using `div`s must handle keyboard events (Enter/Space) and focus (`tabIndex=0`, `role="button"`) manually. Additionally, frontend UI constants (like `private`) must align exactly with database constraints (e.g. `me`), otherwise operations fail silently or with generic errors, confusing users.
**Action:** Standardized list item accessibility in `Artifacts.tsx` and aligned visibility constants with DB schema.
## 2025-05-24 - File Upload Accessibility
**Learning:** Drag-and-drop zones are often inaccessible to keyboard users. Using `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler (Enter/Space) on the drop zone container allows keyboard users to trigger the hidden file input.
**Action:** Implemented keyboard-accessible drag-and-drop zone in `UploadModal.tsx`.

## 2025-05-25 - Interactive List Accessibility
**Learning:** Lists that act as navigation menus (like `NetworkList`) must implement the "button" pattern (role="button", tabIndex=0, onKeyDown) on list items if they are not native `<button>` or `<a>` elements. This is critical for keyboard users to navigate the directory.
**Action:** Added keyboard support and ARIA roles to `NetworkList.tsx` items.

## 2025-12-22 - Modal Standardization
**Learning:** Inconsistent modal implementations lead to varying accessibility support. Refactoring legacy modals (like `FeedbackModal`) to match established accessible patterns (like `ConfirmModal`) is crucial. Specifically, ensuring `Escape` key support, initial focus, and proper ARIA labeling makes the app usable for everyone.
**Action:** Refactored `FeedbackModal.tsx` to include `role="dialog"`, `aria-modal`, escape key handling, and focus management.
