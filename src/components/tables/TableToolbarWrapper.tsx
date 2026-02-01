import React, { useState } from 'react';
import { Box, Button, Tooltip, IconButton, useTheme, alpha } from '@mui/material';
import { FilterList } from '@mui/icons-material';
import { type MRT_TableInstance } from 'material-react-table';
import { SmartFilterModal } from './SmartFilterModal';
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
    const [isSmartFilterOpen, setIsSmartFilterOpen] = useState(false);
    const theme = useTheme();

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>
            {/* Top Action Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>

                {/* Left Side: Advanced Filter Button & Search */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableSearch table={table} />
                    <Button
                        startIcon={<FilterList />}
                        variant="outlined"
                        onClick={() => setIsSmartFilterOpen(true)}
                        sx={{
                            borderColor: theme.palette.divider,
                            color: theme.palette.text.secondary,
                            textTransform: 'none',
                            fontWeight: 600,
                            height: '40px', // Match Search height
                            '&:hover': {
                                borderColor: theme.palette.primary.main,
                                color: theme.palette.primary.main,
                                backgroundColor: theme.palette.action.hover,
                            },
                        }}
                    >
                        تصفية متقدمة
                    </Button>
                </Box>

                {/* Right Side: Custom Actions (Export, New, Fullscreen passed as children) */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {children}
                </Box>
            </Box>

            {/* Smart Filter Modal */}
            <SmartFilterModal
                open={isSmartFilterOpen}
                onClose={() => setIsSmartFilterOpen(false)}
                table={table}
            />

            {/* Quick Filter Bar (On its own row) */}
            {showQuickFilters && (
                <Box sx={{ mt: 1, pt: 0.5 }}>
                    <QuickFilterBar table={table} groups={quickFilterGroups} />
                </Box>
            )}
        </Box>
    );
};
