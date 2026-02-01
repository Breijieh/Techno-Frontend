'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApi } from '@/hooks/useApi';
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
import type { ProjectPaymentRequest, Supplier } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';
import { suppliersApi } from '@/lib/api/suppliers';
import { SmartRow, SmartField } from '@/components/common/SmartLayout';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface PaymentRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<ProjectPaymentRequest>) => Promise<void>;
  initialData?: ProjectPaymentRequest | null;
  loading?: boolean;
  projects: ProjectSummary[];
}

export default function PaymentRequestForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  projects,
}: PaymentRequestFormProps) {
  const isEdit = !!initialData;

  // Fetch suppliers
  const { data: suppliersResponse, loading: loadingSuppliers, error: suppliersError } = useApi(
    () => suppliersApi.getAllSuppliers(),
    { immediate: true }
  );

  const suppliers = useMemo(() => {
    if (!suppliersResponse) return [];
    // Handle both array and object with data property
    const suppliersList = Array.isArray(suppliersResponse) ? suppliersResponse : (suppliersResponse as { data: Supplier[] })?.data || [];
    console.log('[PaymentRequestForm] Suppliers response:', suppliersResponse, 'Parsed:', suppliersList);
    return suppliersList;
  }, [suppliersResponse]);

  // Log error if suppliers fetch fails
  useEffect(() => {
    if (suppliersError) {
      console.error('[PaymentRequestForm] Error fetching suppliers:', suppliersError);
    }
  }, [suppliersError]);

  const [formData, setFormData] = useState<Partial<ProjectPaymentRequest>>({
    projectCode: 0,
    supplierCode: 0, // 0 means not selected
    requestDate: new Date(),
    paymentAmount: 0,
    paymentPurpose: '',
    attachmentPath: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        projectCode: initialData.projectCode,
        supplierCode: initialData.supplierCode || 0,
        requestDate: initialData.requestDate ? new Date(initialData.requestDate) : new Date(),
        paymentAmount: initialData.paymentAmount || 0,
        paymentPurpose: initialData.paymentPurpose || '',
        attachmentPath: initialData.attachmentPath || '',
      });
    } else {
      setFormData({
        projectCode: 0,
        supplierCode: 0,
        requestDate: new Date(),
        paymentAmount: 0,
        paymentPurpose: '',
        attachmentPath: '',
      });
    }
    setErrors({});
  }, [initialData, open]);

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectCode) newErrors.projectCode = 'المشروع مطلوب';
    if (!formData.supplierCode) newErrors.supplierCode = 'المورد مطلوب';
    if (!formData.requestDate) newErrors.requestDate = 'تاريخ الطلب مطلوب';
    if (!formData.paymentAmount || formData.paymentAmount <= 0) {
      newErrors.paymentAmount = 'مبلغ الدفع يجب أن يكون أكبر من 0';
    }
    if (!formData.paymentPurpose?.trim()) {
      newErrors.paymentPurpose = 'الغرض من الدفع مطلوب';
    }
    if (formData.paymentPurpose && formData.paymentPurpose.length > 500) {
      newErrors.paymentPurpose = 'الغرض من الدفع يجب ألا يتجاوز 500 حرف';
    }
    if (formData.attachmentPath && formData.attachmentPath.length > 500) {
      newErrors.attachmentPath = 'مسار المرفق يجب ألا يتجاوز 500 حرف';
    }

    // Validate payment amount doesn't exceed project total
    const paymentAmountNum = Number(formData.paymentAmount || 0);
    if (formData.projectCode && paymentAmountNum > 0) {
      const selectedProject = projects?.find(p => p.projectCode === formData.projectCode);

      if (selectedProject?.totalProjectAmount) {
        const projectTotal = selectedProject.totalProjectAmount;

        if (paymentAmountNum > projectTotal) {
          newErrors.paymentAmount = `مبلغ الدفع (${formatNumber(paymentAmountNum)} ريال) لا يمكن أن يتجاوز إجمالي قيمة المشروع (${formatNumber(projectTotal)} ريال)`;
        } else {
          // Also check sum of all existing payment requests + new payment doesn't exceed project total
          try {
            const { projectsApi } = await import('@/lib/api');
            const existingRequests = await projectsApi.getAllPaymentRequests(formData.projectCode);

            // Calculate existing total (exclude rejected and deleted)
            const existingTotal = existingRequests
              .filter((req: { transStatus?: string; isDeleted?: string }) => req.transStatus !== 'R' && req.isDeleted !== 'Y')
              .reduce((sum: number, req: { paymentAmount?: number }) => sum + (req.paymentAmount || 0), 0);

            const newTotal = existingTotal + paymentAmountNum;

            if (newTotal > projectTotal) {
              const remaining = projectTotal - existingTotal;
              newErrors.paymentAmount = `إجمالي طلبات الدفع (${formatNumber(newTotal)} ريال) سيتجاوز إجمالي المشروع (${formatNumber(projectTotal)} ريال). الحد الأقصى المسموح: ${formatNumber(Math.max(0, remaining))} ريال`;
            }
          } catch (error) {
            console.error('Error validating payment requests:', error);
            // Don't block submission if we can't fetch existing requests, backend will validate
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    const isValid = await validate();
    if (!isValid) return;

    await onSubmit(formData);
  };

  const projectOptions = useMemo(() => {
    const projectsList = projects || [];
    console.log('[PaymentRequestForm] Projects:', projectsList);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return projectsList.map((proj: any) => ({
      value: proj.projectCode,
      label: `${proj.projectName || proj.projectName || proj.projectName || 'مشروع'} (#${proj.projectCode})`,
    }));
  }, [projects]);

  const supplierOptions = useMemo(() => {
    const suppliersList = suppliers || [];
    console.log('[PaymentRequestForm] Suppliers:', suppliersList);
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const options = suppliersList.map((supplier: any) => ({
      value: supplier.supplierId.toString(),
      label: supplier.supplierName || supplier.supplierName || `Supplier #${supplier.supplierId}`,
    }));
    console.log('[PaymentRequestForm] Supplier Options:', options);
    return options;
  }, [suppliers]);

  // Debug: Log when suppliers or options change
  useEffect(() => {
    console.log('[PaymentRequestForm] Suppliers changed:', suppliers);
    console.log('[PaymentRequestForm] Supplier options count:', supplierOptions.length);
    console.log('[PaymentRequestForm] Loading suppliers:', loadingSuppliers);
  }, [suppliers, supplierOptions, loadingSuppliers]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل طلب الدفع' : 'طلب دفع جديد'}
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
        <Box sx={{ py: 1 }}>
          <SmartRow>
            <SmartField>
              <AnimatedSelect
                label="المشروع"
                value={formData.projectCode || 0}
                onChange={(val: string | number) => setFormData({ ...formData, projectCode: val as number })}
                options={[{ value: 0, label: 'اختر المشروع' }, ...projectOptions]}
                error={!!errors.projectCode}
                helperText={errors.projectCode}
                required
              />
            </SmartField>
            <SmartField>
              <AnimatedSelect
                label="المورد"
                value={formData.supplierCode || ''}
                onChange={(val: string | number) => {
                  console.log('[PaymentRequestForm] Supplier selected:', val);
                  setFormData({ ...formData, supplierCode: (val === '' ? 0 : val) as number });
                }}
                options={(() => {
                  const allOptions = [
                    { value: '', label: loadingSuppliers ? 'جارٍ التحميل...' : 'اختر المورد' },
                    ...supplierOptions
                  ];
                  console.log('[PaymentRequestForm] All supplier options passed to AnimatedSelect:', allOptions);
                  return allOptions;
                })()}
                error={!!errors.supplierCode}
                helperText={errors.supplierCode || (loadingSuppliers ? 'جارٍ التحميل...' : `${supplierOptions.length} مورد متاح`)}
                required
                disabled={loadingSuppliers}
              />
            </SmartField>
          </SmartRow>

          <SmartRow>
            <SmartField>
              <AnimatedDatePicker
                label="تاريخ الطلب"
                value={formData.requestDate}
                onChange={(val: Date | null) => setFormData({ ...formData, requestDate: val || new Date() })}
                error={!!errors.requestDate}
                helperText={errors.requestDate}
                required
              />
            </SmartField>
            <SmartField>
              <AnimatedNumberField
                label="مبلغ الدفع"
                value={formData.paymentAmount || ''}
                onChange={(val: number | string) => setFormData({ ...formData, paymentAmount: val === '' ? 0 : Number(val) })}
                error={!!errors.paymentAmount}
                helperText={errors.paymentAmount}
                required
                min={1}
                prefix="ر.س"
              />
            </SmartField>
          </SmartRow>

          <Box sx={{ mt: 1 }}>
            <AnimatedTextField
              label="الغرض من الدفع"
              value={formData.paymentPurpose || ''}
              onChange={(val: string) => setFormData({ ...formData, paymentPurpose: val })}
              error={!!errors.paymentPurpose}
              helperText={errors.paymentPurpose || 'وصف الغرض من طلب الدفع هذا (حد أقصى 500 حرف)'}
              required
              multiline
              rows={3}
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <AnimatedTextField
              label="مسار المرفق (اختياري)"
              value={formData.attachmentPath || ''}
              onChange={(val: string) => setFormData({ ...formData, attachmentPath: val })}
              error={!!errors.attachmentPath}
              helperText={errors.attachmentPath || 'مسار ملف المرفق (حد أقصى 500 حرف)'}
            />
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

