'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Stack,
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
  AnimatedSwitch,
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import { SmartRow, SmartField } from '@/components/common/SmartLayout';
import type { Holiday, HolidayType } from '@/types';

interface HolidayFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Holiday>) => Promise<void>;
  initialData?: Holiday | null;
  loading?: boolean;
}

export default function HolidayForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: HolidayFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<Holiday>>({
    holidayType: 'National' as HolidayType,
    gregYear: new Date().getFullYear(),
    hijriYear: new Date().getFullYear() - 579,
    fromDate: undefined as Date | undefined,
    toDate: undefined as Date | undefined,
    numberOfDays: 0,
    holidayName: '',
    isPaid: true,
    isRecurring: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          holidayType: initialData.holidayType,
          gregYear: initialData.gregYear,
          hijriYear: initialData.hijriYear,
          fromDate: initialData.fromDate ? new Date(initialData.fromDate) : undefined,
          toDate: initialData.toDate ? new Date(initialData.toDate) : undefined,
          numberOfDays: initialData.numberOfDays,
          holidayName: initialData.holidayName || '',
          isPaid: initialData.isPaid !== false,
          isRecurring: initialData.isRecurring === true,
        });
      } else {
        setFormData({
          holidayType: 'National',
          gregYear: new Date().getFullYear(),
          hijriYear: new Date().getFullYear() - 579,
          fromDate: undefined,
          toDate: undefined,
          numberOfDays: 0,
          holidayName: '',
          isPaid: true,
          isRecurring: false,
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  // Calculate number of days when dates change
  useEffect(() => {
    if (formData.fromDate && formData.toDate) {
      const diffTime = formData.toDate.getTime() - formData.fromDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0) {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          setFormData((prev) => ({ ...prev, numberOfDays: diffDays }));
        }, 0);
      }
    }
  }, [formData.fromDate, formData.toDate]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fromDate) newErrors.fromDate = 'تاريخ البدء مطلوب';
    if (!formData.toDate) newErrors.toDate = 'تاريخ الانتهاء مطلوب';
    if (formData.fromDate && formData.toDate && formData.toDate < formData.fromDate) {
      newErrors.toDate = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
    }
    if (!formData.gregYear || formData.gregYear <= 0) {
      newErrors.gregYear = 'السنة الميلادية مطلوبة';
    }
    if (!formData.hijriYear || formData.hijriYear <= 0) {
      newErrors.hijriYear = 'السنة الهجرية مطلوبة';
    }
    if (formData.holidayType === 'Custom') {
      if (!formData.holidayName?.trim()) newErrors.holidayName = 'اسم العطلة مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onSubmit(formData);
  };

  const holidayTypeOptions = [
    { value: 'Fitr', label: 'عيد الفطر' },
    { value: 'Adha', label: 'عيد الأضحى' },
    { value: 'National', label: 'عطلة وطنية' },
    { value: 'Foundation', label: 'يوم التأسيس' },
    { value: 'Custom', label: 'عطلة مخصصة' },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل العطلة' : 'إضافة عطلة جديدة'}
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
              label="نوع العطلة"
              value={formData.holidayType || 'National'}
              onChange={(val: string | number) => setFormData({ ...formData, holidayType: val as HolidayType })}
              options={holidayTypeOptions}
              required
            />
          </Box>

          {formData.holidayType === 'Custom' && (
            <SmartRow>
              <SmartField>
                <Box>
                  <Typography sx={{ fontSize: '12px', fontWeight: 600, mb: 1, color: '#374151' }}>
                    اسم العطلة *
                  </Typography>
                  <input
                    type="text"
                    placeholder="مثلاً: يوم التأسيس"
                    value={formData.holidayName || ''}
                    onChange={(e) => setFormData({ ...formData, holidayName: e.target.value })}
                    dir="auto"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: errors.holidayName ? '1px solid #DC2626' : '1px solid #D1D5DB',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {errors.holidayName && (
                    <Typography sx={{ color: '#DC2626', fontSize: '11px', mt: 0.5 }}>
                      {errors.holidayName}
                    </Typography>
                  )}
                </Box>
              </SmartField>
            </SmartRow>
          )}

          <SmartRow>
            <SmartField>
              <AnimatedNumberField
                label="السنة الميلادية"
                value={formData.gregYear || ''}
                onChange={(val: number | string) => setFormData({ ...formData, gregYear: val === '' ? 0 : Number(val) })}
                error={!!errors.gregYear}
                helperText={errors.gregYear}
                required
                min={2000}
                max={2100}
              />
            </SmartField>
            <SmartField>
              <AnimatedNumberField
                label="السنة الهجرية"
                value={formData.hijriYear || ''}
                onChange={(val: number | string) => setFormData({ ...formData, hijriYear: val === '' ? 0 : Number(val) })}
                error={!!errors.hijriYear}
                helperText={errors.hijriYear}
                required
                min={1400}
                max={1500}
              />
            </SmartField>
          </SmartRow>

          <SmartRow>
            <SmartField>
              <AnimatedDatePicker
                label="من تاريخ"
                value={formData.fromDate}
                onChange={(val: Date | null) => setFormData({ ...formData, fromDate: val || undefined })}
                error={!!errors.fromDate}
                helperText={errors.fromDate}
                required
              />
            </SmartField>
            <SmartField>
              <AnimatedDatePicker
                label="إلى تاريخ"
                value={formData.toDate}
                onChange={(val: Date | null) => setFormData({ ...formData, toDate: val || undefined })}
                error={!!errors.toDate}
                helperText={errors.toDate}
                required
                minDate={formData.fromDate}
              />
            </SmartField>
          </SmartRow>

          <Box sx={{ mt: 2 }}>
            <AnimatedNumberField
              label="عدد الأيام"
              value={formData.numberOfDays || ''}
              onChange={(val: number | string) => setFormData({ ...formData, numberOfDays: val === '' ? 0 : Number(val) })}
              required
              min={1}
              disabled={!!(formData.fromDate && formData.toDate)}
              helperText="يُحسب تلقائياً من التواريخ"
            />
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Box flex={1} sx={{ p: 1, border: '1px dashed #E5E7EB', borderRadius: 1 }}>
              <AnimatedSwitch
                label="عطلة مدفوعة"
                checked={formData.isPaid ?? true}
                onChange={(val: boolean) => setFormData({ ...formData, isPaid: val })}
                helperText="ما إذا كان يجب دفع رواتب الموظفين في هذه العطلة"
              />
            </Box>
            <Box flex={1} sx={{ p: 1, border: '1px dashed #E5E7EB', borderRadius: 1 }}>
              <AnimatedSwitch
                label="عطلة متكررة"
                checked={formData.isRecurring ?? false}
                onChange={(val: boolean) => setFormData({ ...formData, isRecurring: val })}
                helperText="ما إذا كانت هذه العطلة تتكرر في نفس التاريخ كل عام"
              />
            </Box>
          </Stack>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

