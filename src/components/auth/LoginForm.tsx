'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Box,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import LoginRightPanel from './LoginRightPanel';
import { authApi, apiClient } from '@/lib/api';
import { ApiError } from '@/lib/api/client';

type FormData = {
  residenceId: string;
  password: string;
  rememberMe: boolean;
};

/**
 * Normalize backend role format to frontend role format
 * Backend: ADMIN, GENERAL_MANAGER, HR_MANAGER, etc. (uppercase, underscores)
 * Frontend: Admin, General Manager, HR Manager, etc. (capitalized, spaces)
 */
function normalizeUserRole(backendRole: string): string {
  const roleMap: Record<string, string> = {
    'ADMIN': 'Admin',
    'GENERAL_MANAGER': 'General Manager',
    'HR_MANAGER': 'HR Manager',
    'FINANCE_MANAGER': 'Finance Manager',
    'PROJECT_MANAGER': 'Project Manager',
    'PROJECT_SECRETARY': 'Project Secretary',
    'PROJECT_ADVISOR': 'Project Advisor',
    'REGIONAL_PROJECT_MANAGER': 'Regional Project Manager',
    'WAREHOUSE_MANAGER': 'Warehouse Manager',
    'EMPLOYEE': 'Employee',
  };

  // Return mapped role or capitalize first letter if not in map
  return roleMap[backendRole.toUpperCase()] || backendRole.charAt(0).toUpperCase() + backendRole.slice(1).toLowerCase();
}

const translations = {
  systemName: 'نظام شركة تكنو',
  residenceIdLabel: 'رقم الإقامة / الهوية الوطنية (اسم المستخدم)',
  residenceIdPlaceholder: 'أدخل رقم الإقامة أو الهوية الوطنية',
  residenceIdRequired: 'رقم الإقامة / الهوية مطلوب',
  passwordLabel: 'كلمة المرور',
  passwordPlaceholder: 'أدخل كلمة المرور',
  passwordRequired: 'كلمة المرور مطلوبة',
  rememberMe: 'تذكرني',
  loginButton: 'تسجيل الدخول',
};

export default function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    residenceId: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSliding, setIsSliding] = useState(false);

  const t = translations;

  const handleChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'rememberMe' ? event.target.checked : event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Partial<FormData> = {};
    if (!formData.residenceId.trim()) {
      newErrors.residenceId = t.residenceIdRequired;
    }
    if (!formData.password) {
      newErrors.password = t.passwordRequired;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Call real API for login
      const loginResponse = await authApi.login({
        username: formData.residenceId.trim(),
        password: formData.password,
      });

      // Store tokens
      apiClient.setTokens(loginResponse.token, loginResponse.refreshToken, formData.rememberMe);

      // Use user info from login response (it already contains userId, username, userType)
      // No need to call /auth/me immediately after login - avoids token timing issues

      // Normalize role from backend format to frontend format
      // Backend: ADMIN, GENERAL_MANAGER, EMPLOYEE, etc. (uppercase, underscores)
      // Frontend: Admin, General Manager, Employee, etc. (capitalized, spaces)
      const normalizedRole = normalizeUserRole(loginResponse.userType);

      // Store user data in sessionStorage
      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('userName', loginResponse.username);
      // Set both keys for compatibility (userType and userRole)
      sessionStorage.setItem('userType', normalizedRole);
      sessionStorage.setItem('userRole', normalizedRole); // Also set userRole for getUserRole() compatibility
      sessionStorage.setItem('userId', loginResponse.userId.toString());

      // Optional: Fetch full user info later if needed (employeeId, departmentCode, etc.)
      // For now, we use the data from login response which is sufficient for navigation

      // Remember me functionality
      if (formData.rememberMe) {
        localStorage.setItem('rememberedId', formData.residenceId);
      } else {
        localStorage.removeItem('rememberedId');
      }

      // Trigger slide animation
      setIsSliding(true);

      // Fetch full user info to get employeeId, departmentCode, etc.
      try {
        const userInfo = await authApi.getCurrentUser();
        if (userInfo.employeeId || userInfo.employeeNo) {
          sessionStorage.setItem('employeeId', (userInfo.employeeId || userInfo.employeeNo || '').toString());
        }
        if (userInfo.empContractType) {
          sessionStorage.setItem('empContractType', userInfo.empContractType);
        }
        if (userInfo.departmentCode) {
          sessionStorage.setItem('departmentCode', userInfo.departmentCode.toString());
        }
        if (userInfo.projectCode) {
          sessionStorage.setItem('projectCode', userInfo.projectCode.toString());
        }
      } catch (userError) {
        console.warn('Failed to fetch user details after login:', userError);
        // Continue login process even if this fails - sensitive pages will checking/fetch again
      }

      // Wait for animation to start, then navigate
      // Use replace to avoid adding to history and prevent back button issues
      setTimeout(() => {
        router.replace('/loading-transition');
      }, 300);
    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = 'رقم الإقامة/الهوية أو كلمة المرور غير صحيحة';

      if (error instanceof ApiError) {
        errorMessage = error.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setErrors({
        residenceId: errorMessage,
        password: ' ',
      });
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#F8F9FC',
        padding: { xs: 2, sm: 2, md: 2.5 },
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
        transform: isSliding ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        opacity: isSliding ? 0 : 1,
      }}
    >
      {/* Main Container - The "Floating Board" */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          width: '100%',
          maxWidth: { xs: '100%', sm: '96%', md: '97%', lg: '1900px' },
          height: { xs: 'auto', md: '95.5vh' },
          minHeight: { xs: 'auto', md: '750px' },
          backgroundColor: '#F8F9FC',
          borderRadius: { xs: '16px', md: '24px' },
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left Side - Login Form */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: { xs: 4, sm: 5, md: 7 },
            direction: 'rtl',
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 3,
            }}
          >
            <Image
              src="/assets/logo.png"
              alt="شعار شركة تكنو"
              width={140}
              height={70}
              priority
              style={{
                maxWidth: '100%',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          </Box>

          {/* System Name */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              color: '#2C3E50',
              fontWeight: 700,
              marginBottom: 5,
              textAlign: 'center',
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              letterSpacing: '-0.02em',
            }}
          >
            {t.systemName}
          </Typography>

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            {/* Residence ID Field */}
            <Box sx={{ marginBottom: 3 }}>
              <Typography
                sx={{
                  color: '#5A6C7D',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: 1,
                }}
              >
                {t.residenceIdLabel}
              </Typography>
              <TextField
                fullWidth
                placeholder={t.residenceIdPlaceholder}
                value={formData.residenceId}
                onChange={handleChange('residenceId')}
                error={!!errors.residenceId}
                helperText={errors.residenceId}
                autoComplete="off"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease',
                    '& fieldset': {
                      borderColor: '#E1E8ED',
                      borderWidth: '1.5px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#0c2b7a',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#0c2b7a',
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '14px 16px',
                    color: '#2C3E50',
                    fontSize: '0.95rem',
                    '&::placeholder': {
                      color: '#98A6B3',
                      opacity: 1,
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    marginLeft: 0,
                    marginTop: 0.75,
                    color: '#d32f2f',
                    fontSize: '0.75rem',
                  },
                }}
              />
            </Box>

            {/* Password Field */}
            <Box sx={{ marginBottom: 3 }}>
              <Typography
                sx={{
                  color: '#5A6C7D',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: 1,
                }}
              >
                {t.passwordLabel}
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                placeholder={t.passwordPlaceholder}
                value={formData.password}
                onChange={handleChange('password')}
                error={!!errors.password}
                helperText={errors.password}
                autoComplete="new-password"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease',
                    '& fieldset': {
                      borderColor: '#E1E8ED',
                      borderWidth: '1.5px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#0c2b7a',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#0c2b7a',
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '14px 16px',
                    color: '#2C3E50',
                    fontSize: '0.95rem',
                    '&::placeholder': {
                      color: '#98A6B3',
                      opacity: 1,
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    marginLeft: 0,
                    marginTop: 0.75,
                    color: '#d32f2f',
                    fontSize: '0.75rem',
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={togglePasswordVisibility}
                      edge="end"
                      sx={{
                        color: '#98A6B3',
                        '&:hover': {
                          color: '#5A6C7D',
                          backgroundColor: 'transparent',
                        },
                      }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Box>

            {/* Remember Me */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.rememberMe}
                  onChange={handleChange('rememberMe')}
                  sx={{
                    color: '#C5D0DC',
                    '&.Mui-checked': {
                      color: '#0c2b7a',
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(12, 43, 122, 0.04)',
                    },
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    color: '#5A6C7D',
                    fontSize: '0.875rem',
                    fontWeight: 400,
                  }}
                >
                  {t.rememberMe}
                </Typography>
              }
              sx={{ marginBottom: 4 }}
            />

            {/* Login Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{
                background: 'linear-gradient(135deg, #1043a3 0%, #0c2b7a 50%, #0a2461 100%)',
                color: '#FFFFFF',
                padding: '14px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '10px',
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(12, 43, 122, 0.3)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1450b8 0%, #0d3089 50%, #0b286f 100%)',
                  boxShadow: '0 6px 16px rgba(12, 43, 122, 0.4)',
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  background: 'linear-gradient(135deg, #0a2461 0%, #08214d 50%, #061a3f 100%)',
                  transform: 'translateY(0)',
                },
                '&:disabled': {
                  backgroundColor: '#98A6B3',
                  color: '#FFFFFF',
                  boxShadow: 'none',
                },
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} sx={{ color: '#FFFFFF' }} />
              ) : (
                t.loginButton
              )}
            </Button>
          </Box>
        </Box>

        {/* Right Side - Dashboard Preview */}
        <LoginRightPanel />
      </Box>
    </Box>
  );
}

