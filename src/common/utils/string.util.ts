// src/common/utils/string.util.ts

/**
 * Production-grade string utility functions.
 * Used for safe, robust handling of user input, slugs, and more.
 */

/**
 * Creates a URL-friendly slug from any input string.
 * Lowercases, trims, replaces spaces with dashes, removes special chars.
 * Example: "Hello World!" → "hello-world"
 */
export function slugify(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9 -]/g, '') // Remove invalid chars
    .replace(/\s+/g, '-') // Replace whitespace with dash
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing dashes
}

/**
 * Trims and collapses all internal whitespace to a single space.
 */
export function cleanWhitespace(str: string): string {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Checks if a string is a valid UUID v4.
 */
export function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Escapes a string for safe use in HTML (basic).
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str[0].toUpperCase() + str.slice(1);
}
