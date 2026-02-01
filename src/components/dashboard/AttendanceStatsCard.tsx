'use client';

import { Paper, Typography, Box, Divider } from '@mui/material';
import { AccessTime, CheckCircle, Cancel, WatchLater } from '@mui/icons-material';

interface AttendanceStatsCardProps {
    present: number;
    absent: number;
    late: number;
    monthName: string;
}

export default function AttendanceStatsCard({ present, absent, late, monthName }: AttendanceStatsCardProps) {
    return (
        <Paper
            sx={{
                padding: 3,
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                height: '100%',
                animation: 'fadeInUp 0.6s ease-out 0.9s both',
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
                        إحصائيات الحضور
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: '#6B7280', mt: 0.5 }}>
                        ملخص شهر {monthName}
                    </Typography>
                </Box>
                <Box
                    sx={{
                        bgcolor: '#ECFDF5',
                        p: 1,
                        borderRadius: '12px',
                        color: '#10B981',
                    }}
                >
                    <AccessTime />
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                {/* Present Row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ bgcolor: '#ECFDF5', p: 0.8, borderRadius: '8px', display: 'flex' }}>
                            <CheckCircle sx={{ fontSize: 18, color: '#10B981' }} />
                        </Box>
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                            أيام الحضور
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                        {present}
                    </Typography>
                </Box>

                <Divider sx={{ borderStyle: 'dashed' }} />

                {/* Late Row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ bgcolor: '#FFFBEB', p: 0.8, borderRadius: '8px', display: 'flex' }}>
                            <WatchLater sx={{ fontSize: 18, color: '#F59E0B' }} />
                        </Box>
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                            تأخير
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                        {late}
                    </Typography>
                </Box>

                <Divider sx={{ borderStyle: 'dashed' }} />

                {/* Absent Row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ bgcolor: '#FEF2F2', p: 0.8, borderRadius: '8px', display: 'flex' }}>
                            <Cancel sx={{ fontSize: 18, color: '#EF4444' }} />
                        </Box>
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                            غياب
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                        {absent}
                    </Typography>
                </Box>

            </Box>
        </Paper>
    );
}
