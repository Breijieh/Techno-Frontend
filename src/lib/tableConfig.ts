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
  enableColumnFilters: true, // Enable column filters
  columnFilterDisplayMode: 'popover', // Use popover filters instead of a row
  enableFacetedValues: true, // Auto min/max for range, auto options for select
  enableColumnActions: false, // Remove the three dots menu to reduce clutter
  enableColumnFilterModes: false, // Disable filter mode switching icons
  enableColumnPinning: true, // Enable pinning globally
  enableStickyHeader: true, // Keep headers visible
  // Hide MRT's built-in toolbar elements (we use custom TableToolbarWrapper)
  enableGlobalFilter: true, // Keep functionality
  enableGlobalFilterModes: false, // Disable mode switching
  positionGlobalFilter: 'none', // Hide built-in search box
  enableToolbarInternalActions: true, // Keep density toggle etc
  initialState: {
    showColumnFilters: false,
    showGlobalFilter: false, // Hide global filter by default
    columnPinning: { right: ['mrt-row-actions'] }
  }, // Hide built-in column filters row and pin actions to the right
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
      overflowX: 'visible !important', // Force visible so internal TableContainer handles scrolling (for pinning)
      '&::-webkit-scrollbar': {
        width: '6px',
        height: '6px',
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: 'transparent',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#D1D5DB',
        borderRadius: '10px',
        '&:hover': {
          backgroundColor: '#9CA3AF',
        },
      },
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
      justifyContent: 'center !important', // Center content horizontally
      textAlign: 'center !important', // Fallback for text
      // Force all child divs/spans to be centered
      '& *': {
        textAlign: 'center !important',
      },
      // NEW: Layout optimization - Icons Left, Text Space Maximized
      '& .Mui-TableHeadCell-Content': {
        flexDirection: 'row-reverse !important', // Move icons to the left
        justifyContent: 'space-between !important',
        width: '100% !important',
        alignItems: 'center !important',
      },
      '& .Mui-TableHeadCell-Content-Labels': {
        flex: '1 !important', // Give maximum space to text
        justifyContent: 'center !important', // Keep text centered
        paddingLeft: '4px', // Add some spacing from icons
        paddingRight: '4px',
      },
      // Ensure title has minimum width to prevent squashing
      '& .Mui-TableHeadCell-Content-Wrapper': {
        minWidth: '8ch !important',
      },
      '& .Mui-TableHeadCell-Content-Actions': {
        flex: '0 0 auto !important', // Compress icons
        width: 'auto !important',
        // Make icons smaller and tighter
        '& .MuiIconButton-root': {
          padding: '2px !important',
          width: '24px !important',
          height: '24px !important',
          marginLeft: '-2px !important',
        },
        '& .MuiSvgIcon-root': {
          fontSize: '1.0rem !important',
        }
      },
      // End NEW configuration

      padding: '8px',
      backgroundColor: '#F9FAFB',
      fontWeight: 600,
      fontSize: '13px',
      color: '#374151',
      borderBottom: '1px solid #E5E7EB',
      borderLeft: '1px solid #E5E7EB', // Cell separator
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      '&:first-of-type': {
        borderLeft: 'none',
      },
      // Hide sort icons
      '& .MuiTableSortLabel-root': {
        color: '#374151',
        // pointerEvents: 'none', // Removed to allow interaction with icons if they are now primary indicators
        '&:hover': {
          color: '#374151',
        },
        '& .MuiTableSortLabel-icon': {
          display: 'none !important',
        },
      },
      // Target range filter containers to stack inputs vertically
      '& .MuiBox-root': {
        justifyContent: 'center', // Ensure nested flex containers are grounded
        '&:has(> .MuiTextField-root)': {
          flexDirection: 'column !important',
          gap: '4px !important',
          width: '100% !important',
          '& .MuiTextField-root': {
            width: '100% !important',
            minWidth: '0 !important',
          }
        }
      },
      // Targets specifically MRT range filter containers if they use classes
      '& .mrt-filter-range-fields': {
        flexDirection: 'column !important',
        gap: '4px !important',
        width: '100% !important',
        '& .MuiTextField-root': {
          width: '100% !important',
          minWidth: '0 !important',
        }
      }
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
      textAlign: 'center !important', // Force text align
      justifyContent: 'center !important', // Force flex center
      fontSize: '13px',
      color: '#111827',
      borderBottom: '1px solid #F3F4F6',
      borderLeft: '1px solid #F3F4F6', // Cell separator
      backgroundColor: '#FFFFFF',
      '&:first-of-type': {
        borderLeft: 'none',
      },
      // Ensure content within is also centered if it's a flex container
      '& .MuiBox-root': {
        justifyContent: 'center !important',
        textAlign: 'center !important',
        width: '100%',
      },
      // Force all child divs/spans to be centered
      '& *': {
        textAlign: 'center !important',
      }
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
      overflow: 'auto', // Explicit scroll container for pinning
      backgroundColor: '#FFFFFF',
      '&::-webkit-scrollbar': {
        width: '6px',
        height: '6px',
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: 'transparent',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#D1D5DB',
        borderRadius: '10px',
        '&:hover': {
          backgroundColor: '#9CA3AF',
        },
      },
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
        fontSize: '11px',
        '& fieldset': {
          borderColor: '#E5E7EB',
        },
        '&:hover fieldset': {
          borderColor: '#0c2b7a',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#0c2b7a',
        },
        '& .MuiInputBase-input': {
          padding: '4px 8px',
        },
      },
      '& .MuiInputLabel-root': {
        color: '#6B7280',
        fontSize: '9px !important',
        '&.Mui-focused': {
          color: '#0c2b7a',
        },
      },
      '& input::placeholder': {
        fontSize: '9px !important',
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
        fontSize: '10px', // Tightened font
        minWidth: '40px', // Allow extreme shrinking
        '& fieldset': {
          borderColor: '#E5E7EB',
        },
        '&:hover fieldset': {
          borderColor: '#0c2b7a',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#0c2b7a',
        },
        '& .MuiInputBase-input': {
          padding: '4px 6px',
          height: '1.2em', // Smaller height
        },
      },
      '& .MuiInputLabel-root': {
        color: '#6B7280',
        fontSize: '9px !important',
        top: '-4px',
        '&.Mui-focused': {
          color: '#0c2b7a',
        },
      },
      '& input::placeholder': {
        fontSize: '9px !important',
      },
      '& .MuiFormLabel-root': {
        fontSize: '9px !important',
      },
      '& .MuiInputBase-input': {
        color: '#111827',
      },
      '& .MuiSelect-select': {
        color: '#111827',
        fontSize: '11px',
        padding: '4px 24px 4px 6px !important',
      },
    },
  },
  muiFilterAutocompleteProps: () => ({
    sx: {
      '& .MuiOutlinedInput-root': {
        backgroundColor: '#FFFFFF',
        color: '#111827',
        fontSize: '11px',
        padding: '0 4px !important',
        '& .MuiInputBase-input': {
          padding: '4px 6px !important',
        },
      },
    },
  }) as any,
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
        fontSize: '11px',
        '& .MuiInputBase-input': {
          padding: '4px 6px',
        },
      },
      '& .MuiInputLabel-root': {
        color: '#6B7280',
        fontSize: '9px !important',
      },
      '& input::placeholder': {
        fontSize: '9px !important',
      },
    },
  },



};

