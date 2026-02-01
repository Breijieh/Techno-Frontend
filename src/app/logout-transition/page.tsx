'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import Image from 'next/image';

const translations = {
  en: {
    goodbye: 'Goodbye',
    seeYouSoon: 'See you soon!',
  },
  ar: {
    goodbye: 'إلى اللقاء',
    seeYouSoon: 'نراك قريباً!',
  },
};

export default function LogoutTransition() {
  const router = useRouter();
  const [language] = useState<'en' | 'ar'>(() => {
    if (typeof window === 'undefined') return 'ar';
    const savedLanguage = sessionStorage.getItem('language') as 'en' | 'ar' | null;
    return savedLanguage || 'ar';
  });
  const t = translations[language];

  useEffect(() => {
    // Clear session
    sessionStorage.clear();
    
    // Redirect to login after animation
    const redirectTimer = setTimeout(() => {
      router.push('/login');
    }, 2500);

    return () => {
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
        animation: 'fadeIn 0.3s ease-in',
        '@keyframes fadeIn': {
          from: {
            opacity: 0,
          },
          to: {
            opacity: 1,
          },
        },
      }}
    >
      {/* Animated Background Gradient */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(12, 43, 122, 0.03) 0%, rgba(16, 67, 163, 0.05) 100%)',
          animation: 'pulse 3s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 0.5,
            },
            '50%': {
              opacity: 1,
            },
          },
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
          position: 'relative',
        }}
      >
        {/* Animated Logo */}
        <Box
          sx={{
            marginBottom: 4,
            animation: 'logoAnimation 2s ease-in-out',
            '@keyframes logoAnimation': {
              '0%': {
                opacity: 1,
                transform: 'scale(1) rotateY(0deg)',
              },
              '30%': {
                opacity: 0.8,
                transform: 'scale(1.1) rotateY(180deg)',
              },
              '60%': {
                opacity: 0.9,
                transform: 'scale(0.95) rotateY(360deg)',
              },
              '100%': {
                opacity: 1,
                transform: 'scale(1) rotateY(360deg)',
              },
            },
          }}
        >
          <Box
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '50%',
              padding: '40px',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(12, 43, 122, 0.1)',
              boxShadow: '0 8px 32px rgba(12, 43, 122, 0.15)',
            }}
          >
            <Image
              src="/assets/logo.png"
              alt="شعار شركة تكنو"
              width={120}
              height={120}
              priority
              style={{
                maxWidth: '100%',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(12, 43, 122, 0.3))',
              }}
            />
          </Box>
        </Box>

        {/* Goodbye Text */}
        <Typography
          sx={{
            fontSize: '48px',
            fontWeight: 700,
            color: '#2C3E50',
            marginBottom: 2,
            letterSpacing: '0.02em',
            animation: 'textFadeIn 1s ease-in 0.5s both',
            '@keyframes textFadeIn': {
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
          {t.goodbye}
        </Typography>

        <Typography
          sx={{
            fontSize: '18px',
            fontWeight: 400,
            color: '#5A6C7D',
            textAlign: 'center',
            animation: 'textFadeIn 1s ease-in 0.8s both',
            '@keyframes textFadeIn': {
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
          {t.seeYouSoon}
        </Typography>

        {/* Animated Dots */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            marginTop: 4,
          }}
        >
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#0c2b7a',
                animation: 'dotBounce 1.4s ease-in-out infinite',
                animationDelay: `${index * 0.16}s`,
                '@keyframes dotBounce': {
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

      {/* Fade Out Effect */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#F0F4F8',
          animation: 'fadeOut 0.5s ease-out 2s forwards',
          pointerEvents: 'none',
          '@keyframes fadeOut': {
            from: {
              opacity: 0,
            },
            to: {
              opacity: 1,
            },
          },
        }}
      />
    </Box>
  );
}

