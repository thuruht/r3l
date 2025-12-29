## 2024-05-24 - Accessibility Patterns for Interactive Lists
**Learning:** Interactive lists (like notifications or messages) implemented with `div`s and `role="button"` often miss keyboard accessibility. Mouse users can click, but keyboard users can focus (via `tabIndex="0"`) but cannot activate (missing `onKeyDown`).
**Action:** When using `role="button"` on a non-button element, always implement an `onKeyDown` handler that checks for `Enter` and `Space` keys to trigger the same action as `onClick`. Also, be mindful of nested interactive elements within these rows.

## 2024-05-24 - Feedback Modal Enhancements
**Learning:** Adding explicit character counts and keyboard shortcuts (Ctrl+Enter) to textareas significantly improves usability for power users and prevents frustration from hidden limits.
**Action:** Always include a visual character counter and a keyboard submission hint for multi-line text inputs in modals.

## 2025-12-29 - Playwright Verification of SPA with Mocking
**Learning:** Verifying deeply nested components (like  inside ) requires meticulous mocking of all dependency endpoints (e.g., , ) to prevent the SPA from crashing or redirecting before the target component renders.
**Action:** When mocking APIs for SPA verification, always check  and the parent component's  hooks to identify and mock all "boot-up" requests, not just the ones related to the feature being tested.

## 2025-12-29 - Playwright Verification of SPA with Mocking
**Learning:** Verifying deeply nested components (like `Artifacts` inside `CommuniquePage`) requires meticulous mocking of all dependency endpoints (e.g., `/api/users/me`, `/api/customization`) to prevent the SPA from crashing or redirecting before the target component renders.
**Action:** When mocking APIs for SPA verification, always check `App.tsx` and the parent component's `useEffect` hooks to identify and mock all "boot-up" requests, not just the ones related to the feature being tested.
