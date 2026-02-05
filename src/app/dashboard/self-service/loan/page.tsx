'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack,
  Send,
  AttachMoney,
  Download,
} from '@mui/icons-material';
import useRouteProtection from '@/hooks/useRouteProtection';
import { SELF_SERVICE_ALLOWED_ROLES } from '@/lib/permissions';
import { loansApi, employeesApi } from '@/lib/api';
import type { LoanDetailsResponse, InstallmentDetailsResponse } from '@/lib/api/loans';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDate } from '@/lib/utils/dateFormatter';

export default function LoanRequestPage() {
  const router = useRouter();
  const toast = useToast();

  useRouteProtection(SELF_SERVICE_ALLOWED_ROLES);

  // Form state
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [numberOfInstallments, setNumberOfInstallments] = useState<string>('');
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanDetailsResponse | null>(null);
  const [loanDetailsOpen, setLoanDetailsOpen] = useState(false);
  const [installments, setInstallments] = useState<InstallmentDetailsResponse[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Get current user's employee data from API using /me endpoint
  const { data: employeeResponse, loading: loadingEmployee, error: employeeError } = useApi(
    () => employeesApi.getMyEmployee(),
    { immediate: true }
  );

  // Extract employeeNo from employee response
  const employeeNo = employeeResponse?.employeeNo;

  // Get current user's loan requests
  const { data: myLoanRequestsData, execute: loadLoans } = useApi(
    () => loansApi.getMyLoans(),
    { immediate: false }
  );

  // Ensure myLoanRequests is always an array (handle null/undefined from API)
  const myLoanRequests = useMemo(() => {
    if (!Array.isArray(myLoanRequestsData)) return [];

    return myLoanRequestsData.map(loan => ({
      loanId: loan.loanId,
      employeeId: loan.employeeNo,
      loanAmount: typeof loan.loanAmount === 'string' ? parseFloat(loan.loanAmount) : loan.loanAmount,
      numberOfInstallments: loan.noOfInstallments,
      firstPaymentDate: new Date(loan.firstInstallmentDate).toISOString(),
      remainingBalance: typeof loan.remainingBalance === 'string' ? parseFloat(loan.remainingBalance) : loan.remainingBalance,
      status: (loan.transStatus === 'A' ? 'APPROVED' : loan.transStatus === 'R' ? 'REJECTED' : 'INPROCESS') as 'APPROVED' | 'REJECTED' | 'INPROCESS',
      requestDate: new Date(loan.requestDate).toISOString(),
      paidCount: loan.paidInstallments,
      unpaidCount: loan.unpaidInstallments,
    }));
  }, [myLoanRequestsData]);

  // Load loan requests when employee data is loaded
  useEffect(() => {
    if (employeeResponse) {
      loadLoans();
    }
  }, [employeeResponse, loadLoans]);

  // Handle viewId from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const viewId = searchParams.get('viewId');
    if (viewId && myLoanRequests.length > 0) {
      const loan = myLoanRequests.find(l => l.loanId.toString() === viewId);
      if (loan) {
        // Use timeout to ensure state updates don't conflict
        setTimeout(() => {
          // Need to cast to match internal type expected by handleViewDetails which seems to be 'any' but uses LoanDetailsResponse props
          // The handleViewDetails expects an object that has loanId.
          // But setSelectedLoan expects LoanDetailsResponse. 
          // The mapped object above isn't exactly LoanDetailsResponse but has overlapping fields.
          // Let's rely on handleViewDetails implementation which fetches full details.
          handleViewDetails(loan);
        }, 100);
      }
    }
  }, [myLoanRequests]);

  // Get active loans (approved)
  const activeLoans = useMemo(() => {
    if (!Array.isArray(myLoanRequests)) return [];
    return myLoanRequests.filter(loan => loan.status === 'APPROVED');
  }, [myLoanRequests]);

  // Calculate total monthly deduction from active loans
  const totalMonthlyDeduction = useMemo(() => {
    return activeLoans.reduce((total, loan) => {
      const installmentAmount = loan.loanAmount / loan.numberOfInstallments;
      return total + installmentAmount;
    }, 0);
  }, [activeLoans]);

  // Calculate monthly deduction for new loan
  const newLoanMonthlyDeduction = useMemo(() => {
    if (!loanAmount || !numberOfInstallments) return 0;
    const amount = parseFloat(loanAmount);
    const installments = parseInt(numberOfInstallments);
    if (isNaN(amount) || isNaN(installments) || installments === 0) return 0;
    // Matching backend BigDecimal rounding logic: .divide(..., 4, RoundingMode.HALF_UP)
    // For estimation in UI, we can show 2 decimals but use precise division
    return amount / installments;
  }, [loanAmount, numberOfInstallments]);

  // Calculate total monthly deduction if new loan is approved
  const totalMonthlyDeductionWithNew = useMemo(() => {
    return totalMonthlyDeduction + newLoanMonthlyDeduction;
  }, [totalMonthlyDeduction, newLoanMonthlyDeduction]);

  // Calculate maximum allowed monthly deduction (30% of salary)
  const maxMonthlyDeduction = useMemo(() => {
    if (!employeeResponse) return 0;
    return (employeeResponse.monthlySalary || 0) * 0.3;
  }, [employeeResponse]);

  // Check service duration (6 months minimum)
  const serviceDurationMonths = useMemo(() => {
    if (!employeeResponse?.hireDate) return 0;
    const hireDate = new Date(employeeResponse.hireDate);
    const today = new Date();
    const months = (today.getFullYear() - hireDate.getFullYear()) * 12 + (today.getMonth() - hireDate.getMonth());
    return months;
  }, [employeeResponse]);

  // Get contract months (for max installments)
  const contractMonths = useMemo(() => {
    if (!employeeResponse?.hireDate) return 12;
    if (!employeeResponse?.terminationDate) return 12;
    const hireDate = new Date(employeeResponse.hireDate);
    const terminationDate = new Date(employeeResponse.terminationDate);
    const months = (terminationDate.getFullYear() - hireDate.getFullYear()) * 12 + (terminationDate.getMonth() - hireDate.getMonth());
    return Math.max(months, 1);
  }, [employeeResponse]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!loanAmount) {
      newErrors.loanAmount = 'مبلغ السلفة مطلوب';
    } else {
      const amount = parseFloat(loanAmount);
      const maxAllowedAmount = (employeeResponse?.monthlySalary || 0) * 12;
      if (isNaN(amount) || amount <= 0) {
        newErrors.loanAmount = 'مبلغ السلفة يجب أن يكون أكبر من 0';
      } else if (amount > maxAllowedAmount) {
        newErrors.loanAmount = `مبلغ السلفة يتجاوز الحد الأقصى المسموح به (${maxAllowedAmount.toLocaleString()} ريال - 12 شهر راتب)`;
      }
    }

    if (!numberOfInstallments) {
      newErrors.numberOfInstallments = 'عدد الأقساط مطلوب';
    } else {
      const installments = parseInt(numberOfInstallments);
      const maxInsts = Math.min(60, contractMonths);
      if (isNaN(installments) || installments < 3) {
        newErrors.numberOfInstallments = 'عدد الأقساط يجب أن يكون 3 على الأقل';
      } else if (installments > maxInsts) {
        newErrors.numberOfInstallments = `عدد الأقساط لا يمكن أن يتجاوز ${maxInsts} قسط (${maxInsts === 60 ? 'الحد الأقصى للنظام' : 'أشهر العقد'})`;
      }
    }

    if (!firstPaymentDate) {
      newErrors.firstPaymentDate = 'تاريخ الدفعة الأولى مطلوب';
    } else {
      const selectedDate = new Date(firstPaymentDate);
      const minDate = new Date();
      minDate.setMonth(minDate.getMonth() + 1);
      // Reset hours for comparison
      minDate.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < minDate) {
        newErrors.firstPaymentDate = 'يجب أن يكون تاريخ القسط الأول بعد شهر واحد على الأقل من الآن';
      }
    }

    if (employeeResponse?.employmentStatus !== 'ACTIVE') {
      newErrors.general = 'يجب أن يكون الموظف على رأس العمل ليتمكن من طلب سلفة.';
    }

    const hasActiveLoan = myLoanRequests.some(loan => loan.status === 'APPROVED' && loan.remainingBalance > 0);
    if (hasActiveLoan) {
      newErrors.general = 'يوجد لديك سلفة نشطة حالياً. لا يمكن تقديم طلب جديد.';
    }

    if (serviceDurationMonths < 6) {
      newErrors.serviceDuration = `مدة الخدمة الدنيا هي 6 أشهر. خدمتك: ${serviceDurationMonths} شهراً`;
    }

    if (totalMonthlyDeductionWithNew > maxMonthlyDeduction) {
      newErrors.monthlyDeduction = `إجمالي الخصم الشهري (${totalMonthlyDeductionWithNew.toFixed(2)} ريال) يتجاوز 30% من الراتب (${maxMonthlyDeduction.toFixed(2)} ريال)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm() || !employeeNo) return;

    setIsSubmitting(true);
    try {
      await loansApi.submitLoanRequest({
        employeeNo: employeeNo,
        loanAmount: parseFloat(loanAmount),
        noOfInstallments: parseInt(numberOfInstallments),
        firstInstallmentDate: firstPaymentDate,
      });

      setSubmitSuccess(true);

      // Reset form
      setLoanAmount('');
      setNumberOfInstallments('');
      setFirstPaymentDate('');
      setReason('');
      setErrors({});
      loadLoans();
    } catch (error) {
      console.error('Error submitting loan request:', error);
      setErrors({
        general: error instanceof Error ? error.message : 'فشل إرسال طلب السلفة',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadContract = async (loanId: number) => {
    try {
      toast.showSuccess('جارٍ تحميل عقد السلفة...');
      const blob = await loansApi.downloadLoanContract(loanId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Loan_Contract_${loanId}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading contract:', error);
      toast.showError('فشل تحميل عقد السلفة. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleViewDetails = async (loan: any) => {
    setSelectedLoan(loan as unknown as LoanDetailsResponse);
    setLoanDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const data = await loansApi.getLoanInstallments(loan.loanId);
      setInstallments(data.installments || []);
    } catch (error) {
      console.error('Error fetching loan installments:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'APPROVED':
      case 'A':
        return { bg: '#D1FAE5', text: '#065F46', label: 'معتمد' };
      case 'REJECTED':
      case 'R':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'مرفوض' };
      case 'INPROCESS':
      case 'N':
      case 'NEW':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'قيد الانتظار' };
      default:
        return { bg: '#FEF3C7', text: '#92400E', label: status };
    }
  };

  const LoanDetailsDialog = () => (
    <Dialog
      open={loanDetailsOpen}
      onClose={() => setLoanDetailsOpen(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '16px' }
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        تفاصيل السلفة - {selectedLoan?.loanAmount?.toLocaleString()} ريال
      </DialogTitle>
      <DialogContent dividers>
        {loadingDetails ? (
          <Box sx={{ py: 4 }}><LoadingSpinner /></Box>
        ) : (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">الحالة</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedLoan?.transStatus === 'A' ? 'معتمد' : selectedLoan?.transStatus === 'R' ? 'مرفوض' : 'قيد الانتظار'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">الرصيد المتبقي</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedLoan?.remainingBalance?.toLocaleString()} SAR
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">الأقساط</Typography>
                <Typography variant="body2">
                  {selectedLoan?.paidInstallments} / {selectedLoan?.noOfInstallments} مدفوع
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">الدفعة الأولى</Typography>
                <Typography variant="body2">
                  {selectedLoan?.firstInstallmentDate ? formatDate(selectedLoan.firstInstallmentDate) : 'غير متاح'}
                </Typography>
              </Box>
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>جدول الأقساط</Typography>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#F9FAFB' }}>
                <TableRow>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>الرقم</TableCell>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>تاريخ الاستحقاق</TableCell>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>المبلغ</TableCell>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {installments.map((inst: InstallmentDetailsResponse) => (
                  <TableRow key={inst.installmentId}>
                    <TableCell sx={{ fontSize: '12px' }}>{inst.installmentNo}</TableCell>
                    <TableCell sx={{ fontSize: '12px' }}>
                      {formatDate(inst.dueDate)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '12px' }}>
                      {inst.installmentAmount?.toLocaleString()} SAR
                    </TableCell>
                    <TableCell sx={{ fontSize: '12px' }}>
                      <Chip
                        label={inst.paymentStatus}
                        size="small"
                        variant="outlined"
                        color={inst.paymentStatus === 'PAID' ? 'success' : 'warning'}
                        sx={{ height: '20px', fontSize: '10px' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {installments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 2, color: 'text.secondary', fontSize: '12px' }}>
                      سيتم إنشاء الجدول بعد الموافقة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setLoanDetailsOpen(false)} sx={{ textTransform: 'none' }}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );

  const LoanSuccessDialog = () => (
    <Dialog open={submitSuccess} onClose={() => setSubmitSuccess(false)}>
      <DialogTitle>تم إرسال طلب السلفة</DialogTitle>
      <DialogContent>
        <Typography>
          تم إرسال طلب السلفة بنجاح. سيتم مراجعته من قبل مدير الموارد البشرية ومدير المالية.
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
            {employeeError ? `خطأ في تحميل بيانات الموظف: ${employeeError}` : 'سجل الموظف غير موجود. يرجى الاتصال بالدعم.'}
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
              تقديم طلب سلفة
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              التقدم بطلب سلفة راتب مع جدولة الأقساط
            </Typography>
          </Box>
        </Box>

        {/* Loan Information Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Paper
            sx={{
              padding: 2,
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
              color: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '12px', opacity: 0.9, mb: 0.5 }}>
              الراتب الشهري
            </Typography>
            <Typography sx={{ fontSize: '20px', fontWeight: 700 }}>
              {(employeeResponse?.monthlySalary || 0).toLocaleString()} SAR
            </Typography>
          </Paper>

          <Paper
            sx={{
              padding: 2,
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '12px', opacity: 0.9, mb: 0.5 }}>
              الحد الأقصى للخصم الشهري (30%)
            </Typography>
            <Typography sx={{ fontSize: '20px', fontWeight: 700 }}>
              {maxMonthlyDeduction.toFixed(2)} SAR
            </Typography>
          </Paper>

          <Paper
            sx={{
              padding: 2,
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '12px', opacity: 0.9, mb: 0.5 }}>
              الخصم الشهري الحالي
            </Typography>
            <Typography sx={{ fontSize: '20px', fontWeight: 700 }}>
              {totalMonthlyDeduction.toFixed(2)} SAR
            </Typography>
          </Paper>

          <Paper
            sx={{
              padding: 2,
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              color: '#FFFFFF',
            }}
          >
            <Typography sx={{ fontSize: '12px', opacity: 0.9, mb: 0.5 }}>
              مدة الخدمة
            </Typography>
            <Typography sx={{ fontSize: '20px', fontWeight: 700 }}>
              {serviceDurationMonths} شهراً
            </Typography>
          </Paper>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
            gap: 3,
          }}
        >
          {/* Loan Request Form */}
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
              نموذج طلب سلفة
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {errors.general && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.general}
                </Alert>
              )}
              {serviceDurationMonths < 6 && (
                <Alert severity="warning">
                  مدة الخدمة الدنيا هي 6 أشهر. خدمتك: {serviceDurationMonths} شهراً
                </Alert>
              )}

              <TextField
                label="مبلغ السلفة (ريال)"
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                error={!!errors.loanAmount}
                helperText={errors.loanAmount}
                fullWidth
                required
                InputProps={{
                  startAdornment: <AttachMoney sx={{ mr: 1, color: '#6B7280' }} />,
                }}
              />

              <TextField
                label="عدد الأقساط"
                type="number"
                value={numberOfInstallments}
                onChange={(e) => setNumberOfInstallments(e.target.value)}
                error={!!errors.numberOfInstallments}
                helperText={errors.numberOfInstallments || `الحد الأقصى: ${contractMonths} قسط (أشهر العقد)`}
                fullWidth
                required
                inputProps={{ min: 3, max: contractMonths }}
              />

              <TextField
                label="تاريخ الدفعة الأولى"
                type="date"
                value={firstPaymentDate}
                onChange={(e) => setFirstPaymentDate(e.target.value)}
                error={!!errors.firstPaymentDate}
                helperText={errors.firstPaymentDate}
                required
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              <Paper
                sx={{
                  padding: 2,
                  backgroundColor: '#F3F4F6',
                  borderRadius: '8px',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                    مبلغ القسط الشهري
                  </Typography>
                  <Typography sx={{ fontSize: '20px', fontWeight: 600, color: '#0c2b7a' }}>
                    {newLoanMonthlyDeduction.toFixed(2)} SAR
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                    إجمالي الخصم الشهري (مع السلفة الجديدة)
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: totalMonthlyDeductionWithNew > maxMonthlyDeduction ? '#DC2626' : '#059669',
                    }}
                  >
                    {totalMonthlyDeductionWithNew.toFixed(2)} SAR
                  </Typography>
                </Box>
                {errors.monthlyDeduction && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {errors.monthlyDeduction}
                  </Alert>
                )}
              </Paper>

              <TextField
                label="السبب (اختياري)"
                multiline
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="قدم سبب طلب السلفة..."
                fullWidth
              />

              <Button
                variant="contained"
                size="large"
                startIcon={<Send />}
                onClick={handleSubmit}
                disabled={isSubmitting || serviceDurationMonths < 6}
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
                {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال طلب السلفة'}
              </Button>
            </Box>
          </Paper>

          {/* My Loan Requests */}
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
              طلبات السلف الخاصة بي
            </Typography>

            {myLoanRequests.length === 0 ? (
              <Typography sx={{ fontSize: '14px', color: '#6B7280', fontStyle: 'italic', textAlign: 'center', py: 4 }}>
                لا توجد طلبات سلف حتى الآن
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {myLoanRequests.map((request) => {
                  const colors = getStatusColor(request.status);
                  const paidInstallments = request.paidCount || 0;
                  const monthlyInstallment = request.loanAmount / request.numberOfInstallments;

                  return (
                    <Paper
                      key={request.loanId}
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
                            {request.loanAmount.toLocaleString()} SAR
                          </Typography>
                          <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                            {request.numberOfInstallments} أقساط × {monthlyInstallment.toFixed(2)} ريال/شهر
                          </Typography>
                          <Typography sx={{ fontSize: '12px', color: '#6B7280', mt: 0.5 }}>
                            المتبقي: {request.remainingBalance.toLocaleString()} ريال
                          </Typography>
                          {request.status === 'APPROVED' && (
                            <Typography sx={{ fontSize: '12px', color: '#059669', mt: 0.5 }}>
                              مدفوع: {paidInstallments}/{request.numberOfInstallments}
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                        <Typography sx={{ fontSize: '11px', color: '#9CA3AF' }}>
                          تاريخ الطلب: {formatDate(request.requestDate)}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewDetails(request)}
                          sx={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            textTransform: 'none',
                            borderRadius: '4px'
                          }}
                        >
                          التفاصيل
                        </Button>
                        {request.status === 'APPROVED' && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Download />}
                            onClick={() => handleDownloadContract(request.loanId)}
                            sx={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              textTransform: 'none',
                              borderRadius: '4px',
                              ml: 1
                            }}
                          >
                            تحميل العقد
                          </Button>
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
      <LoanDetailsDialog />
      <LoanSuccessDialog />
    </Box>
  );
}
