/**
 * Image Utilities
 * Helper functions for handling image URLs
 */

import { env } from "@/config/env";

/**
 * Converts a relative image URL to an absolute URL using the API base URL
 * @param url - The image URL (can be relative or absolute)
 * @returns Absolute URL or undefined if input is null/empty
 *
 * @example
 * getImageUrl('/uploads/avatar.jpg') // => 'http://localhost:8080/uploads/avatar.jpg'
 * getImageUrl('https://example.com/avatar.jpg') // => 'https://example.com/avatar.jpg'
 * getImageUrl(null) // => undefined
 */
export function getImageUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  // If URL is already absolute, return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // If URL is relative, prepend API base URL
  // Remove trailing slash from API_URL and leading slash from url if present
  const baseUrl = env.API_URL.replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;

  return `${baseUrl}${path}`;
}
