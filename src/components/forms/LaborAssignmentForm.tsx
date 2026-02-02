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
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import type { LaborAssignment, Employee } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';
import { specializationsApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';

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

  const { data: specializationsData } = useApi(
    () => specializationsApi.getAll(true),
    { immediate: open }
  );
  const specializations = specializationsData ?? [];

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
        // Resolve specialization: table may have jobTitleEn (e.g. "Electrician"), form needs code
        const specFromName = specializations.find(
          (s) => s.nameEn === initialData.specialization || s.nameAr === initialData.specialization
        );
        const specializationValue = specFromName ? specFromName.code : (initialData.specialization as string);
        setFormData({
          requestNo: initialData.requestNo,
          employeeId: initialData.employeeId,
          projectCode: initialData.projectCode || selectedProjectCode || 0,
          specialization: specializationValue,
          fromDate: initialData.fromDate ? new Date(initialData.fromDate) : undefined,
          toDate: initialData.toDate ? new Date(initialData.toDate) : undefined,
          status: initialData.status,
          dailyRate: initialData.dailyRate || 0,
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

  // When specializations load and we're in edit mode with specialization as name, resolve to code
  useEffect(() => {
    if (!initialData || !formData.specialization || specializations.length === 0) return;
    const isCode = specializations.some((s) => s.code === formData.specialization);
    if (isCode) return;
    const spec = specializations.find(
      (s) => s.nameEn === formData.specialization || s.nameAr === formData.specialization
    );
    if (spec) setFormData((prev) => ({ ...prev, specialization: spec.code }));
  }, [specializations, initialData, formData.specialization]);

  // Auto-fill specialization and daily rate from selected employee
  useEffect(() => {
    if (!formData.employeeId || formData.employeeId <= 0 || !employees?.length) return;
    const emp = employees.find((e) => e.employeeId === formData.employeeId);
    const updates: Partial<LaborAssignment & { projectCode: number; dailyRate: number }> = {
      specialization: emp?.specializationCode ?? '',
    };
    // When adding (not editing), auto-fill daily rate from employee's monthly salary (÷30)
    if (!initialData && emp?.monthlySalary != null && emp.monthlySalary > 0) {
      updates.dailyRate = Math.round((emp.monthlySalary / 30) * 100) / 100;
    }
    setFormData((prev) => ({ ...prev, ...updates }));
  }, [formData.employeeId, employees, initialData]);

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

  const employeeOptions: { value: number; label: string }[] = [
    // { value: 0, label: 'اختر الموظف' }, // Removed to allow clearing
    ...(employees || [])
      .filter((emp) => emp.status === 'ACTIVE' || (initialData && emp.employeeId === initialData.employeeId))
      .map((emp) => ({
        value: emp.employeeId,
        label: `${emp.fullName} (${emp.employeeId})`,
      })),
  ];

  const projectOptions = (projects || []).map((proj) => ({
    value: proj.projectCode,
    label: `${proj.projectName} (${proj.projectCode})`,
  }));

  const selectedEmployee = formData.employeeId && employees?.length
    ? employees.find((e) => e.employeeId === formData.employeeId)
    : null;
  const specializationDisplayText = !selectedEmployee
    ? 'اختر الموظف أولاً'
    : selectedEmployee.specializationCode
      ? (specializations.find((s) => s.code === selectedEmployee.specializationCode)?.nameAr ?? selectedEmployee.positionTitle ?? '—')
      : 'لا يوجد';

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
            <AnimatedAutocomplete
              label="المشروع"
              value={projectOptions.find((opt) => opt.value === (formData.projectCode || 0)) ?? null}
              onChange={(val) => {
                const option = val as { value: number; label: string } | null;
                setFormData({ ...formData, projectCode: option?.value ?? 0 });
              }}
              options={projectOptions}
              getOptionLabel={(opt) => (opt as { label: string }).label}
              getOptionKey={(opt) => (opt as { value: number }).value}
              error={!!errors.projectCode}
              helperText={errors.projectCode}
              required
            />
            <AnimatedAutocomplete
              label="الموظف"
              value={employeeOptions.find((opt) => opt.value === (formData.employeeId || 0)) ?? null}
              onChange={(val) => {
                const option = val as { value: number; label: string } | null;
                setFormData({ ...formData, employeeId: option?.value ?? 0 });
              }}
              options={employeeOptions}
              getOptionLabel={(opt) => (opt as { label: string }).label}
              getOptionKey={(opt) => (opt as { value: number }).value}
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
            <AnimatedTextField
              label="التخصص"
              value={specializationDisplayText}
              onChange={() => { }}
              disabled
              helperText={errors.specialization || (selectedEmployee ? 'يُعرض من المسمى الوظيفي للموظف المختار' : undefined)}
              error={!!errors.specialization}
            />
            <AnimatedTextField
              label="المعدل اليومي (ر.س)"
              type="number"
              value={formData.dailyRate ? formData.dailyRate.toString() : ''}
              onChange={(val: number | string) => setFormData({ ...formData, dailyRate: val === '' ? 0 : Number(val) })}
              error={!!errors.dailyRate}
              helperText={errors.dailyRate || (selectedEmployee ? 'يُعرض من راتب الموظف الشهري' : 'اختر الموظف أولاً')}
              required
              disabled
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

