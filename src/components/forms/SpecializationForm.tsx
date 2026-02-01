'use client';

import { useState, useEffect } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import { AnimatedTextField, AnimatedSelect } from '@/components/common/FormFields';
import type { SpecializationResponse, SpecializationRequest } from '@/lib/api/specializations';

export type SpecializationFormData = Partial<SpecializationResponse>;

interface SpecializationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SpecializationRequest) => Promise<void>;
  initialData?: SpecializationResponse | null;
  loading?: boolean;
}

export default function SpecializationForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: SpecializationFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<SpecializationRequest>({
    code: '',
    nameAr: '',
    nameEn: '',
    displayOrder: 0,
    isActive: 'Y',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code,
        nameAr: initialData.nameAr,
        nameEn: initialData.nameEn,
        displayOrder: initialData.displayOrder ?? 0,
        isActive: (initialData.isActive as string) ?? 'Y',
      });
    } else {
      setFormData({
        code: '',
        nameAr: '',
        nameEn: '',
        displayOrder: 0,
        isActive: 'Y',
      });
    }
    setErrors({});
  }, [initialData, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.code?.trim()) newErrors.code = 'رمز التخصص مطلوب';
    if (!formData.nameAr?.trim()) newErrors.nameAr = 'اسم التخصص بالعربية مطلوب';
    if (!formData.nameEn?.trim()) newErrors.nameEn = 'اسم التخصص بالإنجليزية مطلوب';
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
      title={isEdit ? 'تعديل التخصص' : 'إضافة تخصص جديد'}
      maxWidth="sm"
      fullWidth
      disableBackdropClick={loading}
      showCloseButton={!loading}
      actions={
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<Cancel />}
            onClick={onClose}
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Save />}
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)' },
            }}
          >
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <AnimatedTextField
          label="رمز التخصص"
          value={formData.code}
          onChange={(v) => setFormData((p) => ({ ...p, code: v }))}
          error={!!errors.code}
          helperText={errors.code}
          disabled={isEdit}
          placeholder="مثال: ELEC"
        />
        <AnimatedTextField
          label="الاسم بالعربية"
          value={formData.nameAr}
          onChange={(v) => setFormData((p) => ({ ...p, nameAr: v }))}
          error={!!errors.nameAr}
          helperText={errors.nameAr}
          placeholder="مثال: كهربائي"
        />
        <AnimatedTextField
          label="الاسم بالإنجليزية"
          value={formData.nameEn}
          onChange={(v) => setFormData((p) => ({ ...p, nameEn: v }))}
          error={!!errors.nameEn}
          helperText={errors.nameEn}
          placeholder="مثال: Electrician"
        />
        <AnimatedTextField
          label="ترتيب العرض"
          value={String(formData.displayOrder ?? 0)}
          onChange={(v) => setFormData((p) => ({ ...p, displayOrder: parseInt(String(v), 10) || 0 }))}
          type="number"
        />
        {isEdit && (
          <AnimatedSelect
            label="الحالة"
            value={formData.isActive ?? 'Y'}
            onChange={(v) => setFormData((p) => ({ ...p, isActive: v as string }))}
            options={[
              { value: 'Y', label: 'نشط' },
              { value: 'N', label: 'غير نشط' },
            ]}
          />
        )}
      </Box>
    </AnimatedDialog>
  );
}
