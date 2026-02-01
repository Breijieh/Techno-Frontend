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
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import type { LaborAssignment, Employee } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';

interface LaborAssignmentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<LaborAssignment>) => Promise<void>;
  initialData?: LaborAssignment | null;
  loading?: boolean;
  requestNo?: number;
  employees: Employee[];
  projects: ProjectSummary[];
  selectedProjectCode?: number;
}

export default function LaborAssignmentForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  requestNo,
  employees,
  projects,
  selectedProjectCode,
}: LaborAssignmentFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<LaborAssignment & { projectCode: number; dailyRate: number }>>({
    requestNo: requestNo || 0,
    employeeId: 0,
    projectCode: selectedProjectCode || 0,
    specialization: '',
    fromDate: undefined,
    toDate: undefined,
    status: 'ACTIVE',
    dailyRate: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          requestNo: initialData.requestNo,
          employeeId: initialData.employeeId,
          projectCode: initialData.projectCode || selectedProjectCode || 0, // Use projectCode from initialData first, then selectedProjectCode
          specialization: initialData.specialization,
          fromDate: initialData.fromDate ? new Date(initialData.fromDate) : undefined,
          toDate: initialData.toDate ? new Date(initialData.toDate) : undefined,
          status: initialData.status,
          dailyRate: initialData.dailyRate || 0, // Use dailyRate from initialData
        });
      } else {
        setFormData({
          requestNo: requestNo || 0,
          employeeId: 0,
          projectCode: selectedProjectCode || 0,
          specialization: '',
          fromDate: undefined,
          toDate: undefined,
          status: 'ACTIVE',
          dailyRate: 0,
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open, requestNo, selectedProjectCode]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectCode) newErrors.projectCode = 'المشروع مطلوب';
    if (!formData.employeeId) newErrors.employeeId = 'الموظف مطلوب';
    if (!formData.specialization?.trim()) newErrors.specialization = 'التخصص مطلوب';
    if (!formData.fromDate) newErrors.fromDate = 'تاريخ البدء مطلوب';
    if (!formData.toDate) newErrors.toDate = 'تاريخ الانتهاء مطلوب';
    if (formData.fromDate && formData.toDate && formData.toDate < formData.fromDate) {
      newErrors.toDate = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
    }
    if (!formData.dailyRate || formData.dailyRate <= 0) {
      newErrors.dailyRate = 'المعدل اليومي يجب أن يكون أكبر من 0';
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
    label: `${proj.projectName} (${proj.projectCode})`,
  }));

  const specializationOptions = [
    { value: 'Electrician', label: 'كهربائي' },
    { value: 'Plumber', label: 'سباك' },
    { value: 'Carpenter', label: 'نجار' },
    { value: 'Welder', label: 'لحام' },
    { value: 'Painter', label: 'دهان' },
    { value: 'General Labor', label: 'عامل عام' },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل تعيين العمالة' : 'إضافة تعيين عمالة'}
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
              label="المشروع"
              value={formData.projectCode || 0}
              onChange={(val: string | number) => setFormData({ ...formData, projectCode: val as number })}
              options={[{ value: 0, label: 'اختر المشروع' }, ...projectOptions]}
              error={!!errors.projectCode}
              helperText={errors.projectCode}
              required
            />
            <AnimatedSelect
              label="الموظف"
              value={formData.employeeId || 0}
              onChange={(val: string | number) => setFormData({ ...formData, employeeId: val as number })}
              options={[{ value: 0, label: 'اختر الموظف' }, ...employeeOptions]}
              error={!!errors.employeeId}
              helperText={errors.employeeId}
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
            <AnimatedSelect
              label="التخصص"
              value={formData.specialization || ''}
              onChange={(val: string | number) => setFormData({ ...formData, specialization: val as string })}
              options={[{ value: '', label: 'اختر التخصص' }, ...specializationOptions]}
              error={!!errors.specialization}
              helperText={errors.specialization}
              required
            />
            <AnimatedTextField
              label="المعدل اليومي (ر.س)"
              type="number"
              value={formData.dailyRate ? formData.dailyRate.toString() : ''}
              onChange={(val: number | string) => setFormData({ ...formData, dailyRate: val === '' ? 0 : Number(val) })}
              error={!!errors.dailyRate}
              helperText={errors.dailyRate || 'أدخل المعدل اليومي بالريال السعودي (يجب أن يكون أكبر من 0)'}
              required
              InputProps={{
                inputProps: { min: 0.01, step: 0.01 },
              }}
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
            <AnimatedDatePicker
              label="من تاريخ"
              value={formData.fromDate}
              onChange={(val: Date | null) => setFormData({ ...formData, fromDate: val || undefined })}
              error={!!errors.fromDate}
              helperText={errors.fromDate}
              required
            />
            <AnimatedDatePicker
              label="إلى تاريخ"
              value={formData.toDate}
              onChange={(val: Date | null) => setFormData({ ...formData, toDate: val || undefined })}
              error={!!errors.toDate}
              helperText={errors.toDate}
              required
              minDate={formData.fromDate || undefined}
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
            <AnimatedSelect
              label="الحالة"
              value={formData.status || 'ACTIVE'}
              onChange={(val: string | number | boolean) => setFormData({ ...formData, status: val as 'ACTIVE' | 'COMPLETED' })}
              options={[
                { value: 'ACTIVE', label: 'نشط' },
                { value: 'COMPLETED', label: 'مكتمل' },
              ]}
              required
            />
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

