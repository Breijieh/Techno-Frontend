'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Payment,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import useRouteProtection from '@/hooks/useRouteProtection';
import { projectsApi } from '@/lib/api/projects';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import type { ProjectDuePayment } from '@/types';

export default function ProjectPaymentsReportPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [allPayments, setAllPayments] = useState<ProjectDuePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const { showError } = useToast();

  // Protect route
  useRouteProtection(['Admin', 'Finance Manager', 'Project Manager', 'General Manager']);

  // Fetch all projects
  const {
    data: projectsData,
    loading: loadingProjects,
    error: projectsError,
    execute: fetchProjects,
  } = useApi(() => projectsApi.getAllProjects({ size: 10000 }), { immediate: true });

  // Fetch payments for all projects
  const fetchAllPayments = useCallback(async () => {
    const projects = projectsData?.content || [];
    if (projects.length === 0) {
      setAllPayments([]);
      return;
    }

    setLoadingPayments(true);
    try {
      const paymentPromises = projects.map(project =>
        projectsApi.getProjectPayments(project.projectCode).catch(() => [])
      );
      const paymentArrays = await Promise.all(paymentPromises);
      const flatPayments = paymentArrays.flat();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedPayments = flatPayments as any as (ProjectDuePayment & { paidAmount?: number })[];

      setAllPayments(mappedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      showError('فشل تحميل بيانات الدفع');
    } finally {
      setLoadingPayments(false);
    }
  }, [projectsData, showError]);

  useEffect(() => {
    if (projectsData?.content && !loadingProjects) {
      fetchAllPayments();
    }
  }, [projectsData, loadingProjects, fetchAllPayments]);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Calculate statistics from real data
  const stats = useMemo(() => {
    const payments = allPayments || [];
    const totalPayments = payments.length;
    const paidPayments = payments.filter(p => p.paymentStatus === 'PAID').length;
    const unpaidPayments = payments.filter(p => p.paymentStatus === 'UNPAID' || p.paymentStatus === 'PARTIAL').length;
    const totalDueAmount = payments.reduce((sum, p) => sum + (p.dueAmount || 0), 0);

    // Calculate paid amount: use paidAmount from backend if available, otherwise use dueAmount for PAID payments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paidAmount = payments.reduce((sum: number, p: any) => {
      if (p.paymentStatus === 'PAID') {
        // For PAID, use paidAmount if available, otherwise use dueAmount
        return sum + (p.paidAmount || p.dueAmount || 0);
      } else if (p.paymentStatus === 'PARTIAL') {
        // For PARTIAL, use paidAmount if available
        return sum + (p.paidAmount || 0);
      }
      return sum;
    }, 0);

    // Unpaid amount: for UNPAID use full dueAmount, for PARTIAL use remaining (dueAmount - paidAmount)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unpaidAmount = payments.reduce((sum: number, p: any) => {
      if (p.paymentStatus === 'UNPAID') {
        return sum + (p.dueAmount || 0);
      } else if (p.paymentStatus === 'PARTIAL') {
        // For PARTIAL, calculate remaining amount
        const paid = p.paidAmount || 0;
        const due = p.dueAmount || 0;
        return sum + (due - paid);
      }
      return sum;
    }, 0);

    return {
      totalPayments,
      paidPayments,
      unpaidPayments,
      totalDueAmount,
      paidAmount,
      unpaidAmount,
    };
  }, [allPayments]);

  const content = (
    <Box sx={{ padding: '32px', backgroundColor: '#F8F9FC' }}>
      {(loadingProjects || loadingPayments) && <LoadingSpinner />}
      {(projectsError || (projectsData && !loadingProjects && !loadingPayments && allPayments.length === 0 && projectsData.content?.length === 0)) && (
        <ErrorDisplay
          error={projectsError || 'لم يتم العثور على مشاريع'}
          onRetry={fetchProjects}
        />
      )}

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
              >
                تقرير مدفوعات المشاريع
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                تقرير شامل عن حالة مدفوعات المشاريع والتحصيلات
              </Typography>
            </Box>
          </Box>
          <Tooltip title={isFullscreen ? 'الخروج من وضع ملء الشاشة' : 'دخول وضع ملء الشاشة'}>
            <IconButton
              onClick={handleToggleFullscreen}
              sx={{
                color: '#0c2b7a',
                '&:hover': {
                  backgroundColor: 'rgba(12, 43, 122, 0.08)',
                },
              }}
            >
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 4,
          animation: 'fadeInUp 0.6s ease-out 0.3s both',
        }}
      >
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #0c2b7a 0%, #0a266e 100%)', color: 'white' }}>
          <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>إجمالي المدفوعات</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>{stats.totalPayments}</Typography>
        </Paper>
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white' }}>
          <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>مدفوع</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>{stats.paidPayments}</Typography>
        </Paper>
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: 'white' }}>
          <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>غير مدفوع</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>{stats.unpaidPayments}</Typography>
        </Paper>
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: 'white' }}>
          <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>إجمالي المستحق</Typography>
          <Typography sx={{ fontSize: '24px', fontWeight: 700 }}>
            SAR {stats.totalDueAmount.toLocaleString()}
          </Typography>
        </Paper>
      </Box>

      {/* Additional Statistics */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 3,
          mb: 4,
        }}
      >
        <Paper sx={{ p: 3 }}>
          <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 2, color: '#111827' }}>
            ملخص الدفع
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ color: '#6B7280' }}>المبلغ المدفوع:</Typography>
              <Typography sx={{ fontWeight: 600, color: '#059669' }}>
                {stats.paidAmount.toLocaleString()} ريال
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ color: '#6B7280' }}>المبلغ غير المدفوع:</Typography>
              <Typography sx={{ fontWeight: 600, color: '#F59E0B' }}>
                {stats.unpaidAmount.toLocaleString()} ريال
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #E5E7EB' }}>
              <Typography sx={{ fontWeight: 600, color: '#111827' }}>إجمالي المستحق:</Typography>
              <Typography sx={{ fontWeight: 700, color: '#0c2b7a', fontSize: '18px' }}>
                {stats.totalDueAmount.toLocaleString()} ريال
              </Typography>
            </Box>
          </Box>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 2, color: '#111827' }}>
            حالة الدفع
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ color: '#6B7280' }}>مدفوع</Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {stats.totalPayments > 0 ? ((stats.paidPayments / stats.totalPayments) * 100).toFixed(1) : 0}%
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 8,
                  backgroundColor: '#E5E7EB',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${stats.totalPayments > 0 ? (stats.paidPayments / stats.totalPayments) * 100 : 0}%`,
                    backgroundColor: '#059669',
                  }}
                />
              </Box>
            </Box>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ color: '#6B7280' }}>غير مدفوع</Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {stats.totalPayments > 0 ? ((stats.unpaidPayments / stats.totalPayments) * 100).toFixed(1) : 0}%
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 8,
                  backgroundColor: '#E5E7EB',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${stats.totalPayments > 0 ? (stats.unpaidPayments / stats.totalPayments) * 100 : 0}%`,
                    backgroundColor: '#F59E0B',
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Fullscreen Container */}
      {isFullscreen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            backgroundColor: '#F8F9FC',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.3s ease-out',
            '@keyframes fadeIn': {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
          }}
        >
          {/* Fullscreen Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: '#111827' }}
            >
              تقرير مدفوعات المشاريع - ملء الشاشة
            </Typography>
            <Tooltip title="الخروج من وضع ملء الشاشة (ESC)">
              <IconButton
                onClick={handleToggleFullscreen}
                sx={{
                  color: '#0c2b7a',
                  '&:hover': {
                    backgroundColor: 'rgba(12, 43, 122, 0.08)',
                  },
                }}
              >
                <FullscreenExit />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Fullscreen Content */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              backgroundColor: '#F8F9FC',
            }}
          >
            {content}
          </Box>
        </Box>
      )}

      {/* Normal View */}
      <Box
        sx={{
          flex: 1,
          opacity: isFullscreen ? 0 : 1,
          pointerEvents: isFullscreen ? 'none' : 'auto',
          transition: 'opacity 0.3s ease-out',
        }}
      >
        {content}
      </Box>
    </>
  );
}


