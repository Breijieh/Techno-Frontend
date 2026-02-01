'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  Send,
} from '@mui/icons-material';
import useRouteProtection from '@/hooks/useRouteProtection';
import { loansApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';

import type { PostponementDetailsResponse } from '@/lib/api/loans';

import { formatDate } from '@/lib/utils/dateFormatter';

export default function InstallmentPostponePage() {
  const router = useRouter();

  // Protect route - only employees
  useRouteProtection(['Employee', 'Admin']);

  // Form state
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [originalMonth, setOriginalMonth] = useState<string>('');
  const [newMonth, setNewMonth] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Get current user's employee data from API using /me endpoint
  const { data: employeeResponse, loading: loadingEmployee, error: employeeError } = useApi(
    () => employeesApi.getMyEmployee(),
    { immediate: true }
  );

  // Extract employeeNo from employee response
  const employeeNo = employeeResponse?.employeeNo;

  // Get current user's loans
  const { data: allLoansData, execute: loadLoans } = useApi(
    () => loansApi.getMyLoans(),
    { immediate: false }
  );

  // Ensure allLoans is always an array (handle null/undefined from API)
  const allLoans = useMemo(() => {
    return Array.isArray(allLoansData) ? allLoansData : [];
  }, [allLoansData]);

  const activeLoans = useMemo(() => {
    if (!Array.isArray(allLoans)) return [];
    return allLoans.filter(loan => loan.transStatus === 'A');
  }, [allLoans]);

  // Get unpaid installments for selected loan using the specific API endpoint
  const { data: unpaidInstallmentsData, execute: loadInstallments } = useApi(
    () => loansApi.getUnpaidInstallments(parseInt(selectedLoanId) || 0),
    { immediate: false }
  );

  // Ensure selectedLoanInstallments is always an array
  const selectedLoanInstallments = useMemo(() => {
    return Array.isArray(unpaidInstallmentsData) ? unpaidInstallmentsData : [];
  }, [unpaidInstallmentsData]);

  // Load loans when employee data is loaded
  useEffect(() => {
    if (employeeResponse) {
      loadLoans();
    }
  }, [employeeResponse, loadLoans]);

  // Load installments when loan is selected
  useEffect(() => {
    if (selectedLoanId) {
      loadInstallments();
    }
  }, [selectedLoanId, loadInstallments]);

  // Get my postponement requests (real API call)
  const { data: myPostponementsData, execute: loadMyPostponements } = useApi(
    () => employeeNo ? loansApi.getAllPostponementRequests({
      employeeNo: employeeNo,
      size: 50,
      sortBy: 'requestDate',
      sortDirection: 'desc'
    }) : Promise.resolve({
      content: [],
      totalElements: 0,
      totalPages: 0,
      currentPage: 0,
      pageSize: 0,
      size: 0,
      number: 0,
      startDate: '',
      endDate: '',
      first: true,
      last: true,
      empty: true
    }), // Return empty PageResponse structure
    { immediate: false }
  );

  const myPostponements = useMemo(() => {
    // Handle PageResponse structure from backend
    if (myPostponementsData && 'content' in myPostponementsData) {
      return myPostponementsData.content;
    }
    return [];
  }, [myPostponementsData]);

  // Load postponements when employee data is loaded
  useEffect(() => {
    if (employeeNo) {
      loadMyPostponements();
    }
  }, [employeeNo, loadMyPostponements]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedLoanId) {
      newErrors.selectedLoanId = 'يرجى اختيار قرض';
    }

    if (!originalMonth) {
      newErrors.originalMonth = 'يرجى اختيار شهر القسط المؤجل';
    }

    if (!newMonth) {
      newErrors.newMonth = 'يرجى اختيار الشهر الجديد';
    }

    if (originalMonth && newMonth && originalMonth >= newMonth) {
      newErrors.newMonth = 'يجب أن يكون الشهر الجديد بعد الشهر الأصلي';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm() || !employeeNo) return;

    setIsSubmitting(true);
    try {
      // Find the installment number from the original month
      const installment = selectedLoanInstallments.find(inst => {
        const instMonth = new Date(inst.dueDate).toISOString().slice(0, 7);
        return instMonth === originalMonth;
      });

      if (!installment) {
        throw new Error('القسط غير موجود للشهر المحدد');
      }

      await loansApi.postponeInstallment({
        employeeNo: employeeNo,
        loanId: parseInt(selectedLoanId),
        installmentNo: installment.installmentNo,
        newDueDate: `${newMonth}-01`, // First day of the new month
        reason: reason.trim(),
      });

      setSubmitSuccess(true);

      // Reset form
      setSelectedLoanId('');
      setOriginalMonth('');
      setNewMonth('');
      setReason('');
      setErrors({});

      // Reload installments and request history
      if (selectedLoanId) {
        loadInstallments();
      }
      loadMyPostponements();
    } catch (error) {
      console.error('Error submitting postponement request:', error);
      setErrors({
        general: error instanceof Error ? error.message : 'فشل إرسال طلب تأجيل القسط',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'A':
      case 'APPROVED':
        return { bg: '#D1FAE5', text: '#065F46', label: 'معتمد' };
      case 'R':
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'مرفوض' };
      case 'N':
      case 'NEW':
      case 'INPROCESS':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'قيد الانتظار' };
      default:
        return { bg: '#FEF3C7', text: '#92400E', label: status };
    }
  };

  // Format month for display
  const formatMonth = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return formatDate(date, 'MMMM yyyy');
  };

  const PostponeSuccessDialog = () => (
    <Dialog open={submitSuccess} onClose={() => setSubmitSuccess(false)}>
      <DialogTitle>تم إرسال طلب التأجيل بنجاح</DialogTitle>
      <DialogContent>
        <Typography>
          تم إرسال طلب تأجيل القسط بنجاح. سيتم مراجعته من قبل مدير الموارد البشرية ومدير المالية.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setSubmitSuccess(false); router.push('/dashboard'); }} sx={{ textTransform: 'none' }}>
          موافق
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Show loading state
  if (loadingEmployee) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#F8F9FC' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  // Show error state if employee data could not be loaded
  if (!loadingEmployee && (!employeeResponse || !employeeNo)) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#F8F9FC' }}>
        <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Alert severity="error">
            {employeeError ? `خطأ في تحميل بيانات الموظف: ${employeeError}` : 'سجل الموظف غير موجود. يرجى التواصل مع الدعم.'}
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F8F9FC',
      }}
    >
      <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/dashboard')}
            sx={{ textTransform: 'none' }}
          >
            رجوع
          </Button>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
              تأجيل القسط
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              طلب تأجيل قسط القرض إلى شهر آخر
            </Typography>
          </Box>
        </Box>

        {activeLoans.length === 0 ? (
          <Paper
            sx={{
              padding: 4,
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}
          >
            <Alert severity="info" sx={{ mb: 2 }}>
              لا توجد لديك قروض نشطة مع أقساط معلقة.
            </Alert>
            <Button
              variant="outlined"
              onClick={() => router.push('/dashboard/self-service/loan')}
              sx={{ textTransform: 'none' }}
            >
              تقديم طلب قرض
            </Button>
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
              gap: 3,
            }}
          >
            {/* Postponement Request Form */}
            <Paper
              sx={{
                padding: 4,
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                animation: 'fadeInUp 0.6s ease-out 0.2s both',
                '@keyframes fadeInUp': {
                  from: { opacity: 0, transform: 'translateY(20px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 3 }}>
                نموذج طلب تأجيل القسط
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  select
                  label="اختر القرض"
                  value={selectedLoanId}
                  onChange={(e) => {
                    setSelectedLoanId(e.target.value);
                    setOriginalMonth(''); // Reset when loan changes
                    setNewMonth('');
                  }}
                  error={!!errors.selectedLoanId}
                  helperText={errors.selectedLoanId}
                  fullWidth
                  required
                >
                  {activeLoans.map((loan) => {
                    // Installments will be loaded when loan is selected
                    const remainingBalance = loan.remainingBalance || 0;
                    const unpaidInstallments = loan.unpaidInstallments || 0;
                    return (
                      <MenuItem key={loan.loanId} value={loan.loanId.toString()}>
                        {loan.loanAmount.toLocaleString()} ر.س - {unpaidInstallments} أقساط معلقة - المتبقي: {remainingBalance.toLocaleString()} ر.س
                      </MenuItem>
                    );
                  })}
                </TextField>

                {selectedLoanId && selectedLoanInstallments.length > 0 && (
                  <>
                    <TextField
                      select
                      label="اختر القسط المؤجل"
                      value={originalMonth}
                      onChange={(e) => {
                        setOriginalMonth(e.target.value);
                        setNewMonth(''); // Reset new month when original changes
                      }}
                      error={!!errors.originalMonth}
                      helperText={errors.originalMonth}
                      fullWidth
                      required
                    >
                      {selectedLoanInstallments.map((inst) => {
                        const d = new Date(inst.dueDate);
                        // Ensure we have a valid date
                        if (isNaN(d.getTime())) return null;
                        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        return (
                          <MenuItem key={inst.installmentNo} value={monthStr}>
                            القسط #{inst.installmentNo} - {formatMonth(monthStr)} - {inst.installmentAmount.toLocaleString()} ر.س
                          </MenuItem>
                        );
                      })}
                    </TextField>

                    {originalMonth && (
                      <TextField
                        label="الشهر الجديد"
                        type="month"
                        value={newMonth}
                        onChange={(e) => setNewMonth(e.target.value)}
                        error={!!errors.newMonth}
                        helperText={errors.newMonth || 'اختر الشهر الجديد لهذا القسط'}
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                      />
                    )}

                    {originalMonth && newMonth && (
                      <Paper
                        sx={{
                          padding: 2,
                          backgroundColor: '#F3F4F6',
                          borderRadius: '8px',
                        }}
                      >
                        <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 1 }}>
                          ملخص التأجيل
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                            من
                          </Typography>
                          <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                            {formatMonth(originalMonth)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                            إلى
                          </Typography>
                          <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#0c2b7a' }}>
                            {formatMonth(newMonth)}
                          </Typography>
                        </Box>
                      </Paper>
                    )}
                  </>
                )}

                <TextField
                  label="السبب (اختياري)"
                  multiline
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="قدم سبباً لطلب التأجيل..."
                  fullWidth
                />

                <Alert severity="info">
                  سيتم مراجعة هذا الطلب من قبل مدير الموارد البشرية ومدير المالية. يمكنك تأجيل الأقساط عدة مرات إذا لزم الأمر.
                </Alert>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Send />}
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedLoanId || !originalMonth || !newMonth}
                  sx={{
                    background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
                    color: '#FFFFFF',
                    textTransform: 'none',
                    fontWeight: 600,
                    padding: '12px 24px',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
                    },
                    '&:disabled': {
                      background: '#9CA3AF',
                    },
                  }}
                >
                  {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال طلب التأجيل'}
                </Button>
              </Box>
            </Paper>

            {/* My Postponement Requests */}
            <Paper
              sx={{
                padding: 3,
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                animation: 'fadeInUp 0.6s ease-out 0.3s both',
                '@keyframes fadeInUp': {
                  from: { opacity: 0, transform: 'translateY(20px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
                maxHeight: '600px',
                overflow: 'auto',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 2 }}>
                طلبات تأجيل الأقساط الخاصة بي
              </Typography>

              {myPostponements.length === 0 ? (
                <Typography sx={{ fontSize: '14px', color: '#6B7280', fontStyle: 'italic', textAlign: 'center', py: 4 }}>
                  لا توجد طلبات تأجيل بعد
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {myPostponements.map((request: PostponementDetailsResponse) => {
                    const colors = getStatusColor(request.transStatus);
                    const loan = activeLoans.find(l => l.loanId === request.loanId);
                    return (
                      <Paper
                        key={request.requestId}
                        sx={{
                          padding: 2,
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827', mb: 0.5 }}>
                              القرض #{request.loanId} - {loan ? `${loan.loanAmount.toLocaleString()} ر.س` : 'غير متاح'}
                            </Typography>
                            <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                              من: {formatMonth(request.originalMonth)}
                            </Typography>
                            <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                              إلى: {formatMonth(request.newMonth)}
                            </Typography>
                            {request.postponementReason && (
                              <Typography sx={{ fontSize: '12px', color: '#6B7280', mt: 0.5, fontStyle: 'italic' }}>
                                {request.postponementReason}
                              </Typography>
                            )}
                          </Box>
                          <Chip
                            label={colors.label}
                            size="small"
                            sx={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                              fontWeight: 600,
                              fontSize: '11px',
                            }}
                          />
                        </Box>
                        <Typography sx={{ fontSize: '11px', color: '#9CA3AF', mt: 1 }}>
                          طلب في: {formatDate(request.requestDate)}
                        </Typography>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </Box>
      <PostponeSuccessDialog />
    </Box>
  );
}
