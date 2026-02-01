'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  Save,
  Cancel,
} from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import {
  AnimatedTextField,
  AnimatedSwitch,
} from '@/components/common/FormFields';
import type { Supplier } from '@/types';

interface SupplierFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Supplier>) => Promise<void>;
  initialData?: Supplier | null;
  loading?: boolean;
}

// Custom Smart Row component
const SmartRow = ({ children, spacing = 2 }: { children: React.ReactNode; spacing?: number }) => (
  <Box sx={{ display: 'flex', gap: spacing, mb: spacing, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
    {children}
  </Box>
);

const SmartField = ({ children, flex = 1 }: { children: React.ReactNode; flex?: number | string }) => (
  <Box sx={{ flex, minWidth: { xs: '100%', md: '0' } }}>
    {children}
  </Box>
);

export default function SupplierForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: SupplierFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<Supplier>>({
    supplierName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          supplierName: initialData.supplierName,
          contactPerson: initialData.contactPerson || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          address: initialData.address || '',
          isActive: initialData.isActive,
        });
      } else {
        setFormData({
          supplierName: '',
          contactPerson: '',
          email: '',
          phone: '',
          address: '',
          isActive: true,
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.supplierName?.trim()) newErrors.supplierName = 'اسم المورد مطلوب';

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'تنسيق بريد إلكتروني غير صحيح';
    }

    if (formData.phone && !/^(009665|9665|\+9665|05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/.test(formData.phone)) {
      // Optional: Relaxed validation if they want to allow international numbers, but for Saudi context:
      // Checking for common Saudi patterns. If not strict, just check length or allow digits.
      // Let's use a simpler regex for general phone validation to avoid being too restrictive
      if (!/^[\d\+\-\s]{7,15}$/.test(formData.phone)) {
        newErrors.phone = 'رقم الهاتف غير صحيح';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <AnimatedDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'تعديل المورد' : 'إضافة مورد جديد'}
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
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          padding: '8px 4px',
          maxHeight: '70vh',
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { backgroundColor: '#F3F4F6' },
          '&::-webkit-scrollbar-thumb': { backgroundColor: '#9CA3AF', borderRadius: '4px' },
        }}
      >
        <Typography variant="subtitle2" sx={{ color: '#6B7280', mb: 1 }}>
          معلومات المورد
        </Typography>

        <SmartRow>
          <SmartField>
            <AnimatedTextField
              label="اسم المورد"
              value={formData.supplierName || ''}
              onChange={(val: string) => setFormData({ ...formData, supplierName: val })}
              error={!!errors.supplierName}
              helperText={errors.supplierName}
              required
              autoFocus
            />
          </SmartField>
          <SmartField>
            <AnimatedTextField
              label="الشخص المسؤول"
              value={formData.contactPerson || ''}
              onChange={(val: string) => setFormData({ ...formData, contactPerson: val })}
            />
          </SmartField>
        </SmartRow>

        <SmartRow>
          <SmartField>
            <AnimatedTextField
              label="رقم الهاتف"
              value={formData.phone || ''}
              onChange={(val: string) => setFormData({ ...formData, phone: val })}
              error={!!errors.phone}
              helperText={errors.phone || "مثال: 0501234567"}
              placeholder="05xxxxxxxx"
            />
          </SmartField>
          <SmartField>
            <AnimatedTextField
              label="البريد الإلكتروني"
              value={formData.email || ''}
              onChange={(val: string) => setFormData({ ...formData, email: val })}
              error={!!errors.email}
              helperText={errors.email}
              type="email"
            />
          </SmartField>
        </SmartRow>

        <SmartRow>
          <SmartField>
            <AnimatedTextField
              label="العنوان"
              value={formData.address || ''}
              onChange={(val: string) => setFormData({ ...formData, address: val })}
              multiline
              rows={3}
            />
          </SmartField>
        </SmartRow>

        <Box sx={{ mt: 1 }}>
          {isEdit && (
            <AnimatedSwitch
              label="حالة المورد (نشط)"
              checked={formData.isActive || false}
              onChange={(val: boolean) => setFormData({ ...formData, isActive: val })}
            />
          )}
        </Box>

      </Box>
    </AnimatedDialog>
  );
}

