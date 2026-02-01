'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  AccessTime,
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
import type { TimeSchedule } from '@/types';
import TimeScheduleForm from '@/components/forms/TimeScheduleForm';
import TimeScheduleViewForm from '@/components/forms/TimeScheduleViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { timeSchedulesApi, mapScheduleResponseToFrontend, generateScheduleName } from '@/lib/api/timeSchedules';
import { departmentsApi } from '@/lib/api/departments';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

export default function TimeSchedulesPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<TimeSchedule | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch data from backend
  const { data: schedulesData, loading: loadingSchedules, error: schedulesError, execute: fetchSchedules } = useApi(
    () => timeSchedulesApi.getAllSchedules(),
    { immediate: true }
  );

  const { data: departmentsData, loading: loadingDepartments } = useApi(
    () => departmentsApi.getAllDepartments(),
    { immediate: true }
  );

  // CRUD operations
  const createSchedule = useApiWithToast(
    (request: { scheduleName: string; departmentCode: number | null; scheduledStartTime: string; scheduledEndTime: string; requiredHours: number; gracePeriodMinutes: number; isActive: string }) => timeSchedulesApi.createSchedule(request),
    {
      successMessage: 'تم إنشاء الجدول الزمني بنجاح',
      errorMessage: 'فشل إنشاء الجدول الزمني',
      onSuccess: () => {
        fetchSchedules();
        setIsAddModalOpen(false);
        setSelectedSchedule(null);
      },
    }
  );

  const updateSchedule = useApiWithToast(
    ({ id, request }: { id: number; request: { scheduleName: string; departmentCode: number | null; scheduledStartTime: string; scheduledEndTime: string; requiredHours: number; gracePeriodMinutes: number; isActive: string } }) =>
      timeSchedulesApi.updateSchedule(id, request),
    {
      successMessage: 'تم تحديث الجدول الزمني بنجاح',
      errorMessage: 'فشل تحديث الجدول الزمني',
      onSuccess: () => {
        fetchSchedules();
        setIsEditModalOpen(false);
        setSelectedSchedule(null);
      },
    }
  );

  const deleteSchedule = useApiWithToast(
    (id: number) => timeSchedulesApi.deleteSchedule(id),
    {
      successMessage: 'تم حذف الجدول الزمني بنجاح',
      errorMessage: 'فشل حذف الجدول الزمني',
      onSuccess: () => {
        fetchSchedules();
        setIsDeleteModalOpen(false);
        setSelectedSchedule(null);
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

  // Map backend data to frontend format
  const timeSchedules = useMemo(() => {
    if (!schedulesData) return [];
    return schedulesData.map(mapScheduleResponseToFrontend);
  }, [schedulesData]);

  // Get department names for display
  const getDepartmentName = useCallback((departmentCode: number | null | undefined) => {
    if (!departmentCode || departmentCode === 0) return 'عام (General)';
    if (!departmentsData) return `قسم ${departmentCode}`;
    const department = departmentsData.find(d => d.deptCode === departmentCode);
    return department?.deptName || department?.deptName || `قسم ${departmentCode}`;
  }, [departmentsData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'scheduleName',
        header: 'اسم الجدول',
        size: 200,
        Cell: ({ cell, row }) => (
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
              {cell.getValue<string>()}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
              الرمز: #{row.original.scheduleId}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'department',
        header: 'القسم',
        size: 180,
        Cell: ({ row }) => (
          <Typography sx={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>
            {row.original.departmentNameEn || getDepartmentName(row.original.departmentCode)}
          </Typography>
        ),
      },
      {
        accessorKey: 'entryTime',
        header: 'وقت الدخول',
        size: 100,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
            {cell.getValue<string>()}
          </Typography>
        ),
      },
      {
        accessorKey: 'exitTime',
        header: 'وقت الخروج',
        size: 100,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#DC2626' }}>
            {cell.getValue<string>()}
          </Typography>
        ),
      },
      {
        accessorKey: 'requiredHours',
        header: 'الساعات المطلوبة',
        size: 120,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0c2b7a' }}>
            {cell.getValue<number>()} ساعة
          </Typography>
        ),
      },
      {
        accessorKey: 'gracePeriodMinutes',
        header: 'فترة السماح',
        size: 120,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', color: '#374151' }}>
            {cell.getValue<number>() || 0} دقيقة
          </Typography>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'الحالة',
        size: 100,
        Cell: ({ cell }) => {
          const isActive = cell.getValue<string>() === 'Y';
          return (
            <Box
              sx={{
                display: 'inline-flex',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: isActive ? '#ECFDF5' : '#FEF2F2',
                color: isActive ? '#059669' : '#DC2626',
                border: `1px solid ${isActive ? '#D1FAE5' : '#FEE2E2'}`,
              }}
            >
              {isActive ? 'نشط' : 'غير نشط'}
            </Box>
          );
        },
      },
    ],
    [getDepartmentName],
  );

  // Form handlers
  const handleAdd = () => {
    setSelectedSchedule(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (schedule: TimeSchedule) => {
    setSelectedSchedule(schedule);
    setIsEditModalOpen(true);
  };

  const handleView = (schedule: TimeSchedule) => {
    setSelectedSchedule(schedule);
    setIsViewModalOpen(true);
  };

  const handleDelete = (schedule: TimeSchedule) => {
    setSelectedSchedule(schedule);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (data: Partial<TimeSchedule>) => {
    if (!departmentsData) return;

    // Get department name for schedule name generation
    const department = departmentsData.find(d => d.deptCode === data.departmentCode);
    const departmentName = department?.deptName || department?.deptName;

    const scheduleName = data.scheduleName || generateScheduleName(departmentName);

    const request = {
      scheduleName,
      departmentCode: data.departmentCode && data.departmentCode > 0 ? data.departmentCode : null,
      scheduledStartTime: data.entryTime || '08:00',
      scheduledEndTime: data.exitTime || '17:00',
      requiredHours: data.requiredHours || 8,
      gracePeriodMinutes: data.gracePeriodMinutes !== undefined ? data.gracePeriodMinutes : 15,
      isActive: data.isActive || 'Y',
    };

    if (selectedSchedule?.scheduleId) {
      // Update existing schedule
      await updateSchedule.execute({ id: selectedSchedule.scheduleId, request });
    } else {
      // Create new schedule
      await createSchedule.execute(request);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSchedule?.scheduleId) return;
    await deleteSchedule.execute(selectedSchedule.scheduleId);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = useMaterialReactTable<any>({
    columns,
    data: timeSchedules || [],
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
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
          sx={{ background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)', color: '#FFFFFF', textTransform: 'none', fontWeight: 600, '& .MuiSvgIcon-root': { color: '#FFFFFF' }, '&:hover': { background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)' } }}
        >
          جدول جديد
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
              الجداول الزمنية - ملء الشاشة
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
      <Box sx={{ flex: 1, opacity: isFullscreen ? 0 : 1, pointerEvents: isFullscreen ? 'none' : 'auto', transition: 'opacity 0.3s ease-out' }}>
        <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
          <Box sx={{ mb: 3, animation: 'fadeInUp 0.6s ease-out 0.2s both', '@keyframes fadeInUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
              الجداول الزمنية
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              تحديد جداول العمل والورديات للموظفين
            </Typography>
          </Box>
          {loadingSchedules || loadingDepartments ? (
            <LoadingSpinner />
          ) : schedulesError ? (
            <ErrorDisplay error={schedulesError} onRetry={fetchSchedules} />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* Forms */}
      <TimeScheduleForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedSchedule(null);
        }}
        onSubmit={handleSubmit}
        loading={createSchedule.loading}
        schedules={timeSchedules}
      />

      <TimeScheduleForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSchedule(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedSchedule}
        loading={updateSchedule.loading}
        schedules={timeSchedules}
      />

      <TimeScheduleViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedSchedule(null);
        }}
        data={selectedSchedule}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSchedule(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف الجدول الزمني"
        message={`هل أنت متأكد أنك تريد حذف هذا الجدول الزمني؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedSchedule ? `الجدول: ${selectedSchedule.scheduleName || `القسم ${selectedSchedule.departmentCode}`}` : undefined}
        loading={deleteSchedule.loading}
      />
    </>
  );
}


