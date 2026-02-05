'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconButton,
  Badge,
  Menu,
  Typography,
  Box,
  Divider,
  Button,
  Skeleton,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Notifications,
  CheckCircle,
  Warning,
  Info,
  Error as ErrorIcon,
  DoneAll,
  ArrowBack,
} from '@mui/icons-material';
import { notificationsApi, type NotificationResponse } from '@/lib/api/notifications';
import { getNotificationIconType, getNotificationCategory, type NotificationIconType } from '@/lib/utils/notifications';
import { formatDateTime } from '@/lib/utils/dateFormatter';

export default function NotificationBell() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [countResponse, notifResponse] = await Promise.all([
        notificationsApi.getUnreadCount(),
        notificationsApi.getMyNotifications({ page: 0, size: 5 }),
      ]);
      setUnreadCount(countResponse);
      setNotifications(notifResponse.content);
      setHasFetched(true);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and periodically
  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // Refresh when opening
    if (!loading) {
      fetchNotifications();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = async (notification: NotificationResponse) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await notificationsApi.markAsRead(notification.notificationId);
        setNotifications(prev =>
          prev.map(n =>
            n.notificationId === notification.notificationId
              ? { ...n, isRead: true }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }

    // Navigate if has link
    if (notification.linkUrl) {
      handleClose();
      router.push(notification.linkUrl);
    }
  };

  const handleViewAll = () => {
    handleClose();
    router.push('/dashboard/notifications');
  };

  const getIcon = (iconType: NotificationIconType) => {
    switch (iconType) {
      case 'success':
        return <CheckCircle sx={{ color: '#059669', fontSize: 20 }} />;
      case 'warning':
        return <Warning sx={{ color: '#F59E0B', fontSize: 20 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#DC2626', fontSize: 20 }} />;
      case 'info':
      default:
        return <Info sx={{ color: '#0c2b7a', fontSize: 20 }} />;
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

  const formatTime = (dateString: string) => {
    return formatDateTime(dateString);
  };

  const getCleanMessage = (message: string) => {
    // Strip HTML tags for preview
    const stripped = message.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    // Truncate if too long
    return stripped.length > 80 ? stripped.substring(0, 80) + '...' : stripped;
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: '#6B7280',
          '&:hover': {
            backgroundColor: 'rgba(12, 43, 122, 0.04)',
            color: '#0c2b7a',
          },
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '10px',
              fontWeight: 700,
              minWidth: '18px',
              height: '18px',
            }
          }}
        >
          <Notifications />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1.5,
            minWidth: 380,
            maxWidth: 420,
            maxHeight: 520,
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{
          px: 2.5,
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #F3F4F6',
          bgcolor: '#FFFFFF',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>
              الإشعارات
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                size="small"
                sx={{
                  height: '22px',
                  fontSize: '11px',
                  fontWeight: 700,
                  bgcolor: 'rgba(12, 43, 122, 0.1)',
                  color: '#0c2b7a',
                }}
              />
            )}
          </Box>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAll sx={{ fontSize: '16px !important' }} />}
              onClick={handleMarkAllRead}
              sx={{
                textTransform: 'none',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0c2b7a',
                px: 1.5,
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: 'rgba(12, 43, 122, 0.06)',
                },
              }}
            >
              قراءة الكل
            </Button>
          )}
        </Box>

        {/* Notifications List */}
        <Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
          {loading && !hasFetched ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, index) => (
              <Box key={index} sx={{ px: 2.5, py: 2, borderBottom: '1px solid #F3F4F6' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width="90%" height={16} />
                    <Skeleton variant="text" width="40%" height={14} />
                  </Box>
                </Box>
              </Box>
            ))
          ) : notifications.length === 0 ? (
            // Empty state
            <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <Notifications sx={{ fontSize: 32, color: '#9CA3AF' }} />
              </Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#374151', mb: 0.5 }}>
                لا توجد إشعارات
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#9CA3AF' }}>
                ستظهر الإشعارات هنا عند وصولها
              </Typography>
            </Box>
          ) : (
            // Notifications
            notifications.map((notification) => {
              const iconType = getNotificationIconType(notification.notificationType);
              const category = getNotificationCategory(notification.notificationType);
              const categoryColors = getCategoryColor(category);

              return (
                <Box
                  key={notification.notificationId}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    px: 2.5,
                    py: 2,
                    cursor: 'pointer',
                    backgroundColor: notification.isRead ? 'transparent' : 'rgba(12, 43, 122, 0.02)',
                    borderBottom: '1px solid #F3F4F6',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: 'rgba(12, 43, 122, 0.04)',
                    },
                    '&::before': !notification.isRead ? {
                      content: '""',
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '3px',
                      backgroundColor: '#0c2b7a',
                    } : {},
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: getIconBgColor(iconType),
                        width: 40,
                        height: 40,
                      }}
                    >
                      {getIcon(iconType)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          sx={{
                            fontSize: '13px',
                            fontWeight: notification.isRead ? 500 : 700,
                            color: '#111827',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {notification.title}
                        </Typography>
                        <Chip
                          label={getCategoryLabel(category)}
                          size="small"
                          sx={{
                            height: '18px',
                            fontSize: '10px',
                            fontWeight: 600,
                            bgcolor: categoryColors.bg,
                            color: categoryColors.text,
                            '& .MuiChip-label': { px: 1 },
                          }}
                        />
                      </Box>
                      <Typography
                        sx={{
                          fontSize: '12px',
                          color: '#6B7280',
                          mb: 0.75,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {getCleanMessage(notification.message)}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '11px',
                          color: '#9CA3AF',
                        }}
                      >
                        {formatTime(notification.createdDate)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>

        {/* Footer */}
        <Divider />
        <Box sx={{ p: 1.5, bgcolor: '#FAFAFA' }}>
          <Button
            fullWidth
            size="small"
            endIcon={<ArrowBack sx={{ fontSize: '16px !important', transform: 'rotate(180deg)' }} />}
            onClick={handleViewAll}
            sx={{
              textTransform: 'none',
              fontSize: '13px',
              fontWeight: 600,
              color: '#0c2b7a',
              py: 1,
              borderRadius: '10px',
              '&:hover': {
                backgroundColor: 'rgba(12, 43, 122, 0.06)',
              },
            }}
          >
            عرض جميع الإشعارات
          </Button>
        </Box>
      </Menu>
    </>
  );
}
