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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material';
import {
  ArrowBack,
  Send,
  MonetizationOn,
  TrendingUp,
} from '@mui/icons-material';
import useRouteProtection from '@/hooks/useRouteProtection';
import { SELF_SERVICE_ALLOWED_ROLES } from '@/lib/permissions';
import { allowancesApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';

type AllowanceType = 'Salary Increase';

import { formatDate } from '@/lib/utils/dateFormatter';

export default function AllowanceRequestPage() {
  const router = useRouter();
  useRouteProtection(SELF_SERVICE_ALLOWED_ROLES);

  // Form state
  const [allowanceType, setAllowanceType] = useState<AllowanceType>('Salary Increase');
  const [amountType, setAmountType] = useState<'amount' | 'percentage'>('amount');
  const [allowanceAmount, setAllowanceAmount] = useState<string>('');
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

  // Get employee's allowance requests
  const { data: myAllowanceRequestsData, execute: loadAllowances } = useApi(
    () => {
      if (!employeeNo || employeeNo === 0) {
        throw new Error('Employee number is required');
      }
      return allowancesApi.getEmployeeAllowances(employeeNo);
    },
    { immediate: false }
  );

  // Ensure myAllowanceRequests is always an array (handle null/undefined from API)
  const myAllowanceRequests = useMemo(() => {
    return Array.isArray(myAllowanceRequestsData) ? myAllowanceRequestsData : [];
  }, [myAllowanceRequestsData]);

  // Load allowance requests when employeeNo is available
  useEffect(() => {
    if (employeeNo && employeeNo !== 0) {
      loadAllowances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeNo]);

  // Calculate new salary if approved
  const newSalary = useMemo(() => {
    if (!employeeResponse || !allowanceAmount) return employeeResponse?.monthlySalary || 0;
    const amount = parseFloat(allowanceAmount);
    const currentSalary = employeeResponse.monthlySalary || 0;
    if (isNaN(amount)) return currentSalary;

    if (amountType === 'percentage') {
      return currentSalary * (1 + amount / 100);
    } else {
      return currentSalary + amount;
    }
  }, [employeeResponse, allowanceAmount, amountType]);

  // Calculate increase amount
  const increaseAmount = useMemo(() => {
    if (!employeeResponse || !allowanceAmount) return 0;
    const amount = parseFloat(allowanceAmount);
    const currentSalary = employeeResponse.monthlySalary || 0;
    if (isNaN(amount)) return 0;

    if (amountType === 'percentage') {
      return currentSalary * (amount / 100);
    } else {
      return amount;
    }
  }, [employeeResponse, allowanceAmount, amountType]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!allowanceAmount) {
      newErrors.allowanceAmount = 'مبلغ البدل مطلوب';
    } else {
      const amount = parseFloat(allowanceAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.allowanceAmount = 'يجب أن يكون مبلغ البدل أكبر من 0';
      }
      if (amountType === 'percentage' && amount > 100) {
        newErrors.allowanceAmount = 'لا يمكن أن تتجاوز النسبة 100%';
      }
    }

    if (!reason || reason.trim().length < 10) {
      newErrors.reason = 'السبب مطلوب ويجب أن يكون 10 أحرف على الأقل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm() || !employeeNo) return;

    setIsSubmitting(true);
    try {
      await allowancesApi.submitAllowanceRequest({
        employeeNo: employeeNo,
        typeCode: 10, // Salary Raise / Salary Increase
        transactionDate: new Date().toISOString().split('T')[0],
        amount: increaseAmount,
        notes: reason.trim(),
      });

      setSubmitSuccess(true);

      // Reset form
      setAllowanceType('Salary Increase');
      setAmountType('amount');
      setAllowanceAmount('');
      setReason('');
      setErrors({});

      // Refresh allowance requests
      if (employeeNo) {
        loadAllowances();
      }
    } catch (error) {
      console.error('Error submitting allowance request:', error);
      setErrors({
        general: error instanceof Error ? error.message : 'فشل إرسال طلب البدل',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'INPROCESS':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      default:
        return { bg: '#FEF3C7', text: '#92400E' };
    }
  };

  const AllowanceSuccessDialog = () => (
    <Dialog open={submitSuccess} onClose={() => setSubmitSuccess(false)}>
      <DialogTitle>تم إرسال طلب البدل</DialogTitle>
      <DialogContent>
        <Typography>
          تم إرسال طلب البدل بنجاح. سيتم مراجعته من قبل مدير الموارد البشرية ومدير المالية.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setSubmitSuccess(false); router.push('/dashboard'); }} sx={{ textTransform: 'none' }}>
          موافق
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Handle viewId from URL for scrolling
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const viewId = searchParams.get('viewId');
    if (viewId && myAllowanceRequests.length > 0) {
      // Find if the request exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exists = myAllowanceRequests.some((r: any) => (r.requestId || r.allowanceId)?.toString() === viewId);
      if (exists) {
        setTimeout(() => {
          const element = document.getElementById(`allowance-request-${viewId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.border = '2px solid #0c2b7a';
            element.style.boxShadow = '0 0 10px rgba(12, 43, 122, 0.2)';
          }
        }, 500); // Delay to allow rendering
      }
    }
  }, [myAllowanceRequests]);

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
              تقديم طلب بدل
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              طلب زيادة راتب من خلال سلسلة الموافقة
            </Typography>
          </Box>
        </Box>

        {/* Current Salary Card */}
        <Paper
          sx={{
            padding: 3,
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            mb: 3,
            background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
            color: '#FFFFFF',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 0.5 }}>
                الراتب الشهري الحالي
              </Typography>
              <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>
                {(employeeResponse?.monthlySalary || 0).toLocaleString('ar-SA')} ر.س
              </Typography>
            </Box>
            <MonetizationOn sx={{ fontSize: 48, opacity: 0.3 }} />
          </Box>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
            gap: 3,
          }}
        >
          {/* Allowance Request Form */}
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
              نموذج طلب البدل
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                select
                label="نوع البدل"
                value={allowanceType}
                onChange={(e) => setAllowanceType(e.target.value as AllowanceType)}
                fullWidth
                required
                disabled
              >
                <MenuItem value="Salary Increase">زيادة راتب</MenuItem>
              </TextField>

              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ mb: 1, color: '#111827', fontWeight: 500 }}>
                  نوع الزيادة
                </FormLabel>
                <RadioGroup
                  row
                  value={amountType}
                  onChange={(e) => {
                    setAmountType(e.target.value as 'amount' | 'percentage');
                    setAllowanceAmount(''); // Reset amount when type changes
                  }}
                >
                  <FormControlLabel value="amount" control={<Radio />} label="مبلغ ثابت (ر.س)" />
                  <FormControlLabel value="percentage" control={<Radio />} label="نسبة مئوية (%)" />
                </RadioGroup>
              </FormControl>

              <TextField
                label={amountType === 'amount' ? 'مبلغ الزيادة (ر.س)' : 'نسبة الزيادة (%)'}
                type="number"
                value={allowanceAmount}
                onChange={(e) => setAllowanceAmount(e.target.value)}
                error={!!errors.allowanceAmount}
                helperText={errors.allowanceAmount}
                fullWidth
                required
                InputProps={{
                  startAdornment: amountType === 'amount' ? (
                    <MonetizationOn sx={{ mr: 1, color: '#6B7280' }} />
                  ) : (
                    <TrendingUp sx={{ mr: 1, color: '#6B7280' }} />
                  ),
                  endAdornment: amountType === 'percentage' && '%',
                }}
              />

              <Paper
                sx={{
                  padding: 2,
                  backgroundColor: '#F3F4F6',
                  borderRadius: '8px',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 1 }}>
                  معاينة حساب الراتب
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                    الراتب الحالي
                  </Typography>
                  <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                    {(employeeResponse?.monthlySalary || 0).toLocaleString('ar-SA')} ر.س
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                    مبلغ الزيادة
                  </Typography>
                  <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#059669' }}>
                    +{increaseAmount.toFixed(2)} ر.س
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #D1D5DB' }}>
                  <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                    الراتب الجديد
                  </Typography>
                  <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#0c2b7a' }}>
                    {newSalary.toFixed(2)} ر.س
                  </Typography>
                </Box>
              </Paper>

              <TextField
                label="السبب (مطلوب)"
                multiline
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                error={!!errors.reason}
                helperText={errors.reason || 'يرجى تقديم سبب مفصل لطلب زيادة الراتب (10 أحرف على الأقل)'}
                placeholder="قدم سبباً مفصلاً لطلب البدل..."
                fullWidth
                required
              />

              <Alert severity="info">
                سيتم مراجعة هذا الطلب من قبل مدير الموارد البشرية ومدير المالية. عند الموافقة، سيتم تحديث راتبك تلقائياً.
              </Alert>

              <Button
                variant="contained"
                size="large"
                startIcon={<Send />}
                onClick={handleSubmit}
                disabled={isSubmitting}
                sx={{
                  background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 600,
                  padding: '12px 24px',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
                  },
                }}
              >
                {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال طلب البدل'}
              </Button>
            </Box>
          </Paper>

          {/* My Allowance Requests */}
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
              طلبات البدل الخاصة بي
            </Typography>

            {myAllowanceRequests.length === 0 ? (
              <Typography sx={{ fontSize: '14px', color: '#6B7280', fontStyle: 'italic', textAlign: 'center', py: 4 }}>
                لا توجد طلبات بدل بعد
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {myAllowanceRequests.map((request) => {
                  const colors = getStatusColor(request.status);
                  return (
                    <Paper
                      key={request.requestId}
                      id={`allowance-request-${request.requestId}`}
                      sx={{
                        padding: 2,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827', mb: 0.5 }}>
                            {request.allowanceType}
                          </Typography>
                          <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#059669', mb: 0.5 }}>
                            +{request.allowanceAmount.toLocaleString('ar-SA')} ر.س
                          </Typography>
                          {request.reason && (
                            <Typography sx={{ fontSize: '12px', color: '#6B7280', mt: 0.5, fontStyle: 'italic' }}>
                              {request.reason}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={request.status}
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
                        تاريخ الطلب: {formatDate(request.requestDate)}
                      </Typography>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
      <AllowanceSuccessDialog />
    </Box>
  );
}
