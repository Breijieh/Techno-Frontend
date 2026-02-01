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
  CalendarToday,
} from '@mui/icons-material';
import useRouteProtection from '@/hooks/useRouteProtection';
import { leavesApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { formatDate } from '@/lib/utils/dateFormatter';

type LeaveType = 'Annual' | 'Sick' | 'Emergency' | 'Unpaid' | 'Hajj' | 'Marriage' | 'Death' | 'Other';

export default function LeaveRequestPage() {
  const router = useRouter();
  // Protect route - only employees
  useRouteProtection(['Employee', 'Admin']);

  // Form state
  const [leaveType, setLeaveType] = useState<LeaveType>('Annual');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Get current user's employee data from API using /me endpoint
  const { data: employeeResponse, loading: loadingEmployee, error: employeeError } = useApi(
    () => employeesApi.getMyEmployee(),
    { immediate: true }
  );

  // Extract employeeNo from employee response
  const employeeNo = employeeResponse?.employeeNo;

  // Get employee's leave requests
  const { data: myLeaveRequestsData, execute: loadLeaves } = useApi(
    () => {
      if (!employeeNo || employeeNo === 0) {
        throw new Error('Employee number is required');
      }
      return leavesApi.getEmployeeLeaves(employeeNo);
    },
    { immediate: false }
  );

  // Ensure myLeaveRequests is always an array (handle null/undefined from API)
  const myLeaveRequests = useMemo(() => {
    return Array.isArray(myLeaveRequestsData) ? myLeaveRequestsData : [];
  }, [myLeaveRequestsData]);

  // Load leave requests when employeeNo is available
  useEffect(() => {
    if (employeeNo && employeeNo !== 0) {
      loadLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeNo]);

  // Calculate number of days
  const numberOfDays = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to < from) return 0;
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both days
    return diffDays;
  }, [fromDate, toDate]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!leaveType) {
      newErrors.leaveType = 'نوع الإجازة مطلوب';
    }

    if (!fromDate) {
      newErrors.fromDate = 'تاريخ البدء مطلوب';
    }

    if (!toDate) {
      newErrors.toDate = 'تاريخ الانتهاء مطلوب';
    }

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      if (to < from) {
        newErrors.toDate = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
      }
    }

    if (numberOfDays < 1) {
      newErrors.days = 'أقل مدة للإجازة هي يوم واحد';
    }

    if (leaveType === 'Annual' && employeeResponse) {
      const leaveBalance = employeeResponse.leaveBalanceDays || 0;
      if (numberOfDays > leaveBalance) {
        newErrors.days = `رصيد الإجازة غير كافٍ. المتاح: ${leaveBalance} يوم`;
      }
      if (numberOfDays > 30) {
        newErrors.days = 'أقصى إجازة سنوية لكل طلب هي 30 يوم';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit leave request with toast notifications
  const { loading: isSubmitting, execute: submitLeave } = useApiWithToast(
    (data: { employeeNo: number; leaveFromDate: string; leaveToDate: string; leaveReason: string }) =>
      leavesApi.submitLeaveRequest(data),
    {
      showSuccessToast: true,
      successMessage: 'تم إرسال طلب الإجازة بنجاح',
      showErrorToast: true,
      onSuccess: () => {
        setSubmitSuccess(true);
        // Reset form
        setLeaveType('Annual');
        setFromDate('');
        setToDate('');
        setReason('');
        setErrors({});
        // Redirect to approvals history after a short delay
        setTimeout(() => {
          router.push('/dashboard/approvals/history');
        }, 2000);
      },
    }
  );

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm() || !employeeNo) return;

    try {
      await submitLeave({
        employeeNo: employeeNo,
        leaveFromDate: fromDate,
        leaveToDate: toDate,
        leaveReason: reason || 'No reason provided',
      });
    } catch (error) {
      // Error is already handled by useApiWithToast
      console.error('Error submitting leave request:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'A':
      case 'APPROVED':
        return { bg: '#D1FAE5', text: '#065F46', label: 'موافق عليه' };
      case 'R':
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'مرفوض' };
      case 'N':
      case 'INPROCESS':
      case 'PENDING':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'قيد الانتظار' };
      default:
        return { bg: '#FEF3C7', text: '#92400E', label: status };
    }
  };

  // Handle viewId from URL for scrolling
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const viewId = searchParams.get('viewId');
    if (viewId && myLeaveRequests.length > 0) {
      // Find if the request exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exists = myLeaveRequests.some((r: any) => (r.leaveId || r.requestId)?.toString() === viewId);
      if (exists) {
        setTimeout(() => {
          const element = document.getElementById(`leave-request-${viewId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.border = '2px solid #0c2b7a';
            element.style.boxShadow = '0 0 10px rgba(12, 43, 122, 0.2)';
          }
        }, 500); // Delay to allow rendering
      }
    }
  }, [myLeaveRequests]);

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
          <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center', borderRadius: '16px' }}>
            <Typography variant="h6" color="error" gutterBottom sx={{ fontWeight: 600 }}>
              سجل الموظف مطلوب
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: '#4B5563' }}>
              {employeeError
                ? "واجهنا مشكلة في تحميل بيانات الموظف. يحدث هذا عادةً إذا لم يكن حساب المستخدم مرتبطًا بسجل موظف."
                : "حسابك غير مرتبط بسجل موظف. ميزات الخدمة الذاتية مثل طلبات الإجازة متاحة فقط للحسابات التي لديها رقم موظف نشط."}
            </Typography>
            <Box sx={{ p: 2, backgroundColor: '#FEF2F2', borderRadius: '8px', mb: 3 }}>
              <Typography variant="body2" color="error" sx={{ fontStyle: 'italic' }}>
                {employeeError || "رمز الخطأ: EMP_NOT_FOUND"}
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => router.push('/dashboard')}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              العودة إلى لوحة التحكم
            </Button>
          </Paper>
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
              تقديم طلب إجازة
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              طلب إجازة مع سير عمل الموافقة
            </Typography>
          </Box>
        </Box>

        {/* Leave Balance Card */}
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
                رصيد الإجازة السنوية
              </Typography>
              <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>
                {employeeResponse?.leaveBalanceDays || 0} يوم
              </Typography>
            </Box>
            <CalendarToday sx={{ fontSize: 48, opacity: 0.3 }} />
          </Box>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
            gap: 3,
          }}
        >
          {/* Leave Request Form */}
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
              نموذج طلب الإجازة
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                select
                label="نوع الإجازة"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                error={!!errors.leaveType}
                helperText={errors.leaveType}
                fullWidth
                required
              >
                <MenuItem value="Annual">إجازة سنوية</MenuItem>
                <MenuItem value="Sick">إجازة مرضية (تقرير طبي مطلوب)</MenuItem>
                <MenuItem value="Emergency">إجازة طارئة (خصم من الراتب)</MenuItem>
                <MenuItem value="Unpaid">إجازة بدون راتب (خصم من الراتب)</MenuItem>
                <MenuItem value="Hajj">إجازة حج (14 يوم، بدون خصم)</MenuItem>
                <MenuItem value="Marriage">إجازة زواج (3 أيام، بدون خصم)</MenuItem>
                <MenuItem value="Death">إجازة وفاة (حسب صلة القرابة، بدون خصم)</MenuItem>
                <MenuItem value="Other">أخرى (موافقة الإدارة مطلوبة)</MenuItem>
              </TextField>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                <TextField
                  label="تاريخ البدء"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  error={!!errors.fromDate}
                  helperText={errors.fromDate}
                  required
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="تاريخ الانتهاء"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  error={!!errors.toDate}
                  helperText={errors.toDate}
                  required
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>

              <Paper
                sx={{
                  padding: 2,
                  backgroundColor: '#F3F4F6',
                  borderRadius: '8px',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                    عدد الأيام
                  </Typography>
                  <Typography sx={{ fontSize: '20px', fontWeight: 600, color: '#0c2b7a' }}>
                    {numberOfDays} {numberOfDays === 1 ? 'يوم' : 'أيام'}
                  </Typography>
                </Box>
                {errors.days && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {errors.days}
                  </Alert>
                )}
              </Paper>

              <TextField
                label="السبب (اختياري)"
                multiline
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="أدخل سبب طلب الإجازة..."
                fullWidth
              />

              {(leaveType === 'Sick' || leaveType === 'Emergency' || leaveType === 'Unpaid') && (
                <Alert severity="info">
                  {leaveType === 'Sick' && 'تقرير طبي مطلوب للإجازة المرضية.'}
                  {(leaveType === 'Emergency' || leaveType === 'Unpaid') && 'سيتم خصم الراتب لهذا النوع من الإجازة.'}
                </Alert>
              )}

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
                {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال طلب الإجازة'}
              </Button>
            </Box>
          </Paper>

          {/* My Leave Requests */}
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
              طلبات الإجازة الخاصة بي
            </Typography>

            {myLeaveRequests.length === 0 ? (
              <Typography sx={{ fontSize: '14px', color: '#6B7280', fontStyle: 'italic', textAlign: 'center', py: 4 }}>
                لا توجد طلبات إجازة بعد
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {myLeaveRequests.map((request: any) => {
                  // Map backend entity fields to what frontend expects
                  const status = request.transStatus || request.status;
                  const from = request.leaveFromDate || request.fromDate;
                  const to = request.leaveToDate || request.toDate;
                  const days = request.leaveDays || request.numberOfDays;
                  const reasonText = request.leaveReason || request.reason;
                  const requestId = request.leaveId || request.requestId;
                  const type = request.leaveType || 'Leave';

                  const colors = getStatusColor(status);
                  return (
                    <Paper
                      key={requestId}
                      id={`leave-request-${requestId}`}
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
                            {type}
                          </Typography>
                          <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                            {from ? formatDate(from) : '-'} - {to ? formatDate(to) : '-'}
                          </Typography>
                          <Typography sx={{ fontSize: '12px', color: '#6B7280', mt: 0.5 }}>
                            {days} {days === 1 ? 'يوم' : 'أيام'}
                          </Typography>
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
                      {reasonText && (
                        <Typography sx={{ fontSize: '12px', color: '#6B7280', mt: 1, fontStyle: 'italic' }}>
                          {reasonText}
                        </Typography>
                      )}
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
      <LeaveSuccessDialog />
    </Box>
  );

  function LeaveSuccessDialog() {
    return (
      <Dialog open={submitSuccess} onClose={() => { setSubmitSuccess(false); router.push('/dashboard/approvals/history'); }}>
        <DialogTitle>تم إرسال طلب الإجازة</DialogTitle>
        <DialogContent>
          <Typography>
            تم إرسال طلب الإجازة بنجاح. سيتم مراجعته من قبل المدير.
            سيتم توجيهك إلى سجل الموافقات...
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSubmitSuccess(false); router.push('/dashboard/approvals/history'); }} sx={{ textTransform: 'none' }}>
            الذهاب إلى السجل
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}


