'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  EventNote,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import useRouteProtection from '@/hooks/useRouteProtection';
import { reportsApi } from '@/lib/api/reports';
import { useApi } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import type { LeaveRequest, RequestStatus } from '@/types';
import type { LeaveDetailsResponse } from '@/lib/api/leaves';

export default function EmployeeLeavesReportPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);


  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'General Manager']);

  // Fetch employee leaves report (no date filter - get all)
  const {
    data: leavesData,
    loading: loadingLeaves,
    error: leavesError,
    execute: fetchLeaves,
  } = useApi(() => reportsApi.getEmployeeLeavesReport({}), { immediate: true });

  // Map backend data to LeaveRequest format
  const leaveRequests = useMemo((): LeaveRequest[] => {
    if (!leavesData || !Array.isArray(leavesData)) return [];

    return leavesData.map((item: LeaveDetailsResponse) => ({
      requestId: item.leaveId || 0,
      employeeId: item.employeeNo || 0,
      leaveType: 'ANNUAL', // Default, backend may not provide this
      fromDate: new Date(item.leaveFromDate || new Date()),
      toDate: new Date(item.leaveToDate || new Date()),
      numberOfDays: Number(item.leaveDays || 0),
      reason: item.leaveReason || '',
      status: item.transStatus === 'A'
        ? 'APPROVED'
        : item.transStatus === 'R'
          ? 'REJECTED'
          : item.transStatus === 'N'
            ? 'NEW'
            : 'INPROCESS' as RequestStatus,
      requestDate: new Date(item.requestDate || new Date()),
      nextApproval: item.nextApproval ?? undefined,
      nextLevel: item.nextAppLevel ?? undefined,
    }));
  }, [leavesData]);

  // Calculate statistics from real data
  const stats = useMemo(() => {
    const totalRequests = leaveRequests.length;
    const approvedRequests = leaveRequests.filter(r => r.status === 'APPROVED').length;
    const pendingRequests = leaveRequests.filter(r => r.status === 'NEW' || r.status === 'INPROCESS').length;
    const rejectedRequests = leaveRequests.filter(r => r.status === 'REJECTED').length;
    const totalDays = leaveRequests.reduce((sum, r) => sum + (r.numberOfDays || 0), 0);
    const approvedDays = leaveRequests
      .filter(r => r.status === 'APPROVED')
      .reduce((sum, r) => sum + (r.numberOfDays || 0), 0);

    return {
      totalRequests,
      approvedRequests,
      pendingRequests,
      rejectedRequests,
      totalDays,
      approvedDays,
    };
  }, [leaveRequests]);

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

  const content = (
    <Box sx={{ padding: '32px', backgroundColor: '#F8F9FC' }}>
      {loadingLeaves && <LoadingSpinner />}
      {leavesError && (
        <ErrorDisplay
          error={leavesError || 'فشل تحميل إجازات الموظفين'}
          onRetry={fetchLeaves}
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
          <Box>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
              >
                تقرير إجازات الموظفين
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                تقرير شامل عن طلبات إجازات الموظفين والإحصائيات
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
          <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>إجمالي الطلبات</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>{stats.totalRequests}</Typography>
        </Paper>
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white' }}>
          <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>مقبول</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>{stats.approvedRequests}</Typography>
        </Paper>
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: 'white' }}>
          <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>قيد الانتظار</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>{stats.pendingRequests}</Typography>
        </Paper>
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: 'white' }}>
          <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>مرفوض</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>{stats.rejectedRequests}</Typography>
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
            ملخص أيام الإجازة
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ color: '#6B7280' }}>إجمالي الأيام المطلوبة:</Typography>
              <Typography sx={{ fontWeight: 600, color: '#0c2b7a' }}>
                {stats.totalDays} يوم
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ color: '#6B7280' }}>الأيام المقبولة:</Typography>
              <Typography sx={{ fontWeight: 600, color: '#059669' }}>
                {stats.approvedDays} يوم
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #E5E7EB' }}>
              <Typography sx={{ fontWeight: 600, color: '#111827' }}>معدل القبول:</Typography>
              <Typography sx={{ fontWeight: 700, color: '#0c2b7a', fontSize: '18px' }}>
                {stats.totalRequests > 0 ? ((stats.approvedRequests / stats.totalRequests) * 100).toFixed(1) : 0}%
              </Typography>
            </Box>
          </Box>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 2, color: '#111827' }}>
            توزيع حالة الطلبات
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ color: '#6B7280' }}>مقبول</Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {stats.totalRequests > 0 ? ((stats.approvedRequests / stats.totalRequests) * 100).toFixed(1) : 0}%
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
                    width: `${stats.totalRequests > 0 ? (stats.approvedRequests / stats.totalRequests) * 100 : 0}%`,
                    backgroundColor: '#059669',
                  }}
                />
              </Box>
            </Box>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ color: '#6B7280' }}>قيد الانتظار</Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {stats.totalRequests > 0 ? ((stats.pendingRequests / stats.totalRequests) * 100).toFixed(1) : 0}%
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
                    width: `${stats.totalRequests > 0 ? (stats.pendingRequests / stats.totalRequests) * 100 : 0}%`,
                    backgroundColor: '#F59E0B',
                  }}
                />
              </Box>
            </Box>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ color: '#6B7280' }}>مرفوض</Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {stats.totalRequests > 0 ? ((stats.rejectedRequests / stats.totalRequests) * 100).toFixed(1) : 0}%
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
                    width: `${stats.totalRequests > 0 ? (stats.rejectedRequests / stats.totalRequests) * 100 : 0}%`,
                    backgroundColor: '#EF4444',
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
              تقرير إجازات الموظفين - ملء الشاشة
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


