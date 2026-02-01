'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Lock,
  Home,
  ArrowBack,
  Security,
  Info,
  ContactSupport,
  CheckCircle,
} from '@mui/icons-material';
import { getUserRole, getAllowedRoutes, getPermissionLevel, ROLE_ARABIC_NAMES } from '@/lib/permissions';
import type { Module, UserRole } from '@/types/roles';

const translations = {
  en: {
    title: 'Access Denied',
    subtitle: "You don't have permission to access this page.",
    yourInfo: 'Your Information',
    user: 'User',
    role: 'Role',
    reason: 'Access Reason',
    noPermission: 'Your current role does not have permission to access this resource.',
    contactAdmin: 'If you believe you should have access, please contact your system administrator.',
    accessiblePages: 'Pages You Can Access',
    goToDashboard: 'Go to Dashboard',
    goBack: 'Go Back',
    contactSupport: 'Contact Support',
    permissions: 'Your Permissions',
    fullAccess: 'Full Access',
    manage: 'Manage',
    approve: 'Approve',
    view: 'View Only',
    request: 'Request Only',
    self: 'Self Service',
    own: 'View Own',
    noAccess: 'No Access',
    attemptedRoute: 'Attempted Route:',
  },
  ar: {
    title: 'تم رفض الوصول',
    subtitle: 'ليس لديك صلاحية للوصول إلى هذه الصفحة.',
    yourInfo: 'معلوماتك',
    user: 'المستخدم',
    role: 'الدور',
    reason: 'سبب الرفض',
    noPermission: 'دورك الحالي لا يسمح بالوصول إلى هذا المورد.',
    contactAdmin: 'إذا كنت تعتقد أنه يجب أن يكون لديك وصول، يرجى الاتصال بمسؤول النظام.',
    accessiblePages: 'الصفحات التي يمكنك الوصول إليها',
    goToDashboard: 'الذهاب إلى لوحة التحكم',
    goBack: 'رجوع',
    contactSupport: 'اتصل بالدعم',
    permissions: 'صلاحياتك',
    fullAccess: 'وصول كامل',
    manage: 'إدارة',
    approve: 'موافقة',
    view: 'عرض فقط',
    request: 'طلب فقط',
    self: 'خدمة ذاتية',
    own: 'عرض الخاص',
    noAccess: 'لا يوجد وصول',
    attemptedRoute: 'المسار المحاول:',
  },
};

import { Suspense } from 'react';

function UnauthorizedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [language] = useState<'en' | 'ar'>(() => {
    if (typeof window === 'undefined') return 'ar';
    const savedLanguage = sessionStorage.getItem('language') as 'en' | 'ar' | null;
    return savedLanguage || 'ar';
  });
  const userRole = getUserRole();
  const userName = typeof window !== 'undefined' ? sessionStorage.getItem('userName') || 'مستخدم' : 'مستخدم';
  const reason = searchParams.get('reason') || '';
  const attemptedRoute = searchParams.get('route') || '';

  useEffect(() => {
    // Redirect to login if not logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }

  }, [router]);

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleContactSupport = () => {
    // In production, this would open a support ticket or email
    window.location.href = 'mailto:support@techno.com?subject=Access Request';
  };

  const t = translations[language];
  const allowedRoutes = userRole ? getAllowedRoutes(userRole) : [];
  const accessiblePages = allowedRoutes.slice(0, 5); // Show first 5 accessible pages

  const getPermissionLabel = (level: string | null) => {
    if (!level) return t.noAccess;
    switch (level) {
      case 'FULL':
        return t.fullAccess;
      case 'MANAGE':
        return t.manage;
      case 'APPROVE':
        return t.approve;
      case 'VIEW':
        return t.view;
      case 'REQUEST':
        return t.request;
      case 'SELF':
        return t.self;
      case 'OWN':
        return t.own;
      default:
        return t.noAccess;
    }
  };

  const modules: Module[] = [
    'attendance',
    'leave',
    'loans',
    'payroll',
    'projects',
    'warehouse',
    'reports',
    'employees',
    'settings',
    'temp-labor',
    'approvals',
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FC',
        padding: 3,
        animation: 'fadeIn 0.5s ease-out',
        '@keyframes fadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      <Paper
        sx={{
          padding: { xs: 3, md: 4 },
          maxWidth: 800,
          width: '100%',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          animation: 'slideUp 0.6s ease-out',
          '@keyframes slideUp': {
            from: {
              opacity: 0,
              transform: 'translateY(30px)',
            },
            to: {
              opacity: 1,
              transform: 'translateY(0)',
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.05)' },
              },
            }}
          >
            <Lock sx={{ fontSize: 50, color: '#F59E0B' }} />
          </Box>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#111827',
              mb: 1,
            }}
          >
            {t.title}
          </Typography>

          <Typography
            sx={{
              fontSize: '16px',
              color: '#6B7280',
              mb: 2,
              lineHeight: 1.6,
            }}
          >
            {t.subtitle}
          </Typography>

          {reason && (
            <Chip
              label={reason}
              color="warning"
              icon={<Info />}
              sx={{ mb: 2 }}
            />
          )}
        </Box>

        {/* User Information */}
        <Box
          sx={{
            backgroundColor: '#F3F4F6',
            borderRadius: '12px',
            padding: 3,
            mb: 3,
          }}
        >
          <Typography
            sx={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#111827',
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Security sx={{ fontSize: 20, color: '#0c2b7a' }} />
            {t.yourInfo}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '13px', color: '#6B7280', mb: 0.5 }}>
                {t.user}
              </Typography>
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                {userName}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13px', color: '#6B7280', mb: 0.5 }}>
                {t.role}
              </Typography>
              <Chip
                label={userRole ? (language === 'ar' ? (ROLE_ARABIC_NAMES[userRole as UserRole] || userRole) : userRole) : (language === 'ar' ? 'غير معين' : 'Not assigned')}
                color="primary"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Box>
          {attemptedRoute && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #E5E7EB' }}>
              <Typography sx={{ fontSize: '13px', color: '#6B7280', mb: 0.5 }}>
                {t.attemptedRoute}
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#111827', fontFamily: 'monospace' }}>
                {attemptedRoute}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Permissions Overview */}
        {userRole && (
          <Box
            sx={{
              backgroundColor: '#F0F9FF',
              borderRadius: '12px',
              padding: 3,
              mb: 3,
              border: '1px solid #BAE6FD',
            }}
          >
            <Typography
              sx={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#111827',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Info sx={{ fontSize: 20, color: '#0c2b7a' }} />
              {t.permissions}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 2,
              }}
            >
              {modules.map((module) => {
                const level = getPermissionLevel(userRole, module);
                if (!level) return null;
                return (
                  <Box
                    key={module}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      padding: 1,
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                    }}
                  >
                    <CheckCircle sx={{ fontSize: 16, color: '#10B981' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                        {module.replace('-', ' ')}
                      </Typography>
                      <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                        {getPermissionLabel(level)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Accessible Pages */}
        {accessiblePages.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#111827',
                mb: 2,
              }}
            >
              {t.accessiblePages}
            </Typography>
            <List sx={{ backgroundColor: '#F9FAFB', borderRadius: '8px', padding: 1 }}>
              {accessiblePages.map((route, index) => (
                <ListItem
                  key={index}
                  sx={{
                    borderRadius: '6px',
                    '&:hover': { backgroundColor: '#F3F4F6' },
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push(route)}
                >
                  <ListItemIcon>
                    <CheckCircle sx={{ fontSize: 18, color: '#10B981' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={route}
                    primaryTypographyProps={{
                      fontSize: '14px',
                      color: '#111827',
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Contact Information */}
        <Box
          sx={{
            backgroundColor: '#FFFBEB',
            borderRadius: '12px',
            padding: 2,
            mb: 3,
            border: '1px solid #FDE68A',
          }}
        >
          <Typography
            sx={{
              fontSize: '14px',
              color: '#92400E',
              lineHeight: 1.6,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
            }}
          >
            <ContactSupport sx={{ fontSize: 18, color: '#F59E0B', mt: 0.5 }} />
            <span>
              <strong>{t.contactAdmin}</strong> {t.contactSupport}
            </span>
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={handleGoToDashboard}
            sx={{
              background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              padding: '12px 32px',
              '&:hover': {
                background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
              },
            }}
          >
            {t.goToDashboard}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handleGoBack}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              padding: '12px 32px',
              borderColor: '#0c2b7a',
              color: '#0c2b7a',
              '&:hover': {
                borderColor: '#0a266e',
                backgroundColor: 'rgba(12, 43, 122, 0.04)',
              },
            }}
          >
            {t.goBack}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ContactSupport />}
            onClick={handleContactSupport}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              padding: '12px 32px',
              borderColor: '#F59E0B',
              color: '#F59E0B',
              '&:hover': {
                borderColor: '#D97706',
                backgroundColor: 'rgba(245, 158, 11, 0.04)',
              },
            }}
          >
            {t.contactSupport}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <UnauthorizedContent />
    </Suspense>
  );
}
