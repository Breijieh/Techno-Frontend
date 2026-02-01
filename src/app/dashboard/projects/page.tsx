'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  CalendarMonth,
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
import useRouteProtection from '@/hooks/useRouteProtection';
import type { Project } from '@/types';
import ProjectForm from '@/components/forms/ProjectForm';
import ProjectViewForm from '@/components/forms/ProjectViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import { projectsApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';
import { mapProjectToProjectRequest, mapProjectResponseToProject } from '@/lib/mappers/projectMapper';
import { formatDate } from '@/lib/utils/dateFormatter';
import { formatNumber } from '@/lib/utils/numberFormatter';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';

export default function ProjectsListPage() {
  const router = useRouter();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch projects
  const { data: projectsData, loading: isLoading, error: projectsError, execute: loadProjects } = useApi(
    () => projectsApi.getAllProjects({ page: 0, size: 1000 }),
    { immediate: true }
  );

  // Fetch employees for manager names
  const { data: employeesResponse } = useApi(
    () => employeesApi.getAllEmployees({ page: 0, size: 1000 }),
    { immediate: true }
  );

  const employees = useMemo(() => {
    if (!employeesResponse?.employees) return [];
    return employeesResponse.employees.map(mapEmployeeResponseToEmployee);
  }, [employeesResponse]);

  // Map ProjectSummary to Project type - only include fields available in backend summary
  // Filter out cancelled (deleted) projects
  const projects = useMemo(() => {
    if (!projectsData?.content) return [];
    return projectsData.content
      .filter((summary) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = summary as any;
        const status = (s.projectStatus || s.status || 'ACTIVE').toUpperCase();
        return status !== 'CANCELLED';
      })
      .map((summary) => {
        // Extended ProjectSummary type with additional fields from backend
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extendedSummary = summary as any;
        const status = extendedSummary.projectStatus || extendedSummary.status || 'ACTIVE';

        return {
          projectCode: summary.projectCode,
          projectName: summary.projectName || '', // Use Arabic name
          projectAddress: extendedSummary.projectAddress || '',
          startDate: summary.startDate ? new Date(summary.startDate) : new Date(),
          endDate: summary.endDate ? new Date(summary.endDate) : new Date(),
          totalProjectAmount: summary.totalProjectAmount !== undefined && summary.totalProjectAmount !== null
            ? Number(summary.totalProjectAmount)
            : 0,
          projectManagerId: extendedSummary.projectMgr || 0,
          status: status as 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED',
          // Store additional fields from summary for display
          projectManagerName: extendedSummary.projectManagerName,
          completionPercentage: extendedSummary.completionPercentage ? Number(extendedSummary.completionPercentage) : undefined,
          durationDays: extendedSummary.durationDays,
          remainingDays: extendedSummary.remainingDays,
          isActive: extendedSummary.isActive,
          isOngoing: extendedSummary.isOngoing,
        } as Project & {
          projectManagerName?: string;
          completionPercentage?: number;
          durationDays?: number;
          remainingDays?: number;
          isActive?: boolean;
          isOngoing?: boolean;
        };
      });
  }, [projectsData]);

  // Protect route based on role
  useRouteProtection();

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

  const getManagerName = useCallback((managerId: number | undefined | null) => {
    if (!managerId || managerId === 0) return '-';
    const manager = employees.find(e => e.employeeId === managerId);
    return manager?.fullName || '-';
  }, [employees]);

  const columns = useMemo<MRT_ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: 'projectCode',
        header: 'الرمز',
        size: 90,
        filterVariant: 'multi-select',
        Cell: ({ cell }) => `#${cell.getValue<number>()}`,
      },
      {
        accessorKey: 'projectName',
        header: 'اسم المشروع',
        size: 220,
      },
      {
        accessorKey: 'projectAddress',
        header: 'الموقع',
        size: 200,
      },
      {
        accessorKey: 'startDate',
        header: 'تاريخ البدء',
        size: 120,
        filterVariant: 'date-range',
        Cell: ({ cell }) => {
          const date = cell.getValue<Date>();
          return date ? formatDate(date) : 'غير متاح';
        },
      },
      {
        accessorKey: 'endDate',
        header: 'تاريخ الانتهاء',
        size: 120,
        filterVariant: 'date-range',
        Cell: ({ cell }) => {
          const date = cell.getValue<Date>();
          return date ? formatDate(date) : 'غير متاح';
        },
      },
      {
        accessorKey: 'totalProjectAmount',
        header: 'المبلغ الإجمالي',
        size: 150,
        filterVariant: 'range',
        Cell: ({ cell }) => {
          const amount = cell.getValue<number>();
          if (!amount || amount === 0) return <Typography sx={{ fontSize: '13px', color: '#6B7280' }}>-</Typography>;
          // Format: if >= 1M show in millions, else show full amount
          const formatted = amount >= 1000000
            ? `ر.س ${(amount / 1000000).toFixed(2)}م`
            : `ر.س ${formatNumber(amount)}`;
          return (
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0c2b7a' }}>
              {formatted}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'projectManagerId',
        header: 'مدير المشروع',
        size: 180,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: Project) => (row as any).projectManagerName || getManagerName(row.projectManagerId)
        },
        Cell: ({ cell }) => {
          const managerId = cell.getValue<number>();
          // Try to use projectManagerName from summary if available
          const project = cell.row.original as Project & { projectManagerName?: string };
          if (project.projectManagerName) {
            return project.projectManagerName;
          }
          return getManagerName(managerId);
        },
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        size: 120,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: Project) => {
            const labels: Record<string, string> = {
              ACTIVE: 'نشط',
              COMPLETED: 'مكتمل',
              ON_HOLD: 'متوقف',
              CANCELLED: 'ملغي',
            };
            return labels[row.status] || row.status;
          }
        },
        Cell: ({ cell }) => {
          const status = cell.getValue<string>() || 'ACTIVE';
          const colors = {
            ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
            COMPLETED: { bg: '#DBEAFE', text: '#1E40AF' },
            ON_HOLD: { bg: '#FEE2E2', text: '#991B1B' },
            CANCELLED: { bg: '#F3F4F6', text: '#6B7280' },
          };
          const color = colors[status as keyof typeof colors] || colors.ACTIVE;
          return (
            <Chip
              label={
                status === 'ACTIVE' ? 'نشط' :
                  status === 'COMPLETED' ? 'مكتمل' :
                    status === 'ON_HOLD' ? 'متوقف' :
                      status === 'CANCELLED' ? 'ملغي' : status.replace('_', ' ')
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
      },
      {
        accessorKey: 'completionPercentage',
        header: 'نسبة الإنجاز',
        size: 150,
        Cell: ({ cell }) => {
          const value = cell.getValue<number | undefined>();
          const progress = value !== undefined ? Math.round(value) : 0;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#E5E7EB',
                  '& .MuiLinearProgress-bar': {
                    background: progress === 100 ? '#059669' : '#0c2b7a',
                    borderRadius: 3,
                  },
                }}
              />
              <Typography sx={{ fontSize: '11px', fontWeight: 600, minWidth: '30px' }}>
                {progress}%
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: 'remainingDays',
        header: 'المتبقي',
        size: 100,
        Cell: ({ cell }) => {
          const days = cell.getValue<number | undefined>();
          if (days === undefined || days === null) return '-';
          return (
            <Chip
              label={`${days} يوم`}
              size="small"
              variant="outlined"
              sx={{
                height: 24,
                fontSize: '11px',
                borderColor: days < 30 ? '#EF4444' : '#E5E7EB',
                color: days < 30 ? '#EF4444' : 'inherit'
              }}
            />
          );
        },
      },
    ],
    [getManagerName],
  );

  // Form handlers
  const handleAdd = () => {
    setSelectedProject(null);
    setIsAddModalOpen(true);
  };

  // Fetch full project details for editing/viewing
  const { data: fullProjectData, loading: loadingFullProject, execute: loadFullProject } = useApi(
    (projectCode: unknown) => projectsApi.getProjectById(projectCode as number),
    { immediate: false }
  );

  const handleEdit = async (project: Project) => {
    setSelectedProject(project);
    setIsEditModalOpen(true);
    // Fetch full project details to get all fields (profit margin, payments, GPS, etc.)
    await loadFullProject(project.projectCode);
  };

  const handleView = async (project: Project) => {
    setSelectedProject(project);
    setIsViewModalOpen(true);
    // Fetch full project details if we only have summary
    if (!project.technoSuffix && !project.numberOfPayments) {
      await loadFullProject(project.projectCode);
    }
  };

  const handleDelete = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
  };

  // Create/Update project with toast notifications
  const { loading: isSaving, execute: saveProject } = useApiWithToast(
    async (params: { isEdit: boolean; projectCode?: number; data: Partial<Project> }) => {
      // Map frontend Project format to backend ProjectRequest format
      const backendRequest = mapProjectToProjectRequest(params.data);

      if (params.isEdit && params.projectCode) {
        return projectsApi.updateProject(params.projectCode, backendRequest);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return projectsApi.createProject(backendRequest as any);
      }
    },
    {
      showSuccessToast: true,
      successMessage: (params: { isEdit: boolean; projectCode?: number; data: Partial<Project> }) =>
        params.isEdit ? 'تم تحديث المشروع بنجاح' : 'تم إنشاء المشروع بنجاح',
      onSuccess: () => {
        loadProjects(); // Refresh list
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedProject(null);
      },
    }
  );

  const handleSubmit = async (data: Partial<Project>) => {
    try {
      await saveProject({
        isEdit: !!selectedProject,
        projectCode: selectedProject?.projectCode,
        data,
      });
    } catch (error) {
      // Error is already handled by useApiWithToast
      console.error('Error saving project:', error);
    }
  };

  // Delete project with toast notifications
  const { loading: isDeleting, execute: deleteProject } = useApiWithToast(
    (projectCode: number) => projectsApi.deleteProject(projectCode),
    {
      showSuccessToast: true,
      successMessage: 'تم حذف المشروع بنجاح',
      onSuccess: () => {
        loadProjects(); // Refresh list
        setIsDeleteModalOpen(false);
        setSelectedProject(null);
      },
    }
  );

  const handleDeleteConfirm = async () => {
    if (!selectedProject) return;
    try {
      await deleteProject(selectedProject.projectCode);
    } catch (error) {
      // Error is already handled by useApiWithToast
      console.error('Error deleting project:', error);
    }
  };

  const table = useMaterialReactTable({
    columns,
    data: projects,
    enableRowSelection: false,
    enableColumnFilters: true,
    enableColumnOrdering: true,
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
      },
    },
    renderTopToolbar: ({ table }) => (
      <TableToolbarWrapper
        table={table}
        quickFilterGroups={[
          {
            id: 'status',
            label: 'حالة المشروع',
            options: [
              { label: 'نشط', value: 'ACTIVE', color: '#10B981' },
              { label: 'مكتمل', value: 'COMPLETED', color: '#3B82F6' },
              { label: 'متوقف', value: 'ON_HOLD', color: '#F59E0B' },
              { label: 'ملغي', value: 'CANCELLED', color: '#EF4444' },
            ]
          }
        ]}
      >
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
            مشروع جديد
          </Button>
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
        <Tooltip title="جدول الدفع">
          <IconButton
            size="small"
            sx={{ color: '#F59E0B' }}
            onClick={() => router.push('/dashboard/projects/payment-schedules')}
          >
            <CalendarMonth fontSize="small" />
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
    renderDetailPanel: ({ row }) => {
      // Use completionPercentage from backend, or calculate from dates if not available
      const project = row.original as Project & {
        completionPercentage?: number;
        durationDays?: number;
        remainingDays?: number;
      };
      let progress = project.completionPercentage;

      if (progress === undefined || progress === null) {
        // Calculate from dates if completionPercentage not available
        const startDate = row.original.startDate ? new Date(row.original.startDate) : null;
        const endDate = row.original.endDate ? new Date(row.original.endDate) : null;
        const now = new Date();

        if (startDate && endDate) {
          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const elapsedDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          if (totalDays > 0) {
            progress = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
          } else {
            progress = 0;
          }
        } else {
          progress = 0;
        }
      } else {
        progress = Math.round(Number(progress));
      }

      return (
        <Box sx={{
          padding: 2,
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          '& *': {
            color: '#111827 !important',
          },
        }}>
          <Typography sx={{
            fontSize: '14px',
            fontWeight: 600,
            mb: 2,
            color: '#111827 !important',
          }}>
            تقدم المشروع
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#E5E7EB',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #0f3a94 0%, #0c2b7a 100%)',
                  borderRadius: 4,
                },
              }}
            />
            <Typography sx={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0c2b7a !important',
            }}>
              {progress}%
            </Typography>
          </Box>
          {/* Show additional info from backend summary if available */}
          {(project.durationDays !== undefined || project.remainingDays !== undefined) && (
            <Typography sx={{
              fontSize: '12px',
              color: '#6B7280 !important',
              mt: 1,
            }}>
              {project.durationDays !== undefined && `المدة: ${project.durationDays} يوم`}
              {project.durationDays !== undefined && project.remainingDays !== undefined && ' | '}
              {project.remainingDays !== undefined && `المتبقي: ${project.remainingDays} يوم`}
            </Typography>
          )}
        </Box>
      );
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
        transition: isFullscreen ? 'none' : 'width 0.3s ease, transform 0.3s ease',
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
              إدارة المشاريع - وضع ملء الشاشة
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
          opacity: isFullscreen ? 0 : 1,
          pointerEvents: isFullscreen ? 'none' : 'auto',
          transition: 'opacity 0.3s ease-out',
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
            إدارة المشاريع
          </Typography>
          <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
            تتبع جميع المشاريع مع جداول الدفع وتخصيص القوى العاملة
          </Typography>
        </Box>

        {isLoading && <LoadingSpinner message="جاري تحميل المشاريع..." />}
        {!isLoading && projectsError && (
          <ErrorDisplay
            error={projectsError}
            onRetry={loadProjects}
            title="فشل تحميل المشاريع"
          />
        )}
        {!isLoading && !projectsError && tableWrapper}
      </Box>

      {/* Forms */}
      <ProjectForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedProject(null);
        }}
        onSubmit={handleSubmit}
        loading={isSaving}
        employees={employees}
      />

      <ProjectForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProject(null);
          // Reset full project data when closing
          if (fullProjectData) {
            // The useApi hook will reset when we call execute with different params
          }
        }}
        onSubmit={handleSubmit}
        initialData={fullProjectData ? mapProjectResponseToProject(fullProjectData) : selectedProject}
        loading={isSaving || loadingFullProject}
        employees={employees}
      />

      <ProjectViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedProject(null);
        }}
        data={fullProjectData ? {
          ...selectedProject!,
          ...mapProjectResponseToProject(fullProjectData),
        } : selectedProject}
        employees={employees}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProject(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف المشروع"
        message={`هل أنت متأكد أنك تريد حذف المشروع "${selectedProject?.projectName}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedProject?.projectName}
        loading={isDeleting}
      />
    </>
  );
}


