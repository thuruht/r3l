## 2024-05-24 - Accessibility Patterns for Interactive Lists
**Learning:** Interactive lists (like notifications or messages) implemented with `div`s and `role="button"` often miss keyboard accessibility. Mouse users can click, but keyboard users can focus (via `tabIndex="0"`) but cannot activate (missing `onKeyDown`).
**Action:** When using `role="button"` on a non-button element, always implement an `onKeyDown` handler that checks for `Enter` and `Space` keys to trigger the same action as `onClick`. Also, be mindful of nested interactive elements within these rows.
