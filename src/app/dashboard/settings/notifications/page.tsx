'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Button,
    Card,
    CardContent,
    FormControlLabel,
    Switch,
    Typography,
    Divider,
} from '@mui/material';
import {
    Notifications,
    Save,
} from '@mui/icons-material';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import useRouteProtection from '@/hooks/useRouteProtection';
import { notificationsApi, type NotificationSettings } from '@/lib/api/notifications';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function NotificationSettingsPage() {
    const router = useRouter();
    const [activeMenu, setActiveMenu] = useState('الإعدادات');
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [loading, setLoading] = useState(true);

    // Protect route
    useRouteProtection(['Admin', 'HR Manager', 'General Manager', 'Finance Manager', 'Project Manager', 'Employee']);

    useEffect(() => {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');
        if (!isLoggedIn) {
            router.push('/login');
        }
    }, [router]);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await notificationsApi.getSettings();
                setSettings(data);
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleLogout = () => {
        router.push('/logout-transition');
    };

    const handleToggleSidebar = () => {
        setSidebarExpanded(!sidebarExpanded);
    };

    const updateSettings = useApiWithToast(
        async (newSettings: NotificationSettings) => {
            await notificationsApi.updateSettings(newSettings);
        },
        { successMessage: 'تم تحديث إعدادات الإشعارات بنجاح' }
    );

    const handleToggle = (key: keyof NotificationSettings) => {
        if (!settings) return;
        setSettings({
            ...settings,
            [key]: !settings[key],
        });
    };

    const handleSave = async () => {
        if (!settings) return;
        await updateSettings.execute(settings);
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FC' }}>
            <DashboardSidebar
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                onLogout={handleLogout}
                sidebarExpanded={sidebarExpanded}
                onToggleSidebar={handleToggleSidebar}
            />

            <Box
                sx={{
                    marginRight: sidebarExpanded ? '280px' : '80px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                    transition: 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <DashboardHeader />

                <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
                    <Box
                        sx={{
                            mb: 3,
                            animation: 'fadeInUp 0.6s ease-out 0.2s both',
                            '@keyframes fadeInUp': {
                                from: { opacity: 0, transform: 'translateY(20px)' },
                                to: { opacity: 1, transform: 'translateY(0)' },
                            },
                        }}
                    >
                        <Typography
                            variant="h5"
                            sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
                        >
                            إعدادات الإشعارات
                        </Typography>
                        <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                            إدارة كيفية ووقت تلقي الإشعارات
                        </Typography>
                    </Box>

                    {loading ? (
                        <LoadingSpinner />
                    ) : settings ? (
                        <Box sx={{ maxWidth: '800px' }}>
                            <Card sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, color: '#111827', mb: 2 }}>
                                        القنوات
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.emailNotifications}
                                                    onChange={() => handleToggle('emailNotifications')}
                                                    color="primary"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>إشعارات البريد الإلكتروني</Typography>
                                                    <Typography sx={{ fontSize: '13px', color: '#6B7280' }}>تلقي الإشعارات عبر البريد الإلكتروني</Typography>
                                                </Box>
                                            }
                                        />
                                        <Divider />
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.pushNotifications}
                                                    onChange={() => handleToggle('pushNotifications')}
                                                    color="primary"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>الإشعارات الفورية</Typography>
                                                    <Typography sx={{ fontSize: '13px', color: '#6B7280' }}>تلقي الإشعارات الفورية على جهازك</Typography>
                                                </Box>
                                            }
                                        />
                                        <Divider />
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.smsNotifications}
                                                    onChange={() => handleToggle('smsNotifications')}
                                                    color="primary"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>إشعارات الرسائل النصية</Typography>
                                                    <Typography sx={{ fontSize: '13px', color: '#6B7280' }}>تلقي التنبيهات المهمة عبر الرسائل النصية</Typography>
                                                </Box>
                                            }
                                        />
                                    </Box>
                                </CardContent>
                            </Card>

                            <Card sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, color: '#111827', mb: 2 }}>
                                        الأحداث
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.notifyOnApproval}
                                                    onChange={() => handleToggle('notifyOnApproval')}
                                                    color="primary"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>طلبات الموافقة</Typography>
                                                    <Typography sx={{ fontSize: '13px', color: '#6B7280' }}>إشعارني عندما يحتاج طلب إلى موافقتي</Typography>
                                                </Box>
                                            }
                                        />
                                        <Divider />
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.notifyOnRejection}
                                                    onChange={() => handleToggle('notifyOnRejection')}
                                                    color="primary"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>الرفض</Typography>
                                                    <Typography sx={{ fontSize: '13px', color: '#6B7280' }}>إشعارني عند رفض طلبي</Typography>
                                                </Box>
                                            }
                                        />
                                        <Divider />
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.notifyOnPayment}
                                                    onChange={() => handleToggle('notifyOnPayment')}
                                                    color="primary"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>تحديثات الدفع</Typography>
                                                    <Typography sx={{ fontSize: '13px', color: '#6B7280' }}>إشعارني حول تغييرات حالة الدفع</Typography>
                                                </Box>
                                            }
                                        />
                                        <Divider />
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.notifyOnSystemUpdates}
                                                    onChange={() => handleToggle('notifyOnSystemUpdates')}
                                                    color="primary"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>تحديثات النظام</Typography>
                                                    <Typography sx={{ fontSize: '13px', color: '#6B7280' }}>إشعارني حول صيانة وتحديثات النظام</Typography>
                                                </Box>
                                            }
                                        />
                                    </Box>
                                </CardContent>
                            </Card>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Save />}
                                    onClick={handleSave}
                                    disabled={updateSettings.loading}
                                    sx={{
                                        background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
                                        color: '#FFFFFF',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        px: 4,
                                        py: 1.5,
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
                                        },
                                    }}
                                >
                                    {updateSettings.loading ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <Typography color="error">فشل تحميل الإعدادات</Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
}

