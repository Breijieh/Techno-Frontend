'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Cancel,
  CheckCircle,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import {
  AnimatedTextField,
  AnimatedDatePicker,
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import type { ManualAttendanceRequest } from '@/types';

interface ManualAttendanceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<ManualAttendanceRequest>, action: 'approve' | 'reject') => Promise<void>;
  initialData?: ManualAttendanceRequest | null;
  loading?: boolean;
  mode?: 'view' | 'approve';
}

export default function ManualAttendanceForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  mode = 'approve',
}: ManualAttendanceFormProps) {
  const [formData, setFormData] = useState<Partial<ManualAttendanceRequest>>({
    attendanceDate: new Date(),
    entryTime: '',
    exitTime: '',
    reason: '',
    rejectionReason: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          attendanceDate: initialData.attendanceDate,
          entryTime: initialData.entryTime,
          exitTime: initialData.exitTime,
          reason: initialData.reason,
          rejectionReason: initialData.rejectionReason || '',
        });
      } else {
        setFormData({
          attendanceDate: new Date(),
          entryTime: '',
          exitTime: '',
          reason: '',
          rejectionReason: '',
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  const validate = (action: 'approve' | 'reject'): boolean => {
    const newErrors: Record<string, string> = {};

    if (action === 'reject' && !formData.rejectionReason?.trim()) {
      newErrors.rejectionReason = 'سبب الرفض مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApprove = async () => {
    if (!validate('approve')) return;
    await onSubmit(formData, 'approve');
  };

  const handleReject = async () => {
    if (!validate('reject')) return;
    await onSubmit(formData, 'reject');
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={mode === 'view' ? 'عرض طلب الحضور اليدوي' : 'مراجعة طلب الحضور اليدوي'}
        maxWidth="md"
        fullWidth
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            padding: 2,
          }}
        >
          {initialData && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  الموظف: {initialData.employeeName}
                </Typography>
                <Chip
                  label={initialData.requestStatus}
                  color={getStatusColor(initialData.requestStatus) as 'success' | 'error' | 'warning' | 'default'}
                  size="small"
                />
              </Box>

              <AnimatedDatePicker
                label="تاريخ الحضور"
                value={formData.attendanceDate || new Date()}
                onChange={(date: Date | null) => setFormData({ ...formData, attendanceDate: date || new Date() })}
                disabled={true}
              />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <AnimatedTextField
                  label="وقت الدخول"
                  value={formData.entryTime || ''}
                  onChange={(val: string) => setFormData({ ...formData, entryTime: val })}
                  disabled={true}
                />

                <AnimatedTextField
                  label="وقت الخروج"
                  value={formData.exitTime || ''}
                  onChange={(val: string) => setFormData({ ...formData, exitTime: val })}
                  disabled={true}
                />
              </Box>

              <AnimatedTextField
                label="السبب"
                value={formData.reason || ''}
                onChange={(val: string) => setFormData({ ...formData, reason: val })}
                multiline
                rows={3}
                disabled={true}
              />

              {mode === 'approve' && initialData.requestStatus === 'PENDING' && (
                <AnimatedTextField
                  label="سبب الرفض (في حالة الرفض)"
                  value={formData.rejectionReason || ''}
                  onChange={(val: string) => setFormData({ ...formData, rejectionReason: val })}
                  multiline
                  rows={2}
                  error={!!errors.rejectionReason}
                  helperText={errors.rejectionReason}
                />
              )}

              {initialData.requestStatus !== 'PENDING' && initialData.rejectionReason && (
                <AnimatedTextField
                  label="سبب الرفض"
                  value={initialData.rejectionReason}
                  onChange={() => { }}
                  multiline
                  rows={2}
                  disabled={true}
                />
              )}
            </>
          )}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2,
              marginTop: 2,
            }}
          >
            <Button
              variant="outlined"
              onClick={onClose}
              startIcon={<Cancel />}
              disabled={loading}
            >
              {mode === 'view' ? 'إغلاق' : 'إلغاء'}
            </Button>
            {mode === 'approve' && initialData?.requestStatus === 'PENDING' && (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleReject}
                  startIcon={loading ? <CircularProgress size={20} /> : <CancelIcon />}
                  disabled={loading}
                >
                  {loading ? 'جارٍ الرفض...' : 'رفض'}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleApprove}
                  startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                  disabled={loading}
                  sx={{
                    backgroundColor: '#0c2b7a',
                    '&:hover': {
                      backgroundColor: '#0a2368',
                    },
                  }}
                >
                  {loading ? 'جارٍ الموافقة...' : 'موافقة'}
                </Button>
              </>
            )}
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

