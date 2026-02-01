import React, { useMemo } from 'react';
import {
    Box,
    Button,
    Drawer,
    IconButton,
    TextField,
    Typography,
    Stack,
    Chip,
    FormControl,
    Select,
    MenuItem,
    OutlinedInput,
    InputLabel,
    ThemeProvider,
    createTheme,
    Slider,
    alpha,
    Autocomplete,
} from '@mui/material';
import { Close, RestartAlt, FilterAlt } from '@mui/icons-material';
import { type MRT_TableInstance } from 'material-react-table';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface SmartFilterModalProps<TData extends Record<string, any> = {}> {
    open: boolean;
    onClose: () => void;
    table: MRT_TableInstance<TData>;
}

export const SmartFilterModal = <TData extends Record<string, any>>({
    open,
    onClose,
    table,
}: SmartFilterModalProps<TData>) => {
    const handleClearAll = () => {
        table.resetColumnFilters();
    };

    const columns = table.getAllColumns().filter((col) => col.getCanFilter());

    // Generate unique options for Select fields
    const filterOptions = useMemo(() => {
        const options: Record<string, { value: any; label: string }[]> = {};
        const rows = table.getPrePaginationRowModel().rows;

        columns.forEach(col => {
            const lowerId = col.id.toLowerCase();
            const colDef = col.columnDef as any;

            // 1. Check for manual override in meta.filterOptions
            if (colDef.meta?.filterOptions) {
                options[col.id] = colDef.meta.filterOptions;
                return;
            }

            // 2. Automated extraction for Selects
            if (
                lowerId.includes('status') ||
                lowerId.includes('type') ||
                lowerId.includes('contract') ||
                lowerId.includes('nationality') ||
                lowerId.includes('gender') ||
                colDef.filterVariant === 'select' ||
                colDef.filterVariant === 'multi-select'
            ) {
                const map = new Map<any, string>();
                rows.forEach(row => {
                    const val = row.getValue(col.id);
                    if (val !== undefined && val !== null && val !== '') {
                        // Extract label using meta.getFilterLabel or heuristic
                        let label = val.toString();
                        if (colDef.meta?.getFilterLabel) {
                            label = colDef.meta.getFilterLabel(row.original);
                        } else if (typeof val === 'string') {
                            // Basic heuristic for common enums if not mapped
                            if (val === 'ACTIVE') label = 'نشط';
                            else if (val === 'INACTIVE') label = 'غير نشط';
                            else if (val === 'PENDING') label = 'قيد الانتظار';
                            else if (val === 'APPROVED') label = 'موافق عليه';
                            else if (val === 'REJECTED') label = 'مرفوض';
                        }
                        map.set(val, label);
                    }
                });

                // Sort by label safely
                options[col.id] = Array.from(map.entries())
                    .map(([value, label]) => ({ value, label }))
                    .sort((a, b) => a.label.localeCompare(b.label, 'ar'));
            }
        });
        return options;
    }, [table, columns]);

    const ltrTheme = useMemo(
        () =>
            createTheme({
                direction: 'ltr',
                typography: {
                    fontFamily: '"El Messiri", var(--font-tajawal), sans-serif',
                },
                components: {
                    MuiDrawer: {
                        defaultProps: {
                            anchor: 'left',
                        }
                    }
                }
            }),
        [],
    );

    return (
        <ThemeProvider theme={ltrTheme}>
            <Drawer
                anchor="left"
                open={open}
                onClose={onClose}
                dir="ltr"
                PaperProps={{
                    sx: { width: { xs: '100%', sm: 420 }, padding: 0 },
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', direction: 'rtl' }}>
                    {/* Header */}
                    <Box
                        sx={{
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #E5E7EB',
                            backgroundColor: '#F9FAFB',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FilterAlt color="primary" />
                            <Typography variant="h6" fontWeight={700} color="text.primary">
                                تصفية متقدمة
                            </Typography>
                        </Box>
                        <IconButton onClick={onClose} size="small">
                            <Close />
                        </IconButton>
                    </Box>

                    {/* Filters Body */}
                    <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                        <Stack spacing={4}>
                            {columns.map((column) => {
                                const { id, columnDef } = column;
                                const header = columnDef.header;
                                const filterValue = column.getFilterValue();
                                const lowerId = id.toLowerCase();

                                // --- Improved Heuristics ---

                                // 1. Select / Tag Cloud
                                const isSelect =
                                    columnDef.filterVariant === 'select' ||
                                    columnDef.filterVariant === 'multi-select' ||
                                    (columnDef.filterVariant === undefined && (
                                        lowerId.includes('status') ||
                                        lowerId.includes('type') ||
                                        lowerId.includes('contract')
                                    ));

                                // 2. Date Range
                                // STRICT logic: Must have 'date' in name, or be exactly 'dob', or end with '_at'.
                                // Excludes 'nationality', 'vacation', etc.
                                const isDate =
                                    columnDef.filterVariant === 'date' ||
                                    columnDef.filterVariant === 'date-range' ||
                                    (columnDef.filterVariant === undefined && (
                                        lowerId.includes('date') ||
                                        lowerId.endsWith('_at') ||
                                        lowerId === 'dob'
                                    ));

                                // 3. Number Range
                                // Check first value type OR key words like salary, balance, amount.
                                const firstValue = table.getPrePaginationRowModel().rows[0]?.getValue(id);
                                const isNumber =
                                    columnDef.filterVariant === 'range' ||
                                    columnDef.filterVariant === 'range-slider' ||
                                    (columnDef.filterVariant === undefined && (
                                        typeof firstValue === 'number' ||
                                        lowerId.includes('salary') ||
                                        lowerId.includes('balance') ||
                                        lowerId.includes('amount') ||
                                        lowerId.includes('rate')
                                    ));

                                return (
                                    <Box key={id}>
                                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#1F2937' }}>
                                            {header}
                                        </Typography>

                                        {isSelect ? (
                                            <Autocomplete
                                                multiple
                                                id={`autocomplete-${id}`}
                                                options={filterOptions[id] || []}
                                                getOptionLabel={(option) => option.label}
                                                value={
                                                    (filterValue as any[])?.map(val =>
                                                        filterOptions[id]?.find(opt => opt.value === val) || { value: val, label: val }
                                                    ) || []
                                                }
                                                onChange={(_, newValue) => {
                                                    column.setFilterValue(newValue.map(v => v.value));
                                                }}
                                                disableCloseOnSelect
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        variant="outlined"
                                                        label={header}
                                                        placeholder={`بحث في ${header}...`}
                                                        size="small"
                                                    />
                                                )}
                                                renderTags={(value, getTagProps) =>
                                                    value.map((option, index) => {
                                                        const { key, ...tagProps } = getTagProps({ index });
                                                        return (
                                                            <Chip
                                                                key={key}
                                                                label={option.label}
                                                                size="small"
                                                                {...tagProps}
                                                            />
                                                        );
                                                    })}
                                                isOptionEqualToValue={(option, value) => option.value === value.value}
                                                noOptionsText="لا توجد نتائج"
                                            />
                                        ) : isDate ? (
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <TextField
                                                    label="من"
                                                    type="date"
                                                    size="small"
                                                    fullWidth
                                                    InputLabelProps={{ shrink: true }}
                                                    // MRT date range expectation: [start, end]
                                                    value={(filterValue as any[])?.[0] ?? ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const current = (filterValue as any[]) || [undefined, undefined];
                                                        column.setFilterValue([val || undefined, current[1]]);
                                                    }}
                                                />
                                                <TextField
                                                    label="إلى"
                                                    type="date"
                                                    size="small"
                                                    fullWidth
                                                    InputLabelProps={{ shrink: true }}
                                                    value={(filterValue as any[])?.[1] ?? ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const current = (filterValue as any[]) || [undefined, undefined];
                                                        column.setFilterValue([current[0], val || undefined]);
                                                    }}
                                                />
                                            </Box>
                                        ) : isNumber ? (
                                            (() => {
                                                // Calculate min/max from data
                                                const rows = table.getPreFilteredRowModel().rows;
                                                let minVal = Infinity;
                                                let maxVal = -Infinity;
                                                rows.forEach((row) => {
                                                    const value = row.getValue<number>(id);
                                                    if (typeof value === 'number' && !isNaN(value)) {
                                                        minVal = Math.min(minVal, value);
                                                        maxVal = Math.max(maxVal, value);
                                                    }
                                                });
                                                if (minVal === Infinity) minVal = 0;
                                                if (maxVal === -Infinity) maxVal = 100;
                                                if (minVal === maxVal) maxVal = minVal + 1;
                                                const min = Math.floor(minVal);
                                                const max = Math.ceil(maxVal);

                                                const currentValue = filterValue as [number, number] | undefined;
                                                const sliderValue: [number, number] = [
                                                    currentValue?.[0] ?? min,
                                                    currentValue?.[1] ?? max
                                                ];

                                                const formatValue = (val: number): string => {
                                                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                                                    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
                                                    return formatNumber(val);
                                                };

                                                return (
                                                    <Box sx={{ px: 1 }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#374151' }}>
                                                                {formatValue(sliderValue[0])}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: '#9CA3AF' }}>—</Typography>
                                                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#374151' }}>
                                                                {formatValue(sliderValue[1])}
                                                            </Typography>
                                                        </Box>
                                                        <Slider
                                                            value={sliderValue}
                                                            onChange={(_, newValue) => {
                                                                const [newMin, newMax] = newValue as [number, number];
                                                                if (newMin === min && newMax === max) {
                                                                    column.setFilterValue(undefined);
                                                                } else {
                                                                    column.setFilterValue([newMin, newMax]);
                                                                }
                                                            }}
                                                            valueLabelDisplay="auto"
                                                            valueLabelFormat={formatValue}
                                                            min={min}
                                                            max={max}
                                                            size="small"
                                                            sx={{
                                                                color: '#0c2b7a',
                                                                '& .MuiSlider-thumb': {
                                                                    width: 16,
                                                                    height: 16,
                                                                    backgroundColor: '#fff',
                                                                    border: '2px solid #0c2b7a',
                                                                    '&:hover, &.Mui-focusVisible': {
                                                                        boxShadow: `0 0 0 6px ${alpha('#0c2b7a', 0.16)}`,
                                                                    },
                                                                },
                                                                '& .MuiSlider-track': {
                                                                    height: 4,
                                                                    borderRadius: 2,
                                                                },
                                                                '& .MuiSlider-rail': {
                                                                    height: 4,
                                                                    borderRadius: 2,
                                                                    backgroundColor: '#E5E7EB',
                                                                },
                                                                '& .MuiSlider-valueLabel': {
                                                                    fontSize: '11px',
                                                                    padding: '4px 8px',
                                                                    backgroundColor: '#0c2b7a',
                                                                    borderRadius: '6px',
                                                                },
                                                            }}
                                                        />
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                                            <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '10px' }}>
                                                                {formatValue(min)}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '10px' }}>
                                                                {formatValue(max)}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                );
                                            })()
                                        ) : (
                                            <TextField
                                                fullWidth
                                                size="small"
                                                variant="outlined"
                                                placeholder={`بحث في ${header}...`}
                                                value={filterValue ?? ''}
                                                onChange={(e) => column.setFilterValue(e.target.value)}
                                            />
                                        )}
                                    </Box>
                                );
                            })}

                            {columns.length === 0 && (
                                <Typography variant="body2" color="text.secondary" textAlign="center">
                                    لا توجد أعمدة قابلة للتصفية
                                </Typography>
                            )}
                        </Stack>
                    </Box>

                    {/* Footer */}
                    <Box
                        sx={{
                            p: 2,
                            borderTop: '1px solid #E5E7EB',
                            backgroundColor: '#F9FAFB',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 2,
                        }}
                    >
                        <Button
                            variant="outlined"
                            startIcon={<RestartAlt />}
                            onClick={handleClearAll}
                            color="inherit"
                            fullWidth
                        >
                            مسح الكل
                        </Button>
                        <Button
                            variant="contained"
                            onClick={onClose}
                            fullWidth
                            sx={{
                                background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
                                fontWeight: 600,
                            }}
                        >
                            تم
                        </Button>
                    </Box>
                </Box>
            </Drawer>
        </ThemeProvider>
    );
};
