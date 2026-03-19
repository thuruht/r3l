/**
 * Icon Size Constants
 * Standard icon sizes for consistent UI across the application
 */

export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

/**
 * Get icon size by category
 * @param size - Icon size category
 * @returns Numeric pixel value
 */
export const getIconSize = (size: IconSize): number => ICON_SIZES[size];

/**
 * Common icon usage patterns
 */
export const ICON_USAGE = {
  navbar: ICON_SIZES.lg,        // 18px
  button: ICON_SIZES.md,         // 16px
  header: ICON_SIZES.xl,         // 20px
  small: ICON_SIZES.sm,          // 14px
  tiny: ICON_SIZES.xs,           // 12px
  sidebar: ICON_SIZES.lg,        // 18px
  avatar: ICON_SIZES['2xl'],     // 24px
  tooltip: ICON_SIZES.sm,        // 14px
} as const;
