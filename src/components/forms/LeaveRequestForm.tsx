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
  AnimatedDatePicker,
  AnimatedNumberField,
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import type { LeaveRequest, RequestStatus, Employee } from '@/types';
import { employeesApi } from '@/lib/api';

import { SmartRow, SmartField } from '@/components/common/SmartLayout';

interface LeaveRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<LeaveRequest>) => Promise<void>;
  initialData?: LeaveRequest | null;
  loading?: boolean;
}

export default function LeaveRequestForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: LeaveRequestFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<LeaveRequest>>({
    employeeId: 0,
    leaveType: '',
    fromDate: undefined as Date | undefined,
    toDate: undefined as Date | undefined,
    numberOfDays: 0,
    reason: '',
    status: 'NEW' as RequestStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    setTimeout(() => {
      if (initialData) {
        setFormData({
          employeeId: initialData.employeeId,
          leaveType: initialData.leaveType,
          fromDate: initialData.fromDate ? new Date(initialData.fromDate) : undefined,
          toDate: initialData.toDate ? new Date(initialData.toDate) : undefined,
          numberOfDays: initialData.numberOfDays,
          reason: initialData.reason,
          status: initialData.status,
        });
      } else {
        setFormData({
          employeeId: 0,
          leaveType: '',
          fromDate: undefined,
          toDate: undefined,
          numberOfDays: 0,
          reason: '',
          status: 'NEW',
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);


  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) newErrors.employeeId = 'الموظف مطلوب';
    if (!formData.leaveType?.trim()) newErrors.leaveType = 'نوع الإجازة مطلوب';
    if (!formData.fromDate) newErrors.fromDate = 'تاريخ البدء مطلوب';
    if (!formData.toDate) newErrors.toDate = 'تاريخ الانتهاء مطلوب';
    if (formData.fromDate && formData.toDate && formData.toDate < formData.fromDate) {
      newErrors.toDate = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
    }
    if (!formData.reason?.trim()) newErrors.reason = 'السبب مطلوب';
    if (!formData.numberOfDays || formData.numberOfDays <= 0) {
      newErrors.numberOfDays = 'يجب أن يكون عدد الأيام أكبر من 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const submitData: Partial<LeaveRequest> = {
      ...formData,
      requestDate: new Date(),
    };

    await onSubmit(submitData);
  };

  // Fetch employees when dialog opens
  useEffect(() => {
    if (open && employees.length === 0) {
      const fetchEmployees = async () => {
        try {
          const response = await employeesApi.searchEmployees({
            contractType: 'TECHNO',
            status: 'ACTIVE',
            page: 0,
            size: 1000
          });
          // Ensure we handle both potential response formats (backend returns 'employees', frontend sometimes expects 'content')
          const employeeList = Array.isArray(response) ? response :
            (response as unknown as { employees?: Employee[] }).employees ||
            (response as unknown as { content?: Employee[] }).content || [];
          setEmployees(employeeList);
        } catch (error) {
          console.error('Failed to fetch employees:', error);
        }
      };
      fetchEmployees();
    }
  }, [open, employees.length]);


  const employeeOptions = employees.map((emp) => {
    const e = emp as Employee & { fullName?: string; employeeName?: string; employeeNo?: string };
    return {
      value: e.employeeId || e.employeeNo || 0,
      label: `${e.fullName || e.employeeName} (${e.employeeId || e.employeeNo})`,
    };
  });

  const leaveTypeOptions = [
    { value: 'Annual Leave', label: 'إجازة سنوية' },
    { value: 'Sick Leave', label: 'إجازة مرضية' },
    { value: 'Emergency Leave', label: 'إجازة طارئة' },
    { value: 'Unpaid Leave', label: 'إجازة بدون راتب' },
    { value: 'Maternity Leave', label: 'إجازة أمومة' },
    { value: 'Paternity Leave', label: 'إجازة أبوة' },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل طلب الإجازة' : 'طلب إجازة جديد'}
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
                options={employeeOptions}
                getOptionLabel={(opt) => (opt as { label: string }).label}
                error={!!errors.employeeId}
                helperText={errors.employeeId}
                required
                disabled={employees.length === 0}
              />
            </SmartField>
            <SmartField>
              <AnimatedSelect
                label="نوع الإجازة"
                value={formData.leaveType || ''}
                onChange={(val: string | number) => setFormData({ ...formData, leaveType: val as string })}
                options={[{ value: '', label: 'اختر نوع الإجازة' }, ...leaveTypeOptions]}
                error={!!errors.leaveType}
                helperText={errors.leaveType}
                required
              />
            </SmartField>
          </SmartRow>

          <SmartRow>
            <SmartField>
              <AnimatedDatePicker
                label="تاريخ البدء"
                value={formData.fromDate}
                onChange={(val: Date | null) => {
                  const nextDate = val ?? undefined;
                  setFormData(prev => {
                    const newState = { ...prev, fromDate: nextDate };
                    if (newState.fromDate && newState.toDate) {
                      const diffTime = newState.toDate.getTime() - newState.fromDate.getTime();
                      newState.numberOfDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
                    }
                    return newState;
                  });
                }}
                error={!!errors.fromDate}
                helperText={errors.fromDate}
                required
                minDate={new Date()}
              />
            </SmartField>
            <SmartField>
              <AnimatedDatePicker
                label="تاريخ الانتهاء"
                value={formData.toDate}
                onChange={(val: Date | null) => {
                  const nextDate = val ?? undefined;
                  setFormData(prev => {
                    const newState = { ...prev, toDate: nextDate };
                    if (newState.fromDate && newState.toDate) {
                      const diffTime = newState.toDate.getTime() - newState.fromDate.getTime();
                      newState.numberOfDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
                    }
                    return newState;
                  });
                }}
                error={!!errors.toDate}
                helperText={errors.toDate}
                required
                minDate={formData.fromDate || new Date()}
              />
            </SmartField>
          </SmartRow>

          <SmartRow>
            <SmartField>
              <AnimatedNumberField
                label="عدد الأيام"
                value={formData.numberOfDays || ''}
                onChange={(val: number | string) => setFormData({ ...formData, numberOfDays: val === '' ? 0 : Number(val) })}
                error={!!errors.numberOfDays}
                helperText={errors.numberOfDays || 'يُحسب تلقائياً من التواريخ'}
                required
                min={1}
                disabled={!!(formData.fromDate && formData.toDate)}
              />
            </SmartField>
          </SmartRow>

          <Box sx={{ mt: 1 }}>
            <AnimatedTextField
              label="السبب"
              value={formData.reason || ''}
              onChange={(val: string) => setFormData({ ...formData, reason: val })}
              error={!!errors.reason}
              helperText={errors.reason}
              required
              multiline
              rows={3}
            />
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

