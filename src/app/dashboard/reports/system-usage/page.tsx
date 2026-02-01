'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import {
  Download,
  TrendingUp,
} from '@mui/icons-material';
import SafeECharts from '@/components/common/SafeECharts';
import useRouteProtection from '@/hooks/useRouteProtection';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import { useToast } from '@/contexts/ToastContext';
import { dashboardApi } from '@/lib/api/dashboard';
import { attendanceApi } from '@/lib/api/attendance';
import { employeesApi } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import type { EChartsOption } from 'echarts';
import { getChartTranslations, getResponsiveChartOption } from '@/lib/charts/echarts-config';

export default function SystemUsageReportsPage() {
  const router = useRouter();
  const [language] = useState<'en' | 'ar'>(() => {
    if (typeof window === 'undefined') return 'ar';
    const savedLanguage = sessionStorage.getItem('language') as 'en' | 'ar' | null;
    return savedLanguage || 'ar';
  });
  const chartT = getChartTranslations(language);

  // Protect route - only Admin
  useRouteProtection(['Admin']);

  const { showSuccess, showError } = useToast();

  // Fetch dashboard stats for total users
  const {
    data: dashboardStats,
    loading: loadingStats,
    error: statsError,
  } = useApi(() => dashboardApi.getDashboardStats(), { immediate: true });

  // Fetch attendance data for last 30 days to calculate daily active users
  const getLast30DaysDateRange = useCallback(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, []);

  const fetchAttendanceData = useCallback(async () => {
    const { startDate, endDate } = getLast30DaysDateRange();
    return attendanceApi.getAllAttendance({
      startDate,
      endDate,
      size: 10000, // Large size to get all records
      sortBy: 'attendanceDate',
      sortDirection: 'asc',
    });
  }, [getLast30DaysDateRange]);

  const {
    data: attendanceData,
    loading: loadingAttendance,
    error: attendanceError,
  } = useApi(fetchAttendanceData, { immediate: true });

  // Fetch all employees for total count
  const {
    data: employeesData,
    loading: loadingEmployees,
    error: employeesError,
  } = useApi(() => employeesApi.getAllEmployees(), { immediate: true });

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

  const handleExport = () => {
    try {
      // Extract chart data for export
      const dailyUsersChartData = dailyUsersChart as unknown as { series: Array<{ data: number[] }>; xAxis: { data: string[] } };
      const moduleUsageChartData = moduleUsageChart as unknown as { series: Array<{ data: number[] }>; xAxis: { data: string[] } };

      const dailyUsersData = dailyUsersChartData.series[0].data;
      const days = dailyUsersChartData.xAxis.data;
      const moduleUsageData = moduleUsageChartData.series[0].data;
      const modules = moduleUsageChartData.xAxis.data;

      // Prepare daily users data
      const dailyUsersExport = days.map((day, index) => ({
        'Day': day,
        'Active Users': dailyUsersData[index] || 0,
      }));

      // Prepare module usage data
      const moduleUsageExport = modules.map((module, index) => ({
        'Module': module,
        'Actions': moduleUsageData[index] || 0,
      }));

      // Combine all data with summary
      const exportData = [
        // Summary section
        {
          'Metric': 'إجمالي المستخدمين',
          'Value': stats.totalUsers.toString(),
        },
        {
          'Metric': 'نشط اليوم',
          'Value': stats.activeToday.toString(),
        },
        {
          'Metric': 'إجمالي الإجراءات',
          'Value': stats.totalActions.toString(),
        },
        {
          'Metric': 'متوسط وقت الجلسة',
          'Value': stats.avgSessionTime,
        },
        // Separator
        {
          'Metric': '---',
          'Value': '---',
        },
        // Daily users header
        {
          'Metric': 'المستخدمون النشطون يومياً',
          'Value': '',
        },
        ...dailyUsersExport.map(d => ({
          'Metric': d['Day'],
          'Value': d['Active Users'].toString(),
        })),
        // Separator
        {
          'Metric': '---',
          'Value': '---',
        },
        // Module usage header
        {
          'Metric': 'استخدام الوحدات',
          'Value': '',
        },
        ...moduleUsageExport.map(m => ({
          'Metric': m['Module'],
          'Value': m['Actions'].toString(),
        })),
      ];

      exportDataToCSV(exportData, 'system-usage-report', {
        'Metric': 'المقياس',
        'Value': 'القيمة',
      });

      showSuccess('تم تصدير تقرير استخدام النظام بنجاح');
    } catch (error) {
      console.error('Export error:', error);
      showError('فشل تصدير تقرير استخدام النظام. يرجى المحاولة مرة أخرى.');
    }
  };

  // Calculate daily active users from attendance data (last 30 days)
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const dailyUsersChart = useMemo(() => {
    const records = attendanceData?.content || [];
    const { startDate } = getLast30DaysDateRange();
    const start = new Date(startDate);

    // Group attendance by date and count unique employees per day
    const dailyCounts = new Map<string, Set<number>>();

    records.forEach(record => {
      if (record.attendanceDate && record.absenceFlag === 'N') {
        const dateStr = record.attendanceDate.split('T')[0];
        if (!dailyCounts.has(dateStr)) {
          dailyCounts.set(dateStr, new Set());
        }
        dailyCounts.get(dateStr)!.add(record.employeeNo);
      }
    });

    // Generate array for last 30 days
    const days: string[] = [];
    const users: number[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push(dayLabel);
      users.push(dailyCounts.get(dateStr)?.size || 0);
    }

    const option = {
      title: { text: chartT.dailyActiveUsers, left: 'center', textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' } },
      tooltip: { trigger: 'axis' as const },
      xAxis: {
        type: 'category' as const,
        data: days,
        axisLabel: {
          rotate: 0,
          interval: 'auto',
          align: 'center',
          verticalAlign: 'middle',
          margin: 10,
          fontSize: 10,
        },
      },
      yAxis: { type: 'value' as const, name: chartT.users },
      series: [{
        name: chartT.activeUsers,
        type: 'line' as const,
        data: users,
        smooth: true,
        itemStyle: { color: '#0c2b7a' },
        areaStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(12, 43, 122, 0.3)' }, { offset: 1, color: 'rgba(12, 43, 122, 0.05)' }] } },
      }],
    } as EChartsOption;

    return getResponsiveChartOption(option, 'ar', false);
  }, [attendanceData, getLast30DaysDateRange, chartT]);

  // Module Usage Chart - using placeholder data structure
  // TODO: Replace with backend API call when module usage tracking is implemented
  // Example: const { data: moduleUsageData } = useApi(() => analyticsApi.getModuleUsage(), { immediate: true });
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const moduleUsageChart = useMemo(() => {
    // Placeholder: Module usage tracking requires backend implementation
    // For now, show zero values to indicate data is not available
    const modules = ['Employees', 'Payroll', 'Projects', 'Warehouse', 'Reports'];
    const usage = modules.map(() => 0); // Zero until backend API is available

    const option = {
      title: { text: chartT.moduleUsage, left: 'center', textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' } },
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      xAxis: { type: 'category' as const, data: modules },
      yAxis: { type: 'value' as const, name: chartT.actions },
      series: [{
        type: 'bar' as const,
        data: usage,
        itemStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#0f3a94' }, { offset: 1, color: '#0c2b7a' }] }, borderRadius: [8, 8, 0, 0] },
      }],
    } as EChartsOption;

    return getResponsiveChartOption(option, 'ar');
  }, [chartT]);

  // Calculate statistics from backend data
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const stats = useMemo(() => {
    const totalUsers = dashboardStats?.totalEmployees || employeesData?.employees?.length || 0;

    // Calculate active today from attendance data
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceData?.content?.filter(r =>
      r.attendanceDate?.startsWith(today) && r.absenceFlag === 'N'
    ) || [];
    const activeToday = new Set(todayRecords.map(r => r.employeeNo)).size;

    // Total actions and avg session time require backend analytics API
    // For now, use placeholder values
    const totalActions = 0; // Requires backend implementation
    const avgSessionTime = 'غير متاح'; // Requires backend implementation

    return {
      totalUsers,
      activeToday,
      totalActions,
      avgSessionTime,
    };
  }, [dashboardStats, employeesData, attendanceData]);

  return (
    <Box
      sx={{
        flex: 1,
        backgroundColor: '#F8F9FC',
      }}
    >
      <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
        {(loadingStats || loadingAttendance || loadingEmployees) && <LoadingSpinner />}
        {(statsError || attendanceError || employeesError) && (
          <ErrorDisplay
            message={statsError || attendanceError || employeesError || 'فشل تحميل بيانات استخدام النظام'}
            onRetry={() => {
              // Retry will be handled by useApi hooks automatically
            }}
          />
        )}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeInUp 0.6s ease-out 0.2s both', '@keyframes fadeInUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
              تقارير استخدام النظام
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              نشاط المستخدمين واستخدام الوحدات ومقاييس أداء النظام
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={loadingStats || loadingAttendance || loadingEmployees}
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
            { label: 'إجمالي المستخدمين', value: stats.totalUsers, color: '#0c2b7a' },
            { label: 'نشط اليوم', value: stats.activeToday, color: '#059669' },
            { label: 'إجمالي الإجراءات', value: stats.totalActions > 0 ? stats.totalActions.toLocaleString() : 'غير متاح', color: '#F59E0B' },
            { label: 'متوسط الجلسة', value: stats.avgSessionTime, color: '#3b82f6' },
          ].map((stat, index) => (
            <Paper key={index} sx={{ padding: 2, borderRadius: '12px', animation: `fadeInUp 0.6s ease-out ${0.3 + index * 0.1}s both` }}>
              <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>{stat.label}</Typography>
              <Typography sx={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</Typography>
            </Paper>
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '7fr 5fr',
            },
            gap: 3,
          }}
        >
          <Paper sx={{ padding: 3, borderRadius: '12px', animation: 'fadeInUp 0.6s ease-out 0.7s both', minHeight: '400px' }}>
            {loadingAttendance ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Typography>جاري التحميل...</Typography>
              </Box>
            ) : (
              <SafeECharts option={dailyUsersChart} showCustomLegend={true} style={{ height: '400px', width: '100%' }} />
            )}
          </Paper>
          <Paper sx={{ padding: 3, borderRadius: '12px', animation: 'fadeInUp 0.6s ease-out 0.8s both', minHeight: '400px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column' }}>
              <Typography sx={{ mb: 2, color: '#6B7280' }}>
                يتطلب تتبع استخدام الوحدات تنفيذ من جانب الخادم
              </Typography>
              <SafeECharts option={moduleUsageChart} style={{ height: '350px', width: '100%' }} />
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}


