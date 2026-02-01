/**
 * Material React Table Configuration
 * 
 * This file contains shared configuration and utilities for Material React Table.
 * Use Material React Table (MRT) for all table/data grid components in this project.
 */

import type { MRT_ColumnDef } from 'material-react-table';

/**
 * Default MRT table options
 */
export const defaultTableOptions = {
  enableColumnResizing: true,
  enableColumnOrdering: true,
  enableStickyHeader: true,
  enableDensityToggle: true,
  enableFullScreenToggle: true,
  enablePagination: true,
  enableSorting: true,
  enableFiltering: true,
  enableGlobalFilter: true,
  enableRowSelection: false,
  paginationDisplayMode: 'pages' as const,
  muiTablePaperProps: {
    elevation: 2,
    sx: {
      borderRadius: '8px',
    },
  },
  muiTableContainerProps: {
    sx: {
      maxHeight: '600px',
    },
  },
};

/**
 * Import Arabic localization
 */
import { mrtArabicLocalization } from './mrt-arabic-localization';

/**
 * Default localization - use Arabic localization
 */
export const defaultLocalization = mrtArabicLocalization;

/**
 * Common column helper functions
 */
export const createColumn = <T extends Record<string, unknown>>(
  accessorKey: keyof T,
  header: string,
  options?: Partial<MRT_ColumnDef<T>>
): MRT_ColumnDef<T> => {
  return {
    accessorKey: accessorKey as string,
    header,
    ...options,
  };
};

