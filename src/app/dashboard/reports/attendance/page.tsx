'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Download,
  Schedule,
} from '@mui/icons-material';
import SafeECharts from '@/components/common/SafeECharts';
import type { EChartsOption } from 'echarts';
import useRouteProtection from '@/hooks/useRouteProtection';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import { attendanceApi } from '@/lib/api/attendance';
import { employeesApi } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { getUserRole } from '@/lib/permissions';
import type { EmployeeResponse } from '@/lib/api/employees';
import type { AttendanceListResponse } from '@/lib/api/attendance';
import { getChartTranslations, getResponsiveChartOption } from '@/lib/charts/echarts-config';

export default function AttendanceReportsPage() {
  const router = useRouter();
  const [language] = useState<'en' | 'ar'>(() => {
    if (typeof window === 'undefined') return 'ar';
    const savedLanguage = sessionStorage.getItem('language') as 'en' | 'ar' | null;
    return savedLanguage || 'ar';
  });
  const chartT = getChartTranslations(language);

  // Generate dynamic month options (last 12 months)
  const generateMonthOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label: monthName });
    }
    return options;
  };

  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || '2024-11');

  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'General Manager', 'Employee']);

  const userRole = getUserRole();
  const { showSuccess, showError } = useToast();

  // Get current user's employee data for Employee role
  const { data: employeeResponse, loading: loadingEmployee, error: employeeError } = useApi<EmployeeResponse>(
    () => employeesApi.getMyEmployee(),
    { immediate: userRole === 'Employee' }
  );

  // Extract employeeNo for Employee role
  const employeeNo = userRole === 'Employee' ? employeeResponse?.employeeNo : undefined;

  // Calculate date range for selected month
  const getMonthDateRange = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  // Fetch attendance data for selected month
  const fetchAttendanceData = useCallback(async () => {
    const { startDate, endDate } = getMonthDateRange(selectedMonth);

    // For Employee role, fetch only their own attendance using my-attendance endpoint
    if (userRole === 'Employee') {
      const result = await attendanceApi.getMyAttendance({
        startDate: startDate,
        endDate: endDate,
        size: 10000,
      });
      // Convert to AttendanceListResponse format for consistency with getAllAttendance
      return {
        content: result.content || [],
        totalElements: result.totalElements || 0,
        totalPages: 1,
        currentPage: 0,
        pageSize: 10000,
        hasNext: false,
        hasPrevious: false,
      };
    }

    // For other roles, fetch all attendance
    return attendanceApi.getAllAttendance({
      startDate,
      endDate,
      size: 10000, // Large size to get all records for the month
      sortBy: 'attendanceDate',
      sortDirection: 'asc',
    });
  }, [selectedMonth, userRole]);

  const {
    data: attendanceData,
    loading: loadingAttendance,
    error: attendanceError,
    execute: fetchAttendance,
  } = useApi<AttendanceListResponse>(fetchAttendanceData, { immediate: userRole !== 'Employee' || !!employeeNo });

  // Fetch employees data (only for non-Employee roles)
  const {
    data: employeesData,
    loading: loadingEmployees,
    error: employeesError,
  } = useApi(() => employeesApi.getAllEmployees(), { immediate: userRole !== 'Employee' });

  // Refetch attendance when month changes or employeeNo becomes available
  useEffect(() => {
    if (userRole !== 'Employee' || employeeNo) {
      fetchAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, employeeNo]);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

  // Calculate statistics from real data
  const stats = useMemo(() => {
    const records = attendanceData?.content || [];
    if (records.length === 0) {
      return {
        totalRecords: 0,
        presentRate: '0.0',
        lateCount: 0,
        absentCount: 0,
      };
    }

    const presentCount = records.filter(r => r.absenceFlag === 'N').length;
    const lateCount = records.filter(r => (r.delayedCalc || 0) > 0).length;
    const absentCount = records.filter(r => r.absenceFlag === 'Y').length;
    const presentRate = ((presentCount / records.length) * 100).toFixed(1);

    return {
      totalRecords: records.length,
      presentRate,
      lateCount,
      absentCount,
    };
  }, [attendanceData]);

  const handleExport = () => {
    try {
      const records = attendanceData?.content || [];
      // For Employee role, use employeeResponse for name lookup instead of all employees
      const employees = userRole === 'Employee' && employeeResponse
        ? [{ employeeNo: employeeResponse.employeeNo, employeeName: employeeResponse.employeeName }]
        : employeesData?.employees || [];

      if (records.length === 0) {
        showError('لا توجد بيانات حضور متاحة للشهر المحدد للتصدير');
        return;
      }

      // Create employee map for quick lookup
      const employeeMap = new Map(employees.map((emp: { employeeNo: number }) => [emp.employeeNo, emp]));

      // Prepare export data with employee names
      const exportData = records.map(record => {
        const employee = employeeMap.get(record.employeeNo);

        // Determine status based on absence flag and other fields
        let status = 'PRESENT';
        if (record.absenceFlag === 'Y') {
          status = 'ABSENT';
        } else if ((record.delayedCalc || 0) > 0) {
          status = 'LATE';
        } else if ((record.earlyOutCalc || 0) > 0) {
          status = 'EARLY_OUT';
        }

        return {
          'Transaction ID': record.transactionId,
          'Employee ID': record.employeeNo,
          'Employee Name': ((employee as unknown) as { employeeName: string })?.employeeName || record.employeeName || 'غير معروف',
          'Date': record.attendanceDate ? new Date(record.attendanceDate).toLocaleDateString('en-GB') : 'غير متاح',
          'Entry Time': record.entryTime || 'غير متاح',
          'Exit Time': record.exitTime || 'غير متاح',
          'Scheduled Hours': record.scheduledHours || 0,
          'Working Hours': record.workingHours || 0,
          'Overtime': record.overtimeCalc || 0,
          'Delay': record.delayedCalc || 0,
          'Early Out': record.earlyOutCalc || 0,
          'Status': status,
          'Absence': record.absenceFlag === 'Y' ? 'نعم' : 'لا',
          'Project Code': record.projectCode || 'غير متاح',
          'Notes': record.notes || '',
        };
      });

      // Add summary row
      const presentCount = exportData.filter(r => r.Status === 'PRESENT').length;
      const absentCount = exportData.filter(r => r.Status === 'ABSENT').length;
      const lateCount = exportData.filter(r => r.Status === 'LATE').length;
      const earlyOutCount = exportData.filter(r => r.Status === 'EARLY_OUT').length;
      const presentRate = exportData.length > 0 ? ((presentCount / exportData.length) * 100).toFixed(1) : '0';

      const summaryRow = {
        'Transaction ID': '',
        'Employee ID': '',
        'Employee Name': 'ملخص',
        'Date': '',
        'Entry Time': '',
        'Exit Time': '',
        'Scheduled Hours': '',
        'Working Hours': '',
        'Overtime': '',
        'Delay': '',
        'Early Out': '',
        'Status': `حاضر: ${presentCount}, غائب: ${absentCount}, متأخر: ${lateCount}, خروج مبكر: ${earlyOutCount}`,
        'Absence': `معدل الحضور: ${presentRate}%`,
        'Project Code': `إجمالي السجلات: ${exportData.length}`,
        'Notes': '',
      };

      exportDataToCSV([...exportData, summaryRow], `attendance-report-${selectedMonth}`, {
        'Transaction ID': 'رقم المعاملة',
        'Employee ID': 'رقم الموظف',
        'Employee Name': 'اسم الموظف',
        'Date': 'التاريخ',
        'Entry Time': 'وقت الدخول',
        'Exit Time': 'وقت الخروج',
        'Scheduled Hours': 'الساعات المجدولة',
        'Working Hours': 'ساعات العمل',
        'Overtime': 'ساعات إضافية',
        'Delay': 'التأخير',
        'Early Out': 'الخروج المبكر',
        'Status': 'الحالة',
        'Absence': 'الغياب',
        'Project Code': 'رمز المشروع',
        'Notes': 'ملاحظات',
      });

      showSuccess(`تم تصدير تقرير الحضور لشهر ${selectedMonth} بنجاح`);
    } catch (error) {
      console.error('Export error:', error);
      showError('فشل تصدير تقرير الحضور. يرجى المحاولة مرة أخرى.');
    }
  };

  // Attendance Status Chart - using real data
  const statusChart = useMemo(() => {
    const records = attendanceData?.content || [];
    const statusCounts = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EARLY_OUT: 0,
    };

    records.forEach(record => {
      if (record.absenceFlag === 'Y') {
        statusCounts.ABSENT++;
      } else if ((record.delayedCalc || 0) > 0) {
        statusCounts.LATE++;
      } else if ((record.earlyOutCalc || 0) > 0) {
        statusCounts.EARLY_OUT++;
      } else {
        statusCounts.PRESENT++;
      }
    });

    const option = {
      title: {
        text: chartT.attendanceStatusDistribution,
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' },
      },
      tooltip: {
        trigger: 'item' as const,
        formatter: '{b}: {c} ({d}%)',
      },
      series: [
        {
          type: 'pie' as const,
          radius: ['40%', '70%'],
          data: [
            { value: statusCounts.PRESENT, name: chartT.present, itemStyle: { color: '#059669' } },
            { value: statusCounts.ABSENT, name: chartT.absent, itemStyle: { color: '#DC2626' } },
            { value: statusCounts.LATE, name: chartT.late, itemStyle: { color: '#F59E0B' } },
            { value: statusCounts.EARLY_OUT, name: chartT.earlyOut, itemStyle: { color: '#EA580C' } },
          ],
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
        },
      ],
    } as EChartsOption;

    return getResponsiveChartOption(option, 'ar', false);
  }, [attendanceData, chartT]);

  // Daily Attendance Trend - using real data
  const trendChart = useMemo(() => {
    const records = attendanceData?.content || [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Group records by day
    const dailyCounts = new Map<number, number>();
    for (let day = 1; day <= daysInMonth; day++) {
      dailyCounts.set(day, 0);
    }

    records.forEach(record => {
      if (record.attendanceDate && record.absenceFlag === 'N') {
        const recordDate = new Date(record.attendanceDate);
        const day = recordDate.getDate();
        if (day >= 1 && day <= daysInMonth) {
          dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
        }
      }
    });

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const presentCounts = days.map(day => dailyCounts.get(day) || 0);
    const dayLabels = days.map(day => {
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const option = {
      title: {
        text: chartT.dailyAttendanceTrend,
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' },
      },
      tooltip: {
        trigger: 'axis' as const,
      },
      xAxis: {
        type: 'category' as const,
        data: dayLabels,
        axisLabel: {
          rotate: 0,
          interval: 'auto',
          align: 'center',
          verticalAlign: 'middle',
          margin: 10,
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'value' as const,
        name: chartT.employees,
      },
      series: [
        {
          name: chartT.present,
          type: 'bar' as const,
          data: presentCounts,
          itemStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#0f3a94' },
                { offset: 1, color: '#0c2b7a' },
              ],
            },
            borderRadius: [8, 8, 0, 0],
          },
        },
      ],
    } as EChartsOption;

    return getResponsiveChartOption(option, 'ar', false);
  }, [attendanceData, selectedMonth, chartT]);

  return (
    <Box
      sx={{
        flex: 1,
        backgroundColor: '#F8F9FC',
      }}
    >
      <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
        {(loadingAttendance || loadingEmployees || (userRole === 'Employee' && loadingEmployee)) && <LoadingSpinner />}
        {(attendanceError || employeesError || (userRole === 'Employee' && employeeError)) && (
          <ErrorDisplay
            message={
              attendanceError ||
              employeesError ||
              (userRole === 'Employee' && employeeError) ||
              'فشل تحميل بيانات الحضور'
            }
            onRetry={() => {
              if (attendanceError) fetchAttendance();
            }}
          />
        )}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeInUp 0.6s ease-out 0.2s both', '@keyframes fadeInUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
              تقارير الحضور
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              تحليلات واتجاهات حضور الموظفين
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={loadingAttendance || !attendanceData?.content || attendanceData.content.length === 0}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#0c2b7a',
              color: '#0c2b7a',
              '&:hover': {
                borderColor: '#0a266e',
                backgroundColor: 'rgba(12, 43, 122, 0.04)'
              },
              '&:disabled': {
                borderColor: '#D1D5DB',
                color: '#9CA3AF',
              },
            }}
          >
            تصدير التقرير
          </Button>
        </Box>

        <Paper sx={{ padding: 2, borderRadius: '12px', mb: 3, animation: 'fadeInUp 0.6s ease-out 0.3s both', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
          <TextField
            select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            size="small"
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
          >
            {monthOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 3,
            mb: 3,
          }}
        >
          {[
            { label: 'إجمالي السجلات', value: stats.totalRecords, color: '#0c2b7a' },
            { label: 'معدل الحضور', value: `${stats.presentRate}%`, color: '#059669' },
            { label: 'الوصول المتأخر', value: stats.lateCount, color: '#F59E0B' },
            { label: 'الغيابات', value: stats.absentCount, color: '#DC2626' },
          ].map((stat, index) => (
            <Paper
              key={index}
              sx={{
                padding: 2,
                borderRadius: '12px',
                animation: `fadeInUp 0.6s ease-out ${0.4 + index * 0.1}s both`,
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              }}
            >
              <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>{stat.label}</Typography>
              <Typography sx={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</Typography>
            </Paper>
          ))}
        </Box>

        {/* Charts - Hide aggregate charts for Employee role */}
        {userRole !== 'Employee' && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: '5fr 7fr',
              },
              gap: 3,
            }}
          >
            <Paper sx={{
              padding: 3,
              borderRadius: '12px',
              animation: 'fadeInUp 0.6s ease-out 0.8s both',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              minHeight: '400px',
            }}>
              {loadingAttendance ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                  <Typography>جاري التحميل...</Typography>
                </Box>
              ) : (
                <SafeECharts key={`status-${selectedMonth}`} option={statusChart} showCustomLegend={true} style={{ height: '400px', width: '100%' }} />
              )}
            </Paper>
            <Paper sx={{
              padding: 3,
              borderRadius: '12px',
              animation: 'fadeInUp 0.6s ease-out 0.9s both',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              minHeight: '400px',
            }}>
              {loadingAttendance ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                  <Typography>جاري التحميل...</Typography>
                </Box>
              ) : (
                <SafeECharts key={`trend-${selectedMonth}`} option={trendChart} showCustomLegend={true} style={{ height: '400px', width: '100%' }} />
              )}
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
}


