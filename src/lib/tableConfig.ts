// Light theme configuration for Material React Table
import { type MRT_TableOptions, type MRT_FilterFn } from 'material-react-table';

/**
 * Robust filter function for multi-select columns.
 * Handles: undefined, null, empty arrays, single values, and arrays.
 * This prevents the "filterValue.some is not a function" errors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const multiSelectFilter: MRT_FilterFn<any> = (row, id, filterValue) => {
  // No filter applied - show all rows
  if (filterValue === undefined || filterValue === null) return true;

  const rowValue = row.getValue(id);

  // Handle array filter values (from SmartFilterModal multi-select)
  if (Array.isArray(filterValue)) {
    // Empty array means no filter - show all
    if (filterValue.length === 0) return true;
    // Check if row value is in the selected filter values
    return filterValue.includes(rowValue);
  }

  // Handle single value filter (fallback for edge cases)
  return rowValue === filterValue;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const lightTableTheme: Partial<MRT_TableOptions<any>> = {
  layoutMode: 'grid',
  enableSorting: true, // Keep functionality
  enableColumnDragging: true, // Enable Drag & Drop
  enableGrouping: true, // Enable Grouping
  enableColumnFilters: true, // Enable functionality for Smart Filters
  enableColumnActions: true, // Keep the three dots for column settings
  initialState: { showColumnFilters: false }, // Hide default filter inputs
  // Global custom filter functions - override MRT defaults for safety
  filterFns: {
    // Override MRT's default multi-select filter to handle edge cases
    // This prevents "filterValue.some is not a function" errors
    arrIncludesSome: multiSelectFilter,
    arrIncludes: multiSelectFilter,
    multiSelectFilter: multiSelectFilter,
  },
  muiTablePaperProps: {
    elevation: 0,
    sx: {
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      backgroundColor: '#FFFFFF',
      maxWidth: '100%',
      overflowX: 'auto',
      '& .MuiIconButton-root': {
        color: '#374151 !important',
        '&:hover': {
          backgroundColor: '#F3F4F6',
          color: '#0c2b7a !important',
        },
      },
      '& .MuiSvgIcon-root': {
        color: '#374151',
      },
      // Ensure all menus and popovers have visible text
      '& .MuiPopover-root .MuiPaper-root': {
        backgroundColor: '#FFFFFF !important',
        color: '#111827 !important',
        '& *': {
          color: '#111827 !important',
        },
        '& .MuiList-root': {
          backgroundColor: '#FFFFFF !important',
          color: '#111827 !important',
          '& *': {
            color: '#111827 !important',
          },
        },
        '& .MuiMenuItem-root': {
          color: '#111827 !important',
          '& .MuiBox-root': {
            color: '#111827 !important',
            '& *': {
              color: '#111827 !important',
            },
          },
          '& div': {
            color: '#111827 !important',
          },
        },
      },
      '& .MuiMenu-root .MuiPaper-root': {
        backgroundColor: '#FFFFFF !important',
        color: '#111827 !important',
        '& *': {
          color: '#111827 !important',
        },
        '& .MuiList-root': {
          backgroundColor: '#FFFFFF !important',
          color: '#111827 !important',
          '& *': {
            color: '#111827 !important',
          },
        },
        '& .MuiMenuItem-root': {
          color: '#111827 !important',
          '& .MuiBox-root': {
            color: '#111827 !important',
            '& *': {
              color: '#111827 !important',
            },
            // Target text nodes directly
            '& > div': {
              color: '#111827 !important',
            },
          },
          '& div': {
            color: '#111827 !important',
          },
          // Force all text content to be visible
          '&::before, &::after': {
            color: '#111827 !important',
          },
        },
      },
      // Global override for all menu content
      '& [role="menu"]': {
        '& .MuiMenuItem-root': {
          color: '#111827 !important',
          '& .MuiBox-root': {
            color: '#111827 !important',
          },
          '& div': {
            color: '#111827 !important',
          },
        },
      },
    },
  },
  muiTableProps: {
    sx: {
      backgroundColor: '#FFFFFF',
      '& .MuiIconButton-root': {
        color: '#374151 !important',
        '&:hover': {
          backgroundColor: '#F3F4F6',
          color: '#0c2b7a !important',
        },
      },
      '& .MuiSvgIcon-root': {
        color: '#374151 !important',
        opacity: '1 !important',
      },
      '& .MuiTableSortLabel-root': {
        color: '#374151 !important',
        '& .MuiSvgIcon-root': {
          color: '#374151 !important',
          opacity: '1 !important',
        },
        '&:hover': {
          color: '#0c2b7a !important',
          '& .MuiSvgIcon-root': {
            color: '#0c2b7a !important',
          },
        },
        '&.Mui-active': {
          color: '#0c2b7a !important',
          '& .MuiSvgIcon-root': {
            color: '#0c2b7a !important',
          },
        },
      },
      '& .MuiTableSortLabel-icon': {
        color: '#374151 !important',
        opacity: '1 !important',
      },
      '& .MuiCheckbox-root': {
        color: '#6B7280',
        '&.Mui-checked': {
          color: '#0c2b7a',
        },
      },
    },
  },
  muiTableHeadProps: {
    sx: {
      backgroundColor: '#F9FAFB',
      '& .MuiIconButton-root': {
        color: '#374151 !important',
        '&:hover': {
          backgroundColor: '#E5E7EB',
          color: '#0c2b7a !important',
        },
      },
      '& .MuiSvgIcon-root': {
        color: '#374151',
      },
    },
  },
  muiTableHeadCellProps: {
    align: 'center',
    sx: {
      backgroundColor: '#F9FAFB',
      fontWeight: 600,
      fontSize: '13px',
      color: '#374151',
      borderBottom: '1px solid #E5E7EB',
      borderLeft: '1px solid #E5E7EB', // Cell separator
      '&:last-child': {
        borderLeft: 'none',
      },
      '& .MuiTableSortLabel-root': {
        color: '#374151',
        pointerEvents: 'none', // Disable clicking header text for sorting
        '&:hover': {
          color: '#374151',
        },
        '& .MuiTableSortLabel-icon': {
          display: 'none !important', // Completely hide sort icons
        },
      },
      // Ensure column actions are still clickable
      '& .MuiIconButton-root': {
        pointerEvents: 'auto',
      },
    },
  },
  muiTableHeadRowProps: {
    sx: {
      backgroundColor: '#F9FAFB',
      '& .MuiTableSortLabel-root': {
        color: '#374151',
        '&:hover': {
          color: '#0c2b7a',
        },
        '&.Mui-active': {
          color: '#0c2b7a',
          '& .MuiTableSortLabel-icon': {
            color: '#0c2b7a !important',
            opacity: '1 !important',
          },
        },
      },
      '& .MuiTableSortLabel-icon': {
        color: '#374151 !important',
        opacity: '1 !important',
      },
      '& .MuiSvgIcon-root': {
        color: '#374151 !important',
        opacity: '1 !important',
      },
    },
  },
  muiTableBodyProps: {
    sx: {
      backgroundColor: '#FFFFFF',
    },
  },
  muiTableBodyCellProps: {
    align: 'center',
    sx: {
      fontSize: '13px',
      color: '#111827',
      borderBottom: '1px solid #F3F4F6',
      borderLeft: '1px solid #F3F4F6', // Cell separator
      backgroundColor: '#FFFFFF',
      '&:last-child': {
        borderLeft: 'none',
      },
    },
  },
  muiTableBodyRowProps: {
    sx: {
      backgroundColor: '#FFFFFF',
      '&:hover': {
        backgroundColor: '#F9FAFB',
      },
      // Expanded row content styling
      '&[data-expanded="true"]': {
        '& .MuiBox-root': {
          color: '#111827 !important',
          '& *': {
            color: '#111827 !important',
          },
        },
        '& .MuiTypography-root': {
          color: '#111827 !important',
        },
      },
    },
  },
  muiTopToolbarProps: {
    sx: {
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E5E7EB',
      '& .MuiIconButton-root': {
        color: '#374151 !important',
        '&:hover': {
          backgroundColor: '#F3F4F6',
          color: '#0c2b7a !important',
        },
      },
      '& .MuiSvgIcon-root': {
        color: '#374151',
      },
    },
  },
  muiBottomToolbarProps: {
    sx: {
      backgroundColor: '#FFFFFF',
      borderTop: '1px solid #E5E7EB',
      '& .MuiIconButton-root': {
        color: '#374151 !important',
        '&:hover': {
          backgroundColor: '#F3F4F6',
          color: '#0c2b7a !important',
        },
      },
      '& .MuiSvgIcon-root': {
        color: '#374151',
      },
    },
  },

  muiTableContainerProps: {
    sx: {
      maxHeight: 'calc(100vh - 350px)',
      backgroundColor: '#FFFFFF',
      '& .MuiTableSortLabel-root': {
        color: '#374151 !important',
        '&:hover': {
          color: '#0c2b7a !important',
        },
        '&.Mui-active': {
          color: '#0c2b7a !important',
        },
      },
      '& .MuiTableSortLabel-icon': {
        color: '#374151 !important',
        opacity: '1 !important',
      },
      '& .MuiSvgIcon-root': {
        color: '#374151 !important',
        opacity: '1 !important',
      },
      '& .MuiTableSortLabel-iconDirectionAsc': {
        color: '#374151 !important',
        opacity: '1 !important',
      },
      '& .MuiTableSortLabel-iconDirectionDesc': {
        color: '#374151 !important',
        opacity: '1 !important',
      },
    },
  },
  muiLinearProgressProps: {
    sx: {
      backgroundColor: '#E5E7EB',
      '& .MuiLinearProgress-bar': {
        backgroundColor: '#0c2b7a',
      },
    },
  },
  muiSearchTextFieldProps: {
    sx: {
      '& .MuiOutlinedInput-root': {
        backgroundColor: '#FFFFFF',
        color: '#111827',
        '& fieldset': {
          borderColor: '#E5E7EB',
        },
        '&:hover fieldset': {
          borderColor: '#0c2b7a',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#0c2b7a',
        },
      },
      '& .MuiInputLabel-root': {
        color: '#6B7280',
        '&.Mui-focused': {
          color: '#0c2b7a',
        },
      },
      '& .MuiInputBase-input': {
        color: '#111827',
      },
    },
  },
  muiFilterTextFieldProps: {
    sx: {
      '& .MuiOutlinedInput-root': {
        backgroundColor: '#FFFFFF',
        color: '#111827',
        '& fieldset': {
          borderColor: '#E5E7EB',
        },
        '&:hover fieldset': {
          borderColor: '#0c2b7a',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#0c2b7a',
        },
      },
      '& .MuiInputLabel-root': {
        color: '#6B7280',
        '&.Mui-focused': {
          color: '#0c2b7a',
        },
      },
      '& .MuiInputBase-input': {
        color: '#111827',
      },
      '& .MuiSelect-select': {
        color: '#111827',
      },
    },
  },
  muiSelectCheckboxProps: {
    sx: {
      color: '#0c2b7a',
    },
  },
  muiSelectAllCheckboxProps: {
    sx: {
      color: '#0c2b7a',
    },
  },
  muiPaginationProps: {
    sx: {
      backgroundColor: '#FFFFFF',
      color: '#374151',
      '& .MuiTablePagination-selectLabel': {
        color: '#374151',
      },
      '& .MuiTablePagination-displayedRows': {
        color: '#374151',
      },
      '& .MuiSelect-select': {
        color: '#111827',
      },
    },
  },
  muiColumnActionsButtonProps: {
    sx: {
      color: '#374151',
      '&:hover': {
        backgroundColor: '#F3F4F6',
      },
    },
  },
  muiFilterSliderProps: {
    sx: {
      '& .MuiSlider-thumb': {
        color: '#0c2b7a',
      },
      '& .MuiSlider-track': {
        color: '#0c2b7a',
      },
      '& .MuiSlider-rail': {
        color: '#E5E7EB',
      },
    },
  },
  muiFilterDatePickerProps: {
    sx: {
      '& .MuiOutlinedInput-root': {
        backgroundColor: '#FFFFFF',
        color: '#111827',
      },
      '& .MuiInputLabel-root': {
        color: '#6B7280',
      },
    },
  },



};

