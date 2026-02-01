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
