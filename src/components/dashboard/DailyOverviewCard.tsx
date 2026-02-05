'use client';

import { Box, Typography, Paper, Chip, Stack, LinearProgress } from '@mui/material';
import {
    Schedule,
    LocationOn,
    CheckCircle,
    ErrorOutline,
    EventAvailable,
    WbSunny,
    Hotel,
    Login,
    Logout,
    TrendingFlat
} from '@mui/icons-material';
import type { DailyOverviewDto } from '@/lib/api/attendance';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatTime } from '@/lib/utils/dateFormatter';

interface DailyOverviewCardProps {
    overview: DailyOverviewDto;
    loading?: boolean;
}

export default function DailyOverviewCard({ overview, loading }: DailyOverviewCardProps) {
    if (loading) {
        return (
            <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                <LinearProgress />
            </Paper>
        );
    }

    const getDayStatus = () => {
        // Use backend provided status and color if available
        if (overview.statusAr) {
            return {
                label: overview.statusAr,
                color: overview.statusColor || '#10B981',
                icon: overview.isHoliday ? <WbSunny /> : overview.isWeekend ? <Hotel /> : !overview.projectCode ? <Schedule /> : <EventAvailable />,
                bg: (overview.statusColor || '#10B981') + '10' // 10% opacity for background
            };
        }

        if (overview.isHoliday) return { label: 'عطلة رسمية', color: '#F59E0B', icon: <WbSunny />, bg: '#FFFBEB' };
        if (overview.isWeekend) return { label: 'عطلة نهاية الأسبوع', color: '#6B7280', icon: <Hotel />, bg: '#F3F4F6' };
        if (overview.isWorkDay && !overview.projectCode) return { label: 'بانتظار تكليف بمشروع', color: '#EF4444', icon: <ErrorOutline />, bg: '#FEF2F2' };
        return { label: 'يوم عمل', color: '#10B981', icon: <EventAvailable />, bg: '#ECFDF5' };
    };

    const status = getDayStatus();
    const attendance = overview.attendance;
    const isCheckedIn = !!attendance?.entryTime;
    const isCheckedOut = !!attendance?.exitTime;

    return (
        <Paper
            sx={{
                p: 0,
                borderRadius: '24px',
                overflow: 'hidden',
                border: '1px solid #E5E7EB',
                background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
            }}
        >
            <Box sx={{ p: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
                    {/* Work Status & Date */}
                    <Stack spacing={1} sx={{ minWidth: 200 }}>
                        <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
                            {format(new Date(overview.date), 'EEEE, d MMMM yyyy', { locale: ar })}
                        </Typography>
                        <Chip
                            icon={status.icon}
                            label={overview.isHoliday ? `${status.label}: ${overview.holidayName}` : status.label}
                            sx={{
                                bgcolor: status.bg,
                                color: status.color,
                                fontWeight: 700,
                                px: 1,
                                '& .MuiChip-icon': { color: 'inherit' },
                                width: 'fit-content'
                            }}
                        />
                    </Stack>

                    {/* Project Info */}
                    <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <LocationOn sx={{ color: '#0c2b7a' }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
                                {overview.projectName || (overview.isWorkDay ? 'قيد انتظار تحديد مشروع العمل' : 'لا يوجد متطلبات عمل حالياً')}
                            </Typography>
                        </Stack>
                        {overview.projectCode && (
                            <Typography variant="caption" sx={{ color: '#6B7280', bgcolor: '#F3F4F6', px: 1, borderRadius: '4px' }}>
                                رمز المشروع: {overview.projectCode}
                            </Typography>
                        )}
                    </Stack>

                    {/* Attendance Status */}
                    <Stack direction="row" spacing={1} alignItems="stretch">
                        <Box sx={{
                            p: 2,
                            borderRadius: '16px',
                            bgcolor: isCheckedIn ? '#ECFDF5' : '#F9FAFB',
                            border: '1px solid',
                            borderColor: isCheckedIn ? '#10B98133' : '#E5E7EB',
                            minWidth: '120px',
                            textAlign: 'center',
                            transition: 'all 0.2s'
                        }}>
                            <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 1, fontWeight: 700 }}>دخول</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                <Login sx={{ fontSize: 20, color: isCheckedIn ? '#10B981' : '#9CA3AF' }} />
                                <Typography variant="body1" sx={{ fontWeight: 800, color: isCheckedIn ? '#111827' : '#9CA3AF' }}>
                                    {isCheckedIn ? formatTime(attendance.entryTime) : '--:--'}
                                </Typography>
                            </Box>
                            {isCheckedIn && (
                                <Typography variant="caption" sx={{ color: '#10B981', mt: 0.5, display: 'block', fontWeight: 600 }}>تم الرصد</Typography>
                            )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                            <TrendingFlat sx={{ color: '#E5E7EB', fontSize: 24 }} />
                        </Box>

                        <Box sx={{
                            p: 2,
                            borderRadius: '16px',
                            bgcolor: isCheckedOut ? '#ECFDF5' : '#F9FAFB',
                            border: '1px solid',
                            borderColor: isCheckedOut ? '#10B98133' : '#E5E7EB',
                            minWidth: '120px',
                            textAlign: 'center',
                            transition: 'all 0.2s'
                        }}>
                            <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 1, fontWeight: 700 }}>خروج</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                <Logout sx={{ fontSize: 20, color: isCheckedOut ? '#10B981' : '#9CA3AF' }} />
                                <Typography variant="body1" sx={{ fontWeight: 800, color: isCheckedOut ? '#111827' : '#9CA3AF' }}>
                                    {isCheckedOut ? formatTime(attendance.exitTime) : '--:--'}
                                </Typography>
                            </Box>
                            {isCheckedOut && (
                                <Typography variant="caption" sx={{ color: '#10B981', mt: 0.5, display: 'block', fontWeight: 600 }}>تم الرصد</Typography>
                            )}
                        </Box>
                    </Stack>
                </Stack>
            </Box>

            {/* Removed redundant warning box */}
        </Paper>
    );
}
