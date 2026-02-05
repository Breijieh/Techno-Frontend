'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Chip,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Description,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import type { SystemLog } from '@/types';
import useRouteProtection from '@/hooks/useRouteProtection';
import { systemLogsApi, mapBackendToFrontend } from '@/lib/api/systemLogs';
import { useApi } from '@/hooks/useApi';
import { formatDateTime } from '@/lib/utils/dateFormatter';

export default function SystemLogsPage() {
  const router = useRouter();
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      // Prevent body scroll when in fullscreen
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

  // Fetch system logs from backend
  const fetchLogsFunction = useCallback(() => {
    return systemLogsApi.getAllLogs({
      page: 0,
      size: 50,
      level: levelFilter === 'all' ? undefined : levelFilter as 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG',
    });
  }, [levelFilter]);

  const { data: logsData } = useApi(
    fetchLogsFunction,
    { immediate: true }
  );

  // Map backend data to frontend format
  const mappedLogs = useMemo(() => {
    if (!logsData?.content) return [];
    return logsData.content.map(mapBackendToFrontend);
  }, [logsData]);

  // Filter logs client-side (for immediate UI response, backend also filters)
  const filteredLogs = levelFilter === 'all'
    ? mappedLogs
    : mappedLogs.filter(log => log.level === levelFilter);

  const columns = useMemo<MRT_ColumnDef<SystemLog>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: 'الوقت',
        size: 180,
        Cell: ({ cell }) => formatDateTime(cell.getValue<Date>()),
      },
      {
        accessorKey: 'level',
        header: 'المستوى',
        size: 100,
        Cell: ({ cell }) => {
          const level = cell.getValue<string>();
          const levelLabels: Record<string, string> = {
            INFO: 'معلومات',
            WARNING: 'تحذير',
            ERROR: 'خطأ',
            DEBUG: 'تصحيح',
          };
          const colors = {
            INFO: { bg: '#DBEAFE', text: '#1E40AF' },
            WARNING: { bg: '#FEF3C7', text: '#92400E' },
            ERROR: { bg: '#FEE2E2', text: '#991B1B' },
            DEBUG: { bg: '#F3F4F6', text: '#6B7280' },
          };
          const color = colors[level as keyof typeof colors] || colors.INFO;
          return (
            <Chip
              label={levelLabels[level] || level}
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
      },
      {
        accessorKey: 'module',
        header: 'الوحدة',
        size: 150,
      },
      {
        accessorKey: 'actionType',
        header: 'الإجراء',
        size: 200,
      },
      {
        accessorKey: 'userId',
        header: 'رقم المستخدم',
        size: 100,
      },
      {
        accessorKey: 'description',
        header: 'الرسالة',
        size: 350,
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredLogs || [],
    enableRowSelection: false,
    enableColumnFilters: false,
    enableColumnResizing: true,
    enableStickyHeader: true,
    enableDensityToggle: true,
    enableFullScreenToggle: false, // Disable built-in fullscreen, using custom
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 80,
      maxSize: 500,
      size: 150,
    },
    initialState: {
      density: 'comfortable',
      pagination: { pageSize: 50, pageIndex: 0 },
      sorting: [{ id: 'timestamp', desc: true }],
    },
    localization: mrtArabicLocalization,
    ...lightTableTheme,
    muiTableContainerProps: {
      sx: {
        overflowX: 'auto',
        maxWidth: '100%',
        width: '100%',
        ...(isFullscreen && { maxHeight: 'calc(100vh - 120px)' }),
      },
    },
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          select
          size="small"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          SelectProps={{ displayEmpty: true }}
          sx={{
            minWidth: 150,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#FFFFFF',
              '& fieldset': { borderColor: '#E5E7EB' },
              '&:hover fieldset': { borderColor: '#0c2b7a' },
              '&.Mui-focused fieldset': { borderColor: '#0c2b7a', borderWidth: '2px' },
            },
            '& .MuiSelect-select': {
              color: levelFilter && levelFilter !== 'all' ? '#111827' : '#9CA3AF',
            },
          }}
        >
          <MenuItem value="all">جميع المستويات</MenuItem>
          <MenuItem value="INFO">معلومات</MenuItem>
          <MenuItem value="WARNING">تحذير</MenuItem>
          <MenuItem value="ERROR">خطأ</MenuItem>
          <MenuItem value="DEBUG">تصحيح</MenuItem>
        </TextField>
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
        transition: isFullscreen ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
              سجلات النظام - ملء الشاشة
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

          {/* Fullscreen Table Container */}
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
          flex: 1,
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
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
            >
              سجلات النظام
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              عرض ومراقبة سجلات نشاط النظام والأحداث
            </Typography>
          </Box>
          {tableWrapper}
        </Box>
      </Box>
    </>
  );
}


