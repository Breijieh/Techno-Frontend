'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  EventNote,
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
import type { Holiday } from '@/types';
import HolidayForm from '@/components/forms/HolidayForm';
import HolidayViewForm from '@/components/forms/HolidayViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { holidaysApi, groupConsecutiveHolidays, type HolidayResponse } from '@/lib/api/holidays';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatDate } from '@/lib/utils/dateFormatter';

export default function HolidaysPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  // Fetch holidays from backend
  const { data: holidaysData, loading: loadingHolidays, error: holidaysError, execute: fetchHolidays } = useApi(
    () => holidaysApi.getAllHolidays(currentYear),
    { immediate: true }
  );

  // Map backend holidays to frontend format with grouping
  const holidays = useMemo(() => {
    if (!holidaysData || holidaysData.length === 0) return [];
    return groupConsecutiveHolidays(holidaysData);
  }, [holidaysData]);

  // Create holiday API (handles date ranges)
  const createHoliday = useApiWithToast(
    async (holiday: Partial<Holiday>) => {
      return holidaysApi.createHoliday(holiday);
    },
    {
      successMessage: () => 'تم إنشاء العطلة بنجاح',
      onSuccess: () => {
        fetchHolidays();
        setIsAddModalOpen(false);
        setSelectedHoliday(null);
      },
    }
  );

  // Update holiday API
  const updateHoliday = useApiWithToast(
    async ({ id, request }: { id: number; request: { holidayDate: string; holidayName: string; holidayYear: number; isRecurring?: string; isActive?: string } }) => {
      return holidaysApi.updateHoliday(id, request);
    },
    {
      successMessage: () => 'تم تحديث العطلة بنجاح',
      onSuccess: () => {
        fetchHolidays();
        setIsEditModalOpen(false);
        setSelectedHoliday(null);
      },
    }
  );

  // Delete holiday API
  // Note: For date ranges, we need to delete all holidays in the range
  const deleteHoliday = useApiWithToast(
    async (holiday: Holiday) => {
      // Use stored holiday IDs if available, otherwise find by date range
      if (holiday.holidayIds && holiday.holidayIds.length > 0) {
        // Delete all holidays in the range using stored IDs
        await Promise.all(holiday.holidayIds.map(id => holidaysApi.deleteHoliday(id)));
      } else {
        // Fallback: Find all holidays in the date range with same name and year
        const rangeHolidays = holidaysData?.filter((h: HolidayResponse) => {
          const hDate = new Date(h.holidayDate);
          return (
            hDate >= holiday.fromDate &&
            hDate <= holiday.toDate &&
            h.holidayYear === holiday.gregYear &&
            h.holidayName?.toLowerCase().includes(holiday.holidayType.toLowerCase())
          );
        }) || [];

        // Delete all holidays in the range
        await Promise.all(rangeHolidays.map((h: HolidayResponse) => holidaysApi.deleteHoliday(h.holidayId)));
      }
    },
    {
      successMessage: () => 'تم حذف العطلة بنجاح',
      onSuccess: () => {
        fetchHolidays();
        setIsDeleteModalOpen(false);
        setSelectedHoliday(null);
      },
    }
  );

  // Protect route
  useRouteProtection(['Admin', 'HR Manager']);

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

  const columns = useMemo<MRT_ColumnDef<Holiday>[]>(
    () => [
      {
        id: 'holidayName',
        header: 'اسم العطلة',
        size: 280,
        Cell: ({ row }) => {
          const { holidayType, holidayName } = row.original;
          const typeLabels: Record<string, string> = {
            Fitr: 'عيد الفطر',
            Adha: 'عيد الأضحى',
            National: 'عطلة وطنية',
            Foundation: 'يوم التأسيس',
          };

          const enLabel = holidayType === 'Custom' && holidayName
            ? holidayName
            : (typeLabels[holidayType] || holidayType);

          const arLabel = holidayName || '';

          return (
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                {enLabel}
              </Typography>
              {arLabel && (
                <Typography sx={{ fontSize: '11px', color: '#6B7280' }} dir="rtl">
                  {arLabel}
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: 'fromDate',
        header: 'التاريخ',
        size: 200,
        Cell: ({ row }) => {
          const fromDate = row.original.fromDate;
          const toDate = row.original.toDate;
          if (!fromDate || !toDate) return <Typography sx={{ fontSize: '13px', color: '#6B7280' }}>تاريخ غير صحيح</Typography>;

          try {
            const from = new Date(fromDate);
            const to = new Date(toDate);

            if (from.getTime() === to.getTime()) {
              // Single date
              return (
                <Typography sx={{ fontSize: '13px', color: '#111827' }}>
                  {formatDate(from)}
                </Typography>
              );
            } else {
              // Date range
              return (
                <Typography sx={{ fontSize: '13px', color: '#111827' }}>
                  {formatDate(from, 'dd/MM')} - {formatDate(to)}
                </Typography>
              );
            }
          } catch {
            return <Typography sx={{ fontSize: '13px', color: '#6B7280' }}>تاريخ غير صحيح</Typography>;
          }
        },
      },
      {
        accessorKey: 'numberOfDays',
        header: 'المدة',
        size: 100,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
            {cell.getValue<number>()} {cell.getValue<number>() === 1 ? 'يوم' : 'أيام'}
          </Typography>
        ),
      },
      {
        id: 'isPaid',
        header: 'مدفوع',
        size: 100,
        Cell: ({ row }) => {
          const isPaid = row.original.isPaid;
          return (
            <Chip
              label={isPaid ? 'مدفوع' : 'غير مدفوع'}
              size="small"
              sx={{
                backgroundColor: isPaid ? '#DCFCE7' : '#F3F4F6',
                color: isPaid ? '#166534' : '#6B7280',
                fontSize: '11px',
                fontWeight: 600
              }}
            />
          );
        },
      },
      {
        id: 'isRecurring',
        header: 'متكرر',
        size: 100,
        Cell: ({ row }) => {
          const isRecurring = row.original.isRecurring;
          return (
            <Chip
              label={isRecurring ? 'نعم' : 'لا'}
              size="small"
              sx={{
                backgroundColor: isRecurring ? '#DBEAFE' : '#F3F4F6',
                color: isRecurring ? '#1E40AF' : '#6B7280',
                fontSize: '11px',
                fontWeight: 600
              }}
            />
          );
        },
      },
      {
        id: 'status',
        header: 'الحالة',
        size: 100,
        Cell: ({ row }) => {
          const isActive = row.original.isActive;
          return (
            <Chip
              label={isActive ? 'نشط' : 'غير نشط'}
              size="small"
              sx={{
                backgroundColor: isActive ? '#ECFDF5' : '#FEF2F2',
                color: isActive ? '#059669' : '#DC2626',
                fontSize: '11px',
                fontWeight: 600
              }}
            />
          );
        },
      },
    ],
    [],
  );

  // Form handlers
  const handleAdd = () => {
    setSelectedHoliday(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setIsEditModalOpen(true);
  };

  const handleView = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setIsViewModalOpen(true);
  };

  const handleDelete = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (data: Partial<Holiday>) => {
    if (selectedHoliday) {
      // For updates, we'll need to handle this differently since backend uses single dates
      // For now, we'll treat updates as delete + create
      // TODO: Implement proper update logic if needed
      await deleteHoliday.execute(selectedHoliday);
      await createHoliday.execute(data);
    } else {
      // Create new holiday (handles date ranges automatically)
      await createHoliday.execute(data);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedHoliday) return;
    await deleteHoliday.execute(selectedHoliday);
  };

  const table = useMaterialReactTable({
    columns,
    data: holidays,
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
      pagination: { pageSize: 25, pageIndex: 0 },
      sorting: [{ id: 'fromDate', desc: false }],
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
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
          sx={{ background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)', color: '#FFFFFF', textTransform: 'none', fontWeight: 600, '& .MuiSvgIcon-root': { color: '#FFFFFF' }, '&:hover': { background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)' } }}
        >
          إضافة عطلة
        </Button>
        <Tooltip title={isFullscreen ? 'إغلاق ملء الشاشة' : 'ملء الشاشة'}>
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
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="عرض التفاصيل">
          <IconButton
            size="small"
            sx={{ color: '#0c2b7a' }}
            onClick={() => handleView(row.original)}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل">
          <IconButton
            size="small"
            sx={{ color: '#0c2b7a' }}
            onClick={() => handleEdit(row.original)}
          >
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton
            size="small"
            sx={{ color: '#DC2626' }}
            onClick={() => handleDelete(row.original)}
          >
            <Delete fontSize="small" />
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
              تقويم العطلات - ملء الشاشة
            </Typography>
            <Tooltip title="إغلاق ملء الشاشة (ESC)">
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
      <Box sx={{
        opacity: isFullscreen ? 0 : 1,
        pointerEvents: isFullscreen ? 'none' : 'auto',
        transition: 'opacity 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        flex: 1
      }}>
        <Box sx={{ mb: 3, animation: 'fadeInUp 0.6s ease-out 0.2s both', '@keyframes fadeInUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
            تقويم العطلات
          </Typography>
          <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
            تكوين العطلات السنوية وأيام الإجازة الرسمية
          </Typography>
        </Box>
        {loadingHolidays ? (
          <LoadingSpinner />
        ) : holidaysError ? (
          <ErrorDisplay error={holidaysError} onRetry={fetchHolidays} />
        ) : (
          tableWrapper
        )}
      </Box>

      {/* Forms */}
      <HolidayForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedHoliday(null);
        }}
        onSubmit={handleSubmit}
        loading={createHoliday.loading}
      />

      <HolidayForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedHoliday(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedHoliday}
        loading={updateHoliday.loading || deleteHoliday.loading}
      />

      <HolidayViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedHoliday(null);
        }}
        data={selectedHoliday}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedHoliday(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف العطلة"
        message={`هل أنت متأكد أنك تريد حذف هذه العطلة؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedHoliday ? `Holiday #${selectedHoliday.serialNo}` : undefined}
        loading={deleteHoliday.loading}
      />
    </>
  );
}


