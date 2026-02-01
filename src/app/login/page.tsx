'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) {
      return;
    }

    // Check if user is already logged in (only once on mount)
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
      // Small delay to prevent redirect loop and ensure sessionStorage is ready
      const timer = setTimeout(() => {
        hasRedirected.current = true;
        router.replace('/dashboard'); // Use replace instead of push to avoid history entry
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // User is not logged in, show login form
      setIsChecking(false);
    }
  }, [router]);

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#F8F9FC',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#F8F9FC',
      }}
    >
      <LoginForm />
    </Box>
  );
}

