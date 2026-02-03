'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Delete,
  PersonAdd,
  Visibility,
  Edit,
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
import type { LaborAssignment } from '@/types';
import LaborAssignmentForm from '@/components/forms/LaborAssignmentForm';
import LaborAssignmentViewForm from '@/components/forms/LaborAssignmentViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import AssignmentOverlapDialog from '@/components/common/AssignmentOverlapDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { projectsApi, employeesApi, laborApi, specializationsApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';
import { ApiError } from '@/lib/api/client';
import type { LaborAssignmentDto, LaborAssignmentResponse } from '@/lib/api/labor';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';

export default function LaborAssignmentsPage() {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<number | 'all'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<LaborAssignment | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [overlapError, setOverlapError] = useState<ApiError | null>(null);
  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);

  // Fetch projects
  const { data: projects = [] } = useApi(
    () => projectsApi.getActiveProjects(),
    { immediate: true }
  );

  // Fetch employees (large size so dropdown has all; refetch when opening add modal so new employees appear)
  const { data: employeesResponse, execute: fetchEmployees } = useApi(
    () => employeesApi.getAllEmployees({ page: 0, size: 5000, sortBy: 'employeeNo', sortDirection: 'asc' }),
    { immediate: true }
  );

  const employees = useMemo(() => {
    if (!employeesResponse?.employees) return [];
    return employeesResponse.employees
      .map(mapEmployeeResponseToEmployee)
      .filter(emp => emp.contractType === 'TECHNO');
  }, [employeesResponse]);

  // Searchable project filter options: "All" + projects
  const projectFilterOptions = useMemo(() => {
    const allOption = { value: 'all' as const, label: 'جميع المشاريع' };
    const projectOptions = (projects || []).map((p) => ({
      value: p.projectCode as number,
      label: p.projectName || `مشروع #${p.projectCode}`,
    }));
    return [allOption, ...projectOptions];
  }, [projects]);

  const selectedProjectOption = useMemo(
    () => projectFilterOptions.find((o) => o.value === selectedProject) ?? projectFilterOptions[0],
    [projectFilterOptions, selectedProject]
  );

  // Fetch specializations (for job title labels when saving)
  const { data: specializations = [] } = useApi(
    () => specializationsApi.getAll(true),
    { immediate: true }
  );

  // Fetch labor assignments
  const { data: allAssignments = [], execute: loadAssignments } = useApi(
    async () => {
      try {
        // Use the getAllAssignments endpoint to get all assignments
        const assignments: LaborAssignmentResponse[] = await laborApi.getAllLaborAssignments();
        // Map backend response to frontend format
        return assignments.map((assignment) => ({
          assignmentNo: assignment.assignmentNo, // Assignment ID
          requestNo: assignment.requestNo ?? null, // Use requestNo from backend, preserve null if not linked to a request
          lineNo: assignment.sequenceNo || 1,
          employeeId: assignment.employeeNo || 0,
          employeeName: assignment.employeeName || assignment.employeeName || undefined, // Include employee name from backend
          specialization: assignment.jobTitleEn || assignment.notes || 'General Labor', // Use jobTitleEn (from request detail) or notes
          fromDate: new Date(assignment.startDate),
          toDate: new Date(assignment.endDate),
          dailyRate: assignment.dailyRate ? Number(assignment.dailyRate) : 0, // Include daily rate from backend
          projectCode: assignment.projectCode || undefined, // Include project code from backend
          status: (assignment.assignmentStatus === 'ACTIVE' || assignment.isActive) ? 'ACTIVE' : 'COMPLETED' as 'ACTIVE' | 'COMPLETED',
        } as LaborAssignment));
      } catch (error) {
        console.error('[LaborAssignments] Error fetching assignments:', error);
        return [];
      }
    },
    { immediate: true }
  );

  // Protect route
  useRouteProtection(['Admin', 'Project Manager', 'HR Manager']);

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

  const getEmployeeName = useCallback((empId: number, employeeName?: string) => {
    // Prioritize employeeName from backend response
    if (employeeName) return employeeName;

    // Fallback to employee lookup
    const employeesList = employees || [];
    const employee = employeesList.find(e => e.employeeId === empId);
    return employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.fullName : `Techno Employee #${empId}`;
  }, [employees]);

  const filteredAssignments = useMemo(() => {
    const assignments = allAssignments || [];
    if (selectedProject === 'all') return assignments;
    return assignments; // Note: LaborAssignment doesn't have projectCode in the type
  }, [allAssignments, selectedProject]);

  // Form handlers
  const handleAdd = () => {
    setSelectedAssignment(null);
    setIsAddModalOpen(true);
    fetchEmployees().catch(() => { }); // Refetch so new employees appear in dropdown
  };

  const handleView = (assignment: LaborAssignment) => {
    setSelectedAssignment(assignment);
    setIsViewModalOpen(true);
  };

  const handleEdit = (assignment: LaborAssignment) => {
    setSelectedAssignment(assignment);
    setIsAddModalOpen(true);
    fetchEmployees().catch(() => { }); // Refetch so new employees appear
  };

  const handleDelete = (assignment: LaborAssignment) => {
    setSelectedAssignment(assignment);
    setIsDeleteModalOpen(true);
  };

  // Handle viewing assignment from overlap dialog
  const handleViewAssignmentFromOverlap = async (assignmentNo: number) => {
    try {
      const assignmentResponse = await laborApi.getLaborAssignmentById(assignmentNo);
      // Map the response to LaborAssignment format
      const assignment: LaborAssignment = {
        assignmentNo: assignmentResponse.assignmentNo, // Assignment ID
        requestNo: assignmentResponse.requestNo ?? null, // Request number (can be null)
        lineNo: assignmentResponse.sequenceNo || 1,
        employeeId: assignmentResponse.employeeNo || 0,
        employeeName: assignmentResponse.employeeName || assignmentResponse.employeeName || undefined,
        specialization: assignmentResponse.jobTitleEn || assignmentResponse.notes || 'General Labor',
        fromDate: new Date(assignmentResponse.startDate),
        toDate: new Date(assignmentResponse.endDate),
        dailyRate: assignmentResponse.dailyRate ? Number(assignmentResponse.dailyRate) : 0,
        projectCode: assignmentResponse.projectCode || undefined,
        status: (assignmentResponse.assignmentStatus === 'ACTIVE' || assignmentResponse.isActive) ? 'ACTIVE' : 'COMPLETED' as 'ACTIVE' | 'COMPLETED',
      };
      setSelectedAssignment(assignment);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching assignment:', error);
    }
  };

  // Create/Update labor assignment
  const { loading: isSaving, execute: saveLaborAssignment } = useApiWithToast(
    async (params: { isEdit: boolean; assignmentId?: number; data: Partial<LaborAssignment> }) => {
      const projectCode = selectedProject !== 'all' ? selectedProject : (projects?.[0]?.projectCode || 0);

      if (!projectCode) {
        throw new Error('يرجى اختيار مشروع أولاً');
      }

      // Get projectCode from data or fallback
      const projectCodeFromData = (params.data as Partial<LaborAssignment & { projectCode: number }>).projectCode;
      const finalProjectCode = projectCodeFromData || projectCode;

      if (!finalProjectCode) {
        throw new Error('رمز المشروع مطلوب');
      }

      const dailyRate = (params.data as Partial<LaborAssignment & { dailyRate?: number }>).dailyRate;
      if (!dailyRate || dailyRate <= 0) {
        throw new Error('يجب أن يكون المعدل اليومي أكبر من 0');
      }

      // Handle requestNo: if it's 0, null, or undefined, send null (or omit it)
      // Only include requestNo if it's a valid positive number
      // Note: We can't validate if the request exists here, so we'll let the backend validate
      let requestNoToSend: number | null | undefined = null;
      if (params.data.requestNo !== null && params.data.requestNo !== undefined) {
        if (params.data.requestNo > 0) {
          requestNoToSend = params.data.requestNo;
        } else {
          // If it's 0 or negative, treat it as no request
          requestNoToSend = null;
        }
      } else {
        // If it's null or undefined, send null
        requestNoToSend = null;
      }

      const specializationCode = params.data.specialization as string | undefined;
      const spec = specializationCode ? (specializations ?? []).find((s) => s.code === specializationCode) : undefined;

      const assignmentDto: LaborAssignmentDto = {
        employeeNo: params.data.employeeId || 0,
        projectCode: finalProjectCode,
        requestNo: requestNoToSend ?? undefined,
        sequenceNo: undefined,
        startDate: params.data.fromDate ? new Date(params.data.fromDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: params.data.toDate ? new Date(params.data.toDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dailyRate: dailyRate,
        jobTitleAr: spec?.nameAr,
        jobTitleEn: spec?.nameEn,
        notes: params.data.specialization || undefined,
      };

      if (params.isEdit && params.assignmentId) {
        await laborApi.updateLaborAssignment(params.assignmentId, assignmentDto);
      } else {
        await laborApi.createLaborAssignment(assignmentDto);
      }
      await loadAssignments();
    },
    {
      showSuccessToast: true,
      showErrorToast: true, // Show toast for non-overlap errors, but we'll override with dialog for overlap
      successMessage: (params) => params.isEdit ? 'تم تحديث تعيين العمالة بنجاح' : 'تم إنشاء تعيين العمالة بنجاح',
    }
  );

  const handleSubmit = async (data: Partial<LaborAssignment & { projectCode: number }>) => {
    try {
      // Get projectCode from form data or fallback to selectedProject
      const projectCode = (data as Partial<LaborAssignment & { projectCode?: number }>).projectCode || (selectedProject !== 'all' ? selectedProject : projects?.[0]?.projectCode);

      if (!projectCode) {
        throw new Error('يرجى اختيار مشروع');
      }

      // Use assignmentNo for updates (not requestNo)
      await saveLaborAssignment({
        isEdit: !!selectedAssignment,
        assignmentId: selectedAssignment?.assignmentNo, // Use assignmentNo for updates
        data: {
          ...data,
          projectCode, // Ensure projectCode is included
        },
      });

      // Close modal and reset after successful save
      setIsAddModalOpen(false);
      setSelectedAssignment(null);
    } catch (error) {
      console.error('Error saving labor assignment:', error);

      // Check if this is an overlap error
      if (error instanceof ApiError && error.data && Array.isArray(error.data)) {
        // Check if error message indicates overlap
        if (error.message && error.message.toLowerCase().includes('overlapping')) {
          setOverlapError(error);
          setIsOverlapDialogOpen(true);
          // Don't re-throw, dialog will handle it
          return;
        }
      }

      // Re-throw other errors so useApiWithToast can handle them
      throw error;
    }
  };

  // Delete labor assignment
  const { execute: deleteLaborAssignment } = useApiWithToast(
    async (assignmentId: number) => {
      await laborApi.deleteLaborAssignment(assignmentId);
      await loadAssignments();
    },
    {
      showSuccessToast: true,
      successMessage: 'تم حذف تعيين العمالة بنجاح',
    }
  );

  const handleDeleteConfirm = async () => {
    if (!selectedAssignment) return;
    try {
      // Use assignmentNo as ID for deletion
      if (!selectedAssignment.assignmentNo) {
        throw new Error('لم يتم العثور على معرف التعيين');
      }
      await deleteLaborAssignment(selectedAssignment.assignmentNo);
      setIsDeleteModalOpen(false);
      setSelectedAssignment(null);
    } catch (error) {
      console.error('Error deleting labor assignment:', error);
      throw error;
    }
  };

  const columns = useMemo<MRT_ColumnDef<LaborAssignment>[]>(
    () => [
      {
        accessorKey: 'requestNo',
        header: 'رقم الطلب',
        size: 120,
        Cell: ({ cell, row }) => {
          const requestNo = cell.getValue<number | null | undefined>();
          const assignmentNo = row.original.assignmentNo;

          if (requestNo) {
            return `#${requestNo}`;
          }

          // Fallback to assignment number if requestNo is null
          if (assignmentNo) {
            return `تعيين #${assignmentNo}`;
          }

          return '-';
        },
      },
      {
        id: 'employeeId',
        header: 'العامل',
        size: 180,
        accessorFn: (row) => getEmployeeName(row.employeeId, row.employeeName),
        filterVariant: 'multi-select',
      },
      {
        id: 'projectCode',
        header: 'المشروع',
        size: 180,
        accessorFn: (row) => {
          const project = (projects || []).find(p => p.projectCode === row.projectCode);
          return project ? project.projectName : `مشروع #${row.projectCode}`;
        },
        filterVariant: 'multi-select',
      },
      {
        accessorKey: 'specialization',
        header: 'التخصص',
        size: 150,
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue<string>()}
            size="small"
            sx={{
              backgroundColor: '#EDE9FE',
              color: '#6B21A8',
              fontWeight: 600,
              fontSize: '11px',
            }}
          />
        ),
      },
      {
        accessorKey: 'dailyRate',
        header: 'المعدل اليومي',
        size: 160,
        filterVariant: 'range',
        Cell: ({ cell, row }) => {
          const dailyRate = cell.getValue<number>() || row.original.dailyRate;
          if (!dailyRate || dailyRate === 0) return '-';
          return (
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0c2b7a' }}>
              ر.س {dailyRate.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'fromDate',
        header: 'من تاريخ',
        size: 130,
        filterVariant: 'date-range',
        Cell: ({ cell }) => new Date(cell.getValue<Date>()).toLocaleDateString('en-GB'),
      },
      {
        accessorKey: 'toDate',
        header: 'إلى تاريخ',
        size: 130,
        filterVariant: 'date-range',
        Cell: ({ cell }) => new Date(cell.getValue<Date>()).toLocaleDateString('en-GB'),
      },
      {
        id: 'status',
        header: 'الحالة',
        size: 120,
        accessorFn: (row) => {
          const labels: Record<string, string> = {
            ACTIVE: 'نشط',
            COMPLETED: 'مكتمل',
          };
          return labels[row.status] || row.status;
        },
        filterVariant: 'multi-select',
        Cell: ({ row }) => {
          const status = row.original.status;
          const colors = {
            ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
            COMPLETED: { bg: '#DBEAFE', text: '#1E40AF' },
          };
          const statusLabels: Record<string, string> = {
            ACTIVE: 'نشط',
            COMPLETED: 'مكتمل',
          };
          const color = colors[status as keyof typeof colors] || colors.ACTIVE;
          return (
            <Chip
              label={statusLabels[status] || status}
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
    [getEmployeeName, projects],
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredAssignments || [],
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
            label: 'حالة التعيين',
            options: [
              { label: 'نشط', value: 'ACTIVE', color: '#10B981' },
              { label: 'مكتمل', value: 'COMPLETED', color: '#3B82F6' },
            ]
          }
        ]}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Autocomplete
            size="small"
            value={selectedProjectOption}
            onChange={(_event, newValue) => {
              setSelectedProject(newValue?.value ?? 'all');
            }}
            options={projectFilterOptions}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.value === value.value}
            renderInput={(params) => (
              <TextField
                {...params}
                label="تصفية حسب المشروع"
                sx={{
                  minWidth: 220,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    '& fieldset': {
                      borderColor: '#E5E7EB',
                    },
                    '&:hover fieldset': {
                      borderColor: '#0c2b7a',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#0c2b7a',
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#6B7280',
                    '&.Mui-focused': {
                      color: '#0c2b7a',
                    },
                  },
                }}
              />
            )}
          />
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
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
        {row.original.status === 'ACTIVE' && (
          <>
            <Tooltip title="تعديل التعيين">
              <IconButton
                size="small"
                sx={{ color: '#0c2b7a' }}
                onClick={() => handleEdit(row.original)}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="إزالة التعيين">
              <IconButton
                size="small"
                sx={{ color: '#DC2626' }}
                onClick={() => handleDelete(row.original)}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>
    ),
    enableRowActions: true,
    positionActionsColumn: 'last',
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'الإجراءات',
        size: 200,
        minSize: 180,
        maxSize: 250,
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
          // overflowX: 'auto', // Removed to fix pinning
        },
        '& .MuiTableContainer-root': {
          overflowX: 'auto !important',
          ...(isFullscreen && { maxHeight: 'calc(100vh - 120px)' }),
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
              تعيينات العمالة - ملء الشاشة
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
                تعيينات العمالة
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                إدارة تخصيص القوى العاملة والتعيينات للمشاريع
              </Typography>
            </Box>

            {tableWrapper}
          </Box>
        </Box>
      </Box>

      {/* Forms */}
      <LaborAssignmentForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedAssignment(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedAssignment}
        loading={isSaving}
        employees={employees}
        projects={projects || []}
        selectedProjectCode={selectedProject !== 'all' ? selectedProject : undefined}
      />

      <LaborAssignmentViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedAssignment(null);
        }}
        data={selectedAssignment}
        employees={employees}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedAssignment(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="إزالة تعيين العمالة"
        itemName={selectedAssignment ? `${getEmployeeName(selectedAssignment.employeeId)} - تعيين #${selectedAssignment.assignmentNo || 'غير متاح'}` : undefined}
        loading={isSaving}
      />

      {/* Overlap Error Dialog */}
      <AssignmentOverlapDialog
        open={isOverlapDialogOpen}
        onClose={() => {
          setIsOverlapDialogOpen(false);
          setOverlapError(null);
        }}
        error={overlapError}
        onViewAssignment={handleViewAssignmentFromOverlap}
      />
    </>
  );
}


