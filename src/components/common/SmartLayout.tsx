import { Box } from '@mui/material';
import React from 'react';

export const SmartRow = ({ children, spacing = 2 }: { children: React.ReactNode; spacing?: number }) => (
    <Box sx={{ display: 'flex', gap: spacing, mb: spacing, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        {children}
    </Box>
);

export const SmartField = ({ children, flex = 1 }: { children: React.ReactNode; flex?: number | string }) => (
    <Box sx={{ flex, minWidth: { xs: '100%', md: '0' } }}>
        {children}
    </Box>
);
