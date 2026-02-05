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
  Edit,
  Delete,
  Visibility,
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
import type { EmployeeContractAllowance } from '@/types';
import EmployeeAllowanceForm from '@/components/forms/EmployeeAllowanceForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { employeeContractAllowancesApi, mapBackendToFrontend } from '@/lib/api/employeeContractAllowances';
import { employeesApi } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatInvariantDate } from '@/lib/utils/dateFormatter';

export default function EmployeeAllowancesPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedAllowance, setSelectedAllowance] = useState<EmployeeContractAllowance | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | undefined>(undefined);

  // Fetch data from backend
  const { data: allowancesData, loading: loadingAllowances, error: allowancesError, execute: fetchAllowances } = useApi(
    () => employeeContractAllowancesApi.getAllAllowances(),
    { immediate: true }
  );

  const { data: employeesData, loading: loadingEmployees } = useApi(
    () => employeesApi.getAllEmployees({ size: 10000 }),
    { immediate: true }
  );

  // Map backend data to frontend format
  const allowances = useMemo(() => {
    if (!allowancesData) return [];
    return allowancesData.map(mapBackendToFrontend);
  }, [allowancesData]);

  // CRUD operations
  const createAllowance = useApiWithToast(
    (request: { employeeNo: number; transTypeCode: number; salaryPercentage: number; isActive: boolean }) =>
      employeeContractAllowancesApi.createAllowance(request),
    {
      successMessage: 'تم إنشاء بدل عقد الموظف بنجاح',
      onSuccess: () => {
        fetchAllowances();
        setIsAddModalOpen(false);
        setSelectedAllowance(null);
        setSelectedEmployeeId(undefined);
      },
    }
  );

  const updateAllowance = useApiWithToast(
    ({ id, request }: { id: number; request: { employeeNo: number; transTypeCode: number; salaryPercentage: number; isActive: boolean } }) =>
      employeeContractAllowancesApi.updateAllowance(id, request),
    {
      successMessage: 'تم تحديث بدل عقد الموظف بنجاح',
      onSuccess: () => {
        fetchAllowances();
        setIsEditModalOpen(false);
        setSelectedAllowance(null);
        setSelectedEmployeeId(undefined);
      },
    }
  );

  const deleteAllowance = useApiWithToast(
    (id: number) => employeeContractAllowancesApi.deleteAllowance(id),
    {
      successMessage: 'تم حذف بدل عقد الموظف بنجاح',
      onSuccess: () => {
        fetchAllowances();
        setIsDeleteModalOpen(false);
        setSelectedAllowance(null);
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
    setSelectedAllowance(null);
    setSelectedEmployeeId(undefined);
    setIsAddModalOpen(true);
  };

  const handleView = (allowance: EmployeeContractAllowance) => {
    setSelectedAllowance(allowance);
    setIsViewModalOpen(true);
  };

  const handleEdit = (allowance: EmployeeContractAllowance) => {
    setSelectedAllowance(allowance);
    setSelectedEmployeeId(allowance.employeeId);
    setIsEditModalOpen(true);
  };

  const handleDelete = (allowance: EmployeeContractAllowance) => {
    setSelectedAllowance(allowance);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (data: Partial<EmployeeContractAllowance>) => {
    if (!data.employeeId || !data.transactionCode || data.percentage === undefined || data.percentage === null) {
      return;
    }

    const request = {
      employeeNo: Number(data.employeeId),
      transTypeCode: Number(data.transactionCode),
      salaryPercentage: Number(data.percentage),
      isActive: data.isActive ?? true,
    };

    if (selectedAllowance) {
      // Edit mode
      await updateAllowance.execute({ id: selectedAllowance.recordId, request });
    } else {
      // Add mode
      await createAllowance.execute(request);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAllowance) return;
    await deleteAllowance.execute(selectedAllowance.recordId);
  };

  const getEmployeeName = useCallback((employeeId: number) => {
    if (!employeesData?.employees) return `موظف ${employeeId}`;
    const employee = employeesData.employees.find((e) => e.employeeNo === employeeId);
    return employee?.employeeName || `موظف ${employeeId}`;
  }, [employeesData]);

  const columns = useMemo<MRT_ColumnDef<EmployeeContractAllowance>[]>(
    () => [
      {
        accessorKey: 'recordId',
        header: 'الرمز',
        size: 80,
      },
      {
        accessorKey: 'employeeId',
        header: 'الموظف',
        size: 200,
        Cell: ({ row }) => getEmployeeName(row.original.employeeId),
      },
      {
        accessorKey: 'transactionName',
        header: 'اسم البدل',
        size: 200,
      },
      {
        accessorKey: 'percentage',
        header: 'النسبة المئوية',
        size: 150,
        Cell: ({ cell }) => `${cell.getValue<number>()}%`,
      },
      {
        accessorKey: 'isActive',
        header: 'الحالة',
        size: 100,
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue<boolean>() ? 'نشط' : 'غير نشط'}
            color={cell.getValue<boolean>() ? 'success' : 'default'}
            size="small"
          />
        ),
      },
      {
        accessorKey: 'createdDate',
        header: 'تاريخ الإنشاء',
        size: 150,
        Cell: ({ cell }) => formatInvariantDate(cell.getValue<Date>()),
      },
    ],
    [getEmployeeName]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = useMaterialReactTable<any>({
    columns,
    data: allowances || [],
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
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #0c2b7a 0%, #0a266e 100%)',
            color: '#FFFFFF',
            '& .MuiSvgIcon-root': {
              color: '#FFFFFF',
            },
            '&:hover': {
              background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
            },
          }}
        >
          إضافة بدل
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
            onClick={() => handleView(row.original)}
            sx={{
              color: '#0c2b7a',
              '&:hover': {
                backgroundColor: 'rgba(12, 43, 122, 0.08)',
              },
            }}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل">
          <IconButton
            size="small"
            onClick={() => handleEdit(row.original)}
            sx={{
              color: '#059669',
              '&:hover': {
                backgroundColor: 'rgba(5, 150, 105, 0.08)',
              },
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton
            size="small"
            onClick={() => handleDelete(row.original)}
            sx={{
              color: '#DC2626',
              '&:hover': {
                backgroundColor: 'rgba(220, 38, 38, 0.08)',
              },
            }}
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
              بدلات عقود الموظفين - ملء الشاشة
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
          <Box
            sx={{
              flex: 1,
              padding: 0,
              overflow: 'auto',
              backgroundColor: '#F8F9FC',
            }}
          >
            {loadingAllowances || loadingEmployees ? (
              <LoadingSpinner />
            ) : allowancesError ? (
              <ErrorDisplay error={allowancesError} onRetry={fetchAllowances} />
            ) : (
              tableWrapper
            )}
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
        <Box
          sx={{
            flex: 1,
            padding: '32px',
            backgroundColor: '#F8F9FC',
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
              بدلات عقود الموظفين
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              إدارة النسب المئوية لتفصيل الراتب والبدلات الخاصة بالموظفين
            </Typography>
          </Box>
          {loadingAllowances || loadingEmployees ? (
            <LoadingSpinner />
          ) : allowancesError ? (
            <ErrorDisplay error={allowancesError} onRetry={fetchAllowances} />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* Modals */}
      <EmployeeAllowanceForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedEmployeeId(undefined);
        }}
        onSubmit={handleSubmit}
        loading={createAllowance.loading}
        employeeId={selectedEmployeeId}
      />

      <EmployeeAllowanceForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEmployeeId(undefined);
        }}
        onSubmit={handleSubmit}
        initialData={selectedAllowance}
        loading={updateAllowance.loading}
        employeeId={selectedEmployeeId}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="حذف بدل الموظف"
        message={`هل أنت متأكد أنك تريد حذف هذا البدل لـ ${selectedAllowance ? getEmployeeName(selectedAllowance.employeeId) : ''}؟`}
        loading={deleteAllowance.loading}
      />

      <ViewDetailsDialog
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedAllowance(null);
        }}
        title="تفاصيل بدل عقد الموظف"
        fields={
          selectedAllowance
            ? [
              {
                label: 'الرمز',
                value: `#${selectedAllowance.recordId}`,
              },
              {
                label: 'الموظف',
                value: getEmployeeName(selectedAllowance.employeeId),
              },
              {
                label: 'نوع المعاملة',
                value: selectedAllowance.transactionName || 'غير متاح',
              },
              {
                label: 'النسبة المئوية',
                value: `${selectedAllowance.percentage}%`,
              },
              {
                label: 'الحالة',
                value: selectedAllowance.isActive ? 'نشط' : 'غير نشط',
                type: 'chip',
                chipColor: selectedAllowance.isActive
                  ? { bg: '#D1FAE5', text: '#065F46' }
                  : { bg: '#F3F4F6', text: '#6B7280' },
              },
              {
                label: 'تاريخ الإنشاء',
                value: new Date(selectedAllowance.createdDate).toLocaleDateString('en-GB'),
              },
            ]
            : []
        }
      />
    </>
  );
}


