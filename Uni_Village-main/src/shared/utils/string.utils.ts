/**
 * String Utilities
 * Common string manipulation functions
 */

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Capitalize each word
 */
export function capitalizeWords(text: string): string {
    return text
        .split(' ')
        .map((word) => capitalize(word))
        .join(' ');
}

/**
 * Convert to slug (URL-friendly string)
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
}

/**
 * Check if string is empty or only whitespace
 */
export function isEmpty(text: string | null | undefined): boolean {
    return !text || text.trim().length === 0;
}

/**
 * Get initials from name
 */
export function getInitials(name: string, maxLength: number = 2): string {
    if (!name) return '';

    const words = name.trim().split(/\s+/);
    const initials = words
        .slice(0, maxLength)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');

    return initials;
}

/**
 * Pluralize word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
    if (count === 1) return singular;
    return plural ?? singular + 's';
}
