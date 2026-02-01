'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Save,
  Cancel,
} from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import { formatNumber } from '@/lib/utils/numberFormatter';
import type { ProjectPaymentRequest } from '@/types';

interface ProcessPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onProcess: (data: {
    paymentDate: string;
    paidAmount: number;
    paymentMethod: string;
    referenceNo?: string;
    bankName?: string;
    processNotes?: string;
  }) => Promise<void>;
  request: ProjectPaymentRequest | null;
  loading?: boolean;
}

export default function ProcessPaymentDialog({
  open,
  onClose,
  onProcess,
  request,
  loading = false,
}: ProcessPaymentDialogProps) {
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paidAmount: request?.paymentAmount || 0,
    paymentMethod: 'BANK_TRANSFER',
    referenceNo: '',
    bankName: '',
    processNotes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (request) {
        setFormData({
          paymentDate: new Date().toISOString().split('T')[0],
          paidAmount: request.paymentAmount || 0,
          paymentMethod: 'BANK_TRANSFER',
          referenceNo: '',
          bankName: '',
          processNotes: '',
        });
      }
      setErrors({});
    }, 0);
  }, [request, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.paymentDate) {
      newErrors.paymentDate = 'تاريخ الدفع مطلوب';
    }
    if (!formData.paidAmount || formData.paidAmount <= 0) {
      newErrors.paidAmount = 'المبلغ المدفوع يجب أن يكون أكبر من 0';
    }
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'طريقة الدفع مطلوبة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onProcess({
      paymentDate: formData.paymentDate,
      paidAmount: formData.paidAmount,
      paymentMethod: formData.paymentMethod,
      referenceNo: formData.referenceNo || undefined,
      bankName: formData.bankName || undefined,
      processNotes: formData.processNotes || undefined,
    });
  };

  return (
    <AnimatedDialog
      open={open}
      onClose={onClose}
      title="معالجة الدفع"
      maxWidth="sm"
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
            {loading ? 'جارٍ المعالجة...' : 'معالجة الدفع'}
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
        {request && (
          <Box
            sx={{
              padding: '12px 16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}
          >
            <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
              الطلب رقم #{request.requestNo}
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
              المبلغ: {formatNumber(request.paymentAmount || 0)} ر.س
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          <TextField
            label="تاريخ الدفع"
            type="date"
            value={formData.paymentDate}
            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            error={!!errors.paymentDate}
            helperText={errors.paymentDate}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
            disabled={loading}
          />
          <TextField
            label="المبلغ المدفوع"
            type="number"
            value={formData.paidAmount}
            onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
            error={!!errors.paidAmount}
            helperText={errors.paidAmount}
            required
            fullWidth
            disabled={loading}
            inputProps={{ min: 0, step: 0.01 }}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1, color: '#6B7280' }}>ر.س</Typography>,
            }}
          />
        </Box>

        <TextField
          label="طريقة الدفع"
          select
          value={formData.paymentMethod}
          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
          error={!!errors.paymentMethod}
          helperText={errors.paymentMethod}
          required
          fullWidth
          disabled={loading}
        >
          <MenuItem value="BANK_TRANSFER">تحويل بنكي</MenuItem>
          <MenuItem value="CHECK">شيك</MenuItem>
          <MenuItem value="CASH">نقدي</MenuItem>
          <MenuItem value="ONLINE">عبر الإنترنت</MenuItem>
        </TextField>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          <TextField
            label="رقم المرجع (اختياري)"
            value={formData.referenceNo}
            onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
            fullWidth
            disabled={loading}
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            label="اسم البنك (اختياري)"
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            fullWidth
            disabled={loading}
            inputProps={{ maxLength: 200 }}
          />
        </Box>

        <TextField
          label="ملاحظات المعالجة (اختياري)"
          value={formData.processNotes}
          onChange={(e) => setFormData({ ...formData, processNotes: e.target.value })}
          multiline
          rows={3}
          fullWidth
          disabled={loading}
          inputProps={{ maxLength: 500 }}
          helperText={`${formData.processNotes.length}/500 حرف`}
        />
      </Box>
    </AnimatedDialog>
  );
}
