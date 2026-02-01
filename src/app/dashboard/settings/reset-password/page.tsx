'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import { Lock } from '@mui/icons-material';
import ResetPasswordForm from '@/components/forms/ResetPasswordForm';
import useRouteProtection from '@/hooks/useRouteProtection';
import { usersApi } from '@/lib/api/users';
import { authApi } from '@/lib/api/auth';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const toast = useToast();

  // Protect route - Admin only
  useRouteProtection(['Admin']);

  // Fetch current user information
  const { data: currentUserData, loading: loadingCurrentUser } = useApi(
    () => authApi.getCurrentUser(),
    { immediate: true }
  );

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

  // Set current user ID and username from sessionStorage or API
  useEffect(() => {
    // Try sessionStorage first (faster)
    const userId = sessionStorage.getItem('userId');
    const username = sessionStorage.getItem('userName');

    if (userId) {
      const parsedUserId = parseInt(userId, 10);
      if (!isNaN(parsedUserId) && currentUserId !== parsedUserId) {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          setCurrentUserId(parsedUserId);
        }, 0);
      }
    }

    if (username && currentUsername !== username) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setCurrentUsername(username);
      }, 0);
    }

    // Also use API data if available
    if (currentUserData) {
      if (currentUserId !== currentUserData.userId) {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          setCurrentUserId(currentUserData.userId);
        }, 0);
      }
      if (currentUsername !== currentUserData.username) {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          setCurrentUsername(currentUserData.username);
        }, 0);
      }
    }
  }, [currentUserData, currentUserId, currentUsername]);

  // Reset password API
  const resetPassword = useApiWithToast(
    async ({ userId, password, generatePassword }: { userId: number; password?: string; generatePassword?: boolean }) => {
      const generatedPwd = await usersApi.resetPassword(userId, {
        newPassword: password,
        generatePassword,
      });
      return generatedPwd;
    },
    {
      showSuccessToast: false, // We'll handle the toast manually in onSuccess to show generated password
      onSuccess: (generatedPassword: string | null) => {
        setIsModalOpen(false);
        // Show success message with generated password if available
        if (generatedPassword) {
          toast.showSuccess(`تم إعادة تعيين كلمة المرور بنجاح. كلمة المرور الجديدة: ${generatedPassword}`);
        } else {
          toast.showSuccess('تم إعادة تعيين كلمة المرور بنجاح');
        }
      },
    }
  );

  const handleOpenModal = () => {
    if (!currentUserId) {
      console.error('Current user ID not available');
      return;
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (password?: string, generatePassword?: boolean) => {
    if (!currentUserId) {
      console.error('Current user ID not available');
      return;
    }

    try {
      await resetPassword.execute({ userId: currentUserId, password, generatePassword });
    } catch (error) {
      console.error('Error resetting password:', error);
      // Error is handled by useApiWithToast
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        backgroundColor: '#F8F9FC',
      }}
    >
      <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
        <Card
          sx={{
            maxWidth: 600,
            margin: '0 auto',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <CardContent sx={{ padding: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#111827',
                marginBottom: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Lock sx={{ color: '#0c2b7a' }} />
              إعادة تعيين كلمة مرور المستخدم
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#6B7280',
                marginBottom: 4,
              }}
            >
              إعادة تعيين كلمة المرور لحساب المستخدم الحالي. سيتم إنشاء كلمة المرور الجديدة تلقائياً أو يمكنك تعيين كلمة مرور مخصصة.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {currentUsername && (
                <Box
                  sx={{
                    padding: '12px 16px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    marginBottom: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '14px',
                      color: '#6B7280',
                      fontWeight: 500,
                      mb: 0.5,
                    }}
                  >
                    المستخدم الحالي:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '16px',
                      color: '#111827',
                      fontWeight: 600,
                    }}
                  >
                    {currentUsername}
                  </Typography>
                </Box>
              )}
              <ResetPasswordForm
                open={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                username={currentUsername || undefined}
                loading={resetPassword.loading}
              />
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: 2,
                }}
              >
                <Button
                  onClick={handleOpenModal}
                  variant="contained"
                  startIcon={<Lock />}
                  disabled={!currentUserId || loadingCurrentUser}
                  sx={{
                    padding: '12px 24px',
                    backgroundColor: '#0c2b7a',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: '#0a2368',
                    },
                    '&:disabled': {
                      backgroundColor: '#9CA3AF',
                      color: '#FFFFFF',
                    },
                  }}
                >
                  إعادة تعيين كلمة المرور للمستخدم الحالي
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
