/**
 * Number Utilities
 * Common number formatting functions
 */

/**
 * Format number with thousands separators
 */
export function formatNumber(value: number, locale?: string): string {
    return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format number as compact (e.g., 1.2K, 3.4M)
 */
export function formatCompact(value: number): string {
    if (value < 1000) return String(value);
    if (value < 1000000) return `${(value / 1000).toFixed(1)}K`.replace('.0K', 'K');
    if (value < 1000000000) return `${(value / 1000000).toFixed(1)}M`.replace('.0M', 'M');
    return `${(value / 1000000000).toFixed(1)}B`.replace('.0B', 'B');
}

/**
 * Format as currency
 */
export function formatCurrency(value: number, currency: string = 'VND', locale?: string): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    }).format(value);
}

/**
 * Format as percentage
 */
export function formatPercent(value: number, decimals: number = 0): string {
    return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Generate random number between min and max (inclusive)
 */
export function randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Round to specific decimal places
 */
export function roundTo(value: number, decimals: number): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
}
