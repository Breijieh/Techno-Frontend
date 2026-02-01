'use client';

import { useState, useEffect } from 'react';
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
  AnimatedAutocomplete,
  AnimatedDatePicker,
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import { employeesApi, type EmployeeResponse as Employee } from '@/lib/api/employees';
import { loansApi } from '@/lib/api/loans';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface PostponementRequest {
  requestId: number;
  employeeId: number;
  loanId: number;
  installmentId?: number; // Added for backend submission
  originalMonth: string;
  newMonth: string;
  reason: string;
  status: string;
  requestDate: Date;
}

interface InstallmentPostponementFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<PostponementRequest>) => Promise<void>;
  initialData?: PostponementRequest | null;
  loading?: boolean;
}

export default function InstallmentPostponementForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: InstallmentPostponementFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<PostponementRequest>>({
    employeeId: 0,
    loanId: 0,
    originalMonth: '',
    newMonth: '',
    reason: '',
    status: 'NEW',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableLoans, setAvailableLoans] = useState<Array<{ value: number; label: string }>>([]);
  const [availableInstallments, setAvailableInstallments] = useState<Array<{ value: number; label: string; dueDate: string }>>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<number | null>(null);

  // Fetch employees when form opens
  useEffect(() => {
    if (open && employees.length === 0) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setLoadingEmployees(true);
        employeesApi.searchEmployees({
          contractType: 'TECHNO',
          status: 'ACTIVE',
          page: 0,
          size: 1000
        })
          .then((response) => {
            setEmployees((response as unknown as { employees?: Employee[] }).employees || (response as unknown as { content?: Employee[] }).content || []);
          })
          .catch((error) => {
            console.error('Failed to fetch employees:', error);
          })
          .finally(() => {
            setLoadingEmployees(false);
          });
      }, 0);
    }
  }, [open, employees.length]);

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          employeeId: initialData.employeeId,
          loanId: initialData.loanId,
          installmentId: initialData.installmentId,
          originalMonth: initialData.originalMonth,
          newMonth: initialData.newMonth,
          reason: initialData.reason,
          status: initialData.status,
        });
      } else {
        setFormData({
          employeeId: 0,
          loanId: 0,
          installmentId: undefined,
          originalMonth: '',
          newMonth: '',
          reason: '',
          status: 'NEW',
        });
        setSelectedInstallment(null);
      }
      setErrors({});
      setAvailableLoans([]);
      setAvailableInstallments([]);
    }, 0);
  }, [initialData, open]);

  // Fetch loans when employee changes
  useEffect(() => {
    if (formData.employeeId && open) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setLoadingLoans(true);
        setAvailableLoans([]);
        setFormData((prev) => ({ ...prev, loanId: 0, installmentId: undefined }));
        setAvailableInstallments([]);
        setSelectedInstallment(null);

        loansApi.getAllLoans({
          employeeNo: formData.employeeId,
          status: 'A', // Only approved loans
          page: 0,
          size: 100,
        })
          .then((response) => {
            // Filter for active loans only
            const activeLoans = response.content.filter(loan => loan.isActive === 'Y');
            const loanOptions = activeLoans.map((loan) => ({
              value: loan.loanId,
              label: `القرض #${loan.loanId} - ر.س ${formatNumber(Number(loan.loanAmount))}`,
            }));
            setAvailableLoans(loanOptions);
          })
          .catch((error) => {
            console.error('Failed to fetch loans:', error);
            setAvailableLoans([]);
          })
          .finally(() => {
            setLoadingLoans(false);
          });
      }, 0);
    } else {
      setTimeout(() => {
        setAvailableLoans([]);
        setAvailableInstallments([]);
        setSelectedInstallment(null);
      }, 0);
    }
  }, [formData.employeeId, open]);

  // Fetch installments when loan changes
  useEffect(() => {
    if (formData.loanId && open) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setLoadingInstallments(true);
        setAvailableInstallments([]);
        setFormData((prev) => ({ ...prev, installmentId: undefined }));
        setSelectedInstallment(null);

        if (!formData.loanId) {
          setLoadingInstallments(false);
          return;
        }

        loansApi.getUnpaidInstallments(formData.loanId)
          .then((installments) => {
            const installmentOptions = installments.map((inst) => {
              const dueDate = new Date(inst.dueDate);
              const monthStr = `${dueDate.toLocaleDateString('ar-SA', { month: 'long' })} ${dueDate.getFullYear()}`;
              return {
                value: inst.installmentId,
                label: `القسط #${inst.installmentNo} - ${monthStr} - ر.س ${formatNumber(Number(inst.installmentAmount))}`,
                dueDate: inst.dueDate,
              };
            });
            setAvailableInstallments(installmentOptions);
          })
          .catch((error) => {
            console.error('Failed to fetch installments:', error);
            setAvailableInstallments([]);
          })
          .finally(() => {
            setLoadingInstallments(false);
          });
      }, 0);
    } else {
      setTimeout(() => {
        setAvailableInstallments([]);
        setSelectedInstallment(null);
      }, 0);
    }
  }, [formData.loanId, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) newErrors.employeeId = 'الموظف مطلوب';
    if (!formData.loanId) newErrors.loanId = 'القرض مطلوب';
    if (!selectedInstallment) newErrors.installmentId = 'القسط مطلوب';
    if (!formData.newMonth?.trim()) newErrors.newMonth = 'الشهر الجديد مطلوب';

    // Validate new month is after original month (from selected installment)
    if (selectedInstallment && formData.newMonth) {
      const selectedInst = availableInstallments.find(inst => inst.value === selectedInstallment);
      if (selectedInst) {
        const originalDate = new Date(selectedInst.dueDate);
        const [newYear, newMonth] = formData.newMonth.split('-').map(Number);
        const newDate = new Date(newYear, newMonth - 1, 1);
        if (newDate <= originalDate) {
          newErrors.newMonth = 'يجب أن يكون الشهر الجديد بعد تاريخ استحقاق القسط الأصلي';
        }
      }
    }

    if (!formData.reason?.trim()) newErrors.reason = 'السبب مطلوب';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!selectedInstallment) {
      setErrors((prev) => ({ ...prev, installmentId: 'القسط مطلوب' }));
      return;
    }

    const submitData: Partial<PostponementRequest> = {
      ...formData,
      installmentId: selectedInstallment,
      // originalMonth will be derived from the selected installment's dueDate
      requestDate: new Date(),
    };

    await onSubmit(submitData);
  };

  const employeeOptions = employees.map((emp) => ({
    value: emp.employeeNo,
    label: `${emp.employeeName || emp.employeeName || 'غير معروف'} (${emp.employeeNo})`,
  }));

  // Helper to format month string from date
  const formatMonthString = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Helper to parse month string to date (first day of month)
  const parseMonthString = (monthStr: string): Date | null => {
    if (!monthStr) return null;
    const [year, month] = monthStr.split('-').map(Number);
    if (!year || !month) return null;
    return new Date(year, month - 1, 1);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل طلب تأجيل القسط' : 'طلب تأجيل قسط جديد'}
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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            padding: '8px 0',
          }}
        >
          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.1s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedAutocomplete
              label="الموظف"
              value={employeeOptions.find(opt => opt.value === (formData.employeeId || 0)) || null}
              onChange={(val) => {
                const option = val as { value: number; label: string } | null;
                const newValue = option?.value || 0;
                setFormData({ ...formData, employeeId: newValue, loanId: 0, installmentId: undefined });
              }}
              options={loadingEmployees ? [] : employeeOptions}
              getOptionLabel={(opt) => (opt as { label: string }).label}
              error={!!errors.employeeId}
              helperText={errors.employeeId}
              required
              disabled={loadingEmployees}
            />
          </Box>

          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.15s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedSelect
              label="القرض"
              value={formData.loanId || 0}
              onChange={(val) => {
                setFormData({ ...formData, loanId: val as number, installmentId: undefined });
                setSelectedInstallment(null);
              }}
              options={[{ value: 0, label: loadingLoans ? 'جارٍ التحميل...' : 'اختر القرض' }, ...availableLoans]}
              error={!!errors.loanId}
              helperText={errors.loanId || (availableLoans.length === 0 && formData.employeeId && !loadingLoans ? 'لا توجد قروض نشطة لهذا الموظف' : '')}
              required
              disabled={!formData.employeeId || loadingLoans}
            />
          </Box>

          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.2s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedSelect
              label="القسط"
              value={selectedInstallment || 0}
              onChange={(val) => {
                const instId = val as number;
                setSelectedInstallment(instId);
                const selectedInst = availableInstallments.find(inst => inst.value === instId);
                if (selectedInst) {
                  const dueDate = new Date(selectedInst.dueDate);
                  const originalMonth = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
                  setFormData({ ...formData, installmentId: instId, originalMonth });
                }
              }}
              options={[{ value: 0, label: loadingInstallments ? 'جارٍ التحميل...' : 'اختر القسط' }, ...availableInstallments]}
              error={!!errors.installmentId}
              helperText={errors.installmentId || (availableInstallments.length === 0 && formData.loanId && !loadingInstallments ? 'لا توجد أقساط غير مدفوعة لهذا القرض' : '')}
              required
              disabled={!formData.loanId || loadingInstallments}
            />
          </Box>

          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.25s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedDatePicker
              label="الشهر الجديد"
              value={parseMonthString(formData.newMonth || '')}
              onChange={(val) => setFormData({ ...formData, newMonth: formatMonthString(val) })}
              error={!!errors.newMonth}
              helperText={errors.newMonth}
              required
              views={['year', 'month']}
              format="MM/yyyy"
              minDate={selectedInstallment ? (() => {
                const selectedInst = availableInstallments.find(inst => inst.value === selectedInstallment);
                if (selectedInst) {
                  const dueDate = new Date(selectedInst.dueDate);
                  // Set min date to the month after the original due date
                  return new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 1);
                }
                return undefined;
              })() : undefined}
              disabled={!selectedInstallment}
            />
          </Box>

          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.25s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedTextField
              label="السبب"
              value={formData.reason || ''}
              onChange={(val) => setFormData({ ...formData, reason: val })}
              error={!!errors.reason}
              helperText={errors.reason}
              required
              multiline
              rows={4}
            />
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

