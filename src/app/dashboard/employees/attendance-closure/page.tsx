'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Chip,
} from '@mui/material';
import {
  Add,
  Lock,
  LockOpen,
  Fullscreen,
  FullscreenExit,
  Refresh,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  useMaterialReactTable,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import type { AttendanceDayClosure } from '@/types';
import AttendanceClosureForm from '@/components/forms/AttendanceClosureForm';
import useRouteProtection from '@/hooks/useRouteProtection';
import { attendanceClosureApi } from '@/lib/api/attendance';
import { mapAttendanceClosureResponseListToAttendanceDayClosureList } from '@/lib/mappers/attendanceClosureMapper';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';
import { formatInvariantDate } from '@/lib/utils/dateFormatter';

export default function AttendanceClosurePage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [closures, setClosures] = useState<AttendanceDayClosure[]>([]);
  const [selectedClosure, setSelectedClosure] = useState<AttendanceDayClosure | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Pagination and sorting state for MRT
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [totalElements, setTotalElements] = useState(0);

  // Protect route - Admin only
  useRouteProtection(['Admin']);

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

  const handleAdd = () => {
    setSelectedClosure(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (closure: AttendanceDayClosure) => {
    setSelectedClosure(closure);
    setIsEditModalOpen(true);
  };

  // Fetch attendance closures from API
  const { execute: fetchClosures, loading: loadingClosures, error: closuresError } = useApiWithToast(
    useCallback(async () => {
      const params = {
        page: pagination.pageIndex,
        size: pagination.pageSize,
        sortBy: 'attendanceDate',
        sortDirection: 'desc' as const,
      };

      const response = await attendanceClosureApi.getAllAttendanceClosures(params);

      // Ensure response and content are defined
      const content = response?.content || [];
      const totalElements = response?.totalElements || 0;

      const mappedClosures = mapAttendanceClosureResponseListToAttendanceDayClosureList(content);
      setClosures(mappedClosures);
      setTotalElements(totalElements);

      return response;
    }, [pagination.pageIndex, pagination.pageSize]),
    { silent: true }
  );

  // Fetch closures when pagination changes
  useEffect(() => {
    fetchClosures();
  }, [fetchClosures]);

  const { execute: closeReopenDay, loading: processingClosure } = useApiWithToast(
    async (data: Partial<AttendanceDayClosure>, action: 'close' | 'reopen') => {
      if (!data.attendanceDate) return;

      const attendanceDate = data.attendanceDate instanceof Date
        ? data.attendanceDate.toISOString().split('T')[0]
        : new Date(data.attendanceDate).toISOString().split('T')[0];

      if (action === 'close') {
        await attendanceClosureApi.closeAttendanceDay({
          attendanceDate,
          notes: data.notes,
        });
      } else {
        await attendanceClosureApi.reopenAttendanceDay({
          attendanceDate,
          notes: data.notes,
        });
      }

      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedClosure(null);
      fetchClosures(); // Refresh data after action
    },
    {
      successMessage: 'تم تحديث إغلاق يوم الحضور بنجاح',
    }
  );

  const handleSubmit = async (data: Partial<AttendanceDayClosure>, action: 'close' | 'reopen') => {
    await closeReopenDay(data, action);
  };

  const columns = useMemo<MRT_ColumnDef<AttendanceDayClosure>[]>(
    () => [
      {
        accessorKey: 'closureId',
        header: 'الرقم',
        size: 100,
        minSize: 80,
        maxSize: 120,
      },
      {
        accessorKey: 'attendanceDate',
        header: 'التاريخ',
        size: 160,
        minSize: 140,
        maxSize: 200,
        filterVariant: 'date-range',
        Cell: ({ cell }) => formatInvariantDate(cell.getValue<Date>()),
      },
      {
        accessorKey: 'isClosed',
        header: 'الحالة',
        size: 150,
        minSize: 130,
        maxSize: 180,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: AttendanceDayClosure) => row.isClosed ? 'مغلق' : 'مفتوح'
        },
        Cell: ({ row }) => (
          <Chip
            label={row.original.isClosed ? 'مغلق' : 'مفتوح'}
            color={row.original.isClosed ? 'error' : 'success'}
            icon={row.original.isClosed ? <Lock /> : <LockOpen />}
            size="small"
            sx={{
              minWidth: 'fit-content',
              padding: '4px 12px',
              '& .MuiChip-label': {
                paddingLeft: '4px',
                paddingRight: '4px',
              },
            }}
          />
        ),
      },
      {
        accessorKey: 'closedDate',
        header: 'تاريخ الإغلاق',
        size: 200,
        minSize: 180,
        maxSize: 250,
        filterVariant: 'date-range',
        Cell: ({ row }) =>
          row.original.closedDate ? new Date(row.original.closedDate).toLocaleString('ar-SA') : 'غير متاح',
      },
      {
        accessorKey: 'reopenedDate',
        header: 'تاريخ إعادة الفتح',
        size: 200,
        minSize: 180,
        maxSize: 250,
        filterVariant: 'date-range',
        Cell: ({ row }) =>
          row.original.reopenedDate ? new Date(row.original.reopenedDate).toLocaleString('ar-SA') : 'غير متاح',
      },
      {
        accessorKey: 'notes',
        header: 'ملاحظات',
        size: 300,
        minSize: 200,
        maxSize: 400,
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    //  eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: closures as any,
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
      isLoading: loadingClosures,
      showAlertBanner: closuresError !== null,
      showProgressBars: loadingClosures,
    },
    muiToolbarAlertBannerProps: closuresError
      ? {
        color: 'error',
        children: closuresError,
      }
      : undefined,
    initialState: {
      density: 'comfortable',
      pagination: { pageSize: 25, pageIndex: 0 },
      showColumnFilters: false,
    },
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
    layoutMode: 'grid',

    renderTopToolbar: ({ table }) => (
      <TableToolbarWrapper table={table}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            sx={{
              backgroundColor: '#0c2b7a',
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: '#0a2368',
              },
              '& .MuiSvgIcon-root': {
                color: '#FFFFFF',
              },
            }}
          >
            إدارة الإغلاق
          </Button>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={() => fetchClosures()} sx={{ color: '#0c2b7a' }}>
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
    renderEmptyRowsFallback: () => (
      <Box sx={{ padding: '20px', textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          لم يتم العثور على إغلاقات حضور.
        </Typography>
      </Box>
    ),
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title={row.original.isClosed ? 'إعادة الفتح' : 'إغلاق'}>
          <IconButton
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={() => handleEdit(row.original as any)}
            sx={{
              color: row.original.isClosed ? '#2e7d32' : '#d32f2f',
              '&:hover': {
                backgroundColor: row.original.isClosed
                  ? 'rgba(46, 125, 50, 0.08)'
                  : 'rgba(211, 47, 47, 0.08)',
              },
            }}
          >
            {row.original.isClosed ? <LockOpen /> : <Lock />}
          </IconButton>
        </Tooltip>
      </Box>
    ),
    enableRowActions: true,
    positionActionsColumn: 'last',
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'الإجراءات',
        size: 200,
      },
    },
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
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
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
          width: '100%',
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
        '& .MuiTableCell-root': {
          padding: '12px 16px',
          whiteSpace: 'nowrap',
        },
        '& .MuiChip-root': {
          minWidth: 'fit-content',
          padding: '4px 12px',
        },
      }}
    >
      <MaterialReactTable table={table} />
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
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
              إغلاق يوم الحضور - وضع ملء الشاشة
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
          <Box
            sx={{
              flex: 1,
              padding: 0,
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
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: '#F8F9FC',
          opacity: isFullscreen ? 0 : 1,
          pointerEvents: isFullscreen ? 'none' : 'auto',
          transition: 'opacity 0.3s ease-out',
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <Box
            sx={{
              flex: 1,
              width: '100%',
              maxWidth: '100%',
              padding: { xs: '16px', sm: '24px', md: '32px' },
              animation: 'fadeInUp 0.6s ease-out 0.2s both',
              '@keyframes fadeInUp': {
                from: { opacity: 0, transform: 'translateY(20px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
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
                إغلاق يوم الحضور
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                إدارة إغلاق وإعادة فتح أيام الحضور
              </Typography>
            </Box>
            {tableWrapper}
          </Box>
        </Box>
      </Box>

      {/* Modals */}
      <AttendanceClosureForm
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSubmit}
        loading={processingClosure}
      />

      <AttendanceClosureForm
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={selectedClosure}
        loading={processingClosure}
      />
    </>
  );
}


