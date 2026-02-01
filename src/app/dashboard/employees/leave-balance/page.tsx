'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  EventNote,
  Fullscreen,
  FullscreenExit,
  Refresh,
  AutoFixHigh,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
  type MRT_PaginationState,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import type { LeaveBalance } from '@/types';
import useRouteProtection from '@/hooks/useRouteProtection';
import { getUserRole } from '@/lib/permissions';
import { getUserContext } from '@/lib/dataFilters';
import { leavesApi, type LeaveBalanceDetailsResponse } from '@/lib/api/leaves';
import { mapLeaveBalanceResponseListToLeaveBalanceList } from '@/lib/mappers/leaveBalanceMapper';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';

export default function LeaveBalancePage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveBalanceResponses, setLeaveBalanceResponses] = useState<LeaveBalanceDetailsResponse[]>([]); // Store raw responses for employee names
  const [totalElements, setTotalElements] = useState(0);
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const userRole = getUserRole();
  const userContext = getUserContext();

  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'Employee']);

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
    const response = leaveBalanceResponses.find(r => r.employeeNo === employeeId);
    return response?.employeeName || `الموظف ${employeeId}`;
  }, [leaveBalanceResponses]);

  // Fetch leave balances from API
  const { execute: fetchLeaveBalances, loading: loadingLeaveBalances, error: leaveBalancesError } = useApiWithToast(
    async () => {
      const params: Parameters<typeof leavesApi.getAllLeaveBalances>[0] = {
        page: pagination.pageIndex,
        size: pagination.pageSize,
        sortBy: 'employeeNo',
        sortDirection: 'asc',
        employmentStatus: 'ACTIVE', // Only show active employees by default
      };

      // Apply role-based filtering
      if (userRole === 'Employee' && userContext.employeeId) {
        params.employeeNo = userContext.employeeId;
      }

      const response = await leavesApi.getAllLeaveBalances(params);

      const mappedBalances = mapLeaveBalanceResponseListToLeaveBalanceList(response.content);
      setLeaveBalances(mappedBalances);
      setLeaveBalanceResponses(response.content); // Store raw responses for employee names
      setTotalElements(response.totalElements);

      return response;
    },
    { silent: true, errorMessage: 'فشل تحميل أرصدة الإجازات' }
  );

  // Add 30 days annual allowance to all active employees
  const { execute: addAnnualAllowance, loading: addingAllowance } = useApiWithToast(
    async () => {
      await leavesApi.initializeBalances();
      await fetchLeaveBalances();
    },
    { successMessage: 'تم إضافة 30 يومًا لجميع أرصدة إجازات الموظفين النشطين', errorMessage: 'فشل إضافة أيام الإجازة' }
  );

  const handleAddAnnualAllowance = () => {
    if (window.confirm('هل أنت متأكد أنك تريد إضافة 30 يومًا لجميع أرصدة إجازات الموظفين النشطين؟ سيتم إضافة الأيام للرصيد الحالي.')) {
      addAnnualAllowance();
    }
  };

  // Fetch leave balances when pagination changes
  useEffect(() => {
    fetchLeaveBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, userRole, userContext.employeeId]);

  const columns = useMemo<MRT_ColumnDef<LeaveBalance>[]>(
    () => [
      {
        accessorKey: 'employeeName',
        header: 'اسم الموظف',
        size: 250,
        enableGlobalFilter: true,
        Cell: ({ row }) => {
          const name = row.original.employeeName || `الموظف ${row.original.employeeId}`;
          return (
            <Box>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                {name}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                رقم: {row.original.employeeId}
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: 'annualLeaveBalance',
        header: 'الإجازة السنوية',
        size: 150,
        filterVariant: 'range',
        enableGlobalFilter: false,
        Cell: ({ cell }) => `${cell.getValue<number>()} يوم`,
      },
      {
        accessorKey: 'sickLeaveBalance',
        header: 'إجازة المرض',
        size: 150,
        filterVariant: 'range',
        enableGlobalFilter: false,
        Cell: ({ cell }) => `${cell.getValue<number>()} يوم`,
      },
      {
        accessorKey: 'emergencyLeaveBalance',
        header: 'إجازة الطوارئ',
        size: 150,
        filterVariant: 'range',
        enableGlobalFilter: false,
        Cell: ({ cell }) => `${cell.getValue<number>()} يوم`,
      },
      {
        accessorKey: 'lastUpdated',
        header: 'آخر تحديث',
        size: 150,
        filterVariant: 'date-range',
        enableGlobalFilter: false,
        Cell: ({ cell }) => cell.getValue<Date>().toLocaleDateString('en-GB'),
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: leaveBalances as any,
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
          لم يتم العثور على أرصدة إجازات.
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
              onClick={() => fetchLeaveBalances()}
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
          {userRole === 'Admin' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={addingAllowance ? <CircularProgress size={20} color="inherit" /> : <AutoFixHigh />}
              onClick={handleAddAnnualAllowance}
              disabled={addingAllowance}
              sx={{
                backgroundColor: '#0c2b7a',
                '&:hover': {
                  backgroundColor: '#09215d',
                },
                textTransform: 'none',
                fontWeight: 600,
                '& .MuiSvgIcon-root': {
                  color: '#FFFFFF',
                },
              }}
            >
              {addingAllowance ? 'جاري الإضافة...' : 'إضافة 30 يومًا للجميع'}
            </Button>
          )}
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
      {loadingLeaveBalances ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : leaveBalancesError ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {typeof leaveBalancesError === 'string' ? leaveBalancesError : (leaveBalancesError as { message?: string }).message || 'فشل تحميل أرصدة الإجازات'}
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
              رصيد الإجازات - وضع ملء الشاشة
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
                >
                  رصيد الإجازات
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  عرض أرصدة إجازات الموظفين (سنوية، مرضية، طوارئ)
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


