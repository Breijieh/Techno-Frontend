'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import type { AttendanceTransaction } from '@/types';
import {
  Download,
  Fullscreen,
  FullscreenExit,
  ArrowBack,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table';
import useRouteProtection from '@/hooks/useRouteProtection';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import { attendanceApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { mapAttendanceResponseListToTransactionList } from '@/lib/mappers/attendanceMapper';
import { formatDate } from '@/lib/utils/dateFormatter';

export default function AttendanceHistoryPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Protect by permission: any role with attendance module can access own attendance history
  useRouteProtection();

  // Get current user's employee data
  const { data: employeeResponse, loading: loadingEmployee, error: employeeError } = useApi(
    () => employeesApi.getMyEmployee(),
    { immediate: true }
  );

  // Fetch attendance history - get all records (employees can only see their own via backend filtering)
  const { data: attendanceData, loading: loadingAttendance, error: attendanceError, execute: loadAttendance } = useApi(
    () => {
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      return attendanceApi.getMyAttendance({
        startDate,
        endDate,
        size: 10000, // Large size to get all records for the year
        sortBy: 'attendanceDate',
        sortDirection: 'desc',
      });
    },
    { immediate: false }
  );

  // Load attendance when employee data is loaded
  useEffect(() => {
    if (employeeResponse) {
      loadAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeResponse]);

  // Map attendance data to AttendanceTransaction format
  const filteredAttendance = useMemo(() => {
    if (!attendanceData?.content) return [];
    return mapAttendanceResponseListToTransactionList(attendanceData.content);
  }, [attendanceData]);

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

  const columns = useMemo<MRT_ColumnDef<AttendanceTransaction>[]>(
    () => [
      {
        accessorKey: 'attendanceDate',
        header: 'التاريخ',
        size: 130,
        Cell: ({ cell }) => formatDate(cell.getValue<Date>()),
      },
      {
        accessorKey: 'entryTime',
        header: 'وقت الدخول',
        size: 110,
      },
      {
        accessorKey: 'exitTime',
        header: 'وقت الخروج',
        size: 110,
      },
      {
        accessorKey: 'scheduledHours',
        header: 'المجدول',
        size: 110,
      },
      {
        accessorKey: 'workingHours',
        header: 'ساعات العمل',
        size: 130,
      },
      {
        accessorKey: 'overtimeCalc',
        header: 'ساعات إضافية',
        size: 110,
        Cell: ({ cell }) => {
          const overtime = cell.getValue<string>();
          return overtime !== '00:00' ? (
            <Chip
              label={overtime}
              size="small"
              sx={{
                backgroundColor: '#DBEAFE',
                color: '#1E40AF',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          ) : (
            <Typography sx={{ fontSize: '12px', color: '#9CA3AF' }}>-</Typography>
          );
        },
      },
      {
        accessorKey: 'delayedCalc',
        header: 'تأخير',
        size: 110,
        Cell: ({ cell }) => {
          const delayed = cell.getValue<string>();
          return delayed !== '00:00' ? (
            <Chip
              label={delayed}
              size="small"
              sx={{
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          ) : (
            <Typography sx={{ fontSize: '12px', color: '#9CA3AF' }}>-</Typography>
          );
        },
      },
      {
        accessorKey: 'earlyOutCalc',
        header: 'خروج مبكر',
        size: 110,
        Cell: ({ cell }) => {
          const earlyOut = cell.getValue<string>();
          return earlyOut !== '00:00' ? (
            <Chip
              label={earlyOut}
              size="small"
              sx={{
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          ) : (
            <Typography sx={{ fontSize: '12px', color: '#9CA3AF' }}>-</Typography>
          );
        },
      },
      {
        accessorKey: 'shortageHours',
        header: 'نقص ساعات',
        size: 110,
        Cell: ({ cell }) => {
          const shortage = cell.getValue<string>();
          return shortage !== '00:00' ? (
            <Chip
              label={shortage}
              size="small"
              sx={{
                backgroundColor: '#FECACA',
                color: '#7F1D1D',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          ) : (
            <Typography sx={{ fontSize: '12px', color: '#9CA3AF' }}>-</Typography>
          );
        },
      },
      {
        accessorKey: 'absenceFlag',
        header: 'الحالة',
        size: 140,
        Cell: ({ row }) => {
          const isAbsent = row.original.absenceFlag === 'Y';
          const isAutoCheckout = row.original.isAutoCheckout === 'Y';
          const isManualEntry = row.original.isManualEntry === 'Y';
          const isWeekendWork = row.original.isWeekendWork === 'Y';
          const isHolidayWork = row.original.isHolidayWork === 'Y';
          
          return (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                label={isAbsent ? 'غائب' : 'حاضر'}
                size="small"
                sx={{
                  backgroundColor: isAbsent ? '#FEE2E2' : '#D1FAE5',
                  color: isAbsent ? '#991B1B' : '#065F46',
                  fontWeight: 600,
                  fontSize: '10px',
                }}
              />
              {isAutoCheckout && (
                <Chip
                  label="تلقائي"
                  size="small"
                  sx={{
                    backgroundColor: '#E0E7FF',
                    color: '#3730A3',
                    fontWeight: 600,
                    fontSize: '10px',
                  }}
                />
              )}
              {isManualEntry && (
                <Chip
                  label="يدوي"
                  size="small"
                  sx={{
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    fontWeight: 600,
                    fontSize: '10px',
                  }}
                />
              )}
              {(isWeekendWork || isHolidayWork) && (
                <Chip
                  label={isHolidayWork ? 'عطلة' : 'نهاية أسبوع'}
                  size="small"
                  sx={{
                    backgroundColor: '#FCE7F3',
                    color: '#9D174D',
                    fontWeight: 600,
                    fontSize: '10px',
                  }}
                />
              )}
            </Box>
          );
        },
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredAttendance,
    enableRowSelection: false,
    enableColumnFilters: true,
    enableColumnOrdering: true,
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
    initialState: {
      density: 'comfortable',
      pagination: { pageSize: 25, pageIndex: 0 },
    },
    localization: mrtArabicLocalization,
    ...lightTableTheme,
    muiTableContainerProps: {
      sx: {
        ...(lightTableTheme.muiTableContainerProps as { sx?: Record<string, unknown> })?.sx,
        overflowX: 'auto',
        maxWidth: '100%',
        width: '100%',
      },
    },
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<Download />}
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
          تصدير
        </Button>
        <Tooltip title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}>
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
              سجل الحضور - ملء الشاشة
            </Typography>
            <Tooltip title="الخروج من ملء الشاشة (ESC)">
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
          <Box sx={{ flex: 1, padding: '24px', overflow: 'auto', backgroundColor: '#F8F9FC' }}>
            {tableWrapper}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
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
          }}
        >
          <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={() => router.push('/dashboard')}
                sx={{ textTransform: 'none' }}
              >
                رجوع
              </Button>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
                  سجل الحضور الخاص بي
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  عرض سجلات الحضور والحسابات الخاصة بك
                </Typography>
              </Box>
            </Box>

            {loadingEmployee || loadingAttendance ? (
              <LoadingSpinner />
            ) : employeeError || attendanceError ? (
              <ErrorDisplay
                error={employeeError || attendanceError || 'فشل تحميل سجل الحضور'}
                onRetry={() => {
                  if (employeeError) {
                    // Will retry automatically via useApi
                  } else if (attendanceError && employeeResponse) {
                    loadAttendance();
                  }
                }}
              />
            ) : (
              tableWrapper
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
}


