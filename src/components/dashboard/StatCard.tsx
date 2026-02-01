'use client';

import { Box, Typography, Paper } from '@mui/material';
import { TrendingUp } from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string;
  percentage: string;
  delay: number;
}

export default function StatCard({ title, value, percentage, delay }: StatCardProps) {
  return (
    <Paper
      sx={{
        padding: '20px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        },
        transition: 'all 0.2s ease',
        animation: `fadeInUp 0.6s ease-out ${delay}s both`,
        '@keyframes fadeInUp': {
          from: {
            opacity: 0,
            transform: 'translateY(20px)',
          },
          to: {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
      }}
    >
      <Typography sx={{ fontSize: '13px', color: '#6B7280', fontWeight: 500, mb: 2 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: '28px', fontWeight: 700, color: '#111827', mb: 1 }}>
        {value}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <TrendingUp sx={{ fontSize: '14px', color: '#10B981' }} />
        <Typography sx={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>
          {percentage}
        </Typography>
        <Typography sx={{ fontSize: '12px', color: '#9CA3AF' }}>
          مقارنة بالشهر الماضي
        </Typography>
      </Box>
    </Paper>
  );
}

