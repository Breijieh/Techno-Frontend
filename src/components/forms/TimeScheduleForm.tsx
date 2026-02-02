'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Save,
  Cancel,
  AccessTime,
} from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import {
  AnimatedSelect,
  AnimatedNumberField,
  AnimatedTextField,
} from '@/components/common/FormFields';
import { SmartRow, SmartField } from '@/components/common/SmartLayout';
import type { TimeSchedule } from '@/types';
import { departmentsApi } from '@/lib/api/departments';
import { useApi } from '@/hooks/useApi';

/**
 * Calculate required hours from entry and exit times
 * Handles midnight-crossing shifts (e.g., 22:00 to 06:00)
 */
function calculateRequiredHours(entryTime: string, exitTime: string): number {
  if (!entryTime || !exitTime) return 0;

  try {
    const [entryHours, entryMinutes] = entryTime.split(':').map(Number);
    let [exitHours, exitMinutes] = exitTime.split(':').map(Number);

    if (isNaN(entryHours) || isNaN(entryMinutes) || isNaN(exitHours) || isNaN(exitMinutes)) {
      return 0;
    }

    // Handle 24:00 as 00:00 for internal calculation logic if needed, 
    // but here we treat 00:00 as next day if it appears as exit time
    if (exitHours === 24) exitHours = 0;

    const entryTotalMinutes = entryHours * 60 + entryMinutes;
    let exitTotalMinutes = exitHours * 60 + exitMinutes;

    // Handle midnight-crossing shift (exit time is before entry time)
    if (exitTotalMinutes < entryTotalMinutes) {
      exitTotalMinutes += 24 * 60; // Add 24 hours
    }

    const diffMinutes = exitTotalMinutes - entryTotalMinutes;
    const hours = diffMinutes / 60;

    // Round to 2 decimal places
    return Math.round(hours * 100) / 100;
  } catch {
    return 0;
  }
}


interface TimeScheduleFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<TimeSchedule>) => Promise<void>;
  initialData?: TimeSchedule | null;
  loading?: boolean;
  schedules?: TimeSchedule[];
}

export default function TimeScheduleForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  schedules = [],
}: TimeScheduleFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<TimeSchedule>>({
    scheduleName: '',
    departmentCode: 0,
    requiredHours: 8,
    entryTime: '08:00',
    exitTime: '17:00',
    gracePeriodMinutes: 15,
    isActive: 'Y',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-calculate required hours from entry and exit times
  const calculatedRequiredHours = useMemo(() => {
    if (formData.entryTime && formData.exitTime) {
      return calculateRequiredHours(formData.entryTime, formData.exitTime);
    }
    return formData.requiredHours || 8;
  }, [formData.entryTime, formData.exitTime, formData.requiredHours]);

  // Update requiredHours when entry/exit times change
  useEffect(() => {
    if (formData.entryTime && formData.exitTime) {
      const calculated = calculateRequiredHours(formData.entryTime, formData.exitTime);
      if (calculated > 0) {
        setFormData(prev => {
          // Only update if value actually changed to avoid infinite loops
          if (Math.abs(calculated - (prev.requiredHours || 0)) > 0.01) {
            return { ...prev, requiredHours: calculated };
          }
          return prev;
        });
      }
    }
  }, [formData.entryTime, formData.exitTime]);

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          scheduleName: initialData.scheduleName || '',
          departmentCode: initialData.departmentCode,
          requiredHours: initialData.requiredHours,
          entryTime: initialData.entryTime,
          exitTime: initialData.exitTime,
          gracePeriodMinutes: initialData.gracePeriodMinutes ?? 15,
          isActive: initialData.isActive ?? 'Y',
        });
      } else {
        setFormData({
          scheduleName: '',
          departmentCode: 0,
          requiredHours: 8,
          entryTime: '08:00',
          exitTime: '17:00',
          gracePeriodMinutes: 15,
          isActive: 'Y',
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.scheduleName?.trim()) newErrors.scheduleName = 'اسم الجدول مطلوب';
    // Department is optional for Global/Default schedules
    // if (!formData.departmentCode || formData.departmentCode === 0) newErrors.departmentCode = 'القسم مطلوب';
    // Required hours is auto-calculated, but validate it's positive
    const calculated = calculateRequiredHours(formData.entryTime || '', formData.exitTime || '');
    if (calculated <= 0) {
      newErrors.requiredHours = 'وقت الدخول والخروج غير صحيح';
    }
    if (formData.gracePeriodMinutes === undefined || formData.gracePeriodMinutes < 0) {
      newErrors.gracePeriodMinutes = 'فترة السماح يجب أن تكون 0 أو أكثر';
    }
    if (!formData.entryTime?.trim()) newErrors.entryTime = 'وقت الدخول مطلوب';
    if (!formData.exitTime?.trim()) newErrors.exitTime = 'وقت الخروج مطلوب';
    // Allow midnight-crossing shifts (exit time can be before entry time for night shifts)
    // Only validate format, not the order
    if (formData.entryTime && formData.exitTime) {
      const calculated = calculateRequiredHours(formData.entryTime, formData.exitTime);
      if (calculated <= 0) {
        newErrors.exitTime = 'وقت الخروج غير صحيح';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch departments from backend
  const { data: departmentsData } = useApi(
    () => departmentsApi.getAllDepartments(),
    { immediate: true }
  );

  // Auto-fill default values from department when selected (for new schedules)
  useEffect(() => {
    if (!isEdit && open && formData.departmentCode && formData.departmentCode > 0) {
      // Find the "Default" schedule for this department
      const deptDefault = schedules.find(
        s => s.departmentCode === formData.departmentCode
      );

      if (deptDefault) {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          setFormData(prev => ({
            ...prev,
            requiredHours: deptDefault.requiredHours,
            entryTime: deptDefault.entryTime,
            exitTime: deptDefault.exitTime,
            gracePeriodMinutes: deptDefault.gracePeriodMinutes || 15,
          }));
        }, 0);
      }
    }
  }, [formData.departmentCode, schedules, isEdit, open]);

  // Auto-generate schedule name if empty and department selected
  useEffect(() => {
    if (!isEdit && open && !formData.scheduleName && formData.departmentCode && formData.departmentCode > 0) {
      const department = (departmentsData || []).find(d => d.deptCode === formData.departmentCode);
      const deptName = department?.deptName || department?.deptName;

      if (deptName) {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          setFormData(prev => ({ ...prev, scheduleName: `${deptName} - Default Schedule` }));
        }, 0);
      }
    }
  }, [formData.departmentCode, departmentsData, isEdit, open, formData.scheduleName]);

  const handleSubmit = async () => {
    if (!validate()) return;

    // Ensure requiredHours is set to calculated value
    // Normalize times: Convert 24:00 to 00:00 for backend compatibility
    const normalizeTime = (time: string) => {
      if (time === '24:00') return '00:00';
      return time;
    };

    const submitData = {
      ...formData,
      requiredHours: calculatedRequiredHours,
      entryTime: normalizeTime(formData.entryTime || ''),
      exitTime: normalizeTime(formData.exitTime || ''),
    };

    await onSubmit(submitData);
  };

  const departmentOptions = (departmentsData || []).map((dept) => ({
    value: dept.deptCode,
    label: dept.deptName || dept.deptName || `Dept ${dept.deptCode}`,
  }));

  return (
    <AnimatedDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'تعديل جدول الوقت' : 'إضافة جدول وقت جديد'}
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
        <Box sx={{ mb: 2 }}>
          <AnimatedSelect
            label="القسم"
            value={formData.departmentCode || 0}
            onChange={(val: string | number) => setFormData({ ...formData, departmentCode: val as number })}
            options={[{ value: 0, label: 'عام (بدون قسم محدد)' }, ...departmentOptions]}
            error={!!errors.departmentCode}
            helperText={errors.departmentCode}
            required
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <AnimatedTextField
            label="اسم الجدول"
            value={formData.scheduleName || ''}
            onChange={(val: string) => setFormData({ ...formData, scheduleName: val })}
            error={!!errors.scheduleName}
            helperText={errors.scheduleName}
            required
            placeholder="مثلاً: نوبة صباحية"
          />
        </Box>

        <SmartRow>
          <SmartField>
            <AnimatedNumberField
              label="الساعات المطلوبة"
              value={calculatedRequiredHours || ''}
              onChange={() => { }} // Read-only - auto-calculated
              error={!!errors.requiredHours}
              helperText={errors.requiredHours || 'يتم الحساب تلقائياً من وقت الدخول والخروج'}
              required
              disabled
              min={1}
              max={24}
            />
          </SmartField>
          <SmartField>
            <AnimatedNumberField
              label="فترة السماح (بالدقائق)"
              value={formData.gracePeriodMinutes || 0}
              onChange={(val: number | string) => setFormData({ ...formData, gracePeriodMinutes: val === '' ? 0 : Number(val) })}
              error={!!errors.gracePeriodMinutes}
              helperText={errors.gracePeriodMinutes || 'السماح بـ X دقيقة تأخير دون غرامة'}
              required
              min={0}
              max={120}
            />
          </SmartField>
        </SmartRow>

        <SmartRow>
          <SmartField>
            <AnimatedTextField
              label="وقت الدخول"
              value={formData.entryTime || ''}
              onChange={(val: string) => setFormData({ ...formData, entryTime: val })}
              error={!!errors.entryTime}
              helperText={errors.entryTime || 'التنسيق: س:د (24 ساعة)'}
              required
              type="time"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                sx: {
                  '& input': {
                    textAlign: 'center !important', // Force center alignment
                    fontSize: '1.rem', // Slightly larger font for time
                    fontWeight: 600,
                  },
                  // Style the native time picker indicator
                  '& input::-webkit-calendar-picker-indicator': {
                    cursor: 'pointer',
                    opacity: 0.6,
                    transition: '0.2s',
                    '&:hover': { opacity: 1 },
                    width: '24px',
                    height: '24px',
                  }
                }
              }}
            />
          </SmartField>
          <SmartField>
            <AnimatedTextField
              label="وقت الخروج"
              value={formData.exitTime || ''}
              onChange={(val: string) => setFormData({ ...formData, exitTime: val })}
              error={!!errors.exitTime}
              helperText={errors.exitTime || 'التنسيق: س:د (24 ساعة)'}
              required
              type="time"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                sx: {
                  '& input': {
                    textAlign: 'center !important', // Force center alignment
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  },
                  '& input::-webkit-calendar-picker-indicator': {
                    cursor: 'pointer',
                    opacity: 0.6,
                    transition: '0.2s',
                    '&:hover': { opacity: 1 },
                    width: '24px',
                    height: '24px',
                  }
                }
              }}
            />
          </SmartField>
        </SmartRow>

        {isEdit && (
          <Box sx={{ mt: 2 }}>
            <AnimatedSelect
              label="الحالة"
              value={formData.isActive || 'Y'}
              onChange={(val: string | number) => setFormData({ ...formData, isActive: val as string })}
              options={[
                { value: 'Y', label: 'نشط' },
                { value: 'N', label: 'غير نشط' },
              ]}
            />
          </Box>
        )}
      </Box>
    </AnimatedDialog>
  );
}

