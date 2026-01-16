## 2025-12-27 - Empty State "No Frequencies"
**Learning:** In a highly thematic app like this ("Mist & Glow"), generic "No results found" text breaks immersion. Using thematic language ("No frequencies found") combined with large, faint iconography (`IconBroadcast`) turns a dead-end interaction into a world-building moment.
**Action:** Always check if "empty" states can be "thematic" states. Use opacity and iconography to make them feel like part of the environment rather than system errors.

## 2025-12-28 - The "Just You" Empty State
**Learning:** When a user is part of a list (like a network directory), a standard empty state logic (length === 0) fails because the user counts as 1. Filtering out the user for the empty check allows showing a "Sector Silent" state while still affirming the user's presence.
**Action:** For self-inclusive lists, use `list.filter(i => !isMe).length === 0` for empty states, and consider displaying the empty state alongside the user's own entry rather than replacing it.
