## 2025-12-27 - Empty State "No Frequencies"
**Learning:** In a highly thematic app like this ("Mist & Glow"), generic "No results found" text breaks immersion. Using thematic language ("No frequencies found") combined with large, faint iconography (`IconBroadcast`) turns a dead-end interaction into a world-building moment.
**Action:** Always check if "empty" states can be "thematic" states. Use opacity and iconography to make them feel like part of the environment rather than system errors.

## 2025-12-28 - Focus State Visibility
**Learning:** Removing `outline: none` from inputs for aesthetic reasons breaks accessibility if not replaced. We can satisfy both by lifting the focus state to the parent container, adding a thematic "glow" (`box-shadow`) and border color change. This makes the search bar feel like it "activates" rather than just being selected.
**Action:** When using custom input styles, always implement a `focus` state on the wrapper element to maintain keyboard visibility.

## 2025-12-29 - Chat Empty States
**Learning:** Chat interfaces often look broken when empty. A "Frequency Silent" message with an icon not only fixes the "is this working?" confusion but encourages the user to be the first to speak ("Be the first to broadcast").
**Action:** In social components, treat empty states as "invitations" rather than just lack of content.

## 2025-01-05 - Group Chat Empty State
**Learning:** Generic "No items" text is a missed opportunity for world-building. Replacing "No groups yet" with "No Clusters Found" and a faint `IconUsers` maintains immersion and guides the user.
**Action:** When designing empty states, ask "What is the thematic equivalent of 'empty' in this context?" (e.g., Silent, Void, Uncharted).

## 2025-01-07 - Inbox Thematic Consistency
**Learning:** The Inbox overlay, being a central hub, requires consistent thematic empty states (Alerts: "Silence...", Messages: "No Active Channels"). Icon-heavy, centered empty states (using `IconBellOff`, `IconMessageOff`) communicate status more effectively and engagingly than plain text.
**Action:** Ensure all tabs or sub-views within a modal share the same high-fidelity empty state patterns to maintain a cohesive experience.
