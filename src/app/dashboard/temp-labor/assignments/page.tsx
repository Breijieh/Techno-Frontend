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
  PersonAdd,
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
import type { TempWorkerAssignment } from '@/types';
import TempLaborAssignmentForm from '@/components/forms/TempLaborAssignmentForm';
import TempLaborAssignmentViewForm from '@/components/forms/TempLaborAssignmentViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { laborApi, projectsApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { mapLaborAssignmentResponsesToTempWorkerAssignments, mapTempWorkerAssignmentToLaborAssignmentDto, mapLaborAssignmentResponseToTempWorkerAssignment } from '@/lib/mappers/laborMapper';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';


interface AssignmentParams {
  isEdit: boolean;
  assignmentNo?: number;
  data: Partial<TempWorkerAssignment> & { employeeNo?: number; projectCode?: number; notes?: string };
}

export default function TempWorkerAssignmentsPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toast = useToast();

  // Protect route
  useRouteProtection(['Admin', 'Project Manager', 'HR Manager']);
  const [selectedAssignment, setSelectedAssignment] = useState<TempWorkerAssignment | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch labor assignments from backend
  const { data: laborAssignmentsData, loading: isLoadingAssignments, error: assignmentsError, execute: loadAssignments } = useApi(
    () => laborApi.getAllLaborAssignments(),
    { immediate: true }
  );

  // Fetch employees for form - fetch with large page size to get all employees
  const { data: employeesResponse } = useApi(
    () => employeesApi.getAllEmployees({ page: 0, size: 1000 }),
    { immediate: true }
  );

  const employees = useMemo(() => {
    if (!employeesResponse?.employees) return [];
    return employeesResponse.employees.map(mapEmployeeResponseToEmployee);
  }, [employeesResponse]);

  // Fetch projects for form
  const { data: projects = [] } = useApi(
    () => projectsApi.getActiveProjects(),
    { immediate: true }
  );

  // Map backend responses to frontend format
  const assignments = useMemo(() => {
    if (!laborAssignmentsData) return [];
    return mapLaborAssignmentResponsesToTempWorkerAssignments(laborAssignmentsData, employees);
  }, [laborAssignmentsData, employees]);

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

  // Form handlers
  const handleAdd = () => {
    setSelectedAssignment(null);
    setIsAddModalOpen(true);
  };

  const handleView = (assignment: TempWorkerAssignment) => {
    setSelectedAssignment(assignment);
    setIsViewModalOpen(true);
  };

  const handleEdit = async (assignment: TempWorkerAssignment) => {
    try {
      const fullAssignment = await laborApi.getLaborAssignmentById(assignment.workerId);
      const mappedAssignment = mapLaborAssignmentResponseToTempWorkerAssignment(
        fullAssignment,
        employees.find(emp => emp.employeeId === fullAssignment.employeeNo)
      );
      const extendedAssignment = mappedAssignment as TempWorkerAssignment & { employeeNo?: number; projectCode?: number; assignmentNo?: number; notes?: string };
      extendedAssignment.employeeNo = fullAssignment.employeeNo;
      extendedAssignment.projectCode = fullAssignment.projectCode;
      extendedAssignment.assignmentNo = fullAssignment.assignmentNo;
      extendedAssignment.notes = fullAssignment.notes;
      setSelectedAssignment(extendedAssignment);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching assignment details:', error);
      toast.showError('فشل تحميل تفاصيل التعيين');
    }
  };

  const handleDelete = (assignment: TempWorkerAssignment) => {
    setSelectedAssignment(assignment);
    setIsDeleteModalOpen(true);
  };

  // Create/Update labor assignment
  const { loading: isSaving, execute: saveLaborAssignment } = useApiWithToast(
    async (params: AssignmentParams) => {
      const employeeNo = params.data.employeeNo || (params.data as { employeeNo?: number }).employeeNo;
      const projectCode = params.data.projectCode;

      if (!employeeNo || !projectCode) {
        throw new Error('الموظف والمشروع مطلوبان');
      }

      const assignmentDto = mapTempWorkerAssignmentToLaborAssignmentDto(
        params.data,
        employeeNo,
        projectCode
      );

      if (params.isEdit && params.assignmentNo) {
        await laborApi.updateLaborAssignment(params.assignmentNo, assignmentDto);
      } else {
        await laborApi.createLaborAssignment(assignmentDto);
      }
      await loadAssignments();
    },
    {
      showSuccessToast: true,
      successMessage: (params: AssignmentParams) => {
        const p = params && typeof params === 'object' && 'isEdit' in params ? params : null;
        return p?.isEdit ? 'تم تحديث التعيين بنجاح' : 'تم إنشاء التعيين بنجاح';
      },
      onSuccess: () => {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedAssignment(null);
      },
    }
  );

  const handleSubmit = async (data: Partial<TempWorkerAssignment> & { employeeNo?: number; projectCode?: number; notes?: string }) => {
    try {
      const assignmentNo = (selectedAssignment as TempWorkerAssignment & { assignmentNo?: number })?.assignmentNo;
      await saveLaborAssignment({
        isEdit: !!selectedAssignment,
        assignmentNo,
        data,
      });
    } catch (error) {
      console.error('Error saving assignment:', error);
    }
  };

  // Delete labor assignment
  const { loading: isDeleting, execute: deleteLaborAssignment } = useApiWithToast(
    async (assignmentNo: number) => {
      await laborApi.deleteLaborAssignment(assignmentNo);
      await loadAssignments();
    },
    {
      showSuccessToast: true,
      successMessage: 'تم حذف التعيين بنجاح',
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setSelectedAssignment(null);
      },
    }
  );

  const handleDeleteConfirm = async () => {
    if (!selectedAssignment) return;
    try {
      const assignmentNo = (selectedAssignment as TempWorkerAssignment & { assignmentNo?: number })?.assignmentNo || selectedAssignment.workerId;
      await deleteLaborAssignment(assignmentNo);
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  // Helper functions to get names from backend data
  const getProjectName = (row: TempWorkerAssignment & { projectName?: string }) => {
    return row.projectName || 'غير متاح';
  };

  const getWorkerName = (row: TempWorkerAssignment) => {
    return row.workerName || 'غير متاح';
  };

  const columns = useMemo<MRT_ColumnDef<TempWorkerAssignment>[]>(
    () => [
      {
        accessorKey: 'workerId',
        header: 'رقم العامل',
        size: 110,
      },
      {
        accessorKey: 'workerName',
        header: 'اسم العامل',
        size: 180,
        Cell: ({ row }) => getWorkerName(row.original),
      },
      {
        accessorKey: 'specialization',
        header: 'التخصص',
        size: 150,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          return (
            <Chip
              label={value || 'غير متاح'}
              size="small"
              sx={{
                backgroundColor: '#EDE9FE',
                color: '#6B21A8',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
      },
      {
        accessorKey: 'nationality',
        header: 'الجنسية',
        size: 130,
        Cell: ({ cell }) => cell.getValue<string>() || 'غير متاح',
      },
      {
        id: 'projectName',
        header: 'المشروع',
        size: 180,
        Cell: ({ row }) => {
          const rowData = row.original as TempWorkerAssignment & { projectName?: string };
          return getProjectName(rowData);
        },
      },
      {
        accessorKey: 'startDate',
        header: 'تاريخ البدء',
        size: 130,
        Cell: ({ cell }) => {
          const date = cell.getValue<Date>();
          return date ? new Date(date).toLocaleDateString('en-GB') : 'غير متاح';
        },
      },
      {
        accessorKey: 'endDate',
        header: 'تاريخ الانتهاء',
        size: 130,
        Cell: ({ cell }) => {
          const date = cell.getValue<Date>();
          return date ? new Date(date).toLocaleDateString('en-GB') : 'غير متاح';
        },
      },
      {
        accessorKey: 'dailyWage',
        header: 'الأجر اليومي',
        size: 120,
        Cell: ({ cell }) => {
          const value = cell.getValue<number>();
          return value ? `ر.س ${value.toLocaleString()}` : 'غير متاح';
        },
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        size: 120,
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          const colors = {
            ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
            COMPLETED: { bg: '#DBEAFE', text: '#1E40AF' },
            TERMINATED: { bg: '#FEE2E2', text: '#991B1B' },
          };
          const statusLabels: Record<string, string> = {
            ACTIVE: 'نشط',
            COMPLETED: 'مكتمل',
            TERMINATED: 'منتهي',
          };
          const color = colors[status as keyof typeof colors] || colors.ACTIVE;
          return (
            <Chip
              label={statusLabels[status] || status || 'غير متاح'}
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
    ],
    [],
  );

  const table = useMaterialReactTable<TempWorkerAssignment>({
    columns,
    data: assignments || [],
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
          تعيين عامل
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
            sx={{ color: '#059669' }}
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
              تعيينات العمال المؤقتين - ملء الشاشة
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
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
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
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
            >
              تعيينات العمال المؤقتين
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              إدارة التعيينات النشطة والمكتملة للعمال المؤقتين
            </Typography>
          </Box>

          {isLoadingAssignments ? (
            <LoadingSpinner />
          ) : assignmentsError ? (
            <ErrorDisplay error={assignmentsError} onRetry={loadAssignments} />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* Forms */}
      <TempLaborAssignmentForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedAssignment(null);
        }}
        onSubmit={handleSubmit}
        loading={isSaving}
        projects={projects || []}
        employees={employees}
      />

      <TempLaborAssignmentForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAssignment(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedAssignment}
        loading={isSaving}
        projects={projects || []}
        employees={employees}
      />

      <TempLaborAssignmentViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedAssignment(null);
        }}
        data={selectedAssignment}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedAssignment(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف تعيين العامل"
        message={`هل أنت متأكد أنك تريد حذف التعيين لـ "${selectedAssignment?.workerName}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedAssignment?.workerName}
        loading={isDeleting}
      />
    </>
  );
}
