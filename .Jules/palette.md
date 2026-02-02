## 2025-12-27 - Empty State "No Frequencies"
**Learning:** In a highly thematic app like this ("Mist & Glow"), generic "No results found" text breaks immersion. Using thematic language ("No frequencies found") combined with large, faint iconography (`IconBroadcast`) turns a dead-end interaction into a world-building moment.
**Action:** Always check if "empty" states can be "thematic" states. Use opacity and iconography to make them feel like part of the environment rather than system errors.

## 2025-12-28 - Focus State Visibility
**Learning:** Removing `outline: none` from inputs for aesthetic reasons breaks accessibility if not replaced. We can satisfy both by lifting the focus state to the parent container, adding a thematic "glow" (`box-shadow`) and border color change. This makes the search bar feel like it "activates" rather than just being selected.
**Action:** When using custom input styles, always implement a `focus` state on the wrapper element to maintain keyboard visibility.

## 2025-12-29 - Chat Empty States
**Learning:** Chat interfaces often look broken when empty. A "Frequency Silent" message with an icon not only fixes the "is this working?" confusion but encourages the user to be the first to speak ("Be the first to broadcast").
**Action:** In social components, treat empty states as "invitations" rather than just lack of content.

## 2026-02-02 - In-Place Editing Accessibility
**Learning:** In-place edit inputs often lose their context when replacing text. Explicit `aria-label`s (e.g., "Edit Collection Name") are mandatory to keep screen reader users informed of what they are editing. `autoFocus` is also critical to move focus to the input immediately.
**Action:** Always add `aria-label` and `autoFocus` to conditional edit inputs.
