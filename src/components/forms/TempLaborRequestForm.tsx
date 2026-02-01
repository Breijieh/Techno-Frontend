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
import type { TempLaborRequest } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';

interface TempLaborRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<TempLaborRequest> & { projectCode?: number }) => Promise<void>;
  initialData?: TempLaborRequest | null;
  loading?: boolean;
  projects: ProjectSummary[];
}

export default function TempLaborRequestForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  projects,
}: TempLaborRequestFormProps) {
  const isEdit = !!initialData;

  // Initialize with today's date (start of day) for new requests
  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const [formData, setFormData] = useState<Partial<TempLaborRequest> & { projectCode?: number }>({
    requestDate: getToday(),
    specialization: '',
    numberOfWorkers: 0,
    fromDate: undefined,
    toDate: undefined,
    dailyWage: 0,
    status: 'NEW',
    projectCode: 0,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        // Edit mode: use existing data
        setFormData({
          requestDate: initialData.requestDate ? new Date(initialData.requestDate) : new Date(),
          specialization: initialData.specialization,
          numberOfWorkers: initialData.numberOfWorkers,
          fromDate: initialData.fromDate ? new Date(initialData.fromDate) : undefined,
          toDate: initialData.toDate ? new Date(initialData.toDate) : undefined,
          dailyWage: initialData.dailyWage,
          status: initialData.status,
          projectCode: initialData.projectCode || 0,
          notes: initialData.notes || '',
        });
      } else {
        // New request: always set requestDate to today
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for consistency
        setFormData({
          requestDate: today,
          specialization: '',
          numberOfWorkers: 0,
          fromDate: undefined,
          toDate: undefined,
          dailyWage: 0,
          status: 'NEW',
          projectCode: 0,
          notes: '',
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectCode || formData.projectCode === 0) {
      newErrors.projectCode = 'المشروع مطلوب';
    }
    if (!formData.specialization?.trim()) newErrors.specialization = 'التخصص مطلوب';
    if (!formData.numberOfWorkers || formData.numberOfWorkers <= 0) {
      newErrors.numberOfWorkers = 'عدد العمال يجب أن يكون أكبر من 0';
    }
    if (!formData.fromDate) newErrors.fromDate = 'تاريخ البدء مطلوب';
    if (!formData.toDate) newErrors.toDate = 'تاريخ الانتهاء مطلوب';
    if (formData.fromDate && formData.toDate && formData.toDate < formData.fromDate) {
      newErrors.toDate = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
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

  const specializationOptions = [
    { value: 'Electrician', label: 'كهربائي' },
    { value: 'Plumber', label: 'سباك' },
    { value: 'Carpenter', label: 'نجار' },
    { value: 'Welder', label: 'لحام' },
    { value: 'Painter', label: 'دهان' },
    { value: 'General Labor', label: 'عامل عام' },
    { value: 'Mason', label: 'بناء' },
    { value: 'Steel Worker', label: 'حداد' },
  ];

  const projectOptions = (projects || []).map((proj) => ({
    value: proj.projectCode,
    label: `${proj.projectName} (#${proj.projectCode})`,
  }));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل طلب عمال مؤقتين' : 'طلب عمال مؤقتين جديد'}
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
              onChange={(val) => setFormData({ ...formData, projectCode: val as number })}
              options={[{ value: 0, label: 'اختر المشروع' }, ...projectOptions]}
              error={!!errors.projectCode}
              helperText={errors.projectCode}
              required
            />
            <AnimatedDatePicker
              label="تاريخ الطلب"
              value={formData.requestDate}
              onChange={(val) => {
                // For new requests, always keep today's date
                if (!isEdit) {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  setFormData({ ...formData, requestDate: today });
                } else {
                  // For edit mode, allow date change
                  setFormData({ ...formData, requestDate: val || new Date() });
                }
              }}
              required
              disabled={!isEdit} // Disable for new requests (always today)
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
              onChange={(val) => setFormData({ ...formData, specialization: val as string })}
              options={[{ value: '', label: 'اختر التخصص' }, ...specializationOptions]}
              error={!!errors.specialization}
              helperText={errors.specialization}
              required
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
            <AnimatedNumberField
              label="عدد العمال"
              value={formData.numberOfWorkers || ''}
              onChange={(val) => setFormData({ ...formData, numberOfWorkers: val === '' ? 0 : val })}
              error={!!errors.numberOfWorkers}
              helperText={errors.numberOfWorkers}
              required
              min={1}
            />
            <AnimatedNumberField
              label="الأجر اليومي"
              value={formData.dailyWage || ''}
              onChange={(val) => setFormData({ ...formData, dailyWage: val === '' ? 0 : val })}
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
              label="من تاريخ"
              value={formData.fromDate}
              onChange={(val) => setFormData({ ...formData, fromDate: val || undefined })}
              error={!!errors.fromDate}
              helperText={errors.fromDate}
              required
              minDate={new Date()}
            />
            <AnimatedDatePicker
              label="إلى تاريخ"
              value={formData.toDate}
              onChange={(val) => setFormData({ ...formData, toDate: val || undefined })}
              error={!!errors.toDate}
              helperText={errors.toDate}
              required
              minDate={formData.fromDate || new Date()}
            />
          </Box>

          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.25s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedTextField
              label="ملاحظات"
              value={formData.notes || ''}
              onChange={(val) => setFormData({ ...formData, notes: val })}
              multiline
              rows={3}
              placeholder="أدخل أي ملاحظات إضافية أو تعليقات حول طلب العمالة هذا..."
            />
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

