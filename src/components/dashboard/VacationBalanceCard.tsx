'use client';

import { Paper, Typography, Box, CircularProgress } from '@mui/material';
import { BeachAccess } from '@mui/icons-material';

interface VacationBalanceCardProps {
    balance: number;
}

export default function VacationBalanceCard({ balance }: VacationBalanceCardProps) {
    // Assuming standard 30 days yearly balance for calculation of percentage
    // If backend provided total entitlement, we would use that.
    const totalEntitlement = 30;
    const percentage = Math.min(100, Math.max(0, (balance / totalEntitlement) * 100));

    return (
        <Paper
            sx={{
                padding: 3,
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                animation: 'fadeInUp 0.6s ease-out 0.8s both',
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
                        رصيد الإجازات
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: '#6B7280', mt: 0.5 }}>
                        الأيام المتاحة لك
                    </Typography>
                </Box>
                <Box
                    sx={{
                        bgcolor: '#EFF6FF',
                        p: 1,
                        borderRadius: '12px',
                        color: '#3B82F6'
                    }}
                >
                    <BeachAccess />
                </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2, position: 'relative' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                        variant="determinate"
                        value={100}
                        size={120}
                        thickness={4}
                        sx={{ color: '#F3F4F6' }}
                    />
                    <CircularProgress
                        variant="determinate"
                        value={percentage}
                        size={120}
                        thickness={4}
                        sx={{
                            color: percentage > 20 ? '#3B82F6' : '#EF4444',
                            position: 'absolute',
                            left: 0,
                            '& .MuiCircularProgress-circle': {
                                strokeLinecap: 'round',
                            },
                        }}
                    />
                    <Box
                        sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                        }}
                    >
                        <Typography variant="h4" component="div" sx={{ fontWeight: 800, color: '#111827' }}>
                            {balance}
                        </Typography>
                        <Typography variant="caption" component="div" sx={{ color: '#6B7280' }}>
                            يوم
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ mt: 'auto', pt: 2 }}>
                <Typography sx={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center' }}>
                    يمكنك تقديم طلب إجازة في أي وقت
                </Typography>
            </Box>
        </Paper>
    );
}
