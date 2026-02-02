'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Save,
  Cancel,
} from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import {
  AnimatedTextField,
  AnimatedSelect,
  AnimatedSwitch,
} from '@/components/common/FormFields';
import { SmartRow, SmartField } from '@/components/common/SmartLayout';
import type { UserAccount, UserType } from '@/types';
import { employeesApi } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';

interface UserAccountFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<UserAccount>) => Promise<void>;
  initialData?: UserAccount | null;
  loading?: boolean;
}

export default function UserAccountForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: UserAccountFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<UserAccount>>({
    username: '',
    password: '',
    nationalId: '',
    userType: 'EMPLOYEE' as UserType,
    isActive: true,
    employeeId: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch employees for dropdown
  const { data: employeesData } = useApi(
    () => employeesApi.getAllEmployees({ size: 1000, status: 'ACTIVE' }),
    { immediate: true }
  );

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          username: initialData.username,
          userType: initialData.userType,
          isActive: initialData.isActive,
          employeeId: initialData.employeeId,
          password: '', // Don't pre-fill password
        });
      } else {
        setFormData({
          username: '',
          password: '',
          nationalId: '',
          userType: 'EMPLOYEE',
          isActive: true,
          employeeId: undefined,
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username?.trim()) {
      newErrors.username = 'اسم المستخدم مطلوب';
    } else if (formData.username.length < 3) {
      newErrors.username = 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
    }

    if (!isEdit && !formData.nationalId?.trim()) {
      newErrors.nationalId = 'الهوية الوطنية مطلوبة';
    } else if (formData.nationalId && formData.nationalId.length > 20) {
      newErrors.nationalId = 'الهوية الوطنية يجب أن تكون 20 حرفاً أو أقل';
    }

    if (!isEdit && !formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const submitData: Partial<UserAccount> = {
      ...formData,
      // Only include password if it's provided (for new users or password reset)
      ...(formData.password ? { password: formData.password } : {}),
    };

    await onSubmit(submitData);
  };

  const employeeOptions = employeesData?.employees?.map((emp) => ({
    value: emp.employeeNo,
    label: `${emp.employeeName || emp.employeeName} (${emp.employeeNo})`,
  })) || [];

  return (
    <AnimatedDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'تعديل حساب المستخدم' : 'إضافة حساب مستخدم جديد'}
      maxWidth="md"
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
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
              color: '#FFFFFF',
              '&:hover': {
                background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
              },
              '&:disabled': {
                background: '#9CA3AF',
              },
            }}
          >
            {loading ? 'جارٍ الحفظ...' : isEdit ? 'تحديث' : 'إنشاء'}
          </Button>
        </Box>
      }
    >
      <SmartRow>
        <SmartField>
          <AnimatedTextField
            label="اسم المستخدم"
            value={formData.username || ''}
            onChange={(val: string) => setFormData({ ...formData, username: val })}
            error={!!errors.username}
            helperText={errors.username}
            required
            autoFocus
            disabled={isEdit} // Username cannot be changed in edit mode
          />
        </SmartField>
        {!isEdit && (
          <SmartField>
            <AnimatedTextField
              label="الهوية الوطنية"
              value={formData.nationalId || ''}
              onChange={(val: string) => setFormData({ ...formData, nationalId: val })}
              error={!!errors.nationalId}
              helperText={errors.nationalId}
              required
            />
          </SmartField>
        )}
      </SmartRow>

      <Box>
        <AnimatedTextField
          label={isEdit ? 'كلمة مرور جديدة (اتركها فارغة للاحتفاظ بالحالية)' : 'كلمة المرور'}
          value={formData.password || ''}
          onChange={(val: string) => setFormData({ ...formData, password: val })}
          error={!!errors.password}
          helperText={errors.password}
          required={!isEdit}
          type="password"
        />
      </Box>

      <SmartRow>
        <SmartField>
          <AnimatedSelect
            label="نوع المستخدم"
            value={formData.userType || 'EMPLOYEE'}
            onChange={(val: string | number) => setFormData({ ...formData, userType: val as UserType })}
            options={[
              { value: 'ADMIN', label: 'مدير النظام (Admin)' },
              { value: 'GENERAL_MANAGER', label: 'المدير العام (General Manager)' },
              { value: 'REGIONAL_PROJECT_MANAGER', label: 'مدير إقليمي (Regional Manager)' },
              { value: 'HR_MANAGER', label: 'مدير الموارد البشرية (HR Manager)' },
              { value: 'FINANCE_MANAGER', label: 'مدير المالية (Finance Manager)' },
              { value: 'PROJECT_MANAGER', label: 'مدير المشروع (Project Manager)' },
              { value: 'WAREHOUSE_MANAGER', label: 'مدير المستودع (Warehouse Manager)' },
              { value: 'EMPLOYEE', label: 'موظف (Employee)' },
            ]}
            required
          />
        </SmartField>
        <SmartField>
          <AnimatedSelect
            label="الموظف المرتبط"
            value={formData.employeeId || 0}
            onChange={(val: string | number) => setFormData({ ...formData, employeeId: val === 0 ? undefined : (val as number) })}
            options={[{ value: 0, label: 'لا يوجد موظف' }, ...employeeOptions]}
          />
        </SmartField>
      </SmartRow>

      {isEdit && (
        <Box sx={{ p: 1, border: '1px dashed #E5E7EB', borderRadius: 1 }}>
          <AnimatedSwitch
            label="حساب نشط"
            checked={formData.isActive ?? true}
            onChange={(val: boolean) => setFormData({ ...formData, isActive: val })}
            helperText={formData.isActive ? 'يمكن للمستخدم تسجيل الدخول' : 'تم تعطيل دخول المستخدم'}
          />
        </Box>
      )}

    </AnimatedDialog >
  );
}

