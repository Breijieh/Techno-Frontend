'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Save,
  Cancel,
  Add,
  Delete,
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
import { SmartRow, SmartField } from '@/components/common/SmartLayout';
import type { ItemPO, RequestStatus } from '@/types';
import type { StoreSummary, PurchaseOrderLineRequest } from '@/lib/api/warehouse';
import { warehouseApi } from '@/lib/api/warehouse';
import { useApi } from '@/hooks/useApi';
import { suppliersApi, type SupplierResponse } from '@/lib/api/suppliers';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface PurchaseOrderFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<ItemPO>) => Promise<void>;
  initialData?: ItemPO | null;
  loading?: boolean;
  stores?: StoreSummary[];
}

export default function PurchaseOrderForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  stores = [],
}: PurchaseOrderFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<ItemPO & { expectedDeliveryDate?: Date; supplierId?: number }>>({
    transactionDate: new Date(),
    storeCode: 0,
    requestStatus: 'NEW' as RequestStatus,
    supplierName: '',
    supplierId: undefined,
    expectedDeliveryDate: undefined,
    approvalNotes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableStores, setAvailableStores] = useState<Array<{ value: number; label: string }>>([]);
  const [orderLines, setOrderLines] = useState<PurchaseOrderLineRequest[]>([]);

  // Fetch items for order lines
  const { data: itemsData, loading: loadingItems } = useApi(
    () => warehouseApi.getAllItems({ size: 1000 }),
    { immediate: true }
  );

  // Fetch suppliers for dropdown
  const { data: suppliersData, loading: loadingSuppliers, error: suppliersError } = useApi(
    () => suppliersApi.getAllSuppliers(),
    { immediate: true }
  );

  // Log supplier fetch status
  useEffect(() => {
    if (suppliersError) {
      console.error('[PurchaseOrderForm] Error fetching suppliers:', suppliersError);
    }
    if (suppliersData) {
      console.log('[PurchaseOrderForm] Suppliers data received:', suppliersData);
    }
  }, [suppliersData, suppliersError]);

  const items = itemsData || [];
  const suppliers = useMemo(() => {
    if (!suppliersData) {
      console.log('[PurchaseOrderForm] No suppliers data received');
      return [];
    }
    // API client already unwraps ApiResponse, so suppliersData should be the array directly
    const suppliersList = Array.isArray(suppliersData) ? suppliersData : [];
    const activeSuppliers = suppliersList.filter((s: SupplierResponse) => s.isActive !== false);
    console.log('[PurchaseOrderForm] Suppliers loaded:', {
      total: suppliersList.length,
      active: activeSuppliers.length,
      all: suppliersList
    });
    return suppliersList; // Return all, filter in the dropdown
  }, [suppliersData]);

  useEffect(() => {
    console.log('[PurchaseOrderForm] useEffect triggered, open:', open, 'initialData:', initialData);

    if (initialData) {
      console.log('[PurchaseOrderForm] Setting up form for edit mode');
      console.log('[PurchaseOrderForm] Initial data received:', {
        transactionDate: initialData.transactionDate,
        storeCode: initialData.storeCode,
        supplierName: initialData.supplierName,
        expectedDeliveryDate: initialData.expectedDeliveryDate,
        orderLines: initialData.orderLines,

        orderLinesCount: initialData.orderLines ? (Array.isArray(initialData.orderLines) ? initialData.orderLines.length : 'not array') : 'null/undefined'
      });

      // Find supplier by name if supplierName is provided
      let supplierId: number | undefined = initialData.supplierId;
      if (!supplierId && initialData.supplierName && suppliers.length > 0) {
        const foundSupplier = suppliers.find((s: SupplierResponse) =>
          s.supplierName === initialData.supplierName ||
          s.supplierName === initialData.supplierName
        );
        if (foundSupplier) {
          supplierId = foundSupplier.supplierId;
          console.log('[PurchaseOrderForm] Found supplier by name:', initialData.supplierName, 'ID:', supplierId);
        } else {
          console.log('[PurchaseOrderForm] Supplier not found by name:', initialData.supplierName, 'Available suppliers:', suppliers.map(s => s.supplierName));
        }
      }

      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setFormData({
          transactionDate: initialData.transactionDate ? new Date(initialData.transactionDate) : new Date(),
          storeCode: initialData.storeCode,
          requestStatus: initialData.requestStatus,
          supplierName: initialData.supplierName,
          supplierId: supplierId,
          expectedDeliveryDate: initialData.expectedDeliveryDate ? new Date(initialData.expectedDeliveryDate) : undefined,
          approvalNotes: initialData.approvalNotes,
        });

        // Load existing order lines if editing
        if (initialData.orderLines && Array.isArray(initialData.orderLines)) {
          console.log('[PurchaseOrderForm] Loading order lines:', initialData.orderLines);
          const mappedLines = initialData.orderLines.map((line) => ({
            itemCode: line.itemCode,
            quantity: line.quantity || 0,
            unitPrice: line.unitPrice || (line.lineTotal && line.quantity ? line.lineTotal / line.quantity : 0),
            notes: line.notes || '',
          }));
          console.log('[PurchaseOrderForm] Mapped order lines:', mappedLines);
          setOrderLines(mappedLines);
        } else {
          console.warn('[PurchaseOrderForm] No order lines found in initialData:', {
            hasOrderLines: !!initialData.orderLines,
            isArray: Array.isArray(initialData.orderLines),
            orderLines: initialData.orderLines
          });
          setOrderLines([]);
        }
        setErrors({});
      }, 0);
    } else {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setFormData({
          transactionDate: new Date(),
          storeCode: 0,
          requestStatus: 'NEW',
          supplierName: '',
          supplierId: undefined,
          expectedDeliveryDate: undefined,
          approvalNotes: '',
        });
        setOrderLines([]);
        setErrors({});
      }, 0);
    }
  }, [initialData, open, suppliers]);

  // Update available stores list
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      const allStores = stores.map((store) => ({
        value: store.storeCode,
        label: `${store.storeName || store.storeName || `Store #${store.storeCode}`}${store.projectName ? ` - ${store.projectName}` : ''}`,
      }));
      setAvailableStores(allStores);
    }, 0);
  }, [stores]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.storeCode) newErrors.storeCode = 'المستودع مطلوب';
    if (!formData.transactionDate) newErrors.transactionDate = 'تاريخ أمر الشراء مطلوب';
    // Supplier validation: either supplierId (from dropdown) or supplierName (text) must be provided
    if (!formData.supplierId && (!formData.supplierName || formData.supplierName.trim() === '')) {
      newErrors.supplierName = 'المورد مطلوب';
    }
    if (formData.expectedDeliveryDate && formData.transactionDate) {
      if (new Date(formData.expectedDeliveryDate) < new Date(formData.transactionDate)) {
        newErrors.expectedDeliveryDate = 'تاريخ التسليم المتوقع يجب أن يكون بعد تاريخ أمر الشراء';
      }
    }
    if (orderLines.length === 0) {
      newErrors.orderLines = 'عنصر واحد على الأقل مطلوب';
    }
    // Validate each order line
    orderLines.forEach((line, index) => {
      if (!line.itemCode) {
        newErrors[`orderLine_${index}_item`] = 'العنصر مطلوب';
      }
      if (!line.quantity || line.quantity <= 0) {
        newErrors[`orderLine_${index}_quantity`] = 'الكمية يجب أن تكون أكبر من 0';
      }
      if (line.unitPrice === undefined || line.unitPrice < 0) {
        newErrors[`orderLine_${index}_unitPrice`] = 'سعر الوحدة يجب أن يكون أكبر من أو يساوي 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('[PurchaseOrderForm] handleSubmit called, isEdit:', isEdit, 'initialData:', initialData);
    console.log('[PurchaseOrderForm] Form data:', formData);
    console.log('[PurchaseOrderForm] Order lines:', orderLines);

    if (!validate()) {
      console.log('[PurchaseOrderForm] Validation failed');
      return;
    }

    // Get supplier name from selected supplier if supplierId is set
    let finalSupplierName = formData.supplierName || '';
    if (formData.supplierId) {
      const selectedSupplier = suppliers.find((s: SupplierResponse) => s.supplierId === formData.supplierId);
      if (selectedSupplier) {
        finalSupplierName = selectedSupplier.supplierName;
        console.log('[PurchaseOrderForm] Selected supplier:', selectedSupplier);
      }
    }

    const submitData = {
      ...formData,
      supplierName: finalSupplierName,
      expectedDeliveryDate: formData.expectedDeliveryDate,
      orderLines
    };

    console.log('[PurchaseOrderForm] Submitting data:', submitData);

    try {
      await onSubmit(submitData);
      console.log('[PurchaseOrderForm] Submit successful');
    } catch (error) {
      console.error('[PurchaseOrderForm] Submit error:', error);
      throw error;
    }
  };

  const handleAddOrderLine = () => {
    setOrderLines([...orderLines, { itemCode: 0, quantity: 1, unitPrice: 0, notes: '' }]);
  };

  const handleRemoveOrderLine = (index: number) => {
    setOrderLines(orderLines.filter((_, i) => i !== index));
  };


  const handleOrderLineChange = (index: number, field: keyof PurchaseOrderLineRequest, value: string | number) => {
    const updated = [...orderLines];
    updated[index] = { ...updated[index], [field]: value };
    setOrderLines(updated);
    // Clear error for this field
    if (errors[`orderLine_${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`orderLine_${index}_${field}`];
      setErrors(newErrors);
    }
  };


  const calculateLineTotal = (quantity: number, unitPrice: number): number => {
    return quantity * unitPrice;
  };

  const calculateTotalAmount = (): number => {
    return orderLines.reduce((total, line) => {
      return total + calculateLineTotal(line.quantity, line.unitPrice);
    }, 0);
  };

  const itemOptions = items.map((item) => ({
    value: item.itemCode,
    label: `${item.itemName || item.itemName || `Item #${item.itemCode}`} (${item.itemCode})`,
  }));


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل أمر الشراء' : 'أمر شراء جديد'}
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
              {loading ? 'جارٍ الإرسال...' : isEdit ? 'تحديث' : 'إنشاء أمر شراء'}
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
          <Box sx={{ py: 1 }}>
            <SmartRow>
              <SmartField>
                <AnimatedDatePicker
                  label="تاريخ أمر الشراء"
                  value={formData.transactionDate}
                  onChange={(val: Date | null) => setFormData({ ...formData, transactionDate: val || new Date() })}
                  error={!!errors.transactionDate}
                  helperText={errors.transactionDate}
                  required
                />
              </SmartField>
              <SmartField>
                <AnimatedSelect
                  label="المستودع"
                  value={formData.storeCode || 0}
                  onChange={(val: string | number) => setFormData({ ...formData, storeCode: val as number })}
                  options={[{ value: 0, label: 'اختر المستودع' }, ...availableStores]}
                  error={!!errors.storeCode}
                  helperText={errors.storeCode || (availableStores.length === 0 ? 'لا توجد مستودعات متاحة' : '')}
                  required
                  disabled={availableStores.length === 0}
                />
              </SmartField>
            </SmartRow>

            <SmartRow>
              <SmartField>
                <AnimatedSelect
                  label="المورد"
                  value={formData.supplierId || ''}
                  onChange={(val: string | number) => {
                    const sId = val === '' ? undefined : (val as number);
                    const selectedSupplier = suppliers.find((s: SupplierResponse) => s.supplierId === sId);
                    setFormData({
                      ...formData,
                      supplierId: sId,
                      supplierName: selectedSupplier ? selectedSupplier.supplierName : ''
                    });
                    if (errors.supplierName) {
                      setErrors({ ...errors, supplierName: '' });
                    }
                  }}
                  options={[
                    { value: '', label: loadingSuppliers ? 'جارٍ التحميل...' : 'اختر المورد' },
                    ...suppliers
                      .filter((s: SupplierResponse) => s.isActive)
                      .map((s: SupplierResponse) => ({
                        value: s.supplierId,
                        label: s.supplierName || s.supplierName || `المورد #${s.supplierId}`,
                      }))
                  ]}
                  error={!!errors.supplierName || !!suppliersError}
                  helperText={
                    errors.supplierName ||
                      suppliersError ? 'خطأ في تحميل الموردين. يرجى التحقق من وجود موردين في النظام.' :
                      loadingSuppliers ? 'جارٍ التحميل...' :
                        suppliers.length > 0 ? `${suppliers.filter((s: SupplierResponse) => s.isActive).length} مورد متاح` :
                          'لا توجد موردين متاحين. يرجى إنشاء موردين أولاً في الإعدادات > الموردين.'
                  }
                  required
                  disabled={loadingSuppliers}
                />
              </SmartField>
              <SmartField>
                <AnimatedDatePicker
                  label="تاريخ التسليم المتوقع"
                  value={formData.expectedDeliveryDate}
                  onChange={(val: Date | null) => {
                    setFormData({ ...formData, expectedDeliveryDate: val || undefined });
                    if (errors.expectedDeliveryDate) {
                      setErrors({ ...errors, expectedDeliveryDate: '' });
                    }
                  }}
                  error={!!errors.expectedDeliveryDate}
                  helperText={errors.expectedDeliveryDate}
                  minDate={formData.transactionDate || new Date()}
                />
              </SmartField>
            </SmartRow>

            <Box sx={{ mt: 1 }}>
              <AnimatedTextField
                label="ملاحظات الموافقة (اختياري)"
                value={formData.approvalNotes || ''}
                onChange={(val: string) => setFormData({ ...formData, approvalNotes: val })}
                multiline
                rows={2}
                fullWidth
              />
            </Box>
          </Box>

          {/* Order Lines Section */}
          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.25s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
                بنود الطلب
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={handleAddOrderLine}
                disabled={loadingItems}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#0c2b7a',
                  color: '#0c2b7a',
                  '&:hover': {
                    borderColor: '#0a266e',
                    backgroundColor: '#F3F4F6',
                  },
                }}
              >
                إضافة بند
              </Button>
            </Box>

            {errors.orderLines && (
              <Typography variant="body2" sx={{ color: '#DC2626', mb: 1, fontSize: '12px' }}>
                {errors.orderLines}
              </Typography>
            )}

            {orderLines.length === 0 ? (
              <Box
                sx={{
                  padding: 3,
                  textAlign: 'center',
                  backgroundColor: '#F9FAFB',
                  borderRadius: 1,
                  border: '1px dashed #D1D5DB',
                }}
              >
                <Typography variant="body2" sx={{ color: '#6B7280' }}>
                  لم تتم إضافة أي بنود. انقر على &quot;إضافة بند&quot; لإضافة العناصر.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB' }}>العنصر</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', minWidth: 100 }}>الكمية</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', minWidth: 120 }}>سعر الوحدة (ر.س)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', minWidth: 120 }}>إجمالي البند (ر.س)</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', minWidth: 150 }}>ملاحظات</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', width: 60 }}>الإجراء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderLines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box sx={{ minWidth: 200 }}>
                            <AnimatedSelect
                              value={line.itemCode || 0}

                              onChange={(val: string | number) => handleOrderLineChange(index, 'itemCode', Number(val))}
                              label="العنصر"
                              options={[{ value: 0, label: 'اختر العنصر' }, ...itemOptions]}
                              error={!!errors[`orderLine_${index}_item`]}
                              helperText={errors[`orderLine_${index}_item`]}
                              fullWidth
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ minWidth: 120 }}>
                            <AnimatedNumberField
                              value={line.quantity || ''}
                              onChange={(val: number | string) => handleOrderLineChange(index, 'quantity', val === '' ? 0 : Number(val))}
                              error={!!errors[`orderLine_${index}_quantity`]}
                              helperText={errors[`orderLine_${index}_quantity`]}
                              min={0.0001}
                              fullWidth
                              label=""
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ minWidth: 140 }}>
                            <AnimatedNumberField
                              value={line.unitPrice || ''}
                              onChange={(val: number | string) => handleOrderLineChange(index, 'unitPrice', val === '' ? 0 : Number(val))}
                              error={!!errors[`orderLine_${index}_unitPrice`]}
                              helperText={errors[`orderLine_${index}_unitPrice`]}
                              min={0}
                              prefix="ر.س"
                              fullWidth
                              label=""
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 600, color: '#0c2b7a', fontSize: '14px' }}>
                            {formatNumber(calculateLineTotal(line.quantity, line.unitPrice), {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ minWidth: 150 }}>
                            <AnimatedTextField
                              value={line.notes || ''}
                              onChange={(val: string) => handleOrderLineChange(index, 'notes', val)}
                              fullWidth
                              label=""
                              placeholder="ملاحظات اختيارية"
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveOrderLine(index)}
                            sx={{ color: '#DC2626' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} align="right" sx={{ fontWeight: 700, backgroundColor: '#F9FAFB' }}>
                        <Typography sx={{ fontWeight: 700, color: '#1F2937' }}>Total Amount:</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: '#F9FAFB' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '16px', color: '#0c2b7a' }}>
                          ر.س {formatNumber(calculateTotalAmount(), {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell colSpan={2} sx={{ backgroundColor: '#F9FAFB' }} />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

