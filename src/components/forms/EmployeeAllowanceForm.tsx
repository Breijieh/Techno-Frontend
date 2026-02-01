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
import type { EmployeeContractAllowance } from '@/types';
import { employeesApi } from '@/lib/api/employees';
import { transactionTypesApi, mapBackendToFrontend as mapTransactionTypeBackendToFrontend } from '@/lib/api/transactionTypes';
import { useApi } from '@/hooks/useApi';

interface EmployeeAllowanceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<EmployeeContractAllowance>) => Promise<void>;
  initialData?: EmployeeContractAllowance | null;
  loading?: boolean;
  employeeId?: number;
}

export default function EmployeeAllowanceForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  employeeId,
}: EmployeeAllowanceFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<EmployeeContractAllowance>>({
    employeeId: employeeId || undefined,
    transactionCode: undefined,
    percentage: 0,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch employees and transaction types from backend
  const { data: employeesData } = useApi(
    () => employeesApi.getAllEmployees({ size: 10000 }),
    { immediate: true }
  );

  const { data: transactionTypesData } = useApi(
    () => transactionTypesApi.getAllTransactionTypes(),
    { immediate: true }
  );

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          employeeId: initialData.employeeId,
          transactionCode: initialData.transactionCode,
          percentage: initialData.percentage,
          isActive: initialData.isActive,
        });
      } else {
        setFormData({
          employeeId: employeeId || undefined,
          transactionCode: undefined,
          percentage: 0,
          isActive: true,
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open, employeeId]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) {
      newErrors.employeeId = 'الموظف مطلوب';
    }
    if (!formData.transactionCode) {
      newErrors.transactionCode = 'نوع المعاملة مطلوب';
    }
    if (!formData.percentage || formData.percentage <= 0) {
      newErrors.percentage = 'النسبة يجب أن تكون أكبر من 0';
    }
    if (formData.percentage && formData.percentage > 100) {
      newErrors.percentage = 'النسبة لا يمكن أن تتجاوز 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
  };

  const employeeOptions = employeesData?.employees
    ? [
      { value: '', label: 'اختر الموظف' },
      ...employeesData.employees.map((emp) => ({
        value: emp.employeeNo,
        label: `${emp.employeeName || emp.employeeName || 'غير معروف'} (${emp.employeeNo})`,
      })),
    ]
    : [{ value: '', label: 'اختر الموظف' }];

  const transactionOptions = transactionTypesData
    ? [
      { value: '', label: 'اختر نوع المعاملة' },
      ...transactionTypesData
        .map(mapTransactionTypeBackendToFrontend)
        .filter((tt) => tt.transactionType === 'ALLOWANCE')
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
      title={isEdit ? 'تعديل بدل الموظف' : 'إضافة بدل موظف'}
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
          label="الموظف"
          value={formData.employeeId || ''}
          onChange={(val: string | number) =>
            setFormData({ ...formData, employeeId: val === '' ? undefined : Number(val) })
          }
          options={employeeOptions}
          error={!!errors.employeeId}
          helperText={errors.employeeId}
          disabled={!!employeeId || isEdit}
          required
        />

        <AnimatedSelect
          label="نوع المعاملة"
          value={formData.transactionCode || ''}
          onChange={(val: string | number) =>
            setFormData({ ...formData, transactionCode: val === '' ? undefined : Number(val) })
          }
          options={transactionOptions}
          error={!!errors.transactionCode}
          helperText={errors.transactionCode}
          required
        />

        <AnimatedNumberField
          label="النسبة"
          value={formData.percentage || 0}
          onChange={(val: number | string) =>
            setFormData({ ...formData, percentage: val === '' ? 0 : Number(val) })
          }
          error={!!errors.percentage}
          helperText={errors.percentage || 'نسبة من إجمالي الراتب'}
          min={0}
          max={100}
          required
        />

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

