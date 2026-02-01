'use client';

import { Typography, Paper } from '@mui/material';

interface WelcomeCardProps {
  employeeName?: string;
  nationalId?: string;
}

export default function WelcomeCard({ employeeName, nationalId }: WelcomeCardProps) {
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مرحباً';
  };

  return (
    <Paper
      sx={{
        padding: '32px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        animation: 'fadeInUp 0.6s ease-out 0.7s both',
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
      <Typography
        variant="h4"
        sx={{
          fontSize: '24px',
          fontWeight: 800,
          color: '#111827',
          mb: 1,
          fontFamily: 'inherit'
        }}
      >
        {getTimeGreeting()}، {employeeName || 'عزيزي الموظف'}
      </Typography>

      {nationalId && (
        <Typography
          sx={{
            fontSize: '14px',
            color: '#4B5563',
            mb: 2,
            fontFamily: 'monospace',
            bgcolor: '#F3F4F6',
            display: 'inline-block',
            px: 2,
            py: 0.5,
            borderRadius: '4px'
          }}
        >
          ID: {nationalId}
        </Typography>
      )}

      <Typography sx={{ fontSize: '16px', color: '#6B7280', maxWidth: '600px', mx: 'auto' }}>
        مرحباً بك في لوحة تحكم شركة تكنو. يمكنك هنا متابعة حضورك، طلبات الإجازات، والاطلاع على رصيد إجازاتك.
      </Typography>
    </Paper>
  );
}

