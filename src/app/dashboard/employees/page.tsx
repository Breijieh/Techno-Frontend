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
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  Delete,
  Download,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
  type MRT_PaginationState,
} from 'material-react-table';

import PermissionGuard from '@/components/common/PermissionGuard';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import useRouteProtection from '@/hooks/useRouteProtection';
import { getUserRole } from '@/lib/permissions';
import { getUserContext, filterEmployeesByRole } from '@/lib/dataFilters';
import type { Employee } from '@/types';
import EmployeeForm from '@/components/forms/EmployeeForm';
import EmployeeViewForm from '@/components/forms/EmployeeViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import { employeesApi, departmentsApi } from '@/lib/api';
import type { DepartmentResponse, EmployeeRequest } from '@/lib/api';
import { mapEmployeeResponseToEmployee, mapEmployeeToEmployeeRequest } from '@/lib/mappers/employeeMapper';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import { formatDate } from '@/lib/utils/dateFormatter';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';
import { RangeSliderFilter } from '@/components/tables/RangeSliderFilter';
import { formatNumber } from '@/lib/utils/numberFormatter';

export default function EmployeesListPage() {
  const router = useRouter();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [totalElements, setTotalElements] = useState(0);
  const userRole = getUserRole();
  const userContext = getUserContext();

  // Protect route based on role
  useRouteProtection();

  // Redirect employees to self-service portal
  useEffect(() => {
    if (userRole === 'Employee') {
      router.push('/dashboard');
    }
  }, [userRole, router]);

  // Fetch departments
  const { execute: fetchDepartments, loading: loadingDepartments } = useApiWithToast(
    departmentsApi.getAllDepartments,
    { silent: true }
  );

  // Fetch employees function
  const fetchEmployeesFn = useCallback(
    () =>
      employeesApi.getAllEmployees({
        page: pagination.pageIndex,
        size: pagination.pageSize,
        sortBy: 'employeeNo',
        sortDirection: 'asc',
      }),
    [pagination.pageIndex, pagination.pageSize]
  );

  const { execute: fetchEmployees, loading: loadingEmployees } = useApiWithToast(
    fetchEmployeesFn,
    { silent: true }
  );

  // Load departments on mount
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const depts = await fetchDepartments();
        if (depts) {
          setDepartments(depts);
        }
      } catch (error) {
        console.error('Failed to load departments:', error);
      }
    };
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle URL search params for specific view
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const viewId = searchParams.get('viewId');
    if (viewId) {
      // Fetch specific employee and open view modal
      employeesApi.getEmployeeById(Number(viewId))
        .then(response => {
          const employee = mapEmployeeResponseToEmployee(response);
          setSelectedEmployee(employee);
          setIsViewModalOpen(true);
        })
        .catch(err => console.error('Failed to load employee for view', err));
    }
  }, []);

  // Load employees when pagination changes
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await fetchEmployees();
        if (response) {
          const mappedEmployees = response.employees.map(mapEmployeeResponseToEmployee);
          setEmployees(mappedEmployees);
          setTotalElements(response.totalElements);
        }
      } catch (error) {
        console.error('Failed to load employees:', error);
      }
    };
    loadEmployees();
  }, [fetchEmployees, pagination]);

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

  // Get department name helper
  const getDepartmentName = useCallback((deptCode: number) => {
    const dept = departments.find(d => d.deptCode === deptCode);
    return dept?.deptName || dept?.deptName || 'غير متوفر';
  }, [departments]);

  // Filter employees based on role
  const filteredEmployees = useMemo(() => {
    return filterEmployeesByRole(
      employees,
      userRole,
      userContext.employeeId,
      userContext.projectCode,
      userContext.departmentCode
    );
  }, [employees, userRole, userContext.employeeId, userContext.projectCode, userContext.departmentCode]);

  // Form handlers
  const handleAdd = () => {
    setSelectedEmployee(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };

  const handleView = async (employee: Employee) => {
    // Fetch full employee details from API
    try {
      const response = await employeesApi.getEmployeeById(employee.employeeId);
      const fullEmployee = mapEmployeeResponseToEmployee(response);
      setSelectedEmployee(fullEmployee);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Failed to load employee details:', error);
      // Fallback to using the employee from the list
      setSelectedEmployee(employee);
      setIsViewModalOpen(true);
    }
  };

  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteModalOpen(true);
  };

  const { execute: createEmployee, loading: creatingEmployee } = useApiWithToast(
    async (request: EmployeeRequest) => {
      const response = await employeesApi.createEmployee(request);
      return response;
    }
  );

  const { execute: updateEmployee, loading: updatingEmployee } = useApiWithToast(
    async ({ id, request }: { id: number; request: EmployeeRequest }) => {
      const response = await employeesApi.updateEmployee(id, request);
      return response;
    }
  );

  const handleSubmit = async (data: Partial<Employee>) => {
    try {
      const request = mapEmployeeToEmployeeRequest(data);

      if (selectedEmployee) {
        // Update existing employee
        await updateEmployee({ id: selectedEmployee.employeeId, request });
        setIsEditModalOpen(false);
      } else {
        // Add new employee
        await createEmployee(request);
        setIsAddModalOpen(false);
      }

      // Refresh employee list
      const response = await employeesApi.getAllEmployees({
        page: pagination.pageIndex,
        size: pagination.pageSize,
        sortBy: 'employeeNo',
        sortDirection: 'asc',
      });
      const mappedEmployees = response.employees.map(mapEmployeeResponseToEmployee);
      setEmployees(mappedEmployees);
      setTotalElements(response.totalElements);

      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error saving employee:', error);
      // Error is handled by useApiWithToast
    }
  };

  const { execute: deleteEmployeeApi, loading: deletingEmployee } = useApiWithToast(
    async (id: number) => {
      await employeesApi.deleteEmployee(id);
    }
  );

  const handleDeleteConfirm = async () => {
    if (!selectedEmployee) return;

    try {
      await deleteEmployeeApi(selectedEmployee.employeeId);

      // Refresh employee list
      const response = await employeesApi.getAllEmployees({
        page: pagination.pageIndex,
        size: pagination.pageSize,
        sortBy: 'employeeNo',
        sortDirection: 'asc',
      });
      const mappedEmployees = response.employees.map(mapEmployeeResponseToEmployee);
      setEmployees(mappedEmployees);
      setTotalElements(response.totalElements);

      setIsDeleteModalOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      // Error is handled by useApiWithToast
    }
  };

  const isLoading = loadingEmployees || loadingDepartments;
  const isActionLoading = creatingEmployee || updatingEmployee || deletingEmployee;

  // Table columns definition
  const columns = useMemo<MRT_ColumnDef<Employee>[]>(
    () => [
      {
        accessorKey: 'employeeId',
        header: 'رقم الموظف',
        size: 120,
      },
      {
        accessorKey: 'departmentCode',
        header: 'القسم',
        size: 150,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: Employee) => getDepartmentName(row.departmentCode),
        },
        Cell: ({ cell }) => getDepartmentName(cell.getValue<number>()),
      },
      {
        accessorKey: 'fullName',
        header: 'الاسم الكامل',
        size: 200,
      },
      {
        accessorKey: 'contractType',
        header: 'نوع العقد',
        size: 140,
        filterVariant: 'multi-select',
        Cell: ({ cell }) => {
          const type = cell.getValue<string>();
          const colors = {
            TECHNO: { bg: '#DBEAFE', text: '#1E40AF' },
            TEMPORARY: { bg: '#FEF3C7', text: '#92400E' },
            DAILY: { bg: '#FCE7F3', text: '#9F1239' },
          };
          const typeLabels: Record<string, string> = {
            TECHNO: 'تكنو',
            TEMPORARY: 'مؤقت',
            DAILY: 'يومي',
          };
          const color = colors[type as keyof typeof colors] || colors.TECHNO;
          return (
            <Chip
              label={typeLabels[type] || type}
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
        meta: {
          getFilterLabel: (row: Employee) => {
            const labels: Record<string, string> = {
              TECHNO: 'تكنو',
              TEMPORARY: 'مؤقت',
              DAILY: 'يومي',
            };
            return labels[row.contractType] || row.contractType;
          }
        }
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        size: 120,
        filterVariant: 'multi-select',
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          const colors = {
            ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
            ON_LEAVE: { bg: '#FEF3C7', text: '#92400E' },
            INACTIVE: { bg: '#FEE2E2', text: '#991B1B' },
            TERMINATED: { bg: '#F3F4F6', text: '#374151' },
          };
          const statusLabels: Record<string, string> = {
            ACTIVE: 'نشط',
            ON_LEAVE: 'في إجازة',
            INACTIVE: 'غير نشط',
            TERMINATED: 'منتهي',
          };
          const color = colors[status as keyof typeof colors] || colors.ACTIVE;
          return (
            <Chip
              label={statusLabels[status] || status.replace('_', ' ')}
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
        meta: {
          getFilterLabel: (row: Employee) => {
            const labels: Record<string, string> = {
              ACTIVE: 'نشط',
              ON_LEAVE: 'في إجازة',
              INACTIVE: 'غير نشط',
              TERMINATED: 'منتهي',
            };
            return labels[row.status] || row.status;
          }
        }
      },
      {
        accessorKey: 'monthlySalary',
        header: 'الراتب الشهري',
        size: 150,
        filterVariant: 'range',
        Filter: ({ column, table }) => <RangeSliderFilter column={column} table={table} />,
        Cell: ({ cell }) => `ر.س ${formatNumber(cell.getValue<number>())}`,
      },
      {
        accessorKey: 'hireDate',
        header: 'تاريخ التوظيف',
        size: 130,
        filterVariant: 'date-range',
        Cell: ({ cell }) => {
          const date = cell.getValue<Date>();
          return date ? formatDate(date) : 'غير متوفر';
        },
      },
      {
        accessorKey: 'nationalId',
        header: 'الهوية / الإقامة',
        size: 140,
      },
      {
        accessorKey: 'nationality',
        header: 'الجنسية',
        size: 130,
        filterVariant: 'multi-select',
      },
      {
        accessorKey: 'vacationBalance',
        header: 'رصيد الإجازات',
        size: 130,
        filterVariant: 'range',
        Filter: ({ column, table }) => <RangeSliderFilter column={column} table={table} />,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
            {cell.getValue<number>().toFixed(2)} يوم
          </Typography>
        ),
      },
    ],
    [getDepartmentName],
  );

  const table = useMaterialReactTable({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: filteredEmployees as any,
    enableRowSelection: true,
    // enableColumnFilters: true, // Removed to use global config (false) and Smart Filters
    enableColumnOrdering: true,
    enableColumnResizing: true,
    enableStickyHeader: true,
    enableDensityToggle: true,
    enableFullScreenToggle: false,
    manualPagination: true,
    rowCount: totalElements,
    onPaginationChange: setPagination,
    state: {
      pagination,
      isLoading,
    },
    initialState: {
      density: 'comfortable',
      pagination: { pageSize: 25, pageIndex: 0 },
    },
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 80,
      maxSize: 500,
      size: 150,
    },
    localization: mrtArabicLocalization,
    layoutMode: 'grid',
    ...lightTableTheme,
    muiTableContainerProps: {
      sx: {
        ...(lightTableTheme.muiTableContainerProps as { sx?: Record<string, unknown> })?.sx,
        overflowX: 'auto',
        maxWidth: '100%',
        width: '100%',
      },
    },
    renderTopToolbarCustomActions: ({ table }) => {
      const handleExport = () => {
        // Export all rows (respects filtering and sorting, but not pagination)
        const rows = table.getPrePaginationRowModel().rows;

        // Transform data to include department names and formatted values
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exportData = rows.map((row: any) => {
          const employee = row.original;
          const departmentName = getDepartmentName(employee.departmentCode);
          const hireDateFormatted = employee.hireDate
            ? formatDate(employee.hireDate)
            : 'غير متوفر';
          const salaryFormatted = employee.monthlySalary
            ? `ر.س ${formatNumber(employee.monthlySalary)}`
            : 'غير متوفر';

          const statusLabels: Record<string, string> = {
            ACTIVE: 'نشط',
            ON_LEAVE: 'في إجازة',
            INACTIVE: 'غير نشط',
            TERMINATED: 'منتهي',
          };
          const contractLabels: Record<string, string> = {
            TECHNO: 'تكنو',
            TEMPORARY: 'مؤقت',
            DAILY: 'يومي',
          };

          return {
            employeeId: employee.employeeId,
            fullName: employee.fullName,
            email: employee.email || 'غير متوفر',
            phone: employee.phone || 'غير متوفر',
            department: departmentName,
            contractType: contractLabels[employee.contractType] || employee.contractType,
            status: statusLabels[employee.status] || employee.status.replace('_', ' '),
            monthlySalary: salaryFormatted,
            hireDate: hireDateFormatted,
          };
        });

        // Export with proper column headers
        exportDataToCSV(exportData, 'employees-export', {
          employeeId: 'رقم الموظف',
          fullName: 'الاسم الكامل',
          email: 'البريد الإلكتروني',
          phone: 'رقم الهاتف',
          department: 'القسم',
          contractType: 'نوع العقد',
          status: 'الحالة',
          monthlySalary: 'الراتب الشهري',
          hireDate: 'تاريخ التوظيف',
        });
      };

      return (
        <TableToolbarWrapper
          table={table}
          quickFilterGroups={[
            {
              id: 'status',
              label: 'حالة الموظف',
              options: [
                { label: 'نشط', value: 'ACTIVE', color: '#10B981' },
                { label: 'في إجازة', value: 'ON_LEAVE', color: '#F59E0B' },
                { label: 'غير نشط', value: 'INACTIVE', color: '#EF4444' },
                { label: 'منتهي', value: 'TERMINATED', color: '#6B7280' },
              ]
            },
            {
              id: 'contractType',
              label: 'نوع العقد',
              options: [
                { label: 'تكنو', value: 'TECHNO', color: '#3B82F6' },
                { label: 'مؤقت', value: 'TEMPORARY', color: '#8B5CF6' },
                { label: 'يومي', value: 'DAILY', color: '#EC4899' },
              ]
            }
          ]}
        >
          <PermissionGuard module="employees" action="create">
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAdd}
              disabled={isActionLoading}
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
              إضافة موظف
            </Button>
          </PermissionGuard>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={filteredEmployees.length === 0}
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
        </TableToolbarWrapper>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderRowActions: ({ row }: any) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <PermissionGuard module="employees" action="read">
          <Tooltip title="عرض التفاصيل">
            <IconButton
              size="small"
              sx={{ color: '#0c2b7a' }}
              onClick={() => handleView(row.original)}
              disabled={isActionLoading}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
        </PermissionGuard>
        <PermissionGuard module="employees" action="update">
          <Tooltip title="تعديل">
            <IconButton
              size="small"
              sx={{ color: '#059669' }}
              onClick={() => handleEdit(row.original)}
              disabled={isActionLoading}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
        </PermissionGuard>
        <PermissionGuard module="employees" action="delete">
          <Tooltip title="حذف">
            <IconButton
              size="small"
              sx={{ color: '#DC2626' }}
              onClick={() => handleDelete(row.original)}
              disabled={isActionLoading || row.original.status === 'TERMINATED'}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </PermissionGuard>
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
        transition: isFullscreen ? 'none' : 'opacity 0.3s ease',
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
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <CircularProgress />
        </Box>
      ) : (
        <MaterialReactTable table={table} />
      )}
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
              قائمة الموظفين - وضع ملء الشاشة
            </Typography>
            <Tooltip title="إغلاق وضع ملء الشاشة (ESC)">
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
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minWidth: 0,
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
            قائمة الموظفين
          </Typography>
          <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
            عرض وإدارة جميع الموظفين في النظام
          </Typography>
        </Box>

        {loadingEmployees || loadingDepartments ? (
          <LoadingSpinner />
        ) : (
          tableWrapper
        )}
      </Box>

      {/* Forms */}
      <EmployeeForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedEmployee(null);
        }}
        onSubmit={handleSubmit}
        loading={isActionLoading}
      />
      <EmployeeForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEmployee(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedEmployee}
        loading={isActionLoading}
      />
      <EmployeeViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
      />
      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedEmployee(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف الموظف"
        message="هل أنت متأكد من رغبتك في حذف هذا الموظف؟ سيتم تحديد حالته كمنتهي (حذف منطقي)."
        itemName={selectedEmployee?.fullName}
        loading={isActionLoading}
      />
    </>
  );
}

