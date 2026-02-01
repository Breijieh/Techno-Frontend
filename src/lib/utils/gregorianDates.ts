import { formatDateGregorian } from '@/lib/utils/dateFormatter';

/**
 * Helper function to format dates with Gregorian calendar
 * @deprecated Use formatDateGregorian from dateFormatter.ts instead
 */
export const toGregorianDate = (
    date: Date | string | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string => {
    return formatDateGregorian(date, options);
};

// Export formatDateGregorian for convenience
export { formatDateGregorian };
