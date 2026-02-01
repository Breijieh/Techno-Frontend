'use client';

import { Box, Typography, Button } from '@mui/material';
import { Lock, ContactSupport } from '@mui/icons-material';
import { getUserRole } from '@/lib/permissions';

interface AccessDeniedBannerProps {
  message?: string;
  action?: string;
  module?: string;
  showContact?: boolean;
  compact?: boolean;
}

export default function AccessDeniedBanner({
  message,
  action,
  module,
  showContact = true,
  compact = false,
}: AccessDeniedBannerProps) {
  const userRole = getUserRole();

  const defaultMessage = action && module
    ? `ليس لديك صلاحية لـ ${action} ${module}.`
    : "ليس لديك صلاحية لتنفيذ هذا الإجراء.";

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@techno.com?subject=طلب صلاحية';
  };

  if (compact) {
    return (
      <Box
        sx={{
          backgroundColor: '#FEF3C7',
          border: '1px solid #FDE68A',
          borderRadius: '8px',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Lock sx={{ color: '#F59E0B', fontSize: 24 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#92400E', mb: 0.5 }}>
            تم رفض الوصول
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#78350F' }}>
            {message || defaultMessage}
          </Typography>
        </Box>
        {showContact && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ContactSupport />}
            onClick={handleContactSupport}
            sx={{
              borderColor: '#F59E0B',
              color: '#F59E0B',
              textTransform: 'none',
              '&:hover': {
                borderColor: '#D97706',
                backgroundColor: 'rgba(245, 158, 11, 0.04)',
              },
            }}
          >
            التواصل مع الدعم
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: '#FFFBEB',
        border: '2px solid #FDE68A',
        borderRadius: '12px',
        padding: 3,
        textAlign: 'center',
        animation: 'fadeInUp 0.5s ease-out',
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
      <Box
        sx={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          backgroundColor: '#FEF3C7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <Lock sx={{ fontSize: 30, color: '#F59E0B' }} />
      </Box>

      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: '#92400E',
          mb: 1,
        }}
      >
        تم رفض الوصول
      </Typography>

      <Typography
        sx={{
          fontSize: '15px',
          color: '#78350F',
          mb: 2,
          lineHeight: 1.6,
        }}
      >
        {message || defaultMessage}
      </Typography>

      {userRole && (
        <Typography
          sx={{
            fontSize: '13px',
            color: '#92400E',
            mb: 2,
          }}
        >
          دورك: <strong>{userRole}</strong>
        </Typography>
      )}

      {showContact && (
        <Button
          variant="outlined"
          startIcon={<ContactSupport />}
          onClick={handleContactSupport}
          sx={{
            borderColor: '#F59E0B',
            color: '#F59E0B',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: '#D97706',
              backgroundColor: 'rgba(245, 158, 11, 0.04)',
            },
          }}
        >
          التواصل مع الدعم للحصول على صلاحية
        </Button>
      )}
    </Box>
  );
}

