import React, { useMemo } from 'react';
import { Box, Chip, Typography, useTheme, alpha, Stack } from '@mui/material';
import { type MRT_TableInstance } from 'material-react-table';
import {
    FilterList,
    CheckCircle,
    Loop,
    Block,
    ErrorOutline,
    PauseCircleOutline,
    DoneAll,
    FiberManualRecord,
    History,
    WorkOutline
} from '@mui/icons-material';

export interface QuickFilterOption {
    label: string;
    value: any;
    color?: string;
    icon?: React.ReactElement;
}

export interface QuickFilterGroup {
    id: string;
    label?: string;
    options: QuickFilterOption[];
}

interface QuickFilterBarProps<TData extends Record<string, any> = {}> {
    table: MRT_TableInstance<TData>;
    groups?: QuickFilterGroup[];
    // Legacy support for single status column
    statusColumnId?: string;
    customOptions?: QuickFilterOption[];
}

export const QuickFilterBar = <TData extends Record<string, any>>({
    table,
    groups: propGroups,
    statusColumnId = 'status',
    customOptions,
}: QuickFilterBarProps<TData>) => {
    const theme = useTheme();

    // Comprehensive default status mappings
    const defaultStatusOptions: QuickFilterOption[] = useMemo(
        () => [
            { label: 'نشط', value: 'ACTIVE', color: '#10B981', icon: <CheckCircle fontSize="inherit" /> },
            { label: 'قيد الانتظار', value: 'PENDING', color: '#F59E0B', icon: <Loop fontSize="inherit" /> },
            { label: 'في إجازة', value: 'ON_LEAVE', color: '#6366F1', icon: <PauseCircleOutline fontSize="inherit" /> },
            { label: 'موافق عليه', value: 'APPROVED', color: '#059669', icon: <DoneAll fontSize="inherit" /> },
            { label: 'قيد التنفيذ', value: 'IN_PROGRESS', color: '#3B82F6', icon: <History fontSize="inherit" /> },
            { label: 'مرفوض', value: 'REJECTED', color: '#EF4444', icon: <ErrorOutline fontSize="inherit" /> },
            { label: 'غير نشط', value: 'INACTIVE', color: '#6B7280', icon: <Block fontSize="inherit" /> },
            { label: 'منتهي', value: 'TERMINATED', color: '#374151', icon: <FiberManualRecord fontSize="inherit" /> },
        ],
        []
    );

    // Formulate final groups to render
    const groups = useMemo(() => {
        let finalGroups: QuickFilterGroup[] = [];

        if (propGroups) {
            finalGroups = propGroups;
        } else {
            // Fallback or legacy construction
            const columnId = statusColumnId;
            const options = customOptions || defaultStatusOptions;
            finalGroups = [
                {
                    id: columnId,
                    label: 'الحالة',
                    options: options
                }
            ];
        }

        // CRITICAL: Filter out groups that don't exist in the table to avoid MRT warnings
        const allColumnIds = new Set(table.getAllColumns().map(col => col.id));
        return finalGroups.filter(group => allColumnIds.has(group.id));
    }, [propGroups, statusColumnId, customOptions, defaultStatusOptions, table]);

    const handleFilterClick = (columnId: string, value: any) => {
        const column = table.getColumn(columnId);
        if (!column) return;

        const currentFilterValue = column.getFilterValue();

        // Check if this value is already selected
        // Handle both array and single-value filter states
        const isCurrentlySelected = Array.isArray(currentFilterValue)
            ? currentFilterValue.includes(value)
            : currentFilterValue === value;

        if (isCurrentlySelected) {
            // Clear the filter
            column.setFilterValue(undefined);
        } else {
            // Set filter as array for multi-select compatibility
            // This ensures arrIncludesSome filter function works correctly
            column.setFilterValue([value]);
        }
    };

    const handleClearGroup = (columnId: string) => {
        table.getColumn(columnId)?.setFilterValue(undefined);
    };

    return (
        <Stack direction="row" spacing={3} sx={{
            mb: 0.5,
            overflowX: 'auto',
            pb: 0.5,
            flex: 1,
            '&::-webkit-scrollbar': { height: '4px' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: alpha(theme.palette.divider, 0.2), borderRadius: '4px' }
        }}>
            {groups.map((group) => {
                const column = table.getColumn(group.id);
                if (!column) return null;

                const currentFilterValue = column.getFilterValue();

                return (
                    <Box key={group.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FilterList fontSize="small" sx={{ color: theme.palette.text.secondary, fontSize: '0.9rem' }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                {group.label || 'تصفية'}:
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                                label="الكل"
                                size="small"
                                onClick={() => handleClearGroup(group.id)}
                                variant={currentFilterValue === undefined ? 'filled' : 'outlined'}
                                sx={{
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    height: '26px',
                                    px: 0.5,
                                    transition: 'all 0.2s',
                                    ...(currentFilterValue === undefined ? {
                                        backgroundColor: theme.palette.primary.main,
                                        color: '#FFF',
                                        '&:hover': { backgroundColor: theme.palette.primary.dark },
                                    } : {
                                        borderColor: alpha(theme.palette.divider, 0.8),
                                        '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.05) },
                                    })
                                }}
                            />
                            {group.options.map((option) => {
                                // Handle both array and single-value filter states
                                const isSelected = Array.isArray(currentFilterValue)
                                    ? currentFilterValue.includes(option.value)
                                    : currentFilterValue === option.value;
                                const optionColor = option.color || theme.palette.primary.main;

                                return (
                                    <Chip
                                        key={option.label}
                                        label={option.label}
                                        size="small"
                                        icon={React.isValidElement(option.icon) ? React.cloneElement(option.icon as React.ReactElement<any>, {
                                            style: { color: isSelected ? '#FFF' : optionColor, fontSize: '13px' }
                                        }) : undefined}
                                        onClick={() => handleFilterClick(group.id, option.value)}
                                        variant={isSelected ? 'filled' : 'outlined'}
                                        sx={{
                                            fontWeight: 600,
                                            borderRadius: '6px',
                                            height: '26px',
                                            px: 0.5,
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s',
                                            borderColor: isSelected ? 'transparent' : alpha(optionColor, 0.3),
                                            backgroundColor: isSelected ? optionColor : 'transparent',
                                            color: isSelected ? '#FFF' : alpha(theme.palette.text.primary, 0.8),
                                            '&:hover': {
                                                backgroundColor: isSelected ? optionColor : alpha(optionColor, 0.08),
                                                borderColor: optionColor,
                                                transform: 'translateY(-1px)',
                                            },
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    </Box>
                );
            })}
        </Stack>
    );
};
