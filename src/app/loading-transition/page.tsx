'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, LinearProgress } from '@mui/material';
import Image from 'next/image';

const translations = {
  en: {
    welcome: 'Welcome to Techno Company',
    loading: 'Loading dashboard...',
  },
  ar: {
    welcome: 'مرحباً بك في شركة تكنو',
    loading: 'جارٍ تحميل لوحة التحكم...',
  },
};

export default function LoadingTransition() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [language] = useState<'en' | 'ar'>(() => {
    if (typeof window === 'undefined') return 'ar';
    const savedLanguage = sessionStorage.getItem('language') as 'en' | 'ar' | null;
    return savedLanguage || 'ar';
  });
  const t = translations[language];

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.replace('/login'); // Use replace to avoid history entry
      return;
    }

    // Animate progress bar
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prevProgress + 2;
      });
    }, 30);

    // Redirect to dashboard after progress completes
    const redirectTimer = setTimeout(() => {
      router.replace('/dashboard'); // Use replace to avoid history entry
    }, 2000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#F0F4F8',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        animation: 'slideInFromRight 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        '@keyframes slideInFromRight': {
          from: {
            transform: 'translateX(100%)',
            opacity: 0,
          },
          to: {
            transform: 'translateX(0)',
            opacity: 1,
          },
        },
      }}
    >
      {/* Background Animation */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(12, 43, 122, 0.03) 0%, rgba(16, 67, 163, 0.05) 100%)',
          zIndex: 0,
        }}
      />

      {/* Content Container */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          width: '100%',
          maxWidth: '500px',
          padding: 4,
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            marginBottom: 4,
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': {
                opacity: 1,
                transform: 'scale(1)',
              },
              '50%': {
                opacity: 0.8,
                transform: 'scale(1.05)',
              },
            },
          }}
        >
          <Image
            src="/assets/logo.png"
            alt="شعار شركة تكنو"
            width={180}
            height={90}
            priority
            style={{
              maxWidth: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </Box>

        {/* Loading Text */}
        <Typography
          variant="h5"
          sx={{
            color: '#2C3E50',
            fontWeight: 600,
            marginBottom: 1,
            textAlign: 'center',
          }}
        >
          {t.welcome}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: '#5A6C7D',
            marginBottom: 5,
            textAlign: 'center',
          }}
        >
          {t.loading}
        </Typography>

        {/* Progress Bar Container */}
        <Box
          sx={{
            width: '100%',
            maxWidth: '400px',
            position: 'relative',
          }}
        >
          {/* Progress Bar Background */}
          <Box
            sx={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(12, 43, 122, 0.1)',
              borderRadius: '10px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Animated Progress Bar */}
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: '8px',
                backgroundColor: 'transparent',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #1043a3 0%, #0c2b7a 100%)',
                  borderRadius: '10px',
                  transition: 'transform 0.3s ease',
                  boxShadow: '0 0 10px rgba(12, 43, 122, 0.4)',
                },
              }}
            />
          </Box>

          {/* Progress Percentage */}
          <Typography
            variant="body2"
            sx={{
              color: '#0c2b7a',
              fontWeight: 600,
              marginTop: 2,
              textAlign: 'center',
            }}
          >
            {Math.round(progress)}%
          </Typography>
        </Box>

        {/* Loading Dots Animation */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            marginTop: 4,
          }}
        >
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#0c2b7a',
                animation: 'bounce 1.4s ease-in-out infinite',
                animationDelay: `${index * 0.16}s`,
                '@keyframes bounce': {
                  '0%, 80%, 100%': {
                    transform: 'scale(0)',
                    opacity: 0.5,
                  },
                  '40%': {
                    transform: 'scale(1)',
                    opacity: 1,
                  },
                },
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

