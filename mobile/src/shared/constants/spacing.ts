/**
 * Spacing Constants
 * Consistent spacing values
 */

export const Spacing = {
    // Base spacing (4px increments)
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,

    // Named spacing for specific use cases
    screenPadding: 16,
    cardPadding: 16,
    inputPadding: 12,
    buttonPadding: 12,
    listItemPadding: 12,
    sectionSpacing: 24,
} as const;

export type SpacingKey = keyof typeof Spacing;
