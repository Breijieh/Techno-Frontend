'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';

interface LegendItem {
    name: string;
    color: string;
    active?: boolean;
}

interface ChartLegendProps {
    data: LegendItem[];
    onToggle?: (name: string) => void;
    direction?: 'rtl' | 'ltr';
}

/**
 * Custom Flexbox-based Legend for ECharts
 * Solves RTL alignment issues where labels and icons overlap or misalign.
 */
const ChartLegend: React.FC<ChartLegendProps> = ({ data, onToggle, direction = 'rtl' }) => {
    const isRtl = direction === 'rtl';

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 3,
                mt: 2,
                px: 2,
                direction: direction,
            }}
        >
            {data.map((item) => (
                <Box
                    key={item.name}
                    onClick={() => onToggle?.(item.name)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: onToggle ? 'pointer' : 'default',
                        opacity: item.active !== false ? 1 : 0.5,
                        transition: 'opacity 0.2s ease',
                        userSelect: 'none',
                        '&:hover': {
                            opacity: onToggle ? 0.8 : 1,
                        },
                    }}
                >
                    {/* Label and Icon Container */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            flexDirection: isRtl ? 'row' : 'row-reverse',
                            gap: 1.5,
                        }}
                    >
                        {/* Rounded Rectangle Indicator */}
                        <Box
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '2px',
                                backgroundColor: item.color,
                                border: '2px solid #fff',
                                flexShrink: 0,
                            }}
                        />

                        {/* Word (Label) */}
                        <Typography
                            sx={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#4B5563',
                                lineHeight: 1,
                            }}
                        >
                            {item.name}
                        </Typography>
                    </Box>
                </Box>
            ))}
        </Box>
    );
};

export default ChartLegend;
