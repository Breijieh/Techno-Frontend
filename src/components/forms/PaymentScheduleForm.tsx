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
  AnimatedDatePicker,
  AnimatedNumberField,
  AnimatedTextField,
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import { SmartRow, SmartField } from '@/components/common/SmartLayout';
import { formatNumber } from '@/lib/utils/numberFormatter';
import type { ProjectDuePayment, PaymentStatus } from '@/types';

interface PaymentScheduleFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<ProjectDuePayment> & {
    sequenceNo: number;
    paymentType?: 'INCOMING' | 'OUTGOING';
    paymentPercentage?: number;
    notes?: string;
  }) => Promise<void>;
  initialData?: ProjectDuePayment | null;
  loading?: boolean;
  projects?: Array<{
    projectCode: number;
    projectName?: string;
    totalProjectAmount?: number;
  }>;
}

export default function PaymentScheduleForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  projects = [],
}: PaymentScheduleFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<ProjectDuePayment> & {
    sequenceNo: number;
    paymentType?: 'INCOMING' | 'OUTGOING';
    paymentPercentage?: number;
    notes?: string;
  }>({
    projectCode: 0,
    sequenceNo: 1,
    dueDate: undefined as Date | undefined,
    dueAmount: 0,
    paymentStatus: 'UNPAID' as PaymentStatus,
    paymentType: 'INCOMING',
    paymentPercentage: undefined,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        projectCode: initialData.projectCode,
        sequenceNo: initialData.serialNo || 1,
        dueDate: initialData.dueDate ? new Date(initialData.dueDate) : undefined,
        dueAmount: initialData.dueAmount,
        paymentStatus: initialData.paymentStatus,
        paymentType: initialData.paymentType || 'INCOMING',
        paymentPercentage: initialData.paymentPercentage,
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        projectCode: 0,
        sequenceNo: 1,
        dueDate: undefined,
        dueAmount: 0,
        paymentStatus: 'UNPAID',
        paymentType: 'INCOMING',
        paymentPercentage: undefined,
        notes: '',
      });
    }
    setErrors({});
  }, [initialData, open]);

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectCode) newErrors.projectCode = 'المشروع مطلوب';
    if (!formData.paymentType) newErrors.paymentType = 'نوع الدفع مطلوب';
    if (!formData.sequenceNo || formData.sequenceNo < 1) {
      newErrors.sequenceNo = 'رقم التسلسل يجب أن يكون على الأقل 1';
    }
    if (!formData.dueDate) newErrors.dueDate = 'تاريخ الاستحقاق مطلوب';
    if (!formData.dueAmount || formData.dueAmount <= 0) {
      newErrors.dueAmount = 'المبلغ المستحق يجب أن يكون أكبر من 0';
    }
    if (formData.paymentPercentage !== undefined && (formData.paymentPercentage < 0 || formData.paymentPercentage > 100)) {
      newErrors.paymentPercentage = 'نسبة الدفع يجب أن تكون بين 0 و 100';
    }

    // Validate payment amount doesn't exceed project total
    if (formData.projectCode && (formData.dueAmount || 0) > 0) {
      const selectedProject = projects?.find(p => p.projectCode === formData.projectCode);

      if (selectedProject?.totalProjectAmount) {
        const projectTotal = selectedProject.totalProjectAmount;

        // For incoming payments, check against project total
        // For outgoing payments, we might allow more flexibility, but still validate
        if (formData.paymentType === 'INCOMING' && (formData.dueAmount || 0) > projectTotal) {
          newErrors.dueAmount = `مبلغ الدفع (${formatNumber(formData.dueAmount || 0)} ريال) لا يمكن أن يتجاوز إجمالي قيمة المشروع (${formatNumber(projectTotal)} ريال)`;
        }

        // Also check sum of all existing payments + new payment doesn't exceed project total
        try {
          const { projectsApi } = await import('@/lib/api');
          const existingPayments = await projectsApi.getProjectPayments(formData.projectCode);

          if (Array.isArray(existingPayments)) {
            const existingTotal = (existingPayments as ProjectDuePayment[])
              .filter((p) => {
                // If editing, exclude the current payment from the sum
                if (isEdit && initialData) {
                  return (p.serialNo) !== initialData.serialNo;
                }
                return true;
              })
              .reduce((sum: number, p: ProjectDuePayment) => {
                return sum + (Number(p.dueAmount) || 0);
              }, 0);

            const dueAmountNum = Number(formData.dueAmount || 0);
            const newTotal = existingTotal + dueAmountNum;

            if (formData.paymentType === 'INCOMING' && newTotal > projectTotal) {
              const remaining = projectTotal - existingTotal;
              newErrors.dueAmount = `إجمالي المدفوعات (${formatNumber(newTotal)} ريال) سيتجاوز إجمالي المشروع (${formatNumber(projectTotal)} ريال). الحد الأقصى المسموح: ${remaining > 0 ? formatNumber(remaining) : '0'} ريال`;
            }
          }
        } catch (error) {
          // If we can't fetch existing payments, just validate against project total
          console.log('Could not fetch existing payments for validation:', error);
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    const isValid = await validate();
    if (!isValid) return;

    await onSubmit(formData);
  };

  const projectOptions = (projects || []).map((proj) => ({
    value: proj.projectCode,
    label: `${proj.projectName || proj.projectName || 'مشروع'} (#${proj.projectCode})`,
  }));

  // Auto-calculate next sequence number when project is selected
  useEffect(() => {
    if (formData.projectCode && formData.projectCode > 0 && !isEdit) {
      // Fetch existing payments for this project to determine next sequence
      const fetchNextSequence = async () => {
        try {
          const { projectsApi } = await import('@/lib/api');
          const existingPayments = await projectsApi.getProjectPayments(formData.projectCode || 0);

          if (Array.isArray(existingPayments) && existingPayments.length > 0) {
            // Find the highest sequence number and add 1
            const maxSequence = Math.max(
              ...existingPayments.map((p: { sequenceNo?: number; serialNo?: number }) => p.sequenceNo || p.serialNo || 0)
            );
            const nextSequence = maxSequence + 1;

            // Only update if current sequence is 1 (default) or if it's less than the calculated next
            if (formData.sequenceNo === 1 || formData.sequenceNo < nextSequence) {
              setFormData(prev => ({ ...prev, sequenceNo: nextSequence }));
            }
          } else {
            // No existing payments, start with 1
            if (formData.sequenceNo !== 1) {
              setFormData(prev => ({ ...prev, sequenceNo: 1 }));
            }
          }
        } catch (error) {
          // If error fetching, keep current value or default to 1
          console.log('Could not fetch existing payments, using default sequence:', error);
          if (formData.sequenceNo !== 1) {
            setFormData(prev => ({ ...prev, sequenceNo: 1 }));
          }
        }
      };

      fetchNextSequence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.projectCode, isEdit]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل جدول الدفع' : 'إضافة جدول دفع'}
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
              <AnimatedSelect
                label="المشروع"
                value={formData.projectCode || 0}
                onChange={(val: string | number) => setFormData({ ...formData, projectCode: val as number })}
                options={[{ value: 0, label: 'اختر المشروع' }, ...projectOptions]}
                error={!!errors.projectCode}
                helperText={errors.projectCode}
                required
              />
            </SmartField>
            <SmartField>
              <AnimatedSelect
                label="نوع الدفع"
                value={formData.paymentType || 'INCOMING'}
                onChange={(val: string | number) => setFormData({ ...formData, paymentType: val as 'INCOMING' | 'OUTGOING' })}
                options={[
                  { value: 'INCOMING', label: 'وارد' },
                  { value: 'OUTGOING', label: 'صادر' },
                ]}
                error={!!errors.paymentType}
                helperText={errors.paymentType || 'اتجاه الدفع (من العميل أو للمورد)'}
                required
              />
            </SmartField>
          </SmartRow>

          <SmartRow>
            <SmartField>
              <AnimatedNumberField
                label="رقم تسلسل الدفع"
                value={formData.sequenceNo || ''}
                onChange={(val: number | string) => setFormData({ ...formData, sequenceNo: val === '' ? 1 : Number(val) })}
                error={!!errors.sequenceNo}
                helperText={errors.sequenceNo || 'يتم حسابه تلقائياً بناءً على المدفوعات الموجودة'}
                required
                min={1}
                max={999}
              />
            </SmartField>
            <SmartField>
              <AnimatedDatePicker
                label="تاريخ الاستحقاق"
                value={formData.dueDate}
                onChange={(val: Date | null) => setFormData({ ...formData, dueDate: val || undefined })}
                error={!!errors.dueDate}
                helperText={errors.dueDate}
                required
              />
            </SmartField>
          </SmartRow>

          <SmartRow>
            <SmartField>
              <AnimatedNumberField
                label="المبلغ المستحق"
                value={formData.dueAmount || ''}
                onChange={(val: number | string) => setFormData({ ...formData, dueAmount: val === '' ? 0 : Number(val) })}
                error={!!errors.dueAmount}
                helperText={errors.dueAmount}
                required
                min={1}
                prefix="ر.س"
              />
            </SmartField>
            <SmartField>
              <AnimatedNumberField
                label="نسبة الدفع (%)"
                value={formData.paymentPercentage || ''}
                onChange={(val: number | string) => setFormData({ ...formData, paymentPercentage: val === '' ? undefined : Number(val) })}
                error={!!errors.paymentPercentage}
                helperText={errors.paymentPercentage || 'النسبة المئوية (0-100%)'}
                min={0}
                max={100}
              />
            </SmartField>
          </SmartRow>

          <Box sx={{ mt: 1 }}>
            <AnimatedTextField
              label="الوصف/ملاحظات"
              value={formData.notes || ''}
              onChange={(val: string) => setFormData({ ...formData, notes: val })}
              error={!!errors.notes}
              helperText={errors.notes || 'ملاحظات إضافية أو وصف لهذا الدفع'}
              multiline
              rows={3}
            />
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

