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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  ArrowBack,
  Download,
  ReceiptLong,
} from '@mui/icons-material';
import useRouteProtection from '@/hooks/useRouteProtection';
import { authApi, payrollApi, attendanceApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import type { AttendanceTransaction } from '@/types';


export default function EmployeePayrollPage() {
  const router = useRouter();
  const toast = useToast();
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Protect route - only employees
  useRouteProtection(['Employee', 'Admin']);

  // Get current user to extract employee number
  const { data: currentUser, loading: loadingUser, error: userError } = useApi(
    () => authApi.getCurrentUser(),
    { immediate: true }
  );

  const employeeNo = currentUser?.employeeNo || currentUser?.employeeId;

  // Get employee data
  const { data: employee, loading: loadingEmployee } = useApi(
    async () => {
      try {
        return await employeesApi.getEmployeeById(employeeNo || 0);
      } catch (error: unknown) {
        const apiError = error as { statusCode?: number; status?: number };
        if (apiError?.statusCode === 404 || apiError?.status === 404) {
          console.warn(`Employee record not found for employeeNo: ${employeeNo}`);
          return null;
        }
        throw error;
      }
    },
    { immediate: !!employeeNo }
  );

  // Get employee's payroll history
  const { data: myPayroll, loading: loadingPayroll, error: payrollError } = useApi(
    () => payrollApi.getPayrollHistory(employeeNo || 0),
    { immediate: !!employeeNo }
  );

  // Ensure myPayroll is always an array
  const payrollArray = useMemo(() => {
    return Array.isArray(myPayroll) ? myPayroll : [];
  }, [myPayroll]);

  // Get selected month payroll details
  const { data: selectedPayrollDetails, execute: loadDetails } = useApi(
    async () => {
      try {
        return await payrollApi.getSalaryDetails(employeeNo || 0, selectedMonth);
      } catch (error: unknown) {
        const apiError = error as { statusCode?: number; status?: number };
        if (apiError?.statusCode === 404 || apiError?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    { immediate: false }
  );

  // Get attendance for selected month
  const { data: attendanceData, execute: loadAttendance } = useApi(
    async () => {
      if (!employeeNo || !selectedMonth) return { content: [], totalElements: 0 };
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const result = await attendanceApi.getAllAttendance({
        employeeNo,
        startDate,
        endDate,
        size: 1000,
      });
      if (Array.isArray(result)) {
        return { content: result, totalElements: result.length };
      }
      return result;
    },
    { immediate: false }
  );

  // Set default month or handle viewId
  useEffect(() => {
    if (selectedMonth) return;

    const searchParams = new URLSearchParams(window.location.search);
    const viewId = searchParams.get('viewId');

    if (viewId && payrollArray.length > 0) {
      // Try to find by salaryId (assuming viewId is salaryId)
      const record = payrollArray.find(p => p.salaryId.toString() === viewId);
      if (record && record.salaryMonth) {
        setTimeout(() => setSelectedMonth(record.salaryMonth), 0);
        return;
      }
    }

    if (payrollArray.length > 0) {
      const mostRecent = payrollArray[0];
      const monthToSet = mostRecent.salaryMonth || '';
      if (monthToSet) {
        setTimeout(() => setSelectedMonth(monthToSet), 0);
      } else {
        const now = new Date();
        setTimeout(() => {
          setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
        }, 0);
      }
    } else {
      const now = new Date();
      setTimeout(() => {
        setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      }, 0);
    }
  }, [payrollArray, selectedMonth]);

  // Get selected month payroll from history
  const selectedPayroll = useMemo(() => {
    if (!selectedMonth) return null;
    const payrollFromHistory = payrollArray.find(p => p.salaryMonth === selectedMonth);
    const payrollFromDetails = !payrollFromHistory ? selectedPayrollDetails?.header : null;
    const payroll = payrollFromHistory || payrollFromDetails;

    if (payroll) {
      return {
        ...payroll,
        // Ensure properties are accessible if mixed types were used (though SalaryHeader should be consistent now)
        salaryMonth: payroll.salaryMonth,
        isApproved: payroll.transStatus === 'A',
      };
    }
    return null;
  }, [payrollArray, selectedMonth, selectedPayrollDetails]);

  // Get attendance for selected month
  const monthAttendance = useMemo(() => {
    if (!attendanceData) return [] as AttendanceTransaction[];
    if ('content' in attendanceData && Array.isArray(attendanceData.content)) {
      return attendanceData.content as AttendanceTransaction[];
    }
    if (Array.isArray(attendanceData)) {
      return attendanceData as AttendanceTransaction[];
    }
    return [] as AttendanceTransaction[];
  }, [attendanceData]);

  // Load details and attendance when month changes
  useEffect(() => {
    if (selectedMonth && employeeNo) {
      loadDetails();
      loadAttendance();
    }
  }, [selectedMonth, employeeNo, loadDetails, loadAttendance]);

  // Generate days in month for timesheet
  const daysInMonth = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const days = new Date(year, month, 0).getDate();
    const result = [];

    for (let day = 1; day <= days; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];

      const attendance = monthAttendance.find((att: AttendanceTransaction) => {
        const attAny = att as AttendanceTransaction & { attendance_date?: string | Date };
        const d = attAny.attendanceDate || attAny.attendance_date;
        const attDate = d ? new Date(d).toISOString().split('T')[0] : '';
        return attDate === dateStr;
      });

      if (dayOfWeek === 5) {
        result.push({ day, status: 'Weekend', color: '#F3F4F6', textColor: '#6B7280' });
      } else if (attendance) {
        const attAny = attendance as AttendanceTransaction & { absence_flag?: string };
        const absenceFlag = attAny.absenceFlag || attAny.absence_flag;
        if (absenceFlag === 'Y') {
          result.push({ day, status: 'Absent', color: '#FEE2E2', textColor: '#991B1B' });
        } else {
          result.push({ day, status: 'Present', color: '#D1FAE5', textColor: '#065F46', attendance });
        }
      } else {
        result.push({ day, status: 'Absent', color: '#FEE2E2', textColor: '#991B1B' });
      }
    }

    return result;
  }, [selectedMonth, monthAttendance]);

  // Calculate summary
  const summary = useMemo(() => {
    return {
      totalDays: daysInMonth.length,
      present: daysInMonth.filter(d => d.status === 'Present').length,
      absent: daysInMonth.filter(d => d.status === 'Absent').length,
      weekends: daysInMonth.filter(d => d.status === 'Weekend').length,
      workingDays: daysInMonth.filter(d => d.status === 'Present' || d.status === 'Weekend').length,
    };
  }, [daysInMonth]);

  // Generate available months from payroll records
  const availableMonths = useMemo(() => {
    if (!payrollArray || payrollArray.length === 0) {
      return selectedMonth ? [selectedMonth] : [];
    }
    const months = payrollArray
      .map(p => p.salaryMonth)
      .filter(Boolean)
      .sort()
      .reverse();
    return months.length > 0 ? months : (selectedMonth ? [selectedMonth] : []);
  }, [payrollArray, selectedMonth]);

  const handleDownloadPayslip = async () => {
    if (!selectedPayroll || !selectedMonth) {
      toast.showWarning('لا توجد بيانات رواتب متاحة للتحميل.');
      return;
    }

    const employeeName = employee
      ? (employee.employeeName || employee.employeeName || 'موظف')
      : `موظف #${employeeNo}`;

    try {
      toast.showSuccess(`جارٍ تحميل كشف الراتب لـ ${employeeName} - ${selectedMonth}`);

      const blob = await payrollApi.downloadPayslip(employeeNo || 0, selectedMonth);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip_${employeeNo}_${selectedMonth}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.showError('فشل تحميل كشف الراتب. يرجى المحاولة مرة أخرى.');
    }
  };

  if (loadingUser || loadingEmployee || (loadingPayroll && payrollArray.length === 0)) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FC' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (userError || payrollError || !employeeNo) {
    return (
      <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
        <ErrorDisplay
          error={(typeof userError === 'string' ? userError : (userError as unknown as { message?: string })?.message) ||
            (typeof payrollError === 'string' ? payrollError : (payrollError as unknown as { message?: string })?.message) ||
            'تعذر تحميل بيانات الرواتب. يرجى المحاولة مرة أخرى لاحقاً.'}
          onRetry={() => window.location.reload()}
        />
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
              رواتبي وكشوف الحضور
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              عرض تفاصيل راتبك وسجلات الحضور
            </Typography>
          </Box>
        </Box>

        {/* Month Selection */}
        <Paper
          sx={{
            padding: 2,
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              SelectProps={{ displayEmpty: true }}
              sx={{
                minWidth: 200,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#FFFFFF',
                  '& fieldset': {
                    borderColor: '#E5E7EB',
                  },
                  '&:hover fieldset': {
                    borderColor: '#0c2b7a',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#0c2b7a',
                    borderWidth: '2px',
                  },
                },
                '& .MuiSelect-select': {
                  color: selectedMonth ? '#111827' : '#9CA3AF',
                },
              }}
              size="small"
            >
              {availableMonths.map((month) => (
                <MenuItem key={month} value={month}>
                  {new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </MenuItem>
              ))}
            </TextField>
            {selectedPayroll && (
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={handleDownloadPayslip}
                sx={{
                  background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
                  },
                }}
              >
                تحميل كشف الراتب (PDF)
              </Button>
            )}
          </Box>
        </Paper>

        {selectedPayroll ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {selectedPayroll.transStatus === 'R' && (
              <Alert severity="error" sx={{ mb: 1, borderRadius: '12px' }}>
                <AlertTitle>تم رفض مسير الرواتب</AlertTitle>
                {selectedPayroll.rejectionReason || 'لم يتم ذكر سبب للرفض.'}
              </Alert>
            )}
            {/* Payroll Summary */}
            <Paper
              sx={{
                padding: 4,
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
                color: '#FFFFFF',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Payroll Summary - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={{ fontSize: '12px', opacity: 0.9, mb: 0.5 }}>
                    الراتب الأساسي
                  </Typography>
                  <Typography sx={{ fontSize: '24px', fontWeight: 700 }}>
                    {(selectedPayroll.grossSalary || 0).toLocaleString()} SAR
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={{ fontSize: '12px', opacity: 0.9, mb: 0.5 }}>
                    إجمالي البدلات
                  </Typography>
                  <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#10B981' }}>
                    +{(selectedPayroll.totalAllowances || 0).toLocaleString()} SAR
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={{ fontSize: '12px', opacity: 0.9, mb: 0.5 }}>
                    إجمالي الخصومات
                  </Typography>
                  <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#EF4444' }}>
                    -{(selectedPayroll.totalDeductions || 0).toLocaleString()} SAR
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={{ fontSize: '12px', opacity: 0.9, mb: 0.5 }}>
                    الراتب الصافي
                  </Typography>
                  <Typography sx={{ fontSize: '28px', fontWeight: 700 }}>
                    {(selectedPayroll.netSalary || 0).toLocaleString()} SAR
                  </Typography>
                </Grid>
              </Grid>
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography sx={{ fontSize: '12px', opacity: 0.9 }}>Overtime</Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>
                      {(selectedPayroll.totalOvertime || 0).toLocaleString()} SAR
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography sx={{ fontSize: '12px', opacity: 0.9 }}>حسم غياب/تأخير</Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>
                      {(selectedPayroll.totalAbsence || 0).toLocaleString()} SAR
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography sx={{ fontSize: '12px', opacity: 0.9 }}>قسط القرض</Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>
                      {(selectedPayroll.totalLoans || 0).toLocaleString()} SAR
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography sx={{ fontSize: '12px', opacity: 0.9 }}>الحالة</Typography>
                    <Chip
                      label={selectedPayroll.isApproved ? 'موافق عليه' : 'قيد الموافقة'}
                      size="small"
                      sx={{
                        backgroundColor: selectedPayroll.isApproved ? '#10B981' : '#F59E0B',
                        color: '#FFFFFF',
                        fontWeight: 600,
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Paper>

            {/* Timesheet Calendar */}
            <Paper
              sx={{
                padding: 3,
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 2 }}>
                Monthly Timesheet
              </Typography>

              {/* Summary */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Chip label={`إجمالي الأيام: ${summary.totalDays}`} sx={{ backgroundColor: '#F3F4F6', color: '#111827' }} />
                <Chip label={`Present: ${summary.present}`} sx={{ backgroundColor: '#D1FAE5', color: '#065F46' }} />
                <Chip label={`Absent: ${summary.absent}`} sx={{ backgroundColor: '#FEE2E2', color: '#991B1B' }} />
                <Chip label={`Weekends: ${summary.weekends}`} sx={{ backgroundColor: '#F3F4F6', color: '#6B7280' }} />
              </Box>

              {/* Calendar Grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 1,
                }}
              >
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Box
                    key={day}
                    sx={{
                      padding: 1,
                      textAlign: 'center',
                      fontWeight: 600,
                      color: '#6B7280',
                      fontSize: '12px',
                    }}
                  >
                    {day}
                  </Box>
                ))}
                {daysInMonth.map((dayData) => (
                  <Box
                    key={dayData.day}
                    sx={{
                      padding: 1.5,
                      textAlign: 'center',
                      borderRadius: '8px',
                      backgroundColor: dayData.color,
                      color: dayData.textColor,
                      fontWeight: 600,
                      fontSize: '12px',
                      minHeight: '40px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      cursor: dayData.attendance ? 'pointer' : 'default',
                    }}
                    title={dayData.attendance ? `وقت الدخول: ${(dayData.attendance as AttendanceTransaction).entryTime || (dayData.attendance as any).entry_time || 'غير متاح'}, وقت الخروج: ${(dayData.attendance as AttendanceTransaction).exitTime || (dayData.attendance as any).exit_time || 'غير متاح'}` : ''}
                  >
                    <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                      {dayData.day}
                    </Typography>
                    {dayData.attendance && (
                      <Typography sx={{ fontSize: '10px', opacity: 0.8 }}>
                        {(dayData.attendance as AttendanceTransaction).workingHours || (dayData.attendance as any).working_hours || ''}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* Payroll History */}
            <Paper
              sx={{
                padding: 3,
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 2 }}>
                سجل الرواتب
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>الشهر</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>الراتب الأساسي</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>البدلات</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>الخصومات</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>الراتب الصافي</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payrollArray.length > 0 ? (
                    payrollArray.map((payroll) => {
                      const monthYear = payroll.salaryMonth;
                      const isApproved = payroll.transStatus === 'A';
                      return (
                        <TableRow key={payroll.salaryId} hover>
                          <TableCell>
                            {monthYear ? new Date(monthYear + '-01').toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }) : 'غير متاح'}
                          </TableCell>
                          <TableCell align="right">{payroll.grossSalary?.toLocaleString() || '0'} SAR</TableCell>
                          <TableCell align="right" sx={{ color: '#059669' }}>
                            +{payroll.totalAllowances?.toLocaleString() || '0'} SAR
                          </TableCell>
                          <TableCell align="right" sx={{ color: '#DC2626' }}>
                            -{payroll.totalDeductions?.toLocaleString() || '0'} SAR
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {payroll.netSalary?.toLocaleString() || '0'} SAR
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={isApproved ? 'موافق عليه' : 'قيد الانتظار'}
                              size="small"
                              sx={{
                                backgroundColor: isApproved ? '#D1FAE5' : '#FEF3C7',
                                color: isApproved ? '#065F46' : '#92400E',
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography sx={{ color: '#6B7280' }}>
                          No payroll history available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        ) : (
          <Paper
            sx={{
              padding: 4,
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}
          >
            <ReceiptLong sx={{ fontSize: 64, color: '#9CA3AF', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#6B7280', mb: 1 }}>
              لا توجد سجلات رواتب
            </Typography>
            <Typography sx={{ color: '#9CA3AF' }}>
              لا توجد سجلات رواتب متاحة للشهر المحدد.
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
