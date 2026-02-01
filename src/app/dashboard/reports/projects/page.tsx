'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import {
  Download,
  AccountTree,
} from '@mui/icons-material';
import SafeECharts from '@/components/common/SafeECharts';
import type { EChartsOption } from 'echarts';
import useRouteProtection from '@/hooks/useRouteProtection';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import { projectsApi } from '@/lib/api/projects';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { getChartTranslations, getResponsiveChartOption } from '@/lib/charts/echarts-config';

interface PaymentSchedule {
  paymentId: number;
  projectCode: number;
  dueAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  isPaid?: boolean;
  isPartial?: boolean;
  isPending?: boolean;
}

export default function ProjectReportsPage() {
  const router = useRouter();
  const [allPayments, setAllPayments] = useState<PaymentSchedule[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [language] = useState<'en' | 'ar'>(() => {
    if (typeof window === 'undefined') return 'ar';
    const savedLanguage = sessionStorage.getItem('language') as 'en' | 'ar' | null;
    return savedLanguage || 'ar';
  });
  const chartT = getChartTranslations(language);

  // Protect route
  useRouteProtection(['Admin', 'General Manager', 'Project Manager']);

  const { showSuccess, showError } = useToast();

  // Fetch all projects
  const {
    data: projectsData,
    loading: loadingProjects,
    error: projectsError,
    execute: fetchProjects,
  } = useApi(() => projectsApi.getAllProjects({ size: 10000 }), { immediate: true });

  // Fetch payments for all projects
  useEffect(() => {
    const fetchAllPayments = async () => {
      const projects = projectsData?.content || [];
      if (projects.length === 0) return;

      setLoadingPayments(true);
      try {
        const paymentPromises = projects.map(project =>
          projectsApi.getProjectPayments(project.projectCode).catch(() => [])
        );
        const paymentArrays = await Promise.all(paymentPromises);
        const flatPayments = paymentArrays.flat();
        setAllPayments(flatPayments as unknown as PaymentSchedule[]);
      } catch (error) {
        console.error('Error fetching payments:', error);
        showError('فشل تحميل بعض بيانات الدفع');
      } finally {
        setLoadingPayments(false);
      }
    };

    if (projectsData?.content) {
      fetchAllPayments();
    }
  }, [projectsData, showError]);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

  // Calculate statistics from real data
  const stats = useMemo(() => {
    const projects = projectsData?.content || [];
    if (projects.length === 0) {
      return {
        totalProjects: 0,
        activeProjects: 0,
        totalValue: 0,
        completedProjects: 0,
      };
    }

    const activeProjects = projects.filter(p => p.status === 'ACTIVE').length;
    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length;
    const totalValue = projects.reduce((sum, p) => sum + (p.totalProjectAmount || 0), 0);

    return {
      totalProjects: projects.length,
      activeProjects,
      totalValue,
      completedProjects,
    };
  }, [projectsData]);

  // Calculate payment statistics
  const paymentStats = useMemo(() => {
    const paid = allPayments
      .filter(p => p.paymentStatus === 'PAID' || p.isPaid)
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    const unpaid = allPayments
      .filter(p => p.paymentStatus === 'PENDING' || p.isPending)
      .reduce((sum, p) => sum + (p.dueAmount || 0), 0);

    const partial = allPayments
      .filter(p => p.paymentStatus === 'PARTIAL' || p.isPartial)
      .reduce((sum, p) => sum + (p.remainingAmount || 0), 0);

    return { paid, unpaid, partial };
  }, [allPayments]);

  const handleExport = () => {
    try {
      const projects = projectsData?.content || [];

      if (projects.length === 0) {
        showError('لا توجد بيانات مشاريع متاحة للتصدير');
        return;
      }

      // Prepare export data with project details
      const exportData = projects.map(project => {
        const projectPayments = allPayments.filter(p => p.projectCode === project.projectCode);
        const paidAmount = projectPayments
          .filter(p => p.paymentStatus === 'PAID' || p.isPaid)
          .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
        const unpaidAmount = projectPayments
          .filter(p => p.paymentStatus === 'PENDING' || p.isPending)
          .reduce((sum, p) => sum + (p.dueAmount || 0), 0);
        const completionRate = project.totalProjectAmount > 0
          ? ((paidAmount / project.totalProjectAmount) * 100).toFixed(1)
          : '0';

        return {
          'Project Code': project.projectCode,
          'Project Name': project.projectName,
          'Status': project.status,
          'Start Date': project.startDate ? new Date(project.startDate).toLocaleDateString('en-GB') : 'غير متاح',
          'End Date': project.endDate ? new Date(project.endDate).toLocaleDateString('en-GB') : 'قيد التنفيذ',
          'Total Amount': `${(project.totalProjectAmount || 0).toLocaleString()} ريال`,
          'Paid Amount': `${paidAmount.toLocaleString()} ريال`,
          'Unpaid Amount': `${unpaidAmount.toLocaleString()} ريال`,
          'Completion Rate': `${completionRate}%`,
          'Client': 'غير متاح', // Not in ProjectSummary
          'Location': project.projectName || 'غير متاح', // Using project name as location placeholder
        };
      });

      // Add summary row
      const summaryRow = {
        'Project Code': '',
        'Project Name': 'ملخص',
        'Status': '',
        'Start Date': '',
        'End Date': '',
        'Total Amount': `${stats.totalValue.toLocaleString()} ريال`,
        'Paid Amount': `${paymentStats.paid.toLocaleString()} ريال`,
        'Unpaid Amount': `${paymentStats.unpaid.toLocaleString()} ريال`,
        'Completion Rate': `الإجمالي: ${stats.totalProjects}, نشط: ${stats.activeProjects}, مكتمل: ${stats.completedProjects}`,
        'Client': '',
        'Location': '',
      };

      exportDataToCSV([...exportData, summaryRow], 'project-report', {
        'Project Code': 'رمز المشروع',
        'Project Name': 'اسم المشروع',
        'Status': 'الحالة',
        'Start Date': 'تاريخ البدء',
        'End Date': 'تاريخ الانتهاء',
        'Total Amount': 'إجمالي المبلغ',
        'Paid Amount': 'المبلغ المدفوع',
        'Unpaid Amount': 'المبلغ غير المدفوع',
        'Completion Rate': 'معدل الإنجاز',
        'Client': 'العميل',
        'Location': 'الموقع',
      });

      showSuccess('تم تصدير تقرير المشاريع بنجاح');
    } catch (error) {
      console.error('Export error:', error);
      showError('فشل تصدير تقرير المشاريع. يرجى المحاولة مرة أخرى.');
    }
  };

  const statusChart = useMemo(() => {
    const projects = projectsData?.content || [];
    const statuses = { ACTIVE: 0, COMPLETED: 0, ON_HOLD: 0 };

    projects.forEach(p => {
      const status = p.status?.toUpperCase();
      if (status === 'ACTIVE') statuses.ACTIVE++;
      else if (status === 'COMPLETED') statuses.COMPLETED++;
      else if (status === 'ON_HOLD' || status === 'ONHOLD') statuses.ON_HOLD++;
    });

    const option = {
      title: { text: chartT.projectStatus, left: 'center', textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' } },
      tooltip: { trigger: 'item' as const },
      series: [{
        type: 'pie' as const,
        radius: ['40%', '70%'],
        data: [
          { value: statuses.ACTIVE, name: chartT.active, itemStyle: { color: '#059669' } },
          { value: statuses.COMPLETED, name: chartT.completed, itemStyle: { color: '#3b82f6' } },
          { value: statuses.ON_HOLD, name: chartT.onHold, itemStyle: { color: '#DC2626' } },
        ],
      }],
    } as EChartsOption;

    return getResponsiveChartOption(option, 'ar');
  }, [projectsData, chartT]);

  const paymentsChart = useMemo(() => {
    const option = {
      title: { text: chartT.paymentStatus, left: 'center', textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' } },
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      xAxis: { type: 'category' as const, data: [chartT.paid, chartT.unpaid, chartT.partial] },
      yAxis: { type: 'value' as const, name: chartT.sar },
      series: [{
        type: 'bar' as const,
        data: [paymentStats.paid, paymentStats.unpaid, paymentStats.partial],
        itemStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#0f3a94' }, { offset: 1, color: '#0c2b7a' }] } },
      }],
    } as EChartsOption;

    return getResponsiveChartOption(option, 'ar');
  }, [paymentStats, chartT]);

  return (
    <Box
      sx={{
        flex: 1,
        backgroundColor: '#F8F9FC',
      }}
    >
      <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
        {(loadingProjects || loadingPayments) && <LoadingSpinner />}
        {projectsError && (
          <ErrorDisplay
            message={projectsError || 'فشل تحميل بيانات المشاريع'}
            onRetry={fetchProjects}
          />
        )}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeInUp 0.6s ease-out 0.2s both', '@keyframes fadeInUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
              تقارير المشاريع
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              تحليلات شاملة للمشاريع ومقاييس الأداء
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={loadingProjects || loadingPayments || !projectsData?.content || projectsData.content.length === 0}
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
            { label: 'إجمالي المشاريع', value: stats.totalProjects, color: '#0c2b7a' },
            { label: 'المشاريع النشطة', value: stats.activeProjects, color: '#059669' },
            { label: 'إجمالي القيمة', value: `${(stats.totalValue / 1000000).toFixed(1)} مليون ريال`, color: '#F59E0B' },
            { label: 'مكتمل', value: stats.completedProjects, color: '#3b82f6' },
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
              md: 'repeat(2, 1fr)',
            },
            gap: 3,
          }}
        >
          <Paper sx={{ padding: 3, borderRadius: '12px', animation: 'fadeInUp 0.6s ease-out 0.7s both', minHeight: '400px' }}>
            {loadingProjects ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Typography>جاري التحميل...</Typography>
              </Box>
            ) : (
              <SafeECharts option={statusChart} style={{ height: '400px', width: '100%' }} />
            )}
          </Paper>
          <Paper sx={{ padding: 3, borderRadius: '12px', animation: 'fadeInUp 0.6s ease-out 0.8s both', minHeight: '400px' }}>
            {loadingProjects || loadingPayments ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Typography>جاري التحميل...</Typography>
              </Box>
            ) : (
              <SafeECharts option={paymentsChart} style={{ height: '400px', width: '100%' }} />
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}


