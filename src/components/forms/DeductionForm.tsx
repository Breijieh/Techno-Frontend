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
  AnimatedAutocomplete,
  AnimatedNumberField,
  AnimatedDatePicker,
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import { SmartRow, SmartField } from '@/components/common/SmartLayout';
import { employeesApi } from '@/lib/api/employees';
import { getUserRole } from '@/lib/permissions';
import { filterEmployeesByRole, getUserContext } from '@/lib/dataFilters';
import type { MonthlyDeduction, StatusType, Employee } from '@/types';
import type { TransactionTypeResponse } from '@/lib/api/transactionTypes';

interface DeductionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<MonthlyDeduction>) => Promise<void>;
  initialData?: MonthlyDeduction | null;
  loading?: boolean;
  employees?: Employee[]; // Optional now, we fetch internally
  transactionTypes: TransactionTypeResponse[];
}

export default function DeductionForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  transactionTypes,
}: DeductionFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<MonthlyDeduction>>({
    employeeId: 0,
    monthYear: '',
    deductionType: 0,
    deductionAmount: 0,
    status: 'N' as StatusType,
    notes: '',
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          employeeId: initialData.employeeId,
          monthYear: initialData.monthYear,
          deductionType: initialData.deductionType,
          deductionAmount: initialData.deductionAmount,
          status: initialData.status,
          notes: initialData.notes || '',
        });
      } else {
        const now = new Date();
        const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setFormData({
          employeeId: 0,
          monthYear: monthYear,
          deductionType: 0,
          deductionAmount: 0,
          status: 'N',
          notes: '',
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  // Fetch employees when dialog opens
  useEffect(() => {
    if (open && employees.length === 0) {
      const fetchEmployees = async () => {
        setLoadingEmployees(true);
        try {
          const response = await employeesApi.searchEmployees({
            status: 'ACTIVE',
            page: 0,
            size: 1000
          });
          const employeeList = ((response as unknown as { employees?: Employee[] }).employees || (response.content || [])) as unknown as Employee[];

          // Filter employees based on role
          const userRole = getUserRole();
          const userContext = getUserContext();
          const filteredList = filterEmployeesByRole(
            employeeList,
            userRole,
            userContext.employeeId,
            userContext.projectCode,
            userContext.departmentCode
          );

          setEmployees(filteredList);
        } catch (error) {
          console.error('Failed to fetch employees:', error);
        } finally {
          setLoadingEmployees(false);
        }
      };
      fetchEmployees();
    }
  }, [open, employees.length]);

  const employeeOptions = employees.map((emp) => {
    const e = emp as unknown as { employeeNo?: number; employeeId?: number; employeeName?: string; fullName?: string };
    return {
      value: e.employeeNo || e.employeeId || 0,
      label: `${e.employeeName || e.fullName} (${e.employeeNo || e.employeeId})`,
    };
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) newErrors.employeeId = 'الموظف مطلوب';
    if (!formData.monthYear?.trim()) newErrors.monthYear = 'الشهر/السنة مطلوبة';
    if (!formData.deductionType || formData.deductionType <= 0) {
      newErrors.deductionType = 'نوع الخصم مطلوب';
    }
    if (!formData.deductionAmount || formData.deductionAmount <= 0) {
      newErrors.deductionAmount = 'يجب أن يكون مبلغ الخصم أكبر من 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onSubmit(formData);
  };

  // Filter to only show deduction types (D) and map to options
  const deductionTypeOptions = transactionTypes
    .filter((type) => type.allowanceDeduction === 'D')
    .map((type) => ({
      value: type.typeCode,
      label: type.typeName || `Type ${type.typeCode}`,
    }));

  const parseMonthYear = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const monthYearDate = formData.monthYear
    ? (() => {
      const [year, month] = formData.monthYear!.split('-').map(Number);
      return new Date(year, month - 1, 1);
    })()
    : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل الخصم' : 'إضافة خصم جديد'}
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
              <AnimatedAutocomplete
                label="الموظف"
                value={employeeOptions.find(opt => opt.value === (formData.employeeId || 0)) || null}
                onChange={(val) => {
                  const option = val as { value: number; label: string } | null;
                  setFormData({ ...formData, employeeId: option?.value || 0 });
                }}
                options={loadingEmployees ? [] : employeeOptions}
                getOptionLabel={(opt) => (opt as { label: string }).label}
                error={!!errors.employeeId}
                helperText={errors.employeeId}
                required
                disabled={loadingEmployees}
              />
            </SmartField>
            <SmartField>
              <AnimatedDatePicker
                label="الشهر/السنة"
                value={monthYearDate}
                onChange={(val: Date | null) => setFormData({ ...formData, monthYear: parseMonthYear(val) })}
                views={['year', 'month']}
                format="MM/yyyy"
                error={!!errors.monthYear}
                helperText={errors.monthYear}
                required
              />
            </SmartField>
          </SmartRow>

          <SmartRow>
            <SmartField>
              <AnimatedSelect
                label="نوع الخصم"
                value={formData.deductionType || 0}
                onChange={(val: string | number) => setFormData({ ...formData, deductionType: val as number })}
                options={[{ value: 0, label: 'اختر النوع' }, ...deductionTypeOptions]}
                error={!!errors.deductionType}
                helperText={errors.deductionType}
                required
              />
            </SmartField>
            <SmartField>
              <AnimatedNumberField
                label="مبلغ الخصم"
                value={formData.deductionAmount || ''}
                onChange={(val: number | string) => setFormData({ ...formData, deductionAmount: val === '' ? 0 : Number(val) })}
                error={!!errors.deductionAmount}
                helperText={errors.deductionAmount}
                required
                min={1}
                prefix="ر.س"
              />
            </SmartField>
          </SmartRow>

          <Box sx={{ mt: 2 }}>
            <AnimatedTextField
              label="ملاحظات"
              value={formData.notes || ''}
              onChange={(val: string) => setFormData({ ...formData, notes: val })}
              multiline
              rows={3}
            />
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}
