'use client';

import { useState, useEffect } from 'react';
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
  AnimatedSelect,
  AnimatedDatePicker,
  AnimatedNumberField,
  AnimatedTextField,
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import { SmartRow, SmartField } from '@/components/common/SmartLayout';
import type { StoreItemTransfer, RequestStatus } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';
import type { EmployeeResponse } from '@/lib/api/employees';
import type { StoreSummary, ItemResponse, StoreTransferLineRequest } from '@/lib/api/warehouse';
import { warehouseApi } from '@/lib/api/warehouse';
import { employeesApi } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';

interface TransferFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<StoreItemTransfer> & { transferLines?: StoreTransferLineRequest[] }) => Promise<void>;
  initialData?: StoreItemTransfer | null;
  loading?: boolean;
  projects?: ProjectSummary[];
  employees?: EmployeeResponse[];
  stores?: StoreSummary[];
  items?: ItemResponse[];
}

export default function TransferForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  projects = [],
  employees = [],
  stores = [],
  items = [],
}: TransferFormProps) {
  const isEdit = !!initialData;

  // Get current user's employee data for auto-filling "Requested By"
  const { data: currentEmployeeData } = useApi(
    () => employeesApi.getMyEmployee(),
    { immediate: !isEdit } // Only fetch when creating new transfer (not editing)
  );

  const [formData, setFormData] = useState<Partial<StoreItemTransfer>>({
    transactionDate: new Date(),
    fromProjectCode: 0,
    fromStoreCode: 0,
    toProjectCode: 0,
    toStoreCode: 0,
    requestStatus: 'NEW' as RequestStatus,
    requestedBy: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fromStores, setFromStores] = useState<Array<{ value: number; label: string }>>([]);
  const [toStores, setToStores] = useState<Array<{ value: number; label: string }>>([]);
  const [transferLines, setTransferLines] = useState<StoreTransferLineRequest[]>([]);
  const [storeBalances, setStoreBalances] = useState<Map<number, number>>(new Map()); // itemCode -> availableQuantity

  // Fetch items for transfer lines
  const { data: itemsData, loading: loadingItems } = useApi(
    () => warehouseApi.getAllItems({ size: 1000 }),
    { immediate: true }
  );

  // Use fetched items or fallback to prop items
  const availableItems = itemsData || items || [];

  // Fetch store balances when fromStore is selected
  const { data: balancesData, execute: fetchBalances } = useApi(
    () => warehouseApi.getBalancesByStore(formData.fromStoreCode!),
    { immediate: false }
  );

  useEffect(() => {
    if (formData.fromStoreCode) {
      fetchBalances();
    } else {
      setStoreBalances(new Map());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.fromStoreCode]);

  useEffect(() => {
    if (balancesData) {
      const balanceMap = new Map<number, number>();
      balancesData.forEach(balance => {
        balanceMap.set(balance.itemCode, balance.availableQuantity || balance.quantityOnHand || 0);
      });
      setStoreBalances(balanceMap);
    }
  }, [balancesData]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        transactionDate: initialData.transactionDate ? new Date(initialData.transactionDate) : new Date(),
        fromProjectCode: initialData.fromProjectCode,
        fromStoreCode: initialData.fromStoreCode,
        toProjectCode: initialData.toProjectCode,
        toStoreCode: initialData.toStoreCode,
        requestStatus: initialData.requestStatus,
        requestedBy: initialData.requestedBy,
      });
      // Load existing transfer lines if editing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((initialData as any).transferLines && Array.isArray((initialData as any).transferLines)) {
        setTransferLines(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (initialData as any).transferLines.map((line: any) => ({
            itemCode: line.itemCode,
            quantity: line.quantity || 0,
            notes: line.notes || '',
          }))
        );
      } else {
        setTransferLines([]);
      }
    } else {
      setFormData({
        transactionDate: new Date(),
        fromProjectCode: 0,
        fromStoreCode: 0,
        toProjectCode: 0,
        toStoreCode: 0,
        requestStatus: 'NEW',
        requestedBy: 0,
      });
      setTransferLines([]);
    }
    setErrors({});
  }, [initialData, open]);

  useEffect(() => {
    if (formData.fromProjectCode) {
      const projectStores = stores
        .filter((store) => store.projectCode === formData.fromProjectCode)
        .map((store) => ({
          value: store.storeCode,
          label: store.storeName || store.storeName || `Store #${store.storeCode}`,
        }));
      setFromStores(projectStores);
      if (projectStores.length === 0) {
        setFormData((prev) => ({ ...prev, fromStoreCode: 0 }));
      }
    } else {
      setFromStores([]);
    }
  }, [formData.fromProjectCode, stores]);

  useEffect(() => {
    if (formData.toProjectCode) {
      const projectStores = stores
        .filter((store) => store.projectCode === formData.toProjectCode)
        .map((store) => ({
          value: store.storeCode,
          label: store.storeName || store.storeName || `Store #${store.storeCode}`,
        }));
      setToStores(projectStores);
      if (projectStores.length === 0) {
        setFormData((prev) => ({ ...prev, toStoreCode: 0 }));
      }
    } else {
      setToStores([]);
    }
  }, [formData.toProjectCode, stores]);

  // Auto-fill "Requested By" with current user when creating new transfer
  useEffect(() => {
    if (!isEdit && currentEmployeeData && currentEmployeeData.employeeNo && formData.requestedBy === 0) {
      console.log('[TransferForm] Auto-filling requestedBy with current user:', currentEmployeeData.employeeNo);
      setFormData((prev) => ({
        ...prev,
        requestedBy: currentEmployeeData.employeeNo,
      }));
    }
  }, [isEdit, currentEmployeeData, formData.requestedBy]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fromProjectCode) newErrors.fromProjectCode = 'مشروع المصدر مطلوب';
    if (!formData.fromStoreCode) newErrors.fromStoreCode = 'مستودع المصدر مطلوب';
    if (!formData.toProjectCode) newErrors.toProjectCode = 'مشروع الهدف مطلوب';
    if (!formData.toStoreCode) newErrors.toStoreCode = 'مستودع الهدف مطلوب';
    if (formData.fromProjectCode === formData.toProjectCode && formData.fromStoreCode === formData.toStoreCode) {
      newErrors.toStoreCode = 'مستودع الهدف يجب أن يكون مختلفاً عن مستودع المصدر';
    }
    if (!formData.requestedBy) newErrors.requestedBy = 'المطلوب بواسطة مطلوب';
    if (transferLines.length === 0) {
      newErrors.transferLines = 'سطر نقل واحد على الأقل مطلوب';
    }
    // Validate each transfer line
    transferLines.forEach((line, index) => {
      if (!line.itemCode) {
        newErrors[`transferLine_${index}_item`] = 'العنصر مطلوب';
      }
      if (!line.quantity || line.quantity <= 0) {
        newErrors[`transferLine_${index}_quantity`] = 'الكمية يجب أن تكون أكبر من 0';
      }
      // Check available quantity in source store
      if (line.itemCode && formData.fromStoreCode) {
        const availableQty = storeBalances.get(line.itemCode) || 0;
        if (line.quantity > availableQty) {
          newErrors[`transferLine_${index}_quantity`] = `الكمية غير كافية. المتاح: ${availableQty}`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onSubmit({ ...formData, transferLines });
  };

  const handleAddTransferLine = () => {
    setTransferLines([...transferLines, { itemCode: 0, quantity: 0, notes: '' }]);
  };

  const handleRemoveTransferLine = (index: number) => {
    setTransferLines(transferLines.filter((_, i) => i !== index));
  };

  const handleTransferLineChange = (
    index: number,
    field: keyof StoreTransferLineRequest,
    value: string | number
  ) => {
    const updated = [...transferLines];
    updated[index] = { ...updated[index], [field]: value };
    setTransferLines(updated);
    // Clear error for this field
    if (errors[`transferLine_${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`transferLine_${index}_${field}`];
      setErrors(newErrors);
    }
  };

  const getAvailableQuantity = (itemCode: number): number => {
    return storeBalances.get(itemCode) || 0;
  };

  const projectOptions = projects.map((proj) => ({
    value: proj.projectCode,
    label: `${proj.projectName || proj.projectName} (#${proj.projectCode})`,
  }));

  const employeeOptions = (employees || []).map((emp) => ({
    value: emp.employeeNo,
    label: emp.employeeName || emp.employeeName || `Employee #${emp.employeeNo}`,
  }));

  const itemOptions = availableItems.map((item) => ({
    value: item.itemCode,
    label: `${item.itemName || item.itemName || `Item #${item.itemCode}`} (${item.itemCode})`,
  }));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل معاملة النقل' : 'معاملة نقل جديدة'}
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
            <Box sx={{ mb: 2 }}>
              <AnimatedDatePicker
                label="تاريخ المعاملة"
                value={formData.transactionDate}
                onChange={(val: Date | null) => setFormData({ ...formData, transactionDate: val || new Date() })}
                required
              />
            </Box>

            <Typography variant="subtitle2" sx={{ color: '#6B7280', mb: 1 }}>
              موقع المصدر
            </Typography>
            <SmartRow>
              <SmartField>
                <AnimatedSelect
                  label="مشروع المصدر"
                  value={formData.fromProjectCode || 0}
                  onChange={(val: string | number) => setFormData({ ...formData, fromProjectCode: val as number, fromStoreCode: 0 })}
                  options={[{ value: 0, label: 'اختر المشروع' }, ...projectOptions]}
                  error={!!errors.fromProjectCode}
                  helperText={errors.fromProjectCode}
                  required
                />
              </SmartField>
              <SmartField>
                <AnimatedSelect
                  label="مستودع المصدر"
                  value={formData.fromStoreCode || 0}
                  onChange={(val: string | number) => setFormData({ ...formData, fromStoreCode: val as number })}
                  options={[{ value: 0, label: 'اختر المستودع' }, ...fromStores]}
                  error={!!errors.fromStoreCode}
                  helperText={errors.fromStoreCode || (fromStores.length === 0 && formData.fromProjectCode ? 'لا توجد مستودعات متاحة' : '')}
                  required
                  disabled={!formData.fromProjectCode || fromStores.length === 0}
                />
              </SmartField>
            </SmartRow>

            <Typography variant="subtitle2" sx={{ color: '#6B7280', mt: 3, mb: 1 }}>
              موقع الهدف
            </Typography>
            <SmartRow>
              <SmartField>
                <AnimatedSelect
                  label="مشروع الهدف"
                  value={formData.toProjectCode || 0}
                  onChange={(val: string | number) => setFormData({ ...formData, toProjectCode: val as number, toStoreCode: 0 })}
                  options={[{ value: 0, label: 'اختر المشروع' }, ...projectOptions.filter(p => p.value !== formData.fromProjectCode)]}
                  error={!!errors.toProjectCode}
                  helperText={errors.toProjectCode}
                  required
                />
              </SmartField>
              <SmartField>
                <AnimatedSelect
                  label="مستودع الهدف"
                  value={formData.toStoreCode || 0}
                  onChange={(val: string | number) => setFormData({ ...formData, toStoreCode: val as number })}
                  options={[{ value: 0, label: 'اختر المستودع' }, ...toStores]}
                  error={!!errors.toStoreCode}
                  helperText={errors.toStoreCode || (toStores.length === 0 && formData.toProjectCode ? 'لا توجد مستودعات متاحة' : '')}
                  required
                  disabled={!formData.toProjectCode || toStores.length === 0}
                />
              </SmartField>
            </SmartRow>

            <Box sx={{ mt: 3 }}>
              <AnimatedSelect
                label="المطلوب بواسطة"
                value={formData.requestedBy || 0}
                onChange={(val: string | number) => setFormData({ ...formData, requestedBy: val as number })}
                options={[{ value: 0, label: 'اختر الموظف' }, ...employeeOptions]}
                error={!!errors.requestedBy}
                helperText={errors.requestedBy || (isEdit ? 'لا يمكن تغييره بعد الإنشاء (لتتبع التدقيق)' : undefined)}
                required
                disabled={isEdit}
              />
            </Box>
          </Box>

          {/* Transfer Lines Section */}
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
              <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
                بنود النقل
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={handleAddTransferLine}
                disabled={loadingItems || !formData.fromStoreCode}
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
                إضافة سطر
              </Button>
            </Box>

            {errors.transferLines && (
              <Typography variant="body2" sx={{ color: '#DC2626', mb: 1, fontSize: '12px' }}>
                {errors.transferLines}
              </Typography>
            )}

            {!formData.fromStoreCode && (
              <Box
                sx={{
                  padding: 2,
                  textAlign: 'center',
                  backgroundColor: '#FEF3C7',
                  borderRadius: 1,
                  border: '1px dashed #F59E0B',
                }}
              >
                <Typography variant="body2" sx={{ color: '#92400E' }}>
                  يرجى اختيار مستودع المصدر أولاً لإضافة العناصر
                </Typography>
              </Box>
            )}

            {formData.fromStoreCode && transferLines.length === 0 && (
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
                  لم يتم إضافة أي بنود نقل. انقر على &quot;إضافة سطر&quot; لإضافة العناصر.
                </Typography>
              </Box>
            )}

            {formData.fromStoreCode && transferLines.length > 0 && (
              <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB' }}>العنصر</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', minWidth: 120 }}>المتاح</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', minWidth: 100 }}>الكمية</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', minWidth: 150 }}>ملاحظات</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', width: 60 }}>إجراء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transferLines.map((line, index) => {
                      const availableQty = line.itemCode ? getAvailableQuantity(line.itemCode) : 0;
                      const isOverTransfer = line.quantity > availableQty;
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ minWidth: 200 }}>
                              <AnimatedSelect
                                value={line.itemCode || 0}
                                onChange={(val: string | number) => handleTransferLineChange(index, 'itemCode', Number(val))}
                                label="العنصر"
                                options={[{ value: 0, label: 'اختر العنصر' }, ...itemOptions]}
                                error={!!errors[`transferLine_${index}_item`]}
                                helperText={errors[`transferLine_${index}_item`]}
                                fullWidth
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography sx={{ color: availableQty > 0 ? '#059669' : '#DC2626', fontWeight: 600 }}>
                              {availableQty}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ minWidth: 120 }}>
                              <AnimatedNumberField
                                value={line.quantity || ''}
                                onChange={(val: number | string) => handleTransferLineChange(index, 'quantity', val === '' ? 0 : Number(val))}
                                error={!!errors[`transferLine_${index}_quantity`] || isOverTransfer}
                                helperText={errors[`transferLine_${index}_quantity`] || (isOverTransfer ? `يتجاوز المتاح: ${availableQty}` : '')}
                                min={0.0001}
                                max={availableQty}
                                fullWidth
                                label=""
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ minWidth: 150 }}>
                              <AnimatedTextField
                                value={line.notes || ''}
                                onChange={(val: string) => handleTransferLineChange(index, 'notes', val)}
                                fullWidth
                                label=""
                                placeholder="ملاحظات اختيارية"
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveTransferLine(index)}
                              sx={{ color: '#DC2626' }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

