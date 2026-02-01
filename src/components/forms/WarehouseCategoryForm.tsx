'use client';

import { useState, useEffect } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import { AnimatedTextField } from '@/components/common/FormFields';
import type { StoreItemCategory } from '@/types';

interface WarehouseCategoryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<StoreItemCategory>) => Promise<void>;
  initialData?: StoreItemCategory | null;
  loading?: boolean;
}

export default function WarehouseCategoryForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: WarehouseCategoryFormProps) {
  const isEdit = !!initialData;
  const [formData, setFormData] = useState<Partial<StoreItemCategory>>({
    categoryName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          categoryName: initialData.categoryName,
        });
      } else {
        setFormData({ categoryName: '' });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.categoryName?.trim()) newErrors.categoryName = 'الاسم بالإنجليزية مطلوب';
    if (!formData.categoryName?.trim()) newErrors.categoryName = 'الاسم بالعربية مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <AnimatedDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
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
                backgroundColor: '#F9FAFB'
              }
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
                background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)'
              },
              '&:disabled': {
                background: '#9CA3AF'
              }
            }}
          >
            {loading ? 'جارٍ الحفظ...' : isEdit ? 'تحديث' : 'إنشاء'}
          </Button>
        </Box>
      }>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
        <AnimatedTextField
          label="اسم الفئة"
          value={formData.categoryName || ''}
          onChange={(val: string) => setFormData({ ...formData, categoryName: val })}
          error={!!errors.categoryName}
          helperText={errors.categoryName}
          required
          autoFocus
        />
      </Box>
    </AnimatedDialog>
  );
}

