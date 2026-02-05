'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import {
  Download,
  Assessment,
} from '@mui/icons-material';
import SafeECharts from '@/components/common/SafeECharts';
import useRouteProtection from '@/hooks/useRouteProtection';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import { laborApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { mapLaborAssignmentResponsesToTempWorkerAssignments } from '@/lib/mappers/laborMapper';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { useToast } from '@/contexts/ToastContext';
import { formatInvariantDate } from '@/lib/utils/dateFormatter';

export default function TempLaborAvailabilityPage() {
  const router = useRouter();
  const toast = useToast();

  // Protect route
  useRouteProtection(['Admin', 'Project Manager']);

  // Fetch labor assignments from backend
  const { data: laborAssignmentsData, loading: isLoadingAssignments, error: assignmentsError, execute: loadAssignments } = useApi(
    () => laborApi.getAllLaborAssignments(),
    { immediate: true }
  );

  // Fetch employees for mapping specialization/nationality
  const { data: employeesResponse } = useApi(
    () => employeesApi.getAllEmployees(),
    { immediate: true }
  );

  const employees = useMemo(() => {
    if (!employeesResponse?.content) return [];
    return employeesResponse.content.map(mapEmployeeResponseToEmployee);
  }, [employeesResponse]);

  // Map backend responses to frontend format
  const assignments = useMemo(() => {
    if (!laborAssignmentsData) return [];
    return mapLaborAssignmentResponsesToTempWorkerAssignments(laborAssignmentsData, employees);
  }, [laborAssignmentsData, employees]);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

  const handleExport = () => {
    try {
      if (!assignments || assignments.length === 0) {
        toast.showError('لا توجد بيانات للتصدير');
        return;
      }

      const exportData = assignments.map(worker => ({
        'رقم العامل': worker.workerId,
        'اسم العامل': worker.workerName,
        'التخصص': worker.specialization,
        'الجنسية': worker.nationality,
        'تاريخ البدء': formatInvariantDate(worker.startDate),
        'تاريخ الانتهاء': formatInvariantDate(worker.endDate),
        'الأجر اليومي': worker.dailyWage,
        'الحالة': worker.status,
      }));

      exportDataToCSV(exportData, 'temp-labor-availability-report');
      toast.showSuccess('تم تصدير التقرير بنجاح');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.showError('فشل تصدير التقرير');
    }
  };

  // Specialization Distribution
  const specializationChart = useMemo(() => {
    const specializations: { [key: string]: number } = {};
    (assignments || []).forEach(worker => {
      if (worker.status === 'ACTIVE') {
        const spec = worker.specialization || 'غير معروف';
        specializations[spec] = (specializations[spec] || 0) + 1;
      }
    });

    const chartData = Object.entries(specializations).map(([name, value], i) => ({
      value,
      name,
      itemStyle: {
        color: ['#0c2b7a', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe', '#EDE9FE'][i % 6],
      },
    }));

    return {
      title: {
        text: 'العمال حسب التخصص',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' },
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} عامل ({d}%)',
      },
      legend: {
        bottom: '0%',
        left: 'center',
      },
      series: [
        {
          name: 'التخصص',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
            },
          },
          data: chartData.length > 0 ? chartData : [{ value: 0, name: 'لا توجد بيانات', itemStyle: { color: '#E5E7EB' } }],
        },
      ],
    };
  }, [assignments]);

  // Daily Wage Distribution
  const wageChart = useMemo(() => {
    const activeWorkers = (assignments || []).filter(w => w.status === 'ACTIVE');
    const wages = activeWorkers.map(w => w.dailyWage).sort((a, b) => a - b);

    if (wages.length === 0) {
      return {
        title: {
          text: 'توزيع الأجر اليومي',
          left: 'center',
          textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' },
        },
        tooltip: {
          trigger: 'axis',
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: [],
          axisLabel: { fontSize: 10 },
        },
        yAxis: {
          type: 'value',
          name: 'ر.س',
        },
        series: [
          {
            name: 'الأجر اليومي',
            type: 'bar',
            data: [],
          },
        ],
      };
    }

    return {
      title: {
        text: 'توزيع الأجر اليومي',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const p = params as { value: number }[];
          return `ر.س ${p[0]?.value}`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: wages.map((_, i) => `ع${i + 1}`),
        axisLabel: { fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        name: 'ر.س',
      },
      series: [
        {
          name: 'الأجر اليومي',
          type: 'bar',
          data: wages,
          itemStyle: {
            color: {
              type: 'linear',
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
    };
  }, [assignments]);

  // Calculate statistics
  const stats = useMemo(() => {
    const allAssignments = assignments || [];
    const active = allAssignments.filter(w => w.status === 'ACTIVE');
    const completed = allAssignments.filter(w => w.status === 'COMPLETED');
    const totalCost = active.reduce((sum, w) => sum + (w.dailyWage || 0), 0);
    const avgWage = active.length > 0 ? totalCost / active.length : 0;

    return {
      total: allAssignments.length,
      active: active.length,
      completed: completed.length,
      totalDailyCost: totalCost,
      avgWage: avgWage,
    };
  }, [assignments]);

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
        <Box
          sx={{
            mb: 3,
            animation: 'fadeInUp 0.6s ease-out 0.2s both',
            '@keyframes fadeInUp': {
              from: { opacity: 0, transform: 'translateY(20px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
          >
            تقارير توفر العمال
          </Typography>
          <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
            نظرة عامة في الوقت الفعلي لتوفر القوى العاملة المؤقتة والتكاليف
          </Typography>
        </Box>

        {isLoadingAssignments ? (
          <LoadingSpinner />
        ) : assignmentsError ? (
          <ErrorDisplay error={assignmentsError} onRetry={loadAssignments} />
        ) : (
          <>
            {/* Statistics */}
            <Paper
              elevation={0}
              sx={{
                padding: 3,
                borderRadius: '12px',
                mb: 3,
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                animation: 'fadeInUp 0.6s ease-out 0.3s both',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  إحصائيات ملخصة
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  size="small"
                  onClick={handleExport}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#0c2b7a',
                    color: '#0c2b7a',
                    '&:hover': {
                      borderColor: '#0a266e',
                      backgroundColor: 'rgba(12, 43, 122, 0.04)',
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
                    xs: 'repeat(2, 1fr)',
                    md: 'repeat(5, 1fr)',
                  },
                  gap: 3,
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                    إجمالي العمال
                  </Typography>
                  <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {stats.total}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                    نشط الآن
                  </Typography>
                  <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#059669' }}>
                    {stats.active}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                    مكتمل
                  </Typography>
                  <Typography sx={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
                    {stats.completed}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                    التكلفة اليومية
                  </Typography>
                  <Typography sx={{ fontSize: '22px', fontWeight: 700, color: '#0c2b7a' }}>
                    ر.س {stats.totalDailyCost.toLocaleString()}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    gridColumn: {
                      xs: '1 / -1',
                      md: 'auto',
                    },
                  }}
                >
                  <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                    متوسط الأجر
                  </Typography>
                  <Typography sx={{ fontSize: '22px', fontWeight: 700, color: '#F59E0B' }}>
                    ر.س {stats.avgWage.toFixed(0)}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Charts */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, 1fr)',
                },
                gap: 3,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  padding: 3,
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  animation: 'fadeInUp 0.6s ease-out 0.5s both',
                  minHeight: '400px',
                }}
              >
                <SafeECharts option={specializationChart as any} style={{ height: '400px', width: '100%' }} />
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  padding: 3,
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  animation: 'fadeInUp 0.6s ease-out 0.6s both',
                  minHeight: '400px',
                }}
              >
                <SafeECharts option={wageChart as any} style={{ height: '400px', width: '100%' }} />
              </Paper>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
