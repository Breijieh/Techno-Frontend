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
  AnimatedDatePicker,
  AnimatedNumberField,
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import type { TempWorkerAssignment, Employee } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';

interface TempLaborAssignmentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<TempWorkerAssignment> & { employeeNo?: number; projectCode?: number; notes?: string }) => Promise<void>;
  initialData?: TempWorkerAssignment | null;
  loading?: boolean;
  projects: ProjectSummary[];
  employees: Employee[];
}

export default function TempLaborAssignmentForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  projects,
  employees,
}: TempLaborAssignmentFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<TempWorkerAssignment> & { employeeNo?: number; projectCode?: number; notes?: string }>({
    workerName: '',
    specialization: '',
    nationality: '',
    startDate: undefined,
    endDate: undefined,
    dailyWage: 0,
    status: 'ACTIVE',
    employeeNo: 0,
    projectCode: 0,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          workerName: initialData.workerName,
          specialization: initialData.specialization,
          nationality: initialData.nationality,
          startDate: initialData.startDate ? new Date(initialData.startDate) : undefined,
          endDate: initialData.endDate ? new Date(initialData.endDate) : undefined,
          dailyWage: initialData.dailyWage,
          status: initialData.status,
          employeeNo: initialData.employeeNo || 0,
          projectCode: initialData.projectCode || 0,
          notes: initialData.notes || '',
        });
      } else {
        setFormData({
          workerName: '',
          specialization: '',
          nationality: '',
          startDate: undefined,
          endDate: undefined,
          dailyWage: 0,
          status: 'ACTIVE',
          employeeNo: 0,
          projectCode: 0,
          notes: '',
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  // Auto-populate specialization and nationality when employee is selected
  useEffect(() => {
    if (formData.employeeNo && formData.employeeNo > 0) {
      const selectedEmployee = employees.find(emp => emp.employeeId === formData.employeeNo);
      if (selectedEmployee) {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          setFormData(prev => ({
            ...prev,
            workerName: selectedEmployee.fullName,
            specialization: selectedEmployee.positionTitle || prev.specialization,
            nationality: selectedEmployee.nationality || prev.nationality,
          }));
        }, 0);
      }
    }
  }, [formData.employeeNo, employees]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeNo || formData.employeeNo === 0) {
      newErrors.employeeNo = 'الموظف مطلوب';
    }
    if (!formData.projectCode || formData.projectCode === 0) {
      newErrors.projectCode = 'المشروع مطلوب';
    }
    if (!formData.startDate) newErrors.startDate = 'تاريخ البدء مطلوب';
    if (!formData.endDate) newErrors.endDate = 'تاريخ الانتهاء مطلوب';
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
    }
    if (!formData.dailyWage || formData.dailyWage <= 0) {
      newErrors.dailyWage = 'الأجر اليومي يجب أن يكون أكبر من 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onSubmit(formData);
  };

  const employeeOptions = (employees || []).map((emp) => ({
    value: emp.employeeId,
    label: `${emp.fullName} (${emp.employeeId})`,
  }));

  const projectOptions = (projects || []).map((proj) => ({
    value: proj.projectCode,
    label: `${proj.projectName} (#${proj.projectCode})`,
  }));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل تعيين عمال مؤقتين' : 'إضافة تعيين عمال مؤقتين'}
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
            gap: 3,
            padding: '8px 0',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
              animation: open ? 'fieldEnter 0.4s ease-out 0.1s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedSelect
              label="الموظف"
              value={formData.employeeNo || 0}
              onChange={(val: string | number) => setFormData({ ...formData, employeeNo: val as number })}
              options={[{ value: 0, label: 'اختر الموظف' }, ...employeeOptions]}
              error={!!errors.employeeNo}
              helperText={errors.employeeNo}
              required
            />
            <AnimatedSelect
              label="المشروع"
              value={formData.projectCode || 0}
              onChange={(val: string | number) => setFormData({ ...formData, projectCode: val as number })}
              options={[{ value: 0, label: 'اختر المشروع' }, ...projectOptions]}
              error={!!errors.projectCode}
              helperText={errors.projectCode}
              required
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
              animation: open ? 'fieldEnter 0.4s ease-out 0.12s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedNumberField
              label="الأجر اليومي"
              value={formData.dailyWage || ''}
              onChange={(val: number | string) => setFormData({ ...formData, dailyWage: val === '' ? 0 : Number(val) })}
              error={!!errors.dailyWage}
              helperText={errors.dailyWage}
              required
              min={1}
              prefix="ر.س"
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
              animation: open ? 'fieldEnter 0.4s ease-out 0.2s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedDatePicker
              label="تاريخ البدء"
              value={formData.startDate}
              onChange={(val: Date | null) => setFormData({ ...formData, startDate: val || undefined })}
              error={!!errors.startDate}
              helperText={errors.startDate}
              required
            />
            <AnimatedDatePicker
              label="تاريخ الانتهاء"
              value={formData.endDate}
              onChange={(val: Date | null) => setFormData({ ...formData, endDate: val || undefined })}
              error={!!errors.endDate}
              helperText={errors.endDate}
              required
              minDate={formData.startDate || undefined}
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
              label="ملاحظات"
              value={formData.notes || ''}
              onChange={(val: string) => setFormData({ ...formData, notes: val })}
              error={!!errors.notes}
              helperText={errors.notes || 'ملاحظات اختيارية لهذا التعيين (حد أقصى 500 حرف)'}
              multiline
              rows={3}
            />
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

