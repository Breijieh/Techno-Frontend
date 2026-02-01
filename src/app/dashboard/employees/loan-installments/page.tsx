'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ReceiptLong,
  Fullscreen,
  FullscreenExit,
  Refresh,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
  type MRT_PaginationState,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import type { LoanInstallmentRecord } from '@/types';
import useRouteProtection from '@/hooks/useRouteProtection';
import { getUserRole } from '@/lib/permissions';
import { getUserContext } from '@/lib/dataFilters';
import { loansApi, type InstallmentScheduleResponse } from '@/lib/api/loans';
import { mapInstallmentResponseListToLoanInstallmentRecordList } from '@/lib/mappers/installmentMapper';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';

export default function LoanInstallmentsPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [installments, setInstallments] = useState<LoanInstallmentRecord[]>([]);
  const [installmentResponses, setInstallmentResponses] = useState<InstallmentScheduleResponse[]>([]); // Store raw responses for employee names
  const [totalElements, setTotalElements] = useState(0);
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const userRole = getUserRole();
  const userContext = getUserContext();

  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'Finance Manager', 'Employee']);

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

  // Get employee name from API response
  const getEmployeeName = useCallback((employeeId: number): string => {
    const response = installmentResponses.find(r => r.employeeNo === employeeId);
    return response?.employeeName || `الموظف ${employeeId}`;
  }, [installmentResponses]);

  // Fetch installments from API
  const { execute: fetchInstallments, loading: loadingInstallments, error: installmentsError } = useApiWithToast(
    async () => {
      const params: Parameters<typeof loansApi.getAllInstallments>[0] = {
        page: pagination.pageIndex,
        size: pagination.pageSize,
        sortBy: 'dueDate',
        sortDirection: 'desc',
      };

      // Apply role-based filtering
      if (userRole === 'Employee' && userContext.employeeId) {
        params.employeeNo = userContext.employeeId;
      }

      const response = await loansApi.getAllInstallments(params);

      const mappedInstallments = mapInstallmentResponseListToLoanInstallmentRecordList(response.content);
      setInstallments(mappedInstallments);
      setInstallmentResponses(response.content); // Store raw responses for employee names
      setTotalElements(response.totalElements);

      return response;
    },
    { silent: true, errorMessage: 'فشل تحميل الأقساط' }
  );

  // Fetch installments when pagination changes
  useEffect(() => {
    fetchInstallments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, userRole, userContext.employeeId]);

  const columns = useMemo<MRT_ColumnDef<LoanInstallmentRecord>[]>(
    () => [
      {
        accessorKey: 'employeeId',
        header: 'الموظف',
        size: 200,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: LoanInstallmentRecord) => {
            const response = installmentResponses.find(r => r.employeeNo === row.employeeId);
            return response?.employeeName || getEmployeeName(row.employeeId);
          }
        },
        Cell: ({ row }) => {
          // Use employeeName from API response if available
          const response = installmentResponses.find(r => r.employeeNo === row.original.employeeId);
          return response?.employeeName || getEmployeeName(row.original.employeeId);
        },
      },
      {
        accessorKey: 'loanRequestId',
        header: 'رقم القرض',
        size: 100,
      },
      {
        accessorKey: 'installmentNumber',
        header: 'رقم القسط',
        size: 120,
      },
      {
        accessorKey: 'dueDate',
        header: 'تاريخ الاستحقاق',
        size: 120,
        filterVariant: 'date-range',
        Cell: ({ cell }) => cell.getValue<Date>().toLocaleDateString('en-GB'),
      },
      {
        accessorKey: 'amount',
        header: 'المبلغ',
        size: 150,
        filterVariant: 'range',
        Cell: ({ cell }) => `ر.س ${cell.getValue<number>().toLocaleString('ar-SA')}`,
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        size: 120,
        filterVariant: 'multi-select',
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          const colors = {
            PAID: { bg: '#D1FAE5', text: '#065F46' },
            POSTPONED: { bg: '#FEF3C7', text: '#92400E' },
            PENDING: { bg: '#F3F4F6', text: '#374151' },
          };
          const color = colors[status as keyof typeof colors] || colors.PENDING;
          return (
            <Chip
              label={
                status === 'PAID' ? 'مدفوع' :
                  status === 'POSTPONED' ? 'مؤجل' :
                    status === 'PENDING' ? 'قيد الانتظار' : status
              }
              size="small"
              sx={{
                backgroundColor: color.bg,
                color: color.text,
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
        meta: {
          getFilterLabel: (row: LoanInstallmentRecord) => {
            const labels: Record<string, string> = {
              PAID: 'مدفوع',
              POSTPONED: 'مؤجل',
              PENDING: 'قيد الانتظار',
            };
            return labels[row.status] || row.status;
          }
        }
      },
      {
        accessorKey: 'paidDate',
        header: 'تاريخ الدفع',
        size: 120,
        filterVariant: 'date-range',
        Cell: ({ cell }) => cell.getValue<Date | undefined>()?.toLocaleDateString('en-GB') || '-',
      },
      {
        accessorKey: 'postponedTo',
        header: 'مؤجل إلى',
        size: 120,
        filterVariant: 'date-range',
        Cell: ({ cell }) => cell.getValue<Date | undefined>()?.toLocaleDateString('en-GB') || '-',
      },
    ],
    [installmentResponses, getEmployeeName]
  );

  const table = useMaterialReactTable({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: installments as any,
    enableRowSelection: false,
    enableColumnFilters: true,
    enableColumnResizing: true,
    enableStickyHeader: true,
    enableDensityToggle: true,
    enableFullScreenToggle: false,
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 80,
      maxSize: 500,
      size: 150,
    },
    manualPagination: true,
    rowCount: totalElements,
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
    initialState: {
      density: 'comfortable',
      showColumnFilters: false,
    },
    renderEmptyRowsFallback: () => (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          لم يتم العثور على أقساط.
        </Typography>
      </Box>
    ),
    localization: mrtArabicLocalization,
    ...lightTableTheme,
    muiTableContainerProps: {
      sx: {
        ...(lightTableTheme.muiTableContainerProps as { sx?: Record<string, unknown> })?.sx,
        overflowX: 'auto',
        maxWidth: '100%',
        width: '100%',
        ...(isFullscreen && { maxHeight: 'calc(100vh - 120px)' }),
      },
    },
    renderTopToolbar: ({ table }) => (
      <TableToolbarWrapper table={table}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث البيانات">
            <IconButton
              onClick={() => fetchInstallments()}
              sx={{
                color: '#0c2b7a',
                '&:hover': {
                  backgroundColor: 'rgba(12, 43, 122, 0.08)',
                },
              }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? 'إغلاق وضع ملء الشاشة' : 'دخول وضع ملء الشاشة'}>
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
      </TableToolbarWrapper>
    ),
  });

  const tableWrapper = (
    <Box
      sx={{
        animation: isFullscreen ? 'none' : 'fadeInUp 0.6s ease-out 0.4s both',
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        width: '100%',
        maxWidth: '100%',
        height: isFullscreen ? '100%' : 'auto',
        overflow: 'hidden',
        transition: isFullscreen ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), maxWidth 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '& .MuiPaper-root': {
          width: '100%',
          maxWidth: '100%',
          height: isFullscreen ? '100%' : 'auto',
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#F3F4F6',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#9CA3AF',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: '#6B7280',
            },
          },
        },
        '& .MuiTableContainer-root': {
          overflowX: 'auto !important',
          ...(isFullscreen && { maxHeight: 'calc(100vh - 120px)' }),
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#F3F4F6',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#9CA3AF',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: '#6B7280',
            },
          },
        },
      }}
    >
      {loadingInstallments ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : installmentsError ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {typeof installmentsError === 'string' ? installmentsError : (installmentsError as { message?: string })?.message || 'فشل تحميل الأقساط'}
        </Alert>
      ) : (
        <MaterialReactTable table={table} />
      )}
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
              جدول أقساط القروض - وضع ملء الشاشة
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

          {/* Fullscreen Table Container */}
          <Box
            sx={{
              flex: 1,
              padding: '24px',
              overflow: 'auto',
              backgroundColor: '#F8F9FC',
            }}
          >
            {tableWrapper}
          </Box>
        </Box>
      )}

      {/* Normal View */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: '#F8F9FC',
          opacity: isFullscreen ? 0 : 1,
          pointerEvents: isFullscreen ? 'none' : 'auto',
          transition: 'opacity 0.3s ease-out',
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
            <Box sx={{ mb: 1 }}>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
                >
                  جدول أقساط القروض
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  عرض جميع أقساط القروض وحالة الدفع
                </Typography>
              </Box>
            </Box>
          </Box>

          {tableWrapper}
        </Box>
      </Box>
    </>
  );
}


