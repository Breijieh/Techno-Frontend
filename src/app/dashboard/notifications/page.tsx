'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    IconButton,
    Tooltip,
    Pagination,
    Stack,
    Chip,
    Avatar,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    CheckCircle,
    Error as ErrorIcon,
    Info,
    Warning,
    DeleteOutline,
    DoneAll,
    Refresh,
} from '@mui/icons-material';
import { notificationsApi, type NotificationResponse } from '@/lib/api/notifications';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import {
    getNotificationIconType,
    getNotificationCategory,
    type NotificationIconType
} from '@/lib/utils/notifications';

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async (page: number) => {
        try {
            setRefreshing(true);
            const response = await notificationsApi.getMyNotifications({
                page: page - 1,
                size: pageSize,
            });
            setNotifications(response.content);
            setTotalCount(response.totalElements);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [pageSize]);

    useEffect(() => {
        fetchNotifications(currentPage);
    }, [currentPage, fetchNotifications]);

    const handleMarkAsRead = async (id: number) => {
        try {
            await notificationsApi.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.notificationId === id ? { ...n, isRead: true } : n)
            );
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await notificationsApi.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.notificationId !== id));
            setTotalCount(prev => prev - 1);
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const getIcon = (iconType: NotificationIconType) => {
        switch (iconType) {
            case 'success':
                return <CheckCircle sx={{ color: '#059669' }} />;
            case 'warning':
                return <Warning sx={{ color: '#F59E0B' }} />;
            case 'error':
                return <ErrorIcon sx={{ color: '#DC2626' }} />;
            case 'info':
            default:
                return <Info sx={{ color: '#0c2b7a' }} />;
        }
    };

    const getIconBgColor = (iconType: NotificationIconType) => {
        switch (iconType) {
            case 'success':
                return 'rgba(5, 150, 105, 0.1)';
            case 'warning':
                return 'rgba(245, 158, 11, 0.1)';
            case 'error':
                return 'rgba(220, 38, 38, 0.1)';
            case 'info':
            default:
                return 'rgba(12, 43, 122, 0.1)';
        }
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, { bg: string; text: string }> = {
            LEAVE: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
            LOAN: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
            PAYROLL: { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' },
            ATTENDANCE: { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6' },
            ALLOWANCE: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22C55E' },
            DEDUCTION: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' },
            TRANSFER: { bg: 'rgba(6, 182, 212, 0.1)', text: '#06B6D4' },
            PAYMENT: { bg: 'rgba(251, 146, 60, 0.1)', text: '#FB923C' },
            ALERT: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' },
            SYSTEM: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6B7280' },
        };
        return colors[category] || colors.SYSTEM;
    };

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            LEAVE: 'إجازات',
            LOAN: 'قروض',
            PAYROLL: 'رواتب',
            ATTENDANCE: 'حضور',
            ALLOWANCE: 'بدلات',
            DEDUCTION: 'خصومات',
            TRANSFER: 'نقل',
            PAYMENT: 'مدفوعات',
            ALERT: 'تنبيه',
            SYSTEM: 'النظام',
        };
        return labels[category] || 'النظام';
    };

    return (
        <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
                        مركز الإشعارات
                    </Typography>
                    <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                        لديك {totalCount} إشعار كلي
                    </Typography>
                </Box>

                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        startIcon={<DoneAll />}
                        onClick={handleMarkAllAsRead}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            borderColor: '#E5E7EB',
                            color: '#374151',
                            '&:hover': { borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' }
                        }}
                    >
                        تحديد الكل كمقروء
                    </Button>
                    <IconButton
                        onClick={() => fetchNotifications(currentPage)}
                        disabled={refreshing}
                        sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB' }}
                    >
                        <Refresh sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                        <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>
                    </IconButton>
                </Stack>
            </Box>

            {loading ? (
                <LoadingSpinner />
            ) : notifications.length === 0 ? (
                <Card sx={{ borderRadius: '16px', py: 8, textAlign: 'center' }}>
                    <NotificationsIcon sx={{ fontSize: 64, color: '#D1D5DB', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#374151', mb: 1 }}>
                        لا توجد إشعارات جديدة
                    </Typography>
                    <Typography sx={{ color: '#6B7280', maxWidth: '300px', mx: 'auto' }}>
                        ستظهر هنا الإشعارات المتعلقة بطلباتك، الموافقات، والتحليلات.
                    </Typography>
                </Card>
            ) : (
                <Stack spacing={2}>
                    {notifications.map((notification) => {
                        const iconType = getNotificationIconType(notification.notificationType);
                        const category = getNotificationCategory(notification.notificationType);
                        const categoryColors = getCategoryColor(category);

                        return (
                            <Card
                                key={notification.notificationId}
                                sx={{
                                    borderRadius: '16px',
                                    border: '1px solid #E5E7EB',
                                    boxShadow: 'none',
                                    transition: 'all 0.2s',
                                    backgroundColor: notification.isRead ? '#FFFFFF' : 'rgba(12, 43, 122, 0.02)',
                                    position: 'relative',
                                    overflow: 'visible',
                                    '&:hover': {
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                        borderColor: '#D1D5DB',
                                    },
                                    '&::before': !notification.isRead ? {
                                        content: '""',
                                        position: 'absolute',
                                        right: -1,
                                        top: -1,
                                        bottom: -1,
                                        width: '4px',
                                        backgroundColor: '#0c2b7a',
                                        borderTopRightRadius: '16px',
                                        borderBottomRightRadius: '16px',
                                    } : {},
                                }}
                            >
                                <CardContent sx={{ p: '20px !important' }}>
                                    <Box sx={{ display: 'flex', gap: 3 }}>
                                        <Avatar
                                            sx={{
                                                bgcolor: getIconBgColor(iconType),
                                                width: 48,
                                                height: 48,
                                            }}
                                        >
                                            {getIcon(iconType)}
                                        </Avatar>

                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                                    <Typography sx={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>
                                                        {notification.title}
                                                    </Typography>
                                                    <Chip
                                                        label={getCategoryLabel(category)}
                                                        size="small"
                                                        sx={{
                                                            height: '22px',
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            bgcolor: categoryColors.bg,
                                                            color: categoryColors.text,
                                                            '& .MuiChip-label': { px: 1 },
                                                        }}
                                                    />
                                                    {(notification.priority === 'URGENT' || notification.priority === 'HIGH' || notification.priority === 'H') && (
                                                        <Chip
                                                            label="هام"
                                                            size="small"
                                                            sx={{
                                                                height: '20px',
                                                                fontSize: '11px',
                                                                bgcolor: 'rgba(220, 38, 38, 0.1)',
                                                                color: '#DC2626',
                                                                fontWeight: 600,
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                                <Typography sx={{ fontSize: '13px', color: '#9CA3AF', whiteSpace: 'nowrap', ml: 2 }}>
                                                    {formatDistanceToNow(new Date(notification.createdDate), { addSuffix: true, locale: arSA })}
                                                </Typography>
                                            </Box>

                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: '#4B5563',
                                                    lineHeight: 1.6,
                                                    mb: 2,
                                                    '& h2, & h3, & h4': { fontSize: '16px', fontWeight: 600, m: 0, mb: 1, color: '#111827' },
                                                    '& p': { m: 0, mb: 1 },
                                                    '& a': { color: '#0c2b7a', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }
                                                }}
                                                dangerouslySetInnerHTML={{ __html: notification.message }}
                                            />

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ display: 'flex', gap: 2 }}>
                                                    {!notification.isRead && (
                                                        <Button
                                                            size="small"
                                                            onClick={() => handleMarkAsRead(notification.notificationId)}
                                                            sx={{ color: '#0c2b7a', textTransform: 'none', fontWeight: 600 }}
                                                        >
                                                            تحديد كمقروء
                                                        </Button>
                                                    )}
                                                    {notification.linkUrl && (
                                                        <Button
                                                            size="small"
                                                            onClick={() => router.push(notification.linkUrl!)}
                                                            sx={{ color: '#0c2b7a', textTransform: 'none', fontWeight: 600 }}
                                                        >
                                                            عرض التفاصيل
                                                        </Button>
                                                    )}
                                                </Box>

                                                <Tooltip title="حذف">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete(notification.notificationId)}
                                                        sx={{ color: '#9CA3AF', '&:hover': { color: '#DC2626' } }}
                                                    >
                                                        <DeleteOutline fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        );
                    })}

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <Pagination
                            count={totalPages}
                            page={currentPage}
                            onChange={(e, value) => setCurrentPage(value)}
                            color="primary"
                            sx={{
                                '& .MuiPaginationItem-root': {
                                    borderRadius: '8px',
                                },
                            }}
                        />
                    </Box>
                </Stack>
            )}
        </Box>
    );
}
