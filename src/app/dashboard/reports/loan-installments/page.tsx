'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  ReceiptLong,
  Fullscreen,
  FullscreenExit,
  Search,
} from '@mui/icons-material';
import { formatDate } from '@/lib/utils/dateFormatter';
import useRouteProtection from '@/hooks/useRouteProtection';
import { reportsApi } from '@/lib/api/reports';
import { useApi } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import type { LoanInstallment } from '@/types';

export default function LoanInstallmentReportPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');


  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'Finance Manager']);

  // Get current month in YYYY-MM format
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // Fetch loan installments report for current month
  const {
    data: installmentsData,
    loading: loadingInstallments,
    error: installmentsError,
    execute: fetchInstallments,
  } = useApi(() => reportsApi.getLoanInstallmentsReport(currentMonth), { immediate: true });

  // Map backend data to LoanInstallment format
  const installments = useMemo((): LoanInstallment[] => {
    return (installmentsData as LoanInstallment[]) || [];
  }, [installmentsData]);

  // Filter installments
  const filteredInstallments = useMemo(() => {
    return installments.filter(inst => {
      const search = searchTerm.toLowerCase();
      return (
        inst.employeeName?.toLowerCase().includes(search) ||
        inst.loanId.toString().includes(search) ||
        inst.installmentNo.toString().includes(search)
      );
    });
  }, [installments, searchTerm]);

  // Calculate statistics from real data
  const stats = useMemo(() => {
    const totalInstallments = installments.length;
    const paidInstallments = installments.filter(i => i.status === 'PAID').length;
    const pendingInstallments = installments.filter(i => i.status === 'PENDING').length;
    const totalAmount = installments.reduce((sum, i) => sum + (i.installmentAmount || 0), 0);
    const paidAmount = installments
      .filter((i: LoanInstallment) => i.status === 'PAID')
      .reduce((sum: number, i: LoanInstallment) => sum + (i.installmentAmount || 0), 0);
    const pendingAmount = installments
      .filter((i: LoanInstallment) => i.status === 'PENDING')
      .reduce((sum: number, i: LoanInstallment) => sum + (i.installmentAmount || 0), 0);
    const postponedAmount = installments
      .filter((i: LoanInstallment) => i.status === 'POSTPONED')
      .reduce((sum: number, i: LoanInstallment) => sum + (i.installmentAmount || 0), 0);
    const postponedInstallments = installments.filter(i => i.status === 'POSTPONED').length;

    return {
      totalInstallments,
      paidInstallments,
      pendingInstallments,
      totalAmount,
      paidAmount,
      pendingAmount,
      postponedAmount,
      postponedInstallments
    };
  }, [installments]);

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
      {loadingInstallments && <LoadingSpinner />}
      {installmentsError && (
        <ErrorDisplay
          error={installmentsError || 'فشل تحميل أقساط القروض'}
          onRetry={fetchInstallments}
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
                تقرير أقساط القروض
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                تقرير شامل عن أقساط القروض وحالة الدفع
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
          <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>إجمالي الأقساط</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>{stats.totalInstallments}</Typography>
        </Paper>
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white' }}>
          <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>مدفوع</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>{stats.paidInstallments}</Typography>
        </Paper>
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: 'white' }}>
          <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>قيد الانتظار</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>{stats.pendingInstallments}</Typography>
        </Paper>
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: 'white' }}>
          <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>إجمالي المبلغ</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>
            SAR {stats.totalAmount.toLocaleString()}
          </Typography>
        </Paper>
        {stats.postponedInstallments > 0 && (
          <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', color: 'white' }}>
            <Typography sx={{ fontSize: '14px', opacity: 0.9, mb: 1 }}>مؤجلة</Typography>
            <Typography sx={{ fontSize: '32px', fontWeight: 700 }}>{stats.postponedInstallments}</Typography>
          </Paper>
        )}
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
              <Typography sx={{ color: '#6B7280' }}>المبلغ المعلق:</Typography>
              <Typography sx={{ fontWeight: 600, color: '#F59E0B' }}>
                {stats.pendingAmount.toLocaleString()} ريال
              </Typography>
            </Box>
            {stats.postponedAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ color: '#6B7280' }}>المبلغ المؤجل:</Typography>
                <Typography sx={{ fontWeight: 600, color: '#EF4444' }}>
                  {stats.postponedAmount.toLocaleString()} ريال
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #E5E7EB' }}>
              <Typography sx={{ fontWeight: 600, color: '#111827' }}>الإجمالي:</Typography>
              <Typography sx={{ fontWeight: 700, color: '#0c2b7a', fontSize: '18px' }}>
                {stats.totalAmount.toLocaleString()} ريال
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
                  {stats.totalInstallments > 0 ? ((stats.paidInstallments / stats.totalInstallments) * 100).toFixed(1) : 0}%
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
                    width: `${stats.totalInstallments > 0 ? (stats.paidInstallments / stats.totalInstallments) * 100 : 0}%`,
                    backgroundColor: '#059669',
                  }}
                />
              </Box>
            </Box>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ color: '#6B7280' }}>قيد الانتظار</Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {stats.totalInstallments > 0 ? ((stats.pendingInstallments / stats.totalInstallments) * 100).toFixed(1) : 0}%
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
                    width: `${stats.totalInstallments > 0 ? (stats.pendingInstallments / stats.totalInstallments) * 100 : 0}%`,
                    backgroundColor: '#F59E0B',
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Installments Table */}
      <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>تفاصيل الأقساط</Typography>
          <TextField
            size="small"
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 250 }}
          />
        </Box>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="installments table">
            <TableHead>
              <TableRow>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>رقم القرض</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>رقم القسط</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>الموظف</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>تاريخ الاستحقاق</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>المبلغ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>تاريخ الدفع/التأجيل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInstallments.length > 0 ? (
                filteredInstallments.map((row) => (
                  <TableRow key={`${row.loanId}-${row.installmentNo}`} hover sx={{ backgroundColor: row.status === 'POSTPONED' ? '#FEF2F2' : 'inherit' }}>
                    <TableCell align="right">{row.loanId}</TableCell>
                    <TableCell align="right">{row.installmentNo}</TableCell>
                    <TableCell align="right">{row.employeeName || '-'}</TableCell>
                    <TableCell align="right">{formatDate(row.dueDate)}</TableCell>
                    <TableCell align="right">{row.installmentAmount.toLocaleString()} ر.س</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={row.status === 'PAID' ? 'مدفوع' : row.status === 'POSTPONED' ? 'مؤجل' : 'قيد الانتظار'}
                        color={row.status === 'PAID' ? 'success' : row.status === 'POSTPONED' ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {row.status === 'PAID'
                        ? formatDate(row.paidDate)
                        : row.status === 'POSTPONED'
                          ? `إلى: ${formatDate(row.postponedTo)}`
                          : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography color="textSecondary">لا توجد بيانات</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box >
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
              تقرير أقساط القروض - ملء الشاشة
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


