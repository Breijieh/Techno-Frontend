'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Save,
  Cancel,
  Visibility,
  VisibilityOff,
  Refresh,
} from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import { AnimatedTextField } from '@/components/common/FormFields';

interface ResetPasswordFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (password?: string, generatePassword?: boolean) => Promise<void>;
  username?: string;
  loading?: boolean;
}

export default function ResetPasswordForm({
  open,
  onClose,
  onSubmit,
  username,
  loading = false,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setPassword('');
        setErrors({});
        setShowPassword(false);
      }, 0);
    }
  }, [open]);

  // Generate a secure random password locally
  const generateSecurePassword = (): string => {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + special;

    // Ensure at least one of each type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleGeneratePassword = () => {
    const generatedPassword = generateSecurePassword();
    setPassword(generatedPassword);
    setShowPassword(true); // Show the generated password
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Only validate if user is trying to submit with custom password
    if (password.trim() && password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    } else if (password.trim() && password.length > 128) {
      newErrors.password = 'كلمة المرور يجب أن تكون أقل من 128 حرفاً';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    // Only submit if custom password is provided
    if (password.trim()) {
      await onSubmit(password, false);
    }
    // If no password, user should use Generate button
  };

  return (
    <AnimatedDialog
      open={open}
      onClose={onClose}
      title="إعادة تعيين كلمة المرور"
      maxWidth="sm"
      disableBackdropClick={loading}
      showCloseButton={!loading}
      actions={
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', width: '100%' }}>
          <Button
            onClick={onClose}
            variant="outlined"
            startIcon={<Cancel />}
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#D1D5DB',
              color: '#374151',
              '&:hover': {
                borderColor: '#9CA3AF',
                backgroundColor: '#F9FAFB',
              },
            }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Save />}
            disabled={loading || !password.trim()}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: '#F59E0B',
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: '#D97706',
              },
              '&:disabled': {
                backgroundColor: '#FCD34D',
                color: '#FFFFFF',
              },
            }}
          >
            {loading ? 'جارٍ إعادة التعيين...' : 'إعادة تعيين كلمة المرور'}
          </Button>
        </Box>
      }
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          paddingTop: 2,
        }}
      >
        {username && (
          <Box
            sx={{
              padding: '12px 16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
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
              المستخدم:
            </Typography>
            <Typography
              sx={{
                fontSize: '16px',
                color: '#111827',
                fontWeight: 600,
              }}
            >
              {username}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography
            sx={{
              fontSize: '14px',
              color: '#111827',
              fontWeight: 600,
            }}
          >
            كلمة المرور الجديدة
          </Typography>

          {/* Generate Password Button - Primary Action */}
          <Button
            onClick={handleGeneratePassword}
            variant="contained"
            size="medium"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
            disabled={loading}
            fullWidth
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: '#0c2b7a',
              color: '#FFFFFF',
              padding: '12px 24px',
              fontSize: '14px',
              '&:hover': {
                backgroundColor: '#0a266e',
              },
              '&:disabled': {
                backgroundColor: '#9CA3AF',
                color: '#FFFFFF',
              },
            }}
          >
            {loading ? 'جارٍ التوليد...' : 'توليد كلمة مرور آمنة'}
          </Button>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              '&::before, &::after': {
                content: '""',
                flex: 1,
                height: '1px',
                backgroundColor: '#E5E7EB',
              },
            }}
          >
            <Typography
              sx={{
                fontSize: '12px',
                color: '#6B7280',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              أو أدخل كلمة مرور مخصصة
            </Typography>
          </Box>

          <AnimatedTextField
            label="كلمة المرور المخصصة"
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (errors.password) {
                setErrors({ ...errors, password: '' });
              }
            }}
            error={!!errors.password}
            helperText={errors.password || 'أدخل كلمة مرور مخصصة (حد أدنى 6 أحرف)'}
            required={false}
            disabled={loading}
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    disabled={loading}
                    sx={{ color: '#6B7280' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box
          sx={{
            padding: '12px 16px',
            backgroundColor: '#DBEAFE',
            borderRadius: '8px',
            border: '1px solid #93C5FD',
          }}
        >
          <Typography
            sx={{
              fontSize: '13px',
              color: '#1E40AF',
              lineHeight: 1.6,
            }}
          >
            <strong>💡 نصيحة:</strong> استخدم &quot;توليد كلمة مرور آمنة&quot; للحصول على كلمة مرور قوية وعشوائية. سيتم عرض كلمة المرور المُولدة بعد إعادة التعيين. يجب على المستخدمين تغيير كلمة المرور بعد أول تسجيل دخول.
          </Typography>
        </Box>
      </Box>
    </AnimatedDialog>
  );
}

