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
  AnimatedSelect,
  AnimatedDatePicker,
  AnimatedNumberField,
  AnimatedTextField,
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import { SmartRow, SmartField } from '@/components/common/SmartLayout';
import type { StoreItemPayable, RequestStatus } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';
import type { EmployeeResponse } from '@/lib/api/employees';
import type { StoreSummary, ItemResponse, GoodsIssueLineRequest } from '@/lib/api/warehouse';
import { warehouseApi } from '@/lib/api/warehouse';
import { employeesApi } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';

interface IssuingFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<StoreItemPayable> & { issueLines?: GoodsIssueLineRequest[] }) => Promise<void>;
  initialData?: StoreItemPayable | null;
  loading?: boolean;
  projects?: ProjectSummary[];
  employees?: EmployeeResponse[];
  stores?: StoreSummary[];
  items?: ItemResponse[];
}

export default function IssuingForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  projects = [],
  employees = [],
  stores = [],
  items = [],
}: IssuingFormProps) {
  const isEdit = !!initialData;

  // Get current user's employee data for auto-filling "Requested By"
  const { data: currentEmployeeData } = useApi(
    () => employeesApi.getMyEmployee(),
    { immediate: !isEdit } // Only fetch when creating new issue (not editing)
  );

  const [formData, setFormData] = useState<Partial<StoreItemPayable>>({
    transactionDate: new Date(),
    projectCode: 0,
    storeCode: 0,
    requestStatus: 'NEW' as RequestStatus,
    requestedBy: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issueLines, setIssueLines] = useState<GoodsIssueLineRequest[]>([]);
  const [originalQuantities, setOriginalQuantities] = useState<Map<number, number>>(new Map()); // itemCode -> originalQuantity (for edit mode)

  // Fetch items for issue lines
  const { data: itemsData, loading: loadingItems } = useApi(
    () => warehouseApi.getAllItems({ size: 1000 }),
    { immediate: true }
  );

  // Use fetched items or fallback to prop items
  const availableItems = itemsData || items || [];

  // Fetch store balances when store is selected
  const { data: balancesData, execute: fetchBalances } = useApi(
    () => warehouseApi.getBalancesByStore(formData.storeCode!),
    { immediate: false }
  );

  useEffect(() => {
    if (formData.storeCode) {
      fetchBalances();
    }
  }, [formData.storeCode, fetchBalances]);

  const storeBalances = useMemo(() => {
    const balanceMap = new Map<number, number>();
    if (balancesData) {
      balancesData.forEach(balance => {
        balanceMap.set(balance.itemCode, balance.availableQuantity || balance.quantityOnHand || 0);
      });
    }
    return balanceMap;
  }, [balancesData]);

  // Auto-fill "Requested By" with current user when creating new issue
  useEffect(() => {
    if (!isEdit && currentEmployeeData && currentEmployeeData.employeeNo && formData.requestedBy === 0) {
      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          requestedBy: currentEmployeeData.employeeNo,
        }));
      }, 0);
    }
  }, [isEdit, currentEmployeeData, formData.requestedBy]);

  useEffect(() => {
    setTimeout(() => {
      if (initialData) {
        setFormData({
          transactionDate: initialData.transactionDate ? new Date(initialData.transactionDate) : new Date(),
          projectCode: initialData.projectCode || 0,
          storeCode: 0, // Will be set after stores are filtered
          requestStatus: initialData.requestStatus,
          requestedBy: initialData.requestedBy || 0,
        });
        // Load existing issue lines if editing (assuming they come from API)
        // For now, initialize empty - you may need to fetch full issue details
        if ((initialData as StoreItemPayable & { issueLines: GoodsIssueLineRequest[] }).issueLines && Array.isArray((initialData as StoreItemPayable & { issueLines: GoodsIssueLineRequest[] }).issueLines)) {
          const lines = (initialData as StoreItemPayable & { issueLines: GoodsIssueLineRequest[] }).issueLines.map((line: GoodsIssueLineRequest) => ({
            itemCode: line.itemCode,
            quantity: line.quantity || 0,
            notes: line.notes || '',
          }));
          setIssueLines(lines);

          // Store original quantities for validation (add back to available stock when editing)
          const originalQtyMap = new Map<number, number>();
          lines.forEach((line: GoodsIssueLineRequest) => {
            if (line.itemCode && line.quantity) {
              originalQtyMap.set(line.itemCode, line.quantity);
            }
          });
          setOriginalQuantities(originalQtyMap);
        } else {
          setIssueLines([]);
          setOriginalQuantities(new Map());
        }
      } else {
        setFormData({
          transactionDate: new Date(),
          projectCode: 0,
          storeCode: 0,
          requestStatus: 'NEW',
          requestedBy: 0,
        });
        setIssueLines([]);
        setOriginalQuantities(new Map());
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  const availableStores = useMemo(() => {
    if (formData.projectCode && formData.projectCode > 0) {
      return stores
        .filter((store) => store.projectCode === formData.projectCode)
        .map((store) => ({
          value: store.storeCode,
          label: store.storeName || store.storeName || `Store #${store.storeCode}`,
        }));
    }
    return [];
  }, [formData.projectCode, stores]);

  useEffect(() => {
    // If editing and we have initialData, try to set the storeCode if it exists in available stores
    if (initialData && initialData.storeCode && initialData.storeCode > 0) {
      const storeExists = availableStores.some(store => store.value === initialData.storeCode);
      if (storeExists) {
        // Only update if it's different to avoid infinite loops
        setTimeout(() => {
          setFormData((prev) => {
            if (prev.storeCode !== (initialData as StoreItemPayable).storeCode) {
              return { ...prev, storeCode: (initialData as StoreItemPayable).storeCode };
            }
            return prev;
          });
        }, 0);
      }
    } else if (availableStores.length === 0 && formData.projectCode) {
      setTimeout(() => {
        setFormData((prev) => ({ ...prev, storeCode: 0 }));
      }, 0);
    }
  }, [availableStores, initialData, formData.projectCode]);

  const getAvailableQuantity = (itemCode: number): number => {
    const currentBalance = storeBalances.get(itemCode) || 0;
    // When editing, add back the original quantity that was issued
    // This allows editing the same quantity or less without validation errors
    if (isEdit && originalQuantities.has(itemCode)) {
      const originalQty = originalQuantities.get(itemCode) || 0;
      return currentBalance + originalQty;
    }
    return currentBalance;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectCode) newErrors.projectCode = 'المشروع مطلوب';
    if (!formData.storeCode) newErrors.storeCode = 'المستودع مطلوب';
    if (!formData.requestedBy) newErrors.requestedBy = 'المطلوب بواسطة مطلوب';
    if (issueLines.length === 0) {
      newErrors.issueLines = 'عنصر واحد على الأقل مطلوب';
    }
    // Validate each issue line
    issueLines.forEach((line, index) => {
      if (!line.itemCode) {
        newErrors[`issueLine_${index}_item`] = 'العنصر مطلوب';
      }
      if (!line.quantity || line.quantity <= 0) {
        newErrors[`issueLine_${index}_quantity`] = 'الكمية يجب أن تكون أكبر من 0';
      }
      // Check available quantity
      if (line.itemCode && formData.storeCode) {
        const availableQty = getAvailableQuantity(line.itemCode);
        if (line.quantity > availableQty) {
          newErrors[`issueLine_${index}_quantity`] = `الكمية غير كافية. المتاح: ${availableQty}`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onSubmit({ ...formData, issueLines });
  };

  const handleAddIssueLine = () => {
    setIssueLines([...issueLines, { itemCode: 0, quantity: 0, notes: '' }]);
  };

  const handleRemoveIssueLine = (index: number) => {
    setIssueLines(issueLines.filter((_, i) => i !== index));
  };


  const handleIssueLineChange = (index: number, field: keyof GoodsIssueLineRequest, value: string | number) => {
    const updated = [...issueLines];
    updated[index] = { ...updated[index], [field]: value };
    setIssueLines(updated);
    // Clear error for this field
    if (errors[`issueLine_${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`issueLine_${index}_${field}`];
      setErrors(newErrors);
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

  const itemOptions = availableItems.map((item) => ({
    value: item.itemCode,
    label: `${item.itemName || item.itemName || `Item #${item.itemCode}`} (${item.itemCode})`,
  }));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل معاملة الإصدار' : 'معاملة إصدار جديدة'}
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
                  label="طلب بواسطة"
                  value={formData.requestedBy || 0}
                  onChange={(val: string | number) => setFormData({ ...formData, requestedBy: val as number })}
                  options={[{ value: 0, label: 'اختر الموظف' }, ...employeeOptions]}
                  error={!!errors.requestedBy}
                  helperText={errors.requestedBy || (isEdit ? 'لا يمكن تغييره بعد الإنشاء (مسار التدقيق)' : undefined)}
                  required
                  disabled={isEdit}
                />
              </SmartField>
            </SmartRow>
          </Box>

          {/* Issue Lines Section */}
          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.2s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
                بنود الإصدار
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={handleAddIssueLine}
                disabled={loadingItems || !formData.storeCode}
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

            {errors.issueLines && (
              <Typography variant="body2" sx={{ color: '#DC2626', mb: 1, fontSize: '12px' }}>
                {errors.issueLines}
              </Typography>
            )}

            {!formData.storeCode && (
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
                  يرجى اختيار مستودع أولاً لإضافة العناصر
                </Typography>
              </Box>
            )}

            {formData.storeCode && issueLines.length === 0 && (
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
            )}

            {formData.storeCode && issueLines.length > 0 && (
              <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB' }}>العنصر</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', minWidth: 120 }}>المتاح</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', minWidth: 100 }}>الكمية</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', minWidth: 150 }}>ملاحظات</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: '#F9FAFB', width: 60 }}>الإجراء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {issueLines.map((line, index) => {
                      const availableQty = line.itemCode ? getAvailableQuantity(line.itemCode) : 0;
                      const isOverIssue = line.quantity > availableQty;
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ minWidth: 200 }}>
                              <AnimatedSelect
                                value={line.itemCode || 0}

                                onChange={(val: string | number) => handleIssueLineChange(index, 'itemCode', Number(val))}
                                label="العنصر"
                                options={[{ value: 0, label: 'اختر العنصر' }, ...itemOptions]}
                                error={!!errors[`issueLine_${index}_item`]}
                                helperText={errors[`issueLine_${index}_item`]}
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
                                onChange={(val: number | string) => handleIssueLineChange(index, 'quantity', val === '' ? 0 : Number(val))}
                                error={!!errors[`issueLine_${index}_quantity`] || isOverIssue}
                                helperText={errors[`issueLine_${index}_quantity`] || (isOverIssue ? `يتجاوز المتاح: ${availableQty}` : '')}
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
                                onChange={(val: string) => handleIssueLineChange(index, 'notes', val)}
                                fullWidth
                                label=""
                                placeholder="ملاحظات اختيارية"
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveIssueLine(index)}
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

