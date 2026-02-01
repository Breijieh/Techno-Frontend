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
  AnimatedSelect,
  AnimatedNumberField,
  AnimatedSwitch,
} from '@/components/common/FormFields';
import type { AllowancePercentage } from '@/types';
import { transactionTypesApi, mapBackendToFrontend as mapTransactionTypeBackendToFrontend } from '@/lib/api/transactionTypes';
import { useApi } from '@/hooks/useApi';

interface AllowancePercentageFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<AllowancePercentage>) => Promise<void>;
  initialData?: AllowancePercentage | null;
  loading?: boolean;
  /** When adding, exclude these transaction codes from the dropdown (already exist in table) */
  existingTransactionCodes?: number[];
}

export default function AllowancePercentageForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  existingTransactionCodes = [],
}: AllowancePercentageFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<AllowancePercentage>>({
    transactionCode: undefined,
    saudiPercentage: 0,
    nonSaudiPercentage: 0,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch transaction types from backend
  const { data: transactionTypesData } = useApi(
    () => transactionTypesApi.getAllTransactionTypes(),
    { immediate: true }
  );

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          transactionCode: initialData.transactionCode,
          saudiPercentage: initialData.saudiPercentage,
          nonSaudiPercentage: initialData.nonSaudiPercentage,
          isActive: initialData.isActive,
        });
      } else {
        setFormData({
          transactionCode: undefined,
          saudiPercentage: 0,
          nonSaudiPercentage: 0,
          isActive: true,
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.transactionCode === undefined || formData.transactionCode === 0) {
      newErrors.transactionCode = 'نوع المعاملة مطلوب';
    }
    if (formData.saudiPercentage === undefined || formData.saudiPercentage < 0) {
      newErrors.saudiPercentage = 'نسبة السعودي يجب أن تكون 0 أو أكبر';
    }
    if (formData.saudiPercentage !== undefined && formData.saudiPercentage > 100) {
      newErrors.saudiPercentage = 'نسبة السعودي لا يمكن أن تتجاوز 100';
    }
    if (formData.nonSaudiPercentage === undefined || formData.nonSaudiPercentage < 0) {
      newErrors.nonSaudiPercentage = 'نسبة غير السعودي يجب أن تكون 0 أو أكبر';
    }
    if (formData.nonSaudiPercentage !== undefined && formData.nonSaudiPercentage > 100) {
      newErrors.nonSaudiPercentage = 'نسبة غير السعودي لا يمكن أن تتجاوز 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
  };

  const transactionOptions = transactionTypesData
    ? [
      { value: '', label: 'اختر نوع المعاملة' },
      ...transactionTypesData
        .map(mapTransactionTypeBackendToFrontend)
        .filter((tt) => tt.transactionType === 'ALLOWANCE')
        .filter((tt) => isEdit || !existingTransactionCodes.includes(tt.transactionCode))
        .map((tt) => ({
          value: tt.transactionCode,
          label: `${tt.transactionNameEn} (${tt.transactionCode})`,
        })),
    ]
    : [{ value: '', label: 'اختر نوع المعاملة' }];

  return (
    <AnimatedDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'تعديل نسبة البدل' : 'إضافة نسبة بدل'}
      maxWidth="md"
      fullWidth
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          padding: 2,
        }}
      >
        <AnimatedSelect
          label="نوع المعاملة"
          value={formData.transactionCode ?? ''}
          onChange={(val: string | number) =>
            setFormData({ ...formData, transactionCode: val === '' ? undefined : Number(val) })
          }
          options={transactionOptions}
          error={!!errors.transactionCode}
          helperText={errors.transactionCode}
          required
          disabled={isEdit}
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          <AnimatedNumberField
            label="نسبة السعودي"
            value={formData.saudiPercentage ?? 0}
            onChange={(val: number | string) =>
              setFormData({ ...formData, saudiPercentage: val === '' ? 0 : Number(val) })
            }
            error={!!errors.saudiPercentage}
            helperText={errors.saudiPercentage}
            min={0}
            max={100}
            required
          />

          <AnimatedNumberField
            label="نسبة غير السعودي"
            value={formData.nonSaudiPercentage ?? 0}
            onChange={(val: number | string) =>
              setFormData({ ...formData, nonSaudiPercentage: val === '' ? 0 : Number(val) })
            }
            error={!!errors.nonSaudiPercentage}
            helperText={errors.nonSaudiPercentage}
            min={0}
            max={100}
            required
          />
        </Box>

        <AnimatedSwitch
          label="نشط"
          checked={formData.isActive ?? true}
          onChange={(checked: boolean) => setFormData({ ...formData, isActive: checked })}
        />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            marginTop: 2,
          }}
        >
          <Button
            variant="outlined"
            onClick={onClose}
            startIcon={<Cancel />}
            disabled={loading}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            disabled={loading}
            sx={{
              backgroundColor: '#0c2b7a',
              '&:hover': {
                backgroundColor: '#0a2368',
              },
            }}
          >
            {loading ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
        </Box>
      </Box>
    </AnimatedDialog>
  );
}
