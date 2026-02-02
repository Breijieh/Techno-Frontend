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
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>
            {/* Top Action Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>

                {/* Left Side: Search */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableSearch table={table} />
                </Box>

                {/* Right Side: Custom Actions (Export, New, Fullscreen passed as children) */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
