'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  AttachMoney,
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
import type { MonthlyAllowanceRecord, MonthlyAllowance } from '@/types';
import useRouteProtection from '@/hooks/useRouteProtection';
import { getUserRole } from '@/lib/permissions';
import { getUserContext } from '@/lib/dataFilters';
import { filterEmployeesByRole } from '@/lib/dataFilters';
import AllowanceForm from '@/components/forms/AllowanceForm';
import AllowanceViewForm from '@/components/forms/AllowanceViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import { allowancesApi, type AllowanceDetailsResponse, type AllowanceQueryParams } from '@/lib/api/allowances';
import { employeesApi } from '@/lib/api/employees';
import { transactionTypesApi } from '@/lib/api/transactionTypes';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import { useToast } from '@/contexts/ToastContext';
import { formatDateGregorian } from '@/lib/utils/dateFormatter';
import { formatNumber } from '@/lib/utils/numberFormatter';

export default function MonthlyAllowancesPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Generate month options (6 months back, 6 months forward)
  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = formatDateGregorian(date, { month: 'long', year: 'numeric' });
      options.push({ value: monthValue, label: monthName });
    }
    return options;
  }, []);

  // Set default month to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedAllowance, setSelectedAllowance] = useState<MonthlyAllowance | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const userRole = getUserRole();
  const userContext = getUserContext();
  const toast = useToast();

  // Fetch employees
  const { data: employeesResponse } = useApi(
    () => employeesApi.getAllEmployees(),
    { immediate: true }
  );

  const employees = useMemo(() => {
    if (!employeesResponse?.content) return [];
    return employeesResponse.content.map(mapEmployeeResponseToEmployee);
  }, [employeesResponse]);

  // Filter employees based on role
  const accessibleEmployees = useMemo(() => {
    return filterEmployeesByRole(
      employees,
      userRole,
      userContext.employeeId,
      userContext.projectCode,
      userContext.departmentCode
    );
  }, [employees, userRole, userContext]);

  // Fetch transaction types (only allowances)
  const { data: transactionTypes } = useApi(
    () => transactionTypesApi.getAllowanceTypes(),
    { immediate: true }
  );

  // Calculate date range for selected month
  const monthDateRange = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [selectedMonth]);

  // Fetch allowances function
  const fetchAllowances = useCallback(async () => {
    const params: AllowanceQueryParams = {
      startDate: monthDateRange.startDate,
      endDate: monthDateRange.endDate,
      page: pagination.pageIndex,
      size: pagination.pageSize,
      sortBy: 'transactionDate',
      sortDirection: 'desc' as const,
    };

    // Apply role-based filtering
    if (userRole === 'Employee' && userContext.employeeId) {
      params.employeeNo = userContext.employeeId;
    }

    return await allowancesApi.getAllAllowances(params);
  }, [monthDateRange.startDate, monthDateRange.endDate, pagination.pageIndex, pagination.pageSize, userRole, userContext.employeeId]);

  // Fetch allowances with pagination and month filter
  const { data: allowancesResponse, loading: loadingAllowances, error: allowancesError, execute: loadAllowances } = useApiWithToast(
    fetchAllowances,
    { silent: true }
  );

  // Load allowances when dependencies change
  useEffect(() => {
    loadAllowances();
  }, [loadAllowances]);

  // Convert AllowanceDetailsResponse to MonthlyAllowanceRecord for table
  const allowances = useMemo(() => {
    if (!allowancesResponse?.content) return [];
    return allowancesResponse.content.map((item: AllowanceDetailsResponse): MonthlyAllowanceRecord => {
      const transactionDate = new Date(item.transactionDate);
      const monthYear = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
      return {
        recordId: item.transactionNo,
        employeeId: item.employeeNo,
        monthYear: monthYear,
        transactionCode: item.typeCode,
        amount: Number(item.amount),
        description: item.notes || '',
        createdDate: transactionDate,
      };
    });
  }, [allowancesResponse]);

  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'Finance Manager']);

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

  // Handler functions
  const handleAdd = () => {
    setSelectedAllowance(null);
    setIsAddModalOpen(true);
  };

  // Convert MonthlyAllowanceRecord to MonthlyAllowance
  const convertRecordToAllowance = (record: MonthlyAllowanceRecord): MonthlyAllowance => {
    return {
      transactionId: record.recordId,
      employeeId: record.employeeId,
      monthYear: record.monthYear,
      transactionType: record.transactionCode,
      transactionAmount: record.amount,
      status: 'N' as const, // Default status
      notes: record.description,
    };
  };

  const handleEdit = (record: MonthlyAllowanceRecord) => {
    setSelectedAllowance(convertRecordToAllowance(record));
    setIsEditModalOpen(true);
  };

  const handleView = (record: MonthlyAllowanceRecord) => {
    setSelectedAllowance(convertRecordToAllowance(record));
    setIsViewModalOpen(true);
  };

  const handleDelete = (record: MonthlyAllowanceRecord) => {
    setSelectedAllowance(convertRecordToAllowance(record));
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (data: Partial<MonthlyAllowance>) => {
    if (!data.employeeId || !data.transactionType || !data.transactionAmount || !data.monthYear) {
      toast.showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      // Extract date from monthYear (YYYY-MM format)
      const [year, month] = data.monthYear.split('-').map(Number);
      const transactionDate = new Date(year, month - 1, 1).toISOString().split('T')[0];

      const request = {
        employeeNo: data.employeeId,
        typeCode: data.transactionType,
        transactionDate: transactionDate,
        amount: data.transactionAmount,
        notes: data.notes || '',
      };

      if (selectedAllowance) {
        // Note: Backend doesn't have update endpoint, so we'll show an error
        toast.showError('وظيفة التحديث غير متاحة. يرجى الحذف وإنشاء بدل جديد.');
        setIsEditModalOpen(false);
      } else {
        // Create new allowance
        await allowancesApi.submitAllowanceRequest(request);
        toast.showSuccess('تم إنشاء البدل بنجاح');
        setIsAddModalOpen(false);
        // Reload allowances
        loadAllowances();
      }
      setSelectedAllowance(null);
    } catch (error) {
      console.error('Error saving allowance:', error);
      toast.showError('فشل حفظ البدل. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAllowance) return;

    try {
      const requestorNo = userContext.employeeId || 1; // Get from context or use default
      await allowancesApi.deleteAllowance(selectedAllowance.transactionId, requestorNo);
      toast.showSuccess('تم حذف البدل بنجاح');
      setIsDeleteModalOpen(false);
      setSelectedAllowance(null);
      // Reload allowances
      loadAllowances();
    } catch (error) {
      console.error('Error deleting allowance:', error);
      toast.showError('فشل حذف البدل. يرجى المحاولة مرة أخرى.');
    }
  };

  const getEmployeeName = useCallback((employeeId: number) => {
    const employee = employees.find(e => e.employeeId === employeeId);
    return employee ? employee.fullName : `رقم: ${employeeId}`;
  }, [employees]);

  const getTransactionName = useCallback((transactionCode: number) => {
    const transaction = transactionTypes?.find(t => t.typeCode === transactionCode);
    return transaction?.typeName || `الرمز ${transactionCode}`;
  }, [transactionTypes]);

  const handleExport = () => {
    if (!allowances || allowances.length === 0) {
      toast.showError('لا توجد بيانات للتصدير');
      return;
    }

    const exportData = allowances.map(allowance => ({
      'رقم الموظف': allowance.employeeId,
      'اسم الموظف': getEmployeeName(allowance.employeeId),
      'الشهر': allowance.monthYear,
      'نوع المعاملة': getTransactionName(allowance.transactionCode),
      'المبلغ': allowance.amount,
      'الوصف': allowance.description || '',
      'تاريخ الإنشاء': formatDateGregorian(allowance.createdDate),
    }));

    exportDataToCSV(exportData, `allowances-${selectedMonth}`);
  };

  const columns = useMemo<MRT_ColumnDef<MonthlyAllowanceRecord>[]>(
    () => [
      {
        accessorKey: 'employeeId',
        header: 'الموظف',
        size: 200,
        Cell: ({ cell }) => getEmployeeName(cell.getValue<number>()),
      },
      {
        accessorKey: 'monthYear',
        header: 'الشهر',
        size: 120,
      },
      {
        accessorKey: 'transactionCode',
        header: 'النوع',
        size: 200,
        Cell: ({ cell }) => getTransactionName(cell.getValue<number>()),
      },
      {
        accessorKey: 'amount',
        header: 'المبلغ',
        size: 150,
        Cell: ({ cell }) => `ر.س ${formatNumber(cell.getValue<number>())}`,
      },
      {
        accessorKey: 'description',
        header: 'الوصف',
        size: 300,
      },
      {
        accessorKey: 'createdDate',
        header: 'تاريخ الإنشاء',
        size: 120,
        Cell: ({ cell }) => formatDateGregorian(cell.getValue<Date>()),
      },
    ],
    [getEmployeeName, getTransactionName]
  );

  const table = useMaterialReactTable({
    columns,
    data: allowances,
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
    manualPagination: true,
    pageCount: allowancesResponse?.totalPages || 0,
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
    initialState: {
      density: 'comfortable',
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
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setPagination({ pageIndex: 0, pageSize: pagination.pageSize });
          }}
          size="small"
          SelectProps={{ displayEmpty: true }}
          sx={{
            minWidth: 150,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#FFFFFF',
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
            '& .MuiSelect-select': {
              color: selectedMonth ? '#111827' : '#9CA3AF',
            },
          }}
        >
          {monthOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
          disabled={loadingAllowances}
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
          إضافة بدل
        </Button>
        <Button
          variant="outlined"
          startIcon={<AttachMoney />}
          onClick={handleExport}
          disabled={loadingAllowances || allowances.length === 0}
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
              البدلات الشهرية - وضع ملء الشاشة
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

          {/* Fullscreen Table Container */}
          <Box
            sx={{
              flex: 1,
              padding: 0,
              overflow: 'auto',
              backgroundColor: '#F8F9FC',
            }}
          >
            {loadingAllowances ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : allowancesError ? (
              <Alert severity="error" sx={{ mb: 3 }}>
                فشل تحميل البدلات. يرجى المحاولة مرة أخرى.
              </Alert>
            ) : (
              tableWrapper
            )}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
                  >
                    البدلات الشهرية
                  </Typography>
                  <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                    عرض وإدارة البدلات الشهرية (الساعات الإضافية، المكافآت، إلخ)
                  </Typography>
                </Box>
              </Box>
            </Box>

            {tableWrapper}
          </Box>
        </Box>
      </Box>

      {/* Forms */}
      <AllowanceForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedAllowance(null);
        }}
        onSubmit={handleSubmit}
        loading={loadingAllowances}
        employees={accessibleEmployees}
        transactionTypes={transactionTypes || []}
      />

      <AllowanceForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAllowance(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedAllowance}
        loading={loadingAllowances}
        employees={accessibleEmployees}
        transactionTypes={transactionTypes || []}
      />

      <AllowanceViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedAllowance(null);
        }}
        data={selectedAllowance}
        employees={employees}
        transactionTypes={transactionTypes || []}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedAllowance(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف البدل"
        message={`هل أنت متأكد أنك تريد حذف هذا البدل؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedAllowance ? `المعاملة #${selectedAllowance.transactionId}` : undefined}
        loading={loadingAllowances}
      />
    </>
  );
}


