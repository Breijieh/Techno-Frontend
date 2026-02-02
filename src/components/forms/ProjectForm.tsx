'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Save,
  Cancel,
  Apartment,
  CalendarToday,
  MonetizationOn,
  Place,
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
  FormSection,
} from '@/components/common/FormFields';
import dynamic from 'next/dynamic';
import { timeSchedulesApi, type TimeScheduleResponse } from '@/lib/api/timeSchedules';
import { useApi } from '@/hooks/useApi';

const LocationPicker = dynamic(() => import('@/components/common/LocationPicker'), {
  ssr: false,
  loading: () => <Box sx={{ height: 400, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}><CircularProgress /></Box>,
});
import type { Project, Employee } from '@/types';

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Project>) => Promise<void>;
  initialData?: Project | null;
  loading?: boolean;
  employees: Employee[];
}

// Custom Smart Row component to replace problematic Grid
const SmartRow = ({ children, spacing = 2 }: { children: React.ReactNode; spacing?: number }) => (
  <Box sx={{ display: 'flex', gap: spacing, mb: spacing, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
    {children}
  </Box>
);

const SmartField = ({ children, flex = 1 }: { children: React.ReactNode; flex?: number | string }) => (
  <Box sx={{ flex, minWidth: { xs: '100%', md: '0' } }}>
    {children}
  </Box>
);



export default function ProjectForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  employees,
}: ProjectFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<Project>>({
    projectName: '',
    projectAddress: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    totalProjectAmount: 0,
    projectProfitMargin: undefined,
    projectLongitude: undefined,
    projectLatitude: undefined,
    attendanceRadius: undefined,
    numberOfPayments: undefined,
    firstDownPaymentDate: undefined,
    projectManagerId: 0,
    regionalManagerId: undefined,
    status: 'ACTIVE',
    scheduleId: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          projectName: initialData.projectName,
          projectAddress: initialData.projectAddress,
          startDate: initialData.startDate ? new Date(initialData.startDate) : undefined,
          endDate: initialData.endDate ? new Date(initialData.endDate) : undefined,
          totalProjectAmount: initialData.totalProjectAmount,
          projectProfitMargin: initialData.projectProfitMargin,
          projectLongitude: initialData.projectLongitude,
          projectLatitude: initialData.projectLatitude,
          attendanceRadius: initialData.attendanceRadius || (initialData.projectLatitude ? 100 : undefined),
          numberOfPayments: initialData.numberOfPayments,
          firstDownPaymentDate: initialData.firstDownPaymentDate ? new Date(initialData.firstDownPaymentDate) : undefined,
          projectManagerId: initialData.projectManagerId,
          regionalManagerId: initialData.regionalManagerId,
          status: initialData.status,
          scheduleId: initialData.scheduleId,
        });
      } else {
        setFormData({
          projectName: '',
          projectAddress: '',
          startDate: undefined,
          endDate: undefined,
          totalProjectAmount: 0,
          projectProfitMargin: undefined,
          projectLongitude: undefined,
          projectLatitude: undefined,
          attendanceRadius: undefined,
          numberOfPayments: undefined,
          firstDownPaymentDate: undefined,
          projectManagerId: 0,
          regionalManagerId: undefined,
          status: 'ACTIVE',
          scheduleId: undefined,
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectName?.trim()) newErrors.projectName = 'اسم المشروع مطلوب';
    if (!formData.projectAddress?.trim()) newErrors.projectAddress = 'عنوان المشروع مطلوب';
    if (!formData.startDate) newErrors.startDate = 'تاريخ البدء مطلوب';
    if (!formData.endDate) newErrors.endDate = 'تاريخ الانتهاء مطلوب';
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
    }
    if (!formData.totalProjectAmount || formData.totalProjectAmount <= 0) {
      newErrors.totalProjectAmount = 'إجمالي مبلغ المشروع يجب أن يكون أكبر من 0';
    }
    if (!formData.projectManagerId) newErrors.projectManagerId = 'مدير المشروع مطلوب';

    // Validate GPS coordinates: if any field is provided, all 3 must be provided
    const hasLongitude = formData.projectLongitude !== undefined && formData.projectLongitude !== null;
    const hasLatitude = formData.projectLatitude !== undefined && formData.projectLatitude !== null;
    const hasRadius = formData.attendanceRadius !== undefined && formData.attendanceRadius !== null;

    if (hasLongitude || hasLatitude || hasRadius) {
      if (!hasLongitude) {
        newErrors.projectLongitude = 'خط الطول مطلوب عند توفير إحداثيات GPS';
      }
      if (!hasLatitude) {
        newErrors.projectLatitude = 'خط العرض مطلوب عند توفير إحداثيات GPS';
      }
      if (!hasRadius) {
        newErrors.attendanceRadius = 'نطاق الحضور مطلوب عند توفير إحداثيات GPS';
      }
    }

    // Validate attendance radius range if provided
    if (hasRadius && (formData.attendanceRadius! < 50 || formData.attendanceRadius! > 5000)) {
      newErrors.attendanceRadius = 'نطاق الحضور يجب أن يكون بين 50 و 5000 متر';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
  };

  // Fetch schedules for selection
  const { data: schedulesData } = useApi(
    () => timeSchedulesApi.getAllSchedules(),
    { immediate: open }
  );

  const managerOptions = employees.map((emp) => ({
    value: emp.employeeId,
    label: emp.fullName,
  }));

  // Filter schedules: show all schedules, but indicate if already assigned to another project
  const scheduleOptions = (schedulesData || []).map((schedule: TimeScheduleResponse) => {
    const timeRange = `${schedule.scheduledStartTime.substring(0, 5)} - ${schedule.scheduledEndTime.substring(0, 5)}`;
    const isAssignedToOtherProject = schedule.projectCode != null &&
      schedule.projectCode !== initialData?.projectCode;
    const label = isAssignedToOtherProject
      ? `${schedule.scheduleName} (${timeRange}) - [مُخصص لمشروع آخر]`
      : `${schedule.scheduleName} (${timeRange})`;

    return {
      value: schedule.scheduleId,
      label,
    };
  });

  // Debug: Log schedule data
  useEffect(() => {
    if (open) {
      console.log('[ProjectForm] Schedules loaded:', schedulesData);
      console.log('[ProjectForm] Schedule options:', scheduleOptions);
      console.log('[ProjectForm] Initial scheduleId:', initialData?.scheduleId);
      console.log('[ProjectForm] Form scheduleId:', formData.scheduleId);
    }
  }, [open, schedulesData, scheduleOptions, initialData?.scheduleId, formData.scheduleId]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل المشروع' : 'إضافة مشروع جديد'}
        maxWidth="lg"
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
            gap: 1,
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '8px 4px',
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { backgroundColor: '#F3F4F6' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: '#9CA3AF', borderRadius: '4px' },
          }}
        >
          <FormSection icon={<Apartment />} title="المعلومات الأساسية" />

          <SmartRow>
            <SmartField>
              <AnimatedTextField
                label="اسم المشروع"
                value={formData.projectName || ''}
                onChange={(val: string) => setFormData({ ...formData, projectName: val })}
                error={!!errors.projectName}
                helperText={errors.projectName}
                required
                autoFocus
              />
            </SmartField>
            <SmartField>
              <AnimatedTextField
                label="عنوان موقع المشروع"
                value={formData.projectAddress || ''}
                onChange={(val: string) => setFormData({ ...formData, projectAddress: val })}
                error={!!errors.projectAddress}
                helperText={errors.projectAddress}
                required
              />
            </SmartField>
            {isEdit && (
              <SmartField>
                <AnimatedSelect
                  label="الحالة"
                  value={formData.status || 'ACTIVE'}
                  onChange={(val: string | number) => setFormData({ ...formData, status: val as 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' })}
                  options={[
                    { value: 'ACTIVE', label: 'نشط' },
                    { value: 'COMPLETED', label: 'مكتمل' },
                    { value: 'ON_HOLD', label: 'معلق' },
                  ]}
                  required
                />
              </SmartField>
            )}
          </SmartRow>

          <FormSection icon={<CalendarToday />} title="إدارة المشروع والجداول الزمنية" />

          <SmartRow>
            <SmartField>
              <AnimatedDatePicker
                label="تاريخ البدء"
                value={formData.startDate}
                onChange={(val: Date | null) => setFormData({ ...formData, startDate: val || undefined })}
                error={!!errors.startDate}
                helperText={errors.startDate}
                required
              />
            </SmartField>
            <SmartField>
              <AnimatedDatePicker
                label="تاريخ الانتهاء"
                value={formData.endDate}
                onChange={(val: Date | null) => setFormData({ ...formData, endDate: val || undefined })}
                error={!!errors.endDate}
                helperText={errors.endDate}
                required
                minDate={formData.startDate || undefined}
              />
            </SmartField>
          </SmartRow>

          <SmartRow>
            <SmartField>
              <AnimatedAutocomplete
                label="مدير المشروع (PM)"
                value={managerOptions.find(opt => opt.value === (formData.projectManagerId || 0)) || null}
                onChange={(val) => {
                  const option = val as { value: number; label: string } | null;
                  setFormData({ ...formData, projectManagerId: option?.value || 0 });
                }}
                options={[{ value: 0, label: 'اختر المدير' }, ...managerOptions]}
                getOptionLabel={(opt) => (opt as { label: string }).label}
                error={!!errors.projectManagerId}
                helperText={errors.projectManagerId}
                required
              />
            </SmartField>
            <SmartField>
              <AnimatedAutocomplete
                label="المدير الإقليمي"
                value={managerOptions.find(opt => opt.value === (formData.regionalManagerId || 0)) || null}
                onChange={(val) => {
                  const option = val as { value: number; label: string } | null;
                  setFormData({ ...formData, regionalManagerId: option?.value === 0 ? undefined : option?.value });
                }}
                options={[{ value: 0, label: 'اختر المدير الإقليمي' }, ...managerOptions]}
                getOptionLabel={(opt) => (opt as { label: string }).label}
              />
            </SmartField>
          </SmartRow>

          <SmartRow>
            <SmartField>
              <AnimatedSelect
                label="جدول الوقت"
                value={formData.scheduleId || 0}
                onChange={(val: string | number) => setFormData({ ...formData, scheduleId: val === 0 ? undefined : (val as number) })}
                options={[
                  { value: 0, label: 'بدون جدول (سيستخدم الجدول الافتراضي)' },
                  ...scheduleOptions
                ]}
                helperText="اختر جدول الوقت المرتبط بهذا المشروع"
              />
            </SmartField>
          </SmartRow>

          <FormSection icon={<MonetizationOn />} title="التفاصيل المالية" />

          <SmartRow>
            <SmartField>
              <AnimatedNumberField
                label="إجمالي مبلغ المشروع"
                value={formData.totalProjectAmount || ''}
                onChange={(val: number | string) => setFormData({ ...formData, totalProjectAmount: val === '' ? 0 : Number(val) })}
                error={!!errors.totalProjectAmount}
                helperText={errors.totalProjectAmount}
                required
                min={1}
                prefix="ر.س"
              />
            </SmartField>
            <SmartField>
              <AnimatedNumberField
                label="هامش الربح (%)"
                value={formData.projectProfitMargin || ''}
                onChange={(val: number | string) => setFormData({ ...formData, projectProfitMargin: val === '' ? undefined : Number(val) })}
                min={0}
                max={100}
              />
            </SmartField>
          </SmartRow>

          <SmartRow>
            <SmartField>
              <AnimatedNumberField
                label="عدد المدفوعات (الأقساط)"
                value={formData.numberOfPayments || ''}
                onChange={(val: number | string) => setFormData({ ...formData, numberOfPayments: val === '' ? undefined : Number(val) })}
                min={1}
              />
            </SmartField>
            <SmartField>
              <AnimatedDatePicker
                label="تاريخ الدفعة الأولى"
                value={formData.firstDownPaymentDate}
                onChange={(val: Date | null) => setFormData({ ...formData, firstDownPaymentDate: val || undefined })}
              />
            </SmartField>
          </SmartRow>

          <FormSection icon={<Place />} title="الموقع الجغرافي (GPS)" />

          <Box sx={{ mt: 1, mb: 2, height: 450 }}>
            <LocationPicker
              latitude={formData.projectLatitude}
              longitude={formData.projectLongitude}
              radius={formData.attendanceRadius}
              onChange={(lat, lng) => setFormData(prev => ({
                ...prev,
                projectLatitude: lat,
                projectLongitude: lng,
                attendanceRadius: prev.attendanceRadius || 100
              }))}
              onRadiusChange={(radius) => setFormData(prev => ({ ...prev, attendanceRadius: radius }))}
              error={errors.projectLatitude || errors.projectLongitude || errors.attendanceRadius}
            />
          </Box>

        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

