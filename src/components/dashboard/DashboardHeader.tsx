'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Button,
} from '@mui/material';
import {
  Notifications,
  Circle,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Warning,
} from '@mui/icons-material';
import { notificationsApi } from '@/lib/api';
import type { UserInfoResponse } from '@/lib/api/types';
import type { NotificationResponse } from '@/lib/api/notifications';

export default function DashboardHeader() {
  const router = useSafeRouter();
  const [userInfo, setUserInfo] = useState<UserInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Notifications state
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationResponse[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Fetch user info from API on mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      // Check if token exists before making API call
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      // First, try to get user info from sessionStorage immediately (for instant display)
      const userName = sessionStorage.getItem('userName');
      if (userName) {
        setUserInfo({
          userId: parseInt(sessionStorage.getItem('userId') || '0', 10),
          username: userName,
          userType: sessionStorage.getItem('userType') || sessionStorage.getItem('userRole') || '',
          isActive: true,
        });
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const summary = await notificationsApi.getSummary();
      setUnreadCount(summary.unreadCount);
      setRecentNotifications(summary.recentNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  useEffect(() => {
    // Poll for notifications every minute
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);
    // Fetch immediately on mount - use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      fetchNotifications();
    }, 0);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Format last login date for display
  const formatLastLoginDate = (date?: string): string => {
    if (!date) {
      // Fallback to current date if no last login
      const now = new Date();
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return `${months[now.getMonth()]} ${now.getDate()}`;
    }

    try {
      // Parse date string (assuming format like "2024-11-22" or ISO format)
      const dateObj = new Date(date);
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return `${months[dateObj.getMonth()]} ${dateObj.getDate()}`;
    } catch {
      return 'غير متاح';
    }
  };

  // Notification handlers
  const handleNotificationClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications(); // Refresh on open
  };

  const handleNotificationClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      // Update local state
      setRecentNotifications(prev =>
        prev.map(n => n.notificationId === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setRecentNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle sx={{ color: '#059669', fontSize: 20 }} />;
      case 'WARNING': return <Warning sx={{ color: '#F59E0B', fontSize: 20 }} />;
      case 'ERROR': return <ErrorIcon sx={{ color: '#DC2626', fontSize: 20 }} />;
      default: return <Info sx={{ color: '#0c2b7a', fontSize: 20 }} />;
    }
  };

  // Get display name: prefer employeeName, fallback to username
  const displayName = userInfo?.employeeName || userInfo?.username || 'مستخدم';

  // Get avatar initial
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  return (
    <Box
      sx={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        animation: 'slideDown 0.5s ease-out',
        '@keyframes slideDown': {
          from: { opacity: 0, transform: 'translateY(-20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {/* Left: Breadcrumb */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        animation: 'fadeIn 0.5s ease-out 0.3s both',
        '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
      }}>
        <Typography sx={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>
          لوحة التحكم
        </Typography>
        <Typography sx={{ fontSize: '14px', color: '#D1D5DB' }}>/</Typography>
        <Typography sx={{ fontSize: '14px', color: '#0c2b7a', fontWeight: 600 }}>
          النظرة العامة
        </Typography>
      </Box>

      {/* Right: Notifications, User */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        animation: 'fadeIn 0.5s ease-out 0.5s both',
        '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
      }}>
        {/* Notification Bell */}
        <IconButton
          onClick={handleNotificationClick}
          sx={{
            color: '#6B7280',
            '&:hover': { backgroundColor: '#F9FAFB' },
          }}
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <Notifications sx={{ fontSize: '20px' }} />
          </Badge>
        </IconButton>

        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleNotificationClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              width: 360,
              maxHeight: 480,
              mt: 1.5,
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            },
          }}
        >
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6' }}>
            <Typography sx={{ fontWeight: 600, color: '#111827' }}>الإشعارات</Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                sx={{ fontSize: '12px', textTransform: 'none', color: '#0c2b7a' }}
              >
                تحديد الكل كمقروء
              </Button>
            )}
          </Box>
          <List sx={{ p: 0 }}>
            {recentNotifications.length > 0 ? (
              recentNotifications.map((notification) => (
                <ListItem
                  key={notification.notificationId}
                  alignItems="flex-start"
                  sx={{
                    bgcolor: notification.isRead ? 'transparent' : '#F9FAFB',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#F3F4F6' },
                    borderBottom: '1px solid #F3F4F6'
                  }}
                  onClick={() => !notification.isRead && handleMarkAsRead(notification.notificationId)}
                >
                  <ListItemAvatar sx={{ minWidth: 40, mt: 0.5 }}>
                    {getNotificationIcon(notification.notificationType)}
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: notification.isRead ? 400 : 600, color: '#111827' }}>
                          {notification.title}
                        </Typography>
                        {!notification.isRead && <Circle sx={{ fontSize: 8, color: '#0c2b7a' }} />}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{
                            display: 'block',
                            color: '#6B7280',
                            fontSize: '12px',
                            mb: 0.5,
                            '& h2, & h3, & h4': { fontSize: '14px', fontWeight: 600, m: 0, mb: 0.5, color: '#111827' },
                            '& p': { m: 0, mb: 0.5 },
                            '& a': { color: '#0c2b7a', fontWeight: 600, textDecoration: 'none' }
                          }}
                          dangerouslySetInnerHTML={{ __html: notification.message }}
                        />
                        <Typography component="span" sx={{ fontSize: '11px', color: '#9CA3AF' }}>
                          {new Date(notification.createdDate).toLocaleDateString('en-GB')}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography sx={{ color: '#6B7280', fontSize: '14px' }}>لا توجد إشعارات</Typography>
              </Box>
            )}
          </List>
          <Box sx={{ p: 1.5, borderTop: '1px solid #F3F4F6', display: 'flex', gap: 1 }}>
            <Button
              fullWidth
              size="small"
              variant="contained"
              sx={{
                textTransform: 'none',
                background: '#0c2b7a',
                fontSize: '13px',
                '&:hover': { background: '#091e56' }
              }}
              onClick={() => {
                handleNotificationClose();
                router.push('/dashboard/notifications');
              }}
            >
              عرض الكل
            </Button>
            <Button
              fullWidth
              size="small"
              sx={{ textTransform: 'none', color: '#6B7280', fontSize: '13px' }}
              onClick={() => {
                handleNotificationClose();
                router.push('/dashboard/settings/notifications');
              }}
            >
              الإعدادات
            </Button>
          </Box>
        </Popover>

        {/* User Profile */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: '#F9FAFB',
            },
          }}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#0c2b7a' }} title={displayName}>
            {loading ? '...' : avatarInitial}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              {loading ? 'جارٍ التحميل...' : displayName}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
              {loading ? '...' : formatLastLoginDate(userInfo?.lastLoginDate)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

