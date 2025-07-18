// src/common/utils/date.util.ts

/**
 * Date utility functions for consistent, timezone-safe operations.
 * All dates should be handled as UTC in backend logic.
 */

import { add, format, isAfter, isBefore, isValid, parseISO } from 'date-fns';

/**
 * Returns the current UTC timestamp as ISO string.
 */
export function nowIsoUtc(): string {
  return new Date().toISOString();
}

/**
 * Returns a formatted ISO date string for a given Date or ISO string.
 * @param date Date object or ISO date string
 */
export function toIsoUtc(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return d instanceof Date && isValid(d) ? d.toISOString() : '';
}

/**
 * Adds the given number of days to a date and returns new ISO string.
 * @param date Date object or ISO string
 * @param days Number of days to add (can be negative)
 */
export function addDays(date: Date | string, days: number): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return add(d, { days }).toISOString();
}

/**
 * Checks if a date is after another date.
 * @param a First date (Date or ISO)
 * @param b Second date (Date or ISO)
 */
export function isAfterDate(a: Date | string, b: Date | string): boolean {
  const dA = typeof a === 'string' ? parseISO(a) : a;
  const dB = typeof b === 'string' ? parseISO(b) : b;
  return isAfter(dA, dB);
}

/**
 * Checks if a date is before another date.
 * @param a First date (Date or ISO)
 * @param b Second date (Date or ISO)
 */
export function isBeforeDate(a: Date | string, b: Date | string): boolean {
  const dA = typeof a === 'string' ? parseISO(a) : a;
  const dB = typeof b === 'string' ? parseISO(b) : b;
  return isBefore(dA, dB);
}

/**
 * Formats a date to `YYYY-MM-DD` (ISO local date only).
 * @param date Date object or ISO string
 */
export function formatIsoDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, 'yyyy-MM-dd') : '';
}
