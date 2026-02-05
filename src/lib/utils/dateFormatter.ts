import { format } from 'date-fns';

/**
 * Format a date to dd/MM/yyyy using Gregorian calendar
 * @param date - Date object or date string
 * @param pattern - Optional pattern, default is 'dd/MM/yyyy'
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (date: Date | string | null | undefined, pattern: string = 'dd/MM/yyyy'): string => {
    if (!date) return '';

    try {
        const d = typeof date === 'string' ? new Date(date) : date;

        if (isNaN(d.getTime())) return '';

        // Use format without locale to ensure Gregorian calendar
        return format(d, pattern);
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

/**
 * Format a date to localized string using Gregorian calendar (forced)
 * Uses en-GB locale to guarantee DD/MM/YYYY format
 * @param date - Date object or date string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatDateGregorian = (
    date: Date | string | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string => {
    if (!date) return '';

    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '';

        // Use 'en-GB' locale to ensure DD/MM/YYYY format (Gregorian calendar)
        return d.toLocaleDateString('en-GB', {
            ...options,
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

/**
 * Format a date to DD/MM/YYYY string - simple helper for table cells
 * @param date - Date object or date string
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatDateShort = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '';
        // DD/MM/YYYY format using en-GB locale
        return d.toLocaleDateString('en-GB');
    } catch (error) {
        return '';
    }
};

/**
 * Format a valid Date object or ISO string (YYYY-MM-DD...) to DD/MM/YYYY 
 * WITHOUT applying local timezone conversion.
 * 
 * Assumes the input Date object (if Date) represents the exact date in UTC (e.g. 00:00 UTC).
 * Assumes the input string (if string) is an ISO date.
 * 
 * @param date - Date object or ISO string
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatInvariantDate = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        if (date instanceof Date) {
            if (isNaN(date.getTime())) return '';
            // Use UTC components to ensure we get the exact date stored in the object
            // This is primarily for dates that were parsed from "YYYY-MM-DD" (which become UTC midnight)
            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const year = date.getUTCFullYear();
            return `${day}/${month}/${year}`;
        }

        // Handle string input
        // Fallback to simple string parsing for ISO formats to be absolutely safe against timezone shifts
        const cleanDate = date.split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day}/${month}/${year}`;
        }

        // Fallback for non-iso strings (?) - unlikely to happen for Dates
        return '';
    } catch {
        return '';
    }
};

/**
 * Format a date to YYYY-MM-DD (ISO format) for API
 * @param date - Date object or date string
 * @returns Formatted date string YYYY-MM-DD
 */
export const formatDateForApi = (date: Date | string | null | undefined): string | undefined => {
    if (!date) return undefined;
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return undefined;
        return d.toISOString().split('T')[0];
    } catch {
        return undefined;
    }
};

/**
 * Get today's date in local timezone as YYYY-MM-DD string
 * Use this instead of new Date().toISOString().split('T')[0] to avoid timezone issues
 * @returns Today's date in YYYY-MM-DD format (local timezone)
 */
export const getTodayLocalDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format a Date to YYYY-MM-DD in local timezone (for API date params).
 * Avoids toISOString() which uses UTC and can shift the calendar day.
 */
export const formatLocalDateYYYYMMDD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format a Date to HH:mm (24-hour format)
 * @param date - Date object or date string
 * @returns Formatted time string HH:mm
 */
export const formatTime = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (!isNaN(d.getTime())) {
            return format(d, 'HH:mm');
        }

        // Fallback: Try parsing as time string directly (HH:mm:ss or HH:mm)
        if (typeof date === 'string') {
            const timeMatch = date.match(/(\d{2}):(\d{2})/);
            if (timeMatch) {
                return `${timeMatch[1]}:${timeMatch[2]}`;
            }
        }
        return '';
    } catch {
        return '';
    }
};

/**
 * Format a Date to dd/MM/yyyy HH:mm (24-hour format)
 * @param date - Date object or date string
 * @returns Formatted date-time string
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '';
        return format(d, 'dd/MM/yyyy HH:mm');
    } catch {
        return '';
    }
};
