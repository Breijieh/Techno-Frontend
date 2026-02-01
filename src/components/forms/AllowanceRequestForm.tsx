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
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import type { AllowanceRequest, RequestStatus, Employee } from '@/types';
import { employeesApi, type EmployeeResponse } from '@/lib/api/employees';

interface AllowanceRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<AllowanceRequest>) => Promise<void>;
  initialData?: AllowanceRequest | null;
  loading?: boolean;
}

export default function AllowanceRequestForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: AllowanceRequestFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<AllowanceRequest>>({
    employeeId: 0,
    allowanceType: '',
    allowanceAmount: 0,
    reason: '',
    status: 'NEW' as RequestStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        employeeId: initialData.employeeId,
        allowanceType: initialData.allowanceType,
        allowanceAmount: initialData.allowanceAmount,
        reason: initialData.reason,
        status: initialData.status,
      });
    } else {
      setFormData({
        employeeId: 0,
        allowanceType: '',
        allowanceAmount: 0,
        reason: '',
        status: 'NEW',
      });
    }
    setErrors({});
  }, [initialData, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) newErrors.employeeId = 'الموظف مطلوب';
    if (!formData.allowanceType?.trim()) newErrors.allowanceType = 'نوع البدل مطلوب';
    if (!formData.allowanceAmount || formData.allowanceAmount <= 0) {
      newErrors.allowanceAmount = 'يجب أن يكون مبلغ البدل أكبر من 0';
    }
    if (!formData.reason?.trim()) newErrors.reason = 'السبب مطلوب';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const submitData: Partial<AllowanceRequest> = {
      ...formData,
      requestDate: new Date(),
    };

    await onSubmit(submitData);
  };

  // Fetch employees when dialog opens
  useEffect(() => {
    if (open && employees.length === 0) {
      const fetchEmployees = async () => {
        setLoadingEmployees(true);
        try {
          const response = await employeesApi.searchEmployees({
            contractType: 'TECHNO',
            status: 'ACTIVE',
            page: 0,
            size: 1000
          });
          const employeeList = ((response as unknown as { employees?: Employee[] }).employees || (response.content || [])) as unknown as Employee[];
          setEmployees(employeeList);
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

  const allowanceTypeOptions = [
    { value: 'Salary Increase', label: 'زيادة راتب' },
    { value: 'Special Allowance', label: 'بدل خاص' },
    { value: 'Performance Bonus', label: 'مكافأة الأداء' },
    { value: 'Transportation', label: 'بدل مواصلات' },
    { value: 'Housing', label: 'بدل سكن' },
    { value: 'Food', label: 'بدل طعام' },
    { value: 'Medical', label: 'بدل طبي' },
    { value: 'Special', label: 'خاص' },
    { value: 'Overtime', label: 'ساعات إضافية' },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل طلب البدل' : 'طلب بدل جديد'}
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
              {loading ? 'جارٍ الإرسال...' : isEdit ? 'تحديث' : 'إرسال الطلب'}
            </Button>
          </Box>
        }
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            padding: '8px 0',
          }}
        >
          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.1s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
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
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
              animation: open ? 'fieldEnter 0.4s ease-out 0.15s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedSelect
              label="نوع البدل"
              value={formData.allowanceType || ''}
              onChange={(val: string | number) => setFormData({ ...formData, allowanceType: val as string })}
              options={[{ value: '', label: 'اختر نوع البدل' }, ...allowanceTypeOptions]}
              error={!!errors.allowanceType}
              helperText={errors.allowanceType}
              required
            />
            <AnimatedNumberField
              label="مبلغ البدل"
              value={formData.allowanceAmount || ''}
              onChange={(val: number | string) => setFormData({ ...formData, allowanceAmount: val === '' ? 0 : Number(val) })}
              error={!!errors.allowanceAmount}
              helperText={errors.allowanceAmount}
              required
              min={1}
              prefix="ر.س"
            />
          </Box>

          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.2s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedTextField
              label="السبب"
              value={formData.reason || ''}
              onChange={(val: string) => setFormData({ ...formData, reason: val })}
              error={!!errors.reason}
              helperText={errors.reason}
              required
              multiline
              rows={4}
            />
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

