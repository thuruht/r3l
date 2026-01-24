## 2025-12-27 - Empty State "No Frequencies"
**Learning:** In a highly thematic app like this ("Mist & Glow"), generic "No results found" text breaks immersion. Using thematic language ("No frequencies found") combined with large, faint iconography (`IconBroadcast`) turns a dead-end interaction into a world-building moment.
**Action:** Always check if "empty" states can be "thematic" states. Use opacity and iconography to make them feel like part of the environment rather than system errors.

## 2025-12-28 - Focus State Visibility
**Learning:** Removing `outline: none` from inputs for aesthetic reasons breaks accessibility if not replaced. We can satisfy both by lifting the focus state to the parent container, adding a thematic "glow" (`box-shadow`) and border color change. This makes the search bar feel like it "activates" rather than just being selected.
**Action:** When using custom input styles, always implement a `focus` state on the wrapper element to maintain keyboard visibility.

## 2025-12-29 - Iconography for Actions
**Learning:** Using text characters (like ▲/▼) for interface actions creates inconsistent touch targets and visual noise. Replacing them with standardized icons (ChevronUp/Down) not only improves the "Mist & Glow" aesthetic but ensures predictable hit areas, especially when combined with adequate spacing (increased from 2px to 6px).
**Action:** Avoid unicode characters for interactive controls; standard icons provide better scalability and accessibility.
