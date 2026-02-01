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
import type { TransactionType } from '@/types';

interface TransactionTypeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<TransactionType>) => Promise<void>;
  initialData?: TransactionType | null;
  loading?: boolean;
}

export default function TransactionTypeForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: TransactionTypeFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<TransactionType>>({
    transactionNameAr: '',
    transactionNameEn: '',
    transactionType: 'ALLOWANCE',
    isSystem: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          transactionNameAr: initialData.transactionNameAr,
          transactionNameEn: initialData.transactionNameEn,
          transactionType: initialData.transactionType,
          isSystem: initialData.isSystem,
        });
      } else {
        setFormData({
          transactionNameAr: '',
          transactionNameEn: '',
          transactionType: 'ALLOWANCE',
          isSystem: false,
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.transactionNameAr?.trim()) newErrors.transactionNameAr = 'الاسم بالعربية مطلوب';
    if (!formData.transactionNameEn?.trim()) newErrors.transactionNameEn = 'الاسم بالإنجليزية مطلوب';

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
      title={isEdit ? 'تعديل نوع المعاملة' : 'إضافة نوع معاملة جديد'}
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
      <Box sx={{ py: 1 }}>
        <SmartRow>
          <SmartField>
            <AnimatedTextField
              label="الاسم بالعربية"
              value={formData.transactionNameAr || ''}
              onChange={(val: string) => setFormData({ ...formData, transactionNameAr: val })}
              error={!!errors.transactionNameAr}
              helperText={errors.transactionNameAr}
              required
              autoFocus
            />
          </SmartField>
          <SmartField>
            <AnimatedTextField
              label="الاسم بالإنجليزية"
              value={formData.transactionNameEn || ''}
              onChange={(val: string) => setFormData({ ...formData, transactionNameEn: val })}
              error={!!errors.transactionNameEn}
              helperText={errors.transactionNameEn}
              required
            />
          </SmartField>
        </SmartRow>

        <SmartRow>
          <SmartField>
            <AnimatedSelect
              label="فئة المعاملة"
              value={formData.transactionType || 'ALLOWANCE'}
              onChange={(val: string | number) => setFormData({ ...formData, transactionType: val as 'ALLOWANCE' | 'DEDUCTION' })}
              options={[
                { value: 'ALLOWANCE', label: 'بدل' },
                { value: 'DEDUCTION', label: 'خصم' },
              ]}
              required
            />
          </SmartField>
        </SmartRow>

        <Box sx={{ p: 1, mt: 1, border: '1px dashed #E5E7EB', borderRadius: 1 }}>
          <AnimatedSwitch
            label="معرفة من النظام"
            checked={formData.isSystem || false}
            onChange={(val: boolean) => setFormData({ ...formData, isSystem: val })}
            helperText="المعاملات المعرفة من النظام لا يمكن حذفها"
          />
        </Box>
      </Box>
    </AnimatedDialog>
  );
}
