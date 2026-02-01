'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Slider, Typography, useTheme, alpha } from '@mui/material';
import { type MRT_Column, type MRT_RowData, type MRT_TableInstance } from 'material-react-table';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface RangeSliderFilterProps<TData extends MRT_RowData> {
    column: MRT_Column<TData>;
    table: MRT_TableInstance<TData>;
}

/**
 * Custom Range Slider Filter component for Material React Table
 * Replaces the default min/max text fields with a slider
 */
export function RangeSliderFilter<TData extends MRT_RowData>({
    column,
    table,
}: RangeSliderFilterProps<TData>) {
    const theme = useTheme();
    const columnFilterValue = column.getFilterValue() as [number, number] | undefined;

    // Calculate min/max from data
    const { min, max } = useMemo(() => {
        const rows = table.getPreFilteredRowModel().rows;
        let minVal = Infinity;
        let maxVal = -Infinity;

        rows.forEach((row) => {
            const value = row.getValue<number>(column.id);
            if (typeof value === 'number' && !isNaN(value)) {
                minVal = Math.min(minVal, value);
                maxVal = Math.max(maxVal, value);
            }
        });

        // Handle edge cases
        if (minVal === Infinity) minVal = 0;
        if (maxVal === -Infinity) maxVal = 100;
        if (minVal === maxVal) maxVal = minVal + 1;

        return { min: Math.floor(minVal), max: Math.ceil(maxVal) };
    }, [table, column.id]);

    // Local state for slider value (before debounce)
    const [value, setValue] = useState<[number, number]>([min, max]);

    // Sync with column filter value
    useEffect(() => {
        if (columnFilterValue) {
            setValue([
                columnFilterValue[0] ?? min,
                columnFilterValue[1] ?? max
            ]);
        } else {
            setValue([min, max]);
        }
    }, [columnFilterValue, min, max]);

    const handleChange = (_: Event, newValue: number | number[]) => {
        setValue(newValue as [number, number]);
    };

    const handleChangeCommitted = (_: React.SyntheticEvent | Event, newValue: number | number[]) => {
        const [newMin, newMax] = newValue as [number, number];

        // Only set filter if values are different from the full range
        if (newMin === min && newMax === max) {
            column.setFilterValue(undefined);
        } else {
            column.setFilterValue([newMin, newMax]);
        }
    };

    // Format value for display
    const formatValue = (val: number): string => {
        if (val >= 1000000) {
            return `${(val / 1000000).toFixed(1)}M`;
        } else if (val >= 1000) {
            return `${(val / 1000).toFixed(1)}K`;
        }
        return formatNumber(val);
    };

    return (
        <Box
            sx={{
                px: 2,
                py: 1,
                minWidth: 180,
                maxWidth: 280,
            }}
        >
            {/* Value display */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        color: theme.palette.text.secondary,
                        fontWeight: 600,
                        fontSize: '11px',
                    }}
                >
                    {formatValue(value[0])}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        color: theme.palette.text.secondary,
                        fontWeight: 500,
                        fontSize: '10px',
                    }}
                >
                    —
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        color: theme.palette.text.secondary,
                        fontWeight: 600,
                        fontSize: '11px',
                    }}
                >
                    {formatValue(value[1])}
                </Typography>
            </Box>

            {/* Slider */}
            <Slider
                value={value}
                onChange={handleChange}
                onChangeCommitted={handleChangeCommitted}
                valueLabelDisplay="auto"
                valueLabelFormat={formatValue}
                min={min}
                max={max}
                size="small"
                sx={{
                    color: theme.palette.primary.main,
                    '& .MuiSlider-thumb': {
                        width: 14,
                        height: 14,
                        backgroundColor: '#fff',
                        border: `2px solid ${theme.palette.primary.main}`,
                        '&:hover, &.Mui-focusVisible': {
                            boxShadow: `0 0 0 6px ${alpha(theme.palette.primary.main, 0.16)}`,
                        },
                    },
                    '& .MuiSlider-track': {
                        height: 4,
                        borderRadius: 2,
                    },
                    '& .MuiSlider-rail': {
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.divider, 0.4),
                    },
                    '& .MuiSlider-valueLabel': {
                        fontSize: '10px',
                        padding: '2px 6px',
                        backgroundColor: theme.palette.primary.main,
                        borderRadius: '4px',
                    },
                }}
            />

            {/* Range labels */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mt: 0.5,
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        color: alpha(theme.palette.text.secondary, 0.6),
                        fontSize: '9px',
                    }}
                >
                    {formatValue(min)}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        color: alpha(theme.palette.text.secondary, 0.6),
                        fontSize: '9px',
                    }}
                >
                    {formatValue(max)}
                </Typography>
            </Box>
        </Box>
    );
}

export default RangeSliderFilter;
