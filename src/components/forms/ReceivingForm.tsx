'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
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
import type { StoreItemReceivable, RequestStatus } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';
import type { EmployeeResponse } from '@/lib/api/employees';
import type { StoreSummary, ItemResponse, GoodsReceiptLineRequest } from '@/lib/api/warehouse';
import { useApi } from '@/hooks/useApi';
import { warehouseApi } from '@/lib/api/warehouse';
import { employeesApi } from '@/lib/api/employees';

interface ReceivingFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<StoreItemReceivable> & { receiptLines?: GoodsReceiptLineRequest[] }) => Promise<void>;
  initialData?: StoreItemReceivable | null;
  loading?: boolean;
  projects?: ProjectSummary[];
  employees?: EmployeeResponse[];
  stores?: StoreSummary[];
  items?: ItemResponse[];
}

export default function ReceivingForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  projects = [],
  employees = [],
  stores = [],
  items = [],
}: ReceivingFormProps) {
  const isEdit = !!initialData;

  // Get current user's employee data for auto-filling "Requested By"
  const { data: currentEmployeeData } = useApi(
    () => employeesApi.getMyEmployee(),
    { immediate: !isEdit } // Only fetch when creating new receipt (not editing)
  );

  const [formData, setFormData] = useState<Partial<StoreItemReceivable>>({
    transactionDate: new Date(),
    projectCode: 0,
    storeCode: 0,
    requestStatus: 'NEW' as RequestStatus,
    itemsPOTransactionNo: undefined,
    requestedBy: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableStores, setAvailableStores] = useState<Array<{ value: number; label: string }>>([]);
  const [availablePOs, setAvailablePOs] = useState<Array<{ value: number; label: string }>>([]);
  const [receiptLines, setReceiptLines] = useState<GoodsReceiptLineRequest[]>([]);

  // Fetch items for receipt lines
  const { data: itemsData, loading: loadingItems } = useApi(
    () => warehouseApi.getAllItems({ size: 1000 }),
    { immediate: true }
  );

  // Use fetched items or fallback to prop items
  const availableItems = itemsData || items || [];

  // Auto-fill "Requested By" with current user when creating new receipt
  useEffect(() => {
    if (!isEdit && currentEmployeeData && currentEmployeeData.employeeNo && formData.requestedBy === 0) {
      setFormData((prev) => ({
        ...prev,
        requestedBy: currentEmployeeData.employeeNo,
      }));
    }
  }, [isEdit, currentEmployeeData, formData.requestedBy]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        transactionDate: initialData.transactionDate ? new Date(initialData.transactionDate) : new Date(),
        projectCode: initialData.projectCode || 0,
        storeCode: 0, // Will be set after stores are filtered
        requestStatus: initialData.requestStatus,
        itemsPOTransactionNo: 0, // Will be set after POs are loaded
        requestedBy: initialData.requestedBy || 0,
      });

      if ((initialData as StoreItemReceivable & { receiptLines: GoodsReceiptLineRequest[] }).receiptLines && Array.isArray((initialData as StoreItemReceivable & { receiptLines: GoodsReceiptLineRequest[] }).receiptLines)) {
        const mappedLines = (initialData as StoreItemReceivable & { receiptLines: GoodsReceiptLineRequest[] }).receiptLines.map((line: GoodsReceiptLineRequest) => ({
          itemCode: line.itemCode,
          quantity: line.quantity || 0,
          notes: line.notes || '',
        }));
        setReceiptLines(mappedLines);
      } else {
        setReceiptLines([]);
      }
    } else {
      setFormData({
        transactionDate: new Date(),
        projectCode: 0,
        storeCode: 0,
        requestStatus: 'NEW',
        itemsPOTransactionNo: undefined,
        requestedBy: 0,
      });
      setReceiptLines([]);
    }
    setErrors({});
  }, [initialData, open]);

  // Fetch approved purchase orders for the selected store
  const storeCodeForPO = formData.storeCode && formData.storeCode > 0 ? formData.storeCode : undefined;
  const { data: purchaseOrdersData, loading: loadingPOs, execute: fetchPOs } = useApi(
    () => warehouseApi.getAllPurchaseOrders(undefined, storeCodeForPO, 'APPROVED'),
    { immediate: false }
  );

  // Fetch the linked PO directly when editing (in case it's not APPROVED anymore)
  const linkedPOId = isEdit && initialData && initialData.itemsPOTransactionNo && initialData.itemsPOTransactionNo > 0
    ? initialData.itemsPOTransactionNo
    : undefined;
  const { data: linkedPOData, execute: fetchLinkedPO } = useApi(
    () => {
      if (linkedPOId && linkedPOId > 0) {
        return warehouseApi.getPurchaseOrderById(linkedPOId);
      }
      return Promise.resolve(null);
    },
    { immediate: false }
  );

  useEffect(() => {
    if (formData.projectCode && formData.projectCode > 0) {
      const projectStores = stores
        .filter((store) => store.projectCode === formData.projectCode)
        .map((store) => ({
          value: store.storeCode,
          label: store.storeName || store.storeName || `Store #${store.storeCode}`,
        }));
      setAvailableStores(projectStores);

      // If editing and we have initialData, try to set the storeCode if it exists in available stores
      if (initialData && initialData.storeCode && initialData.storeCode > 0) {
        const storeExists = projectStores.some(store => store.value === initialData.storeCode);
        if (storeExists) {
          // Only update if it's different to avoid infinite loops
          setFormData((prev) => {
            if (prev.storeCode !== initialData.storeCode) {
              return { ...prev, storeCode: initialData.storeCode };
            }
            return prev;
          });
        }
      } else if (projectStores.length === 0) {
        // No stores available for this project
        setFormData((prev) => ({ ...prev, storeCode: 0 }));
      }
    } else {
      setAvailableStores([]);
      // Don't reset storeCode if we're editing and have initialData - might be loading
      if (!initialData) {
        setFormData((prev) => ({ ...prev, storeCode: 0 }));
      }
    }
  }, [formData.projectCode, stores, initialData]);

  // Fetch POs when store is selected (using storeCode directly, not fetchPOs in deps)
  useEffect(() => {
    if (formData.storeCode && formData.storeCode > 0) {
      fetchPOs();
    }
  }, [formData.storeCode, fetchPOs]);

  // Fetch linked PO immediately when editing
  useEffect(() => {
    if (linkedPOId && linkedPOId > 0) {
      fetchLinkedPO();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedPOId, isEdit]);

  // Update available POs when purchase orders data changes
  useEffect(() => {
    let finalPOs: Array<{ value: number; label: string }> = [];

    // Start with approved POs if available
    if (purchaseOrdersData && Array.isArray(purchaseOrdersData)) {
      finalPOs = purchaseOrdersData
        .filter((po) => po.poStatus === 'APPROVED')
        .map((po) => ({
          value: po.poId,
          label: `${po.poNumber} - ${po.supplierName} (Total: ${po.totalAmount || 0})`,
        }));
    }

    // If editing and we have a linked PO, add it to the list even if not APPROVED
    if (isEdit && initialData && initialData.itemsPOTransactionNo && initialData.itemsPOTransactionNo > 0) {
      const linkedPOExists = finalPOs.some(po => po.value === initialData.itemsPOTransactionNo);
      if (!linkedPOExists && linkedPOData) {
        // Add the linked PO to the list
        finalPOs.push({
          value: linkedPOData.poId,
          label: `${linkedPOData.poNumber} - ${linkedPOData.supplierName} (Total: ${linkedPOData.totalAmount || 0})${linkedPOData.poStatus !== 'APPROVED' ? ` [${linkedPOData.poStatus}]` : ''}`,
        });
      }
    }

    setAvailablePOs(finalPOs);

    // If editing and we have initialData, try to set the itemsPOTransactionNo if it exists in available POs
    if (initialData && initialData.itemsPOTransactionNo && initialData.itemsPOTransactionNo > 0) {
      const poExists = finalPOs.some(po => po.value === initialData.itemsPOTransactionNo);
      if (poExists) {
        // Only update if it's different to avoid infinite loops
        setFormData((prev) => {
          if (prev.itemsPOTransactionNo !== initialData.itemsPOTransactionNo) {
            return { ...prev, itemsPOTransactionNo: initialData.itemsPOTransactionNo };
          }
          return prev;
        });
      } else if (linkedPOData && linkedPOData.poId === initialData.itemsPOTransactionNo) {
        // Linked PO data is available but not yet in the list - set it directly
        setFormData((prev) => {
          if (prev.itemsPOTransactionNo !== linkedPOData.poId) {
            return { ...prev, itemsPOTransactionNo: linkedPOData.poId };
          }
          return prev;
        });
      }
    }
  }, [purchaseOrdersData, linkedPOData, initialData, isEdit]);

  // Auto-populate receipt lines when PO is selected (only for new receipts, not when editing)
  useEffect(() => {
    if (isEdit) return; // Don't auto-populate when editing

    if (formData.itemsPOTransactionNo && purchaseOrdersData && Array.isArray(purchaseOrdersData)) {
      const selectedPO = purchaseOrdersData.find(
        (po) => po.poId === formData.itemsPOTransactionNo
      );
      if (selectedPO && selectedPO.orderLines && selectedPO.orderLines.length > 0) {
        // Only update if receipt lines are empty or different
        const newLines = selectedPO.orderLines.map((line) => ({
          itemCode: line.itemCode,
          quantity: line.quantity,
          notes: line.notes || '',
        }));

        // Check if lines are different to avoid infinite loop
        const linesChanged = receiptLines.length !== newLines.length ||
          receiptLines.some((line, idx) =>
            line.itemCode !== newLines[idx]?.itemCode ||
            line.quantity !== newLines[idx]?.quantity
          );

        if (linesChanged) {
          setReceiptLines(newLines);
        }
      }
    } else if (!formData.itemsPOTransactionNo && receiptLines.length > 0) {
      // Clear receipt lines when PO is deselected
      setReceiptLines([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.itemsPOTransactionNo, purchaseOrdersData, isEdit]);

  const itemOptions = availableItems.map((item) => ({
    value: item.itemCode,
    label: `${item.itemName || item.itemName || `Item #${item.itemCode}`} (${item.itemCode})`,
  }));

  const handleAddReceiptLine = () => {
    setReceiptLines([...receiptLines, { itemCode: 0, quantity: 0, notes: '' }]);
  };

  const handleRemoveReceiptLine = (index: number) => {
    setReceiptLines(receiptLines.filter((_, i) => i !== index));
  };


  const handleReceiptLineChange = (index: number, field: keyof GoodsReceiptLineRequest, value: string | number) => {
    const updated = [...receiptLines];
    updated[index] = { ...updated[index], [field]: value };
    setReceiptLines(updated);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectCode) newErrors.projectCode = 'المشروع مطلوب';
    if (!formData.storeCode) newErrors.storeCode = 'المستودع مطلوب';
    if (!formData.requestedBy) newErrors.requestedBy = 'المطلوب بواسطة مطلوب';

    // Validate receipt lines
    if (receiptLines.length === 0 && !formData.itemsPOTransactionNo) {
      newErrors.receiptLines = 'يرجى إضافة عنصر واحد على الأقل أو الربط بأمر شراء';
    } else {
      receiptLines.forEach((line, index) => {
        if (!line.itemCode) {
          newErrors[`receiptLine_${index}_itemCode`] = 'العنصر مطلوب';
        }
        if (!line.quantity || line.quantity <= 0) {
          newErrors[`receiptLine_${index}_quantity`] = 'الكمية يجب أن تكون أكبر من 0';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      await onSubmit({ ...formData, receiptLines });
    } catch (error) {
      throw error;
    }
  };

  const projectOptions = projects.map((proj) => ({
    value: proj.projectCode,
    label: `${proj.projectName || proj.projectName} (#${proj.projectCode})`,
  }));

  const employeeOptions = (employees || [])
    .filter((emp) => emp.employmentStatus === 'ACTIVE' || (initialData && emp.employeeNo === initialData.requestedBy))
    .map((emp) => ({
      value: emp.employeeNo,
      label: emp.employeeName || emp.employeeName || `Employee #${emp.employeeNo}`,
    }));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل معاملة الاستلام' : 'معاملة استلام جديدة'}
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
              {loading ? 'جارٍ الإرسال...' : isEdit ? 'تحديث' : 'إنشاء'}
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
                  label="تاريخ المعاملة"
                  value={formData.transactionDate}
                  onChange={(val: Date | null) => setFormData({ ...formData, transactionDate: val || new Date() })}
                  required
                />
              </SmartField>
              <SmartField>
                <AnimatedSelect
                  label="المشروع"
                  value={formData.projectCode || 0}
                  onChange={(val: string | number) => setFormData({ ...formData, projectCode: val as number, storeCode: 0 })}
                  options={[{ value: 0, label: 'اختر المشروع' }, ...projectOptions]}
                  error={!!errors.projectCode}
                  helperText={errors.projectCode}
                  required
                />
              </SmartField>
            </SmartRow>

            <SmartRow>
              <SmartField>
                <AnimatedSelect
                  label="المستودع"
                  value={formData.storeCode || 0}
                  onChange={(val: string | number) => setFormData({ ...formData, storeCode: val as number })}
                  options={[{ value: 0, label: 'اختر المستودع' }, ...availableStores]}
                  error={!!errors.storeCode}
                  helperText={errors.storeCode || (availableStores.length === 0 && formData.projectCode ? 'لا توجد مستودعات متاحة' : '')}
                  required
                  disabled={!formData.projectCode || availableStores.length === 0}
                />
              </SmartField>
              <SmartField>
                <AnimatedSelect
                  label="رقم أمر الشراء (اختياري)"
                  value={formData.itemsPOTransactionNo && formData.itemsPOTransactionNo > 0 ? formData.itemsPOTransactionNo : 0}
                  onChange={(val: string | number) => setFormData({ ...formData, itemsPOTransactionNo: val === 0 ? undefined : (val as number) })}
                  options={[{ value: 0, label: 'اختر أمر الشراء (اختياري)' }, ...availablePOs]}
                  disabled={!formData.storeCode || (loadingPOs && !linkedPOData)}
                  helperText={
                    loadingPOs && !linkedPOData ? 'جارٍ التحميل...' :
                      (availablePOs.length === 0 && formData.storeCode && !linkedPOData ? 'لا توجد أوامر شراء معتمدة متاحة لهذا المستودع' :
                        (isEdit && linkedPOData ? 'تم تحميل أمر الشراء المرتبط (قد لا يكون معتمداً)' :
                          'اختر أمر شراء لملء بنود الاستلام تلقائياً'))
                  }
                />
              </SmartField>
            </SmartRow>

            <Box sx={{ mt: 1 }}>
              <AnimatedSelect
                label="طلب بواسطة"
                value={formData.requestedBy || 0}
                onChange={(val: string | number) => setFormData({ ...formData, requestedBy: val as number })}
                options={[{ value: 0, label: 'اختر الموظف' }, ...employeeOptions]}
                error={!!errors.requestedBy}
                helperText={errors.requestedBy || (isEdit ? 'لا يمكن تغييره بعد الإنشاء (مسار التدقيق)' : undefined)}
                required
                disabled={isEdit}
              />
            </Box>
          </Box>

          {/* Receipt Lines Section */}
          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.3s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827' }}>
                عناصر الاستلام
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={handleAddReceiptLine}
                disabled={loading || loadingItems}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#0c2b7a',
                  color: '#0c2b7a',
                  '&:hover': {
                    borderColor: '#0a266e',
                    backgroundColor: 'rgba(12, 43, 122, 0.08)',
                  },
                }}
              >
                إضافة عنصر
              </Button>
            </Box>

            {errors.receiptLines && (
              <Typography variant="caption" sx={{ color: '#DC2626', mb: 1, display: 'block' }}>
                {errors.receiptLines}
              </Typography>
            )}

            {receiptLines.length === 0 ? (
              <Box
                sx={{
                  padding: 3,
                  textAlign: 'center',
                  border: '2px dashed #E5E7EB',
                  borderRadius: 2,
                  backgroundColor: '#F9FAFB',
                }}
              >
                <Typography variant="body2" sx={{ color: '#6B7280' }}>
                  لم تتم إضافة أي عناصر. انقر على &quot;إضافة عنصر&quot; لإضافة عناصر إلى هذا الاستلام.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ border: '1px solid #E5E7EB', borderRadius: 1 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#111827' }}>العنصر</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#111827', width: '150px' }}>الكمية</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#111827' }}>ملاحظات</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#111827', width: '60px' }}>الإجراء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {receiptLines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <AnimatedSelect
                            label="العنصر"
                            value={line.itemCode || 0}

                            onChange={(val: string | number) => handleReceiptLineChange(index, 'itemCode', Number(val))}
                            options={[{ value: 0, label: 'اختر العنصر' }, ...itemOptions]}
                            error={!!errors[`receiptLine_${index}_itemCode`]}
                            helperText={errors[`receiptLine_${index}_itemCode`]}
                          />
                        </TableCell>
                        <TableCell>
                          <AnimatedNumberField
                            label="الكمية"
                            value={line.quantity || 0}
                            onChange={(val: number | string) => handleReceiptLineChange(index, 'quantity', val === '' ? 0 : Number(val))}
                            min={0.0001}
                            step={0.01}
                            error={!!errors[`receiptLine_${index}_quantity`]}
                            helperText={errors[`receiptLine_${index}_quantity`]}
                          />
                        </TableCell>
                        <TableCell>
                          <AnimatedTextField
                            label="ملاحظات (اختياري)"
                            value={line.notes || ''}
                            onChange={(val: string) => handleReceiptLineChange(index, 'notes', val)}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveReceiptLine(index)}
                            sx={{ color: '#DC2626' }}
                            disabled={loading}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

