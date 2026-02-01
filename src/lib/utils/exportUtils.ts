import { mkConfig, generateCsv, download } from 'export-to-csv';
import type { MRT_Row } from 'material-react-table';
import { formatDate } from './dateFormatter';

/**
 * Sanitize a value for CSV export by converting complex types to strings
 * @param value - The value to sanitize
 * @returns A CSV-safe value (number, string, boolean, null, undefined)
 */
const sanitizeValueForCSV = (value: unknown): string | number | boolean | null | undefined => {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle Date objects first (before type checks)
  if (value instanceof Date) {
    return formatDate(value);
  }

  // Handle numbers and booleans (already CSV-safe)
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  // Handle strings - check if it's a date string first
  if (typeof value === 'string') {
    // Check if string looks like a date (ISO format or similar)
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return formatDate(date);
        }
      } catch {
        // Not a valid date, continue as regular string
      }
    }
    // Regular strings are CSV-safe
    return value;
  }

  // Handle arrays - convert to comma-separated string
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValueForCSV(item)).join(', ');
  }

  // Handle objects - convert to JSON string
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }

  // Fallback: convert to string
  return String(value);
};

/**
 * Sanitize a data object for CSV export by converting all values
 * @param data - The data object to sanitize
 * @returns A new object with all values sanitized for CSV
 */
const sanitizeDataForCSV = <T extends Record<string, unknown>>(data: T): Record<string, string | number | boolean | null | undefined> => {
  // Handle null or undefined data
  if (data == null || typeof data !== 'object') {
    return {};
  }

  const sanitized: Record<string, string | number | boolean | null | undefined> = {};

  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      sanitized[key] = sanitizeValueForCSV(data[key]);
    }
  }

  return sanitized;
};

/**
 * Export table rows to CSV file
 * @param rows - Array of MRT table rows
 * @param filename - Name of the exported file (without extension)
 * @param columnMapping - Optional mapping to rename columns in export
 */
export const exportTableToCSV = <T extends Record<string, unknown>>(
  rows: MRT_Row<T>[],
  filename: string,
  columnMapping?: Record<string, string>
) => {
  const csvConfig = mkConfig({
    fieldSeparator: ',',
    decimalSeparator: '.',
    useKeysAsHeaders: true,
    filename,
  });

  // Extract original data from rows and sanitize, filtering out null/undefined rows
  let rowData = rows
    .filter((row) => row.original != null)
    .map((row) => sanitizeDataForCSV(row.original));

  // Apply column mapping if provided
  if (columnMapping) {
    rowData = rowData.map((row) => {
      const mappedRow: Record<string, string | number | boolean | null | undefined> = {};
      Object.keys(row).forEach((key) => {
        const mappedKey = columnMapping[key] || key;
        mappedRow[mappedKey] = row[key];
      });
      return mappedRow;
    });
  }

  const csv = generateCsv(csvConfig)(rowData);
  download(csvConfig)(csv);
};

/**
 * Export array of data objects to CSV
 * @param data - Array of data objects
 * @param filename - Name of the exported file (without extension)
 * @param columnMapping - Optional mapping to rename columns in export
 */
export const exportDataToCSV = <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columnMapping?: Record<string, string>
) => {
  const csvConfig = mkConfig({
    fieldSeparator: ',',
    decimalSeparator: '.',
    useKeysAsHeaders: true,
    filename,
  });

  // Sanitize all data before export
  let exportData = data.map((row) => sanitizeDataForCSV(row));

  // Apply column mapping if provided
  if (columnMapping) {
    exportData = exportData.map((row) => {
      const mappedRow: Record<string, string | number | boolean | null | undefined> = {};
      Object.keys(row).forEach((key) => {
        const mappedKey = columnMapping[key] || key;
        mappedRow[mappedKey] = row[key];
      });
      return mappedRow;
    });
  }

  const csv = generateCsv(csvConfig)(exportData);
  download(csvConfig)(csv);
};

