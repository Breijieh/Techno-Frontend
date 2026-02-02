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
  Business,
  Visibility,
  Delete,
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
import type { Department } from '@/types';
import DepartmentForm from '@/components/forms/DepartmentForm';
import DepartmentViewForm from '@/components/forms/DepartmentViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { departmentsApi, getDepartmentEmployeeCounts, type DepartmentResponse } from '@/lib/api/departments';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

export default function DepartmentsPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeCounts, setEmployeeCounts] = useState<Map<number, number>>(new Map());

  // Fetch departments from backend
  const { data: departmentsData, loading: loadingDepartments, error: departmentsError, execute: fetchDepartments } = useApi(
    () => departmentsApi.getAllDepartments(),
    { immediate: true }
  );

  // Fetch employee counts when departments are loaded
  useEffect(() => {
    if (departmentsData && departmentsData.length > 0) {
      const deptCodes = departmentsData.map(dept => dept.deptCode);
      getDepartmentEmployeeCounts(deptCodes).then(counts => {
        setEmployeeCounts(counts);
      });
    } else {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setEmployeeCounts(prev => prev.size === 0 ? prev : new Map());
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [departmentsData]);

  // Map backend DepartmentResponse to frontend Department format
  const departments = useMemo(() => {
    if (!departmentsData) return [];

    return departmentsData.map((dept: DepartmentResponse): Department => ({
      departmentCode: dept.deptCode,
      departmentName: dept.deptName || '',
      parentDepartmentCode: dept.parentDeptCode,
      managerEmployeeId: dept.deptMgrCode,
      employeeCount: employeeCounts.get(dept.deptCode) || 0,
    }));
  }, [departmentsData, employeeCounts]);

  // Create department API
  const createDepartment = useApiWithToast(
    async (request: { deptName: string; parentDeptCode?: number; deptMgrCode?: number }) => {
      return departmentsApi.createDepartment(request);
    },
    {
      successMessage: () => 'تم إنشاء القسم بنجاح',
      onSuccess: async () => {
        await fetchDepartments();
        // Employee counts will be refreshed automatically via useEffect
        setIsAddModalOpen(false);
        setSelectedDepartment(null);
      },
    }
  );

  // Update department API
  const updateDepartment = useApiWithToast(
    async ({ id, request }: { id: number; request: { deptName: string; parentDeptCode?: number; deptMgrCode?: number } }) => {
      return departmentsApi.updateDepartment(id, request);
    },
    {
      successMessage: () => 'تم تحديث القسم بنجاح',
      onSuccess: async () => {
        await fetchDepartments();
        // Employee counts will be refreshed automatically via useEffect
        setIsEditModalOpen(false);
        setSelectedDepartment(null);
      },
    }
  );

  // Delete department API
  const deleteDepartment = useApiWithToast(
    async (id: number) => {
      await departmentsApi.deleteDepartment(id);
    },
    {
      successMessage: () => 'تم حذف القسم بنجاح',
      onSuccess: () => {
        fetchDepartments();
        setIsDeleteModalOpen(false);
        setSelectedDepartment(null);
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

  // Form handlers
  const handleAdd = () => {
    setSelectedDepartment(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setSelectedDepartment(dept);
    setIsEditModalOpen(true);
  };

  const handleView = (dept: Department) => {
    setSelectedDepartment(dept);
    setIsViewModalOpen(true);
  };

  const handleDelete = (dept: Department) => {
    setSelectedDepartment(dept);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (data: Partial<Department>) => {
    const request = {
      deptName: data.departmentName || '',
      parentDeptCode: data.parentDepartmentCode,
      deptMgrCode: data.managerEmployeeId,
    };

    if (selectedDepartment) {
      // Update existing department
      await updateDepartment.execute({
        id: selectedDepartment.departmentCode,
        request,
      });
    } else {
      // Create new department
      await createDepartment.execute(request);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDepartment) return;
    await deleteDepartment.execute(selectedDepartment.departmentCode);
  };

  // Get department names for display
  const getDepartmentName = useCallback((departmentCode: number) => {
    if (!departmentsData) return `قسم ${departmentCode}`;
    const department = departmentsData.find(d => d.deptCode === departmentCode);
    return department?.deptName || `قسم ${departmentCode}`;
  }, [departmentsData]);

  const columns = useMemo<MRT_ColumnDef<Department>[]>(
    () => [
      {
        accessorKey: 'departmentCode',
        header: 'الرمز',
        size: 80,
      },
      {
        accessorKey: 'departmentName',
        header: 'اسم القسم',
        size: 200,
      },
      {
        id: 'parentDepartment',
        header: 'القسم الرئيسي',
        size: 200,
        Cell: ({ row }) => (
          <Typography sx={{ fontSize: '13px', color: '#374151' }}>
            {row.original.parentDepartmentCode ? getDepartmentName(row.original.parentDepartmentCode) : 'لا يوجد'}
          </Typography>
        ),
      },
      {
        accessorKey: 'employeeCount',
        header: 'الموظفون',
        size: 120,
        Cell: ({ cell }) => {
          const count = cell.getValue<number>();
          return (
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0c2b7a' }}>
              {count} موظف
            </Typography>
          );
        },
      },
    ],
    [getDepartmentName],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = useMaterialReactTable<any>({
    columns,
    data: departments || [],
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
          sx={{
            background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
            color: '#FFFFFF',
            textTransform: 'none',
            fontWeight: 600,
            '& .MuiSvgIcon-root': {
              color: '#FFFFFF',
            },
            '&:hover': {
              background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
            },
          }}
        >
          قسم جديد
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
        <Tooltip title="عرض">
          <IconButton size="small" sx={{ color: '#0c2b7a' }} onClick={() => handleView(row.original)}>
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل">
          <IconButton size="small" sx={{ color: '#059669' }} onClick={() => handleEdit(row.original)}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => handleDelete(row.original)}>
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
        height: isFullscreen ? '100%' : 'auto',
        overflow: 'hidden',
        transition: isFullscreen ? 'none' : 'all 0.3s ease',
        '& .MuiPaper-root': {
          width: '100%',
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
              الأقسام - ملء الشاشة
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
            الأقسام
          </Typography>
          <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
            إدارة الأقسام التنظيمية والهيكل
          </Typography>
        </Box>
        {loadingDepartments ? (
          <LoadingSpinner />
        ) : departmentsError ? (
          <ErrorDisplay error={departmentsError} onRetry={fetchDepartments} />
        ) : (
          tableWrapper
        )}
      </Box>

      {/* Forms */}
      <DepartmentForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedDepartment(null);
        }}
        onSubmit={handleSubmit}
        loading={createDepartment.loading}
        departments={departmentsData || []}
      />
      <DepartmentForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedDepartment(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedDepartment}
        loading={updateDepartment.loading}
        departments={departmentsData || []}
      />
      <DepartmentViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedDepartment(null);
        }}
        department={selectedDepartment}
      />
      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDepartment(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف القسم"
        message="هل أنت متأكد أنك تريد حذف هذا القسم؟"
        itemName={selectedDepartment?.departmentName}
        loading={deleteDepartment.loading}
      />
    </>
  );
}


