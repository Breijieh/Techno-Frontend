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
  Lock,
  LockOpen,
} from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import {
  AnimatedTextField,
  AnimatedDatePicker,
  AnimatedSwitch,
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import type { AttendanceDayClosure } from '@/types';

interface AttendanceClosureFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<AttendanceDayClosure>, action: 'close' | 'reopen') => Promise<void>;
  initialData?: AttendanceDayClosure | null;
  loading?: boolean;
}

export default function AttendanceClosureForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: AttendanceClosureFormProps) {
  const [formData, setFormData] = useState<Partial<AttendanceDayClosure>>({
    attendanceDate: new Date(),
    isClosed: false,
    notes: '',
  });


  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          attendanceDate: initialData.attendanceDate,
          isClosed: initialData.isClosed,
          notes: initialData.notes || '',
        });
      } else {
        setFormData({
          attendanceDate: new Date(),
          isClosed: false,
          notes: '',
        });
      }
    }, 0);
  }, [initialData, open]);

  const validate = (): boolean => {
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const action = formData.isClosed ? 'close' : 'reopen';
    await onSubmit(formData, action);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={initialData?.isClosed ? 'إعادة فتح يوم الحضور' : 'إغلاق يوم الحضور'}
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
          <AnimatedDatePicker
            label="تاريخ الحضور"
            value={formData.attendanceDate || new Date()}
            onChange={(date: Date | null) => setFormData({ ...formData, attendanceDate: date || new Date() })}
            disabled={!!initialData}
            required
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={formData.isClosed ? 'مغلق' : 'مفتوح'}
              color={formData.isClosed ? 'error' : 'success'}
              icon={formData.isClosed ? <Lock /> : <LockOpen />}
            />
            <AnimatedSwitch
              label={formData.isClosed ? 'اليوم مغلق' : 'اليوم مفتوح'}
              checked={formData.isClosed ?? false}
              onChange={(checked: boolean) => setFormData({ ...formData, isClosed: checked })}
            />
          </Box>

          {initialData && (
            <>
              {initialData.isClosed && initialData.closedDate && (
                <Typography variant="body2" color="text.secondary">
                  تم الإغلاق في: {new Date(initialData.closedDate).toLocaleString('en-GB')}
                </Typography>
              )}
              {!initialData.isClosed && initialData.reopenedDate && (
                <Typography variant="body2" color="text.secondary">
                  تم إعادة الفتح في: {new Date(initialData.reopenedDate).toLocaleString('en-GB')}
                </Typography>
              )}
            </>
          )}

          <AnimatedTextField
            label="ملاحظات"
            value={formData.notes || ''}
            onChange={(val: string) => setFormData({ ...formData, notes: val })}
            multiline
            rows={3}
            helperText="ملاحظات اختيارية حول الإغلاق/إعادة الفتح"
          />

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
              إلغاء
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              startIcon={loading ? <CircularProgress size={20} /> : formData.isClosed ? <Lock /> : <LockOpen />}
              disabled={loading}
              sx={{
                backgroundColor: formData.isClosed ? '#d32f2f' : '#0c2b7a',
                '&:hover': {
                  backgroundColor: formData.isClosed ? '#c62828' : '#0a2368',
                },
              }}
            >
              {loading
                ? 'جارٍ المعالجة...'
                : formData.isClosed
                  ? 'إغلاق اليوم'
                  : 'إعادة فتح اليوم'}
            </Button>
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

