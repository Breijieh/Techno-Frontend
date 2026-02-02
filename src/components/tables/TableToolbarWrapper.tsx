import React from 'react';
import { Box } from '@mui/material';
import { type MRT_TableInstance } from 'material-react-table';
import { TableSearch } from './TableSearch';
import { QuickFilterBar, type QuickFilterGroup } from './QuickFilterBar';

interface TableToolbarWrapperProps<TData extends Record<string, any> = {}> {
    table: MRT_TableInstance<TData>;
    children?: React.ReactNode;
    showQuickFilters?: boolean;
    quickFilterGroups?: QuickFilterGroup[];
}

export const TableToolbarWrapper = <TData extends Record<string, any>>({
    table,
    children,
    showQuickFilters = true,
    quickFilterGroups,
}: TableToolbarWrapperProps<TData>) => {
    return (
        <Box dir="rtl" sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 1, direction: 'rtl' }}>
            {/* Top Action Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>

                {/* Right Side (RTL): Search */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableSearch table={table} />
                </Box>

                {/* Left Side (RTL): Custom Actions (Export, New, Fullscreen passed as children) */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: 'row-reverse' }}>
                    {children}
                </Box>
            </Box>

            {/* Quick Filter Bar (On its own row) */}
            {showQuickFilters && (
                <Box sx={{ mt: 1, pt: 0.5 }}>
                    <QuickFilterBar table={table} groups={quickFilterGroups} />
                </Box>
            )}
        </Box>
    );
};
