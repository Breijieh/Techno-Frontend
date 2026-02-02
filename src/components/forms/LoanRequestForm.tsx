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
  AnimatedAutocomplete,
  AnimatedDatePicker,
  AnimatedNumberField,
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import type { LoanRequest, RequestStatus, Employee } from '@/types';
import { employeesApi } from '@/lib/api';

import { SmartRow, SmartField } from '@/components/common/SmartLayout';

interface LoanRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<LoanRequest>) => Promise<void>;
  initialData?: LoanRequest | null;
  loading?: boolean;
}

export default function LoanRequestForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: LoanRequestFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<LoanRequest>>({
    employeeId: 0,
    loanAmount: 0,
    numberOfInstallments: 0,
    firstPaymentDate: undefined as Date | undefined,
    status: 'NEW' as RequestStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [prevInitialData, setPrevInitialData] = useState<LoanRequest | null | undefined>(null);
  const [prevOpen, setPrevOpen] = useState(false);

  if (initialData !== prevInitialData || open !== prevOpen) {
    setPrevInitialData(initialData);
    setPrevOpen(open);
    setFormData(initialData ? {
      employeeId: initialData.employeeId,
      loanAmount: initialData.loanAmount,
      numberOfInstallments: initialData.numberOfInstallments,
      firstPaymentDate: initialData.firstPaymentDate ? new Date(initialData.firstPaymentDate) : undefined,
      status: initialData.status,
    } : {
      employeeId: 0,
      loanAmount: 0,
      numberOfInstallments: 0,
      firstPaymentDate: undefined,
      status: 'NEW',
    });
    setErrors({});
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) newErrors.employeeId = 'الموظف مطلوب';
    if (!formData.loanAmount || formData.loanAmount <= 0) {
      newErrors.loanAmount = 'يجب أن يكون مبلغ السلفة أكبر من 0';
    }
    if (!formData.numberOfInstallments || formData.numberOfInstallments < 3) {
      newErrors.numberOfInstallments = 'يجب أن يكون عدد الأقساط 3 على الأقل';
    }
    if (!formData.firstPaymentDate) {
      newErrors.firstPaymentDate = 'تاريخ الدفع الأول مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const submitData: Partial<LoanRequest> = {
      ...formData,
      requestDate: new Date(),
      remainingBalance: formData.loanAmount || 0,
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
          // Ensure we handle both potential response formats
          const employeeList = Array.isArray(response) ? response : (response as unknown as { content: Employee[]; employees?: Employee[] }).content || (response as unknown as { employees?: Employee[] }).employees || [];
          setEmployees(employeeList.map((emp) => {
            const e = emp as Employee & { fullName?: string; employeeName?: string; employeeNo?: string };
            return {
              ...emp,
              employeeId: e.employeeId || e.employeeNo,
              fullName: e.fullName || e.employeeName || 'غير معروف'
            };
          }));
        } catch (error) {
          console.error('Failed to fetch employees:', error);
        }
      };
      fetchEmployees();
    }
  }, [open, employees.length]);

  const employeeOptions = employees.map((emp) => ({
    value: emp.employeeId,
    label: `${emp.fullName} (${emp.employeeId})`,
  }));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل طلب السلفة' : 'طلب سلفة جديد'}
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
                value={employeeOptions.find(opt => opt.value === formData.employeeId) || null}
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
              <AnimatedDatePicker
                label="تاريخ الدفع الأول"
                value={formData.firstPaymentDate}
                onChange={(val: Date | null) => setFormData({ ...formData, firstPaymentDate: val || undefined })}
                error={!!errors.firstPaymentDate}
                helperText={errors.firstPaymentDate}
                required
                minDate={new Date()}
              />
            </SmartField>
          </SmartRow>

          <SmartRow>
            <SmartField>
              <AnimatedNumberField
                label="مبلغ السلفة"
                value={formData.loanAmount || ''}
                onChange={(val: number | string) => setFormData({ ...formData, loanAmount: val === '' ? 0 : Number(val) })}
                error={!!errors.loanAmount}
                helperText={errors.loanAmount}
                required
                min={1}
                prefix="ر.س"
              />
            </SmartField>
            <SmartField>
              <AnimatedNumberField
                label="عدد الأقساط"
                value={formData.numberOfInstallments || ''}
                onChange={(val: number | string) => setFormData({ ...formData, numberOfInstallments: val === '' ? 0 : Number(val) })}
                error={!!errors.numberOfInstallments}
                helperText={errors.numberOfInstallments}
                required
                min={3}
              />
            </SmartField>
          </SmartRow>

          <Box sx={{ mt: 2, p: 2, bgcolor: '#F9FAFB', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>القسط الشهري التقديري:</span>
              <span style={{ fontWeight: 600, color: '#0c2b7a' }}>
                {formData.loanAmount && formData.numberOfInstallments
                  ? (formData.loanAmount / formData.numberOfInstallments).toFixed(2) + ' ر.س'
                  : '-'}
              </span>
            </Box>
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

