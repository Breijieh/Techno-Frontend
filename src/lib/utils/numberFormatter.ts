/**
 * Standard number formatter to ensure Western Arabic numerals (1, 2, 3)
 * are used throughout the application, even provided with Arabic locale.
 */

/**
 * Format a number ensuring Western Arabic numerals (0-9)
 * @param value - The number to format
 * @param options - Optional Intl.NumberFormatOptions
 * @returns Formatted string
 */
export const formatNumber = (value: number | bigint, options?: Intl.NumberFormatOptions): string => {
    // Force 'en-US' to ensure 1, 2, 3. 
    // We could use 'ar-EG-u-nu-latn' if we wanted Arabic symbols for percentage/currency but Latin numbers,
    // but usually 'en-US' is the safest bet for 100% Western numerals.

    // However, often users want Arabic currency symbols (SAR) but English numbers.
    // In that case, we can use 'en-US' with currency style, OR 'ar-SA' with 'latn' numbering system.
    // Let's stick effectively to 'en-US' for basic numbers to avoid confusion.

    if (value === undefined || value === null) return '';
    return new Intl.NumberFormat('en-US', options).format(value);
};

/**
 * Format currency ensuring Western Arabic numerals (0-9)
 * @param value - The amount to format
 * @param currency - Currency code (default: SAR)
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number, currency = 'SAR'): string => {
    if (value === undefined || value === null) return '';
    // Use en-US to get "$1,234.56" format or "SAR 1,234.56"
    // If we want "ر.س.‏ 1,234.56", we can use 'ar-SA-u-nu-latn'.
    // usually users referring to "1 2 3" also prefer standard international format for currencies or
    // just want the digits to be readable.
    // Let's use 'en-US' but valid currency.
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

/**
 * Format percentage ensuring Western Arabic numerals (0-9)
 * @param value - The value to format (e.g. 0.5 for 50%)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals = 0): string => {
    if (value === undefined || value === null) return '';
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};
