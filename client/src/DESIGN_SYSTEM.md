# REL F Design System Documentation

A comprehensive design system for maintaining visual coherence and user-friendly interfaces across the r3l application.

## Overview

The REL F design system provides a unified approach to:
- **Design Tokens**: Consistent spacing, sizing, colors, and animations
- **Component Patterns**: Reusable UI component styling
- **Visual Hierarchy**: Clear typography and spacing scales
- **Theme System**: Dark themes (Mist & Verdant)
- **Accessibility**: Focus states and semantic HTML

---

## Design Tokens

All design values are defined as CSS custom properties for easy maintenance and consistency.

### Spacing Scale

Used for padding, margins, gaps, and layout spacing. Base unit: **4px**

```css
--spacing-xs: 4px    /* Extra small: alerts, tiny gaps */
--spacing-sm: 8px    /* Small: form fields, icon gaps */
--spacing-md: 12px   /* Medium: component padding */
--spacing-lg: 16px   /* Large: section padding, modal spacing */
--spacing-xl: 20px   /* Extra large: major gaps */
--spacing-2xl: 24px  /* 2XL: section margins */
```

**Usage Examples:**
```tsx
// CSS
padding: var(--spacing-md);
gap: var(--spacing-lg);

// Utility classes
<div className="p-lg"> ... </div>
<div className="flex-gap-md"> ... </div>
```

### Icon Sizes

Standard icon sizes for consistent visual language across the app.

```typescript
ICON_SIZES = {
  xs: 12px,    // Tiny icons (tooltips, badges)
  sm: 14px,    // Small icons (compact UI)
  md: 16px,    // Medium icons (buttons, standard)
  lg: 18px,    // Large icons (header, prominent)
  xl: 20px,    // Extra large icons (hero, title-sized)
  '2xl': 24px, // 2XL icons (avatars, large sections)
}

// Common usage patterns
ICON_USAGE = {
  navbar: 18px,
  button: 16px,
  header: 20px,
  small: 14px,
  tiny: 12px,
  sidebar: 18px,
  avatar: 24px,
  tooltip: 14px,
}
```

**Usage Examples:**
```tsx
import { ICON_SIZES } from '@/constants/iconSizes';

<IconRadar2 size={ICON_SIZES.lg} /> <!-- 18px -->
<IconChartCircles size={ICON_SIZES.md} /> <!-- 16px -->
```

### Border Radius

Consistent border-radius values for components.

```css
--radius-sm: 4px;   /* Buttons, inputs, small elements */
--radius-md: 8px;   /* Cards, modals, medium elements */
--radius-lg: 12px;  /* Large cards, containers */
--radius-full: 50%; /* Circular (badges, avatars) */
```

### Shadows

Shadow hierarchy for depth perception.

```css
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);           /* Subtle elevation */
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);         /* Medium elevation */
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.2);          /* Strong elevation */
```

### Transitions & Animations

Consistent timing for all animations and transitions.

```css
--transition-fast: 150ms ease-out;      /* Quick interactions (hover) */
--transition-base: 250ms ease-out;      /* Standard transitions */
--transition-slow: 350ms ease-out;      /* Lengthy animations */
```

---

## Color System

The design system uses two coordinated dark themes with accent colors for visual emphasis.

### Theme: Mist (Default)
**Dark blue-black base with neon green accent**

```css
--bg-color: #0a0b10         /* Deep background */
--bg-mist: #111318          /* Lighter background panel */
--text-primary: #e0e4e8     /* Main text */
--text-secondary: #7f8a96   /* Secondary/muted text */
--accent-sym: #26de81       /* Primary action color (neon green) */
--accent-alert: #ff4b4b     /* Error/alert red */
--accent-online: #00d2ff    /* Online status cyan */
--border-color: #2a2f3aff   /* Borders and dividers */
--drawer-bg: #101217f2      /* Modal/drawer background */
```

### Theme: Verdant
**Dark green-black base with matching green accent**

Same color structure as Mist with green-shifted backgrounds.

---

## Component Styles

### Buttons

Four button variants for different use cases:

#### Primary Button
```tsx
<button className="btn-primary">Action</button>
<button className="btn-primary btn-md">Medium</button>
<button className="btn-primary btn-lg">Large</button>
```

**Properties:**
- Background: `var(--accent-sym)` (neon green)
- Text: Black (#000)
- Hover: White background with green glow
- Sizes: sm (6px 10px), md (8px 12px), lg (12px 16px)

#### Secondary Button
```tsx
<button className="btn-secondary">Secondary Action</button>
```

**Properties:**
- Background: `var(--bg-mist)`
- Border: `1px solid var(--border-color)`
- Hover: Border changes to green

#### Text Button
```tsx
<button className="btn-text">Link Text</button>
```

**Properties:**
- No background
- Underlined text
- Color: `var(--text-secondary)`
- Hover: Color changes to green

#### Icon Button
```tsx
<button className="btn-icon"><IconRadar2 size={20} /></button>
```

**Properties:**
- Transparent background
- Hover: Light background
- No padding, just icon

### Modals & Drawers

Standard modal structure using `.modal-panel`:

```tsx
<div className="modal-panel">
  <div className="modal-header">
    <h2>Modal Title</h2>
    <button onClick={onClose}>✕</button>
  </div>
  <div className="modal-body">
    <!-- Content here -->
  </div>
  <div className="modal-footer">
    <button className="btn-secondary">Cancel</button>
    <button className="btn-primary">Confirm</button>
  </div>
</div>
```

**Properties:**
- Padding: `var(--spacing-lg)` (16px)
- Border radius: `var(--radius-md)` (8px)
- Background: Glass morphism effect
- Sticky header with bottom border

### Forms & Inputs

Consistent form field styling:

```tsx
<div className="input-group">
  <label className="input-label">Username</label>
  <input className="input-field" type="text" />
  <span className="input-hint">Your display name</span>
</div>
```

**Properties:**
- Background: `var(--bg-color)`
- Border: `1px solid var(--border-color)`
- Focus: Green border with subtle glow
- Padding: `var(--spacing-sm)` (8px)

### Flex Utilities

Helpful flexbox utility classes:

```tsx
<div className="flex-between">       <!-- space-between -->
<div className="flex-center">        <!-- center content -->
<div className="flex-gap-md">        <!-- gap: 12px -->
```

---

## Typography

### Font Families
```css
--font-family-heading: 'Rajdhani', sans-serif    /* All caps titles */
--font-family-body: 'Inter', sans-serif          /* Body text */
--font-family-mono: 'Courier New', monospace     /* Code/data */
```

### Font Sizes
```css
--text-xs: 0.75rem      /* 12px - small labels */
--text-sm: 0.875rem     /* 14px - secondary text */
--text-base: 1rem       /* 16px - default body */
--text-lg: 1.125rem     /* 18px - larger text */
--text-xl: 1.25rem      /* 20px - subtitle */
--text-2xl: 1.5rem      /* 24px - section heading */
```

### Line Heights
```css
--line-height-tight: 1.2       /* Titles, dense text */
--line-height-normal: 1.5      /* Default */
--line-height-relaxed: 1.75    /* Dense content, readability */
```

---

## Animations

### CSS Animation Classes

Simple animations using CSS keyframes:

```tsx
<!-- Fade animations -->
<div className="anim-fade-in">Content</div>

<!-- Slide animations -->
<div className="anim-slide-up">Content</div>

<!-- Scale animations -->
<div className="anim-scale-in">Content</div>

<!-- Pulse/attention -->
<div className="anim-pulse">Pulsing content</div>

<!-- Spin (loading) -->
<div className="anim-spin">Loading...</div>
```

**Available animations:**
- `anim-fade-in/out` - Opacity transitions
- `anim-slide-up/down/left/right` - Directional slides
- `anim-scale-in/out` - Scale transitions
- `anim-pulse/pulse-scale/drift-pulse` - Attention animations
- `anim-spin/spin-slow/spin-fast` - Rotation
- `anim-glitch` - Glitch effect
- `anim-bounce` - Bounce animation
- `anim-shake` - Shake animation

### GSAP Animations

For complex animation sequences, use GSAP utils:

```typescript
import { GSAPAnimations } from '@/utils/animations';

// Animate element in
GSAPAnimations.animateIn(element, 0.4);

// Stagger list items
GSAPAnimations.staggerIn(listItems, 0.5);

// Pulse effect
GSAPAnimations.pulse(element, 1.1, 0.6);
```

### Transition Classes

Apply smooth transitions to any property change:

```tsx
<button className="transition-base">Hover me</button>  <!-- Transitions all -->
<button className="transition-colors">Colors</button>  <!-- Just colors -->
<button className="transition-transform">Scale</button> <!-- Just transform -->
```

---

## Z-Index Stack

Layering hierarchy for overlapping elements:

```css
--z-base: 1              /* Default stacking context */
--z-dropdown: 100        /* Dropdowns, tooltips */
--z-sticky: 500          <!-- Sticky headers -->
--z-modal: 1000          /* Modal overlays */
--z-toast: 2000          /* Toast notifications -->
--z-tooltip: 3000        /* Tooltips, popovers -->
```

---

## Responsive Design

### Breakpoints
```css
/* Mobile first approach */
@media (max-width: 576px) { /* Extra small devices */ }
@media (max-width: 768px) { /* Tablets and smaller */ }
@media (max-width: 1024px) { /* Laptops and smaller */ }
```

### Utility Classes
```tsx
<div className="desktop-only">      <!-- Hidden on mobile -->
<div className="mobile-only">       <!-- Hidden on desktop -->
```

---

## Best Practices

### ✅ DO

- Use design tokens for all values (spacing, colors, sizes)
- Apply utility classes from `components.css`
- Use CSS classes for styling instead of inline styles
- Reference `ICON_SIZES` constant for all icon sizing
- Use semantic HTML with proper ARIA labels
- Maintain consistent gap sizes: sm (8px), md (12px), lg (16px), xl (20px)

### ❌ DON'T

- Hardcode pixel values (use tokens instead)
- Use inline `style={{}}` props for styling
- Mix spacing scales (don't mix 10px with 12px)
- Create custom color values (use theme colors)
- Override component styling with inline styles

### Example: Good Component

```tsx
// ✅ GOOD - Uses design tokens and CSS classes
<div className="modal-panel">
  <div className="modal-header">
    <h2>Confirm Action</h2>
  </div>
  <div className="modal-body">
    <p>Are you sure?</p>
  </div>
  <div className="modal-footer">
    <button className="btn-secondary">Cancel</button>
    <button className="btn-primary btn-md">Confirm</button>
  </div>
</div>
```

### Example: Bad Component

```tsx
// ❌ BAD - Uses inline styles and hardcoded values
<div style={{
  background: 'rgba(0,0,0,0.8)',
  padding: '30px',
  borderRadius: '8px',
}}>
  <h2 style={{ marginBottom: '15px' }}>Confirm Action</h2>
  <p style={{ color: '#7f8a96', fontSize: '14px' }}>Are you sure?</p>
  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
    <button style={{ padding: '8px 16px', border: 'none' }}>Cancel</button>
    <button style={{ padding: '8px 16px', background: '#26de81', color: '#000' }}>Confirm</button>
  </div>
</div>
```

---

## File Organization

```
client/src/
├── styles/
│   ├── design-tokens.css      /* Core design values */
│   ├── global.css             /* Global styles & theme */
│   ├── components.css         /* Reusable component styles */
│   ├── animations.css         /* Animation definitions */
│   └── App.css                /* App-specific styles */
├── constants/
│   └── iconSizes.ts           /* Icon size constants */
├── utils/
│   └── animations.ts          /* Animation utilities */
└── components/
    └── ui/                    /* Reusable UI components */
        ├── Button.tsx
        ├── Modal.tsx
        └── FormInput.tsx
```

---

## Migration Guide

To update existing components to use the design system:

### Step 1: Replace Inline Styles with Classes
```tsx
// Before
<div style={{ padding: '20px', gap: '15px' }}>

// After
<div className="p-lg flex-gap-md">
```

### Step 2: Use Icon Size Constant
```tsx
// Before
<IconRadar2 size={20} />

// After
<IconRadar2 size={ICON_SIZES.xl} />
```

### Step 3: Use Token CSS Variables
```tsx
// Before
<div style={{ background: '#26de81', color: '#000' }}>

// After
<div style={{ background: 'var(--accent-sym)', color: '#000' }}>
// Or better: Add a CSS class
```

### Step 4: Use Button Component Classes
```tsx
// Before
<button style={{ background: 'green', padding: '10px 15px' }}>Click</button>

// After
<button className="btn-primary btn-md">Click</button>
```

---

## Troubleshooting

### Styles Not Applying

1. ✅ Check CSS import order (design-tokens.css must be first)
2. ✅ Verify className is spelled correctly
3. ✅ Check CSS specificity (component styles override utility classes)
4. ✅ Ensure tokens are imported in global.css

### Color Not Showing

1. ✅ Verify theme class is applied to `document.documentElement`
2. ✅ Check token name: `var(--accent-sym)` not `--accent-green`
3. ✅ Ensure color-scheme is set correctly

### Animation Not Playing

1. ✅ Check animation class name (e.g., `anim-fade-in`)
2. ✅ Verify animation is imported from animations.css
3. ✅ Check animation duration (compare with --transition-* speeds)

---

## Version History

- **v1.0.0** (2025-03-19): Initial design system implementation
  - Established design tokens
  - Created component CSS library
  - Consolidated animations
  - Refactored App.tsx inline styles

---

## Support & Feedback

For design system improvements or questions, refer to:
- `/home/dale/Desktop/r3l/client/src/styles/` for CSS files
- `/home/dale/Desktop/r3l/client/src/constants/iconSizes.ts` for icon references
- `/home/dale/Desktop/r3l/client/src/utils/animations.ts` for animation utilities
