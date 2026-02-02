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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  RemoveCircle,
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
import type { MonthlyDeductionRecord, MonthlyDeduction } from '@/types';
import useRouteProtection from '@/hooks/useRouteProtection';
import { getUserRole } from '@/lib/permissions';
import { getUserContext, filterEmployeesByRole } from '@/lib/dataFilters';
import DeductionForm from '@/components/forms/DeductionForm';
import DeductionViewForm from '@/components/forms/DeductionViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import { deductionsApi, type DeductionDetailsResponse, type DeductionQueryParams } from '@/lib/api/deductions';
import { employeesApi } from '@/lib/api/employees';
import { transactionTypesApi } from '@/lib/api/transactionTypes';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import { useToast } from '@/contexts/ToastContext';
import { formatDateGregorian } from '@/lib/utils/dateFormatter';
import { CircularProgress, Alert } from '@mui/material';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';
import { formatNumber } from '@/lib/utils/numberFormatter';

export default function MonthlyDeductionsPage() {
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

  const [selectedDeduction, setSelectedDeduction] = useState<MonthlyDeduction | null>(null);
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

  // Fetch transaction types (only deductions for this page)
  const { data: transactionTypesResponse } = useApi(
    () => transactionTypesApi.getDeductionTypes(),
    { immediate: true }
  );

  const transactionTypes = useMemo(() => {
    if (!transactionTypesResponse) return [];
    return transactionTypesResponse;
  }, [transactionTypesResponse]);

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

  // Fetch deductions function
  const fetchDeductions = useCallback(async () => {
    const params: DeductionQueryParams = {
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

    return await deductionsApi.getAllDeductions(params);
  }, [monthDateRange.startDate, monthDateRange.endDate, pagination.pageIndex, pagination.pageSize, userRole, userContext.employeeId]);

  // Fetch deductions with pagination and month filter
  const { data: deductionsResponse, loading: loadingDeductions, error: deductionsError, execute: loadDeductions } = useApiWithToast(
    fetchDeductions,
    { silent: true }
  );

  // Load deductions when dependencies change
  useEffect(() => {
    loadDeductions();
  }, [loadDeductions]);

  // Convert DeductionDetailsResponse to MonthlyDeductionRecord for table
  const deductions = useMemo(() => {
    if (!deductionsResponse?.content) return [];
    return deductionsResponse.content.map((item: DeductionDetailsResponse): MonthlyDeductionRecord => {
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
  }, [deductionsResponse]);

  // Handle URL search params for specific view
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const viewId = searchParams.get('viewId');
    if (viewId && deductions.length > 0) {
      const record = deductions.find(r => r.recordId.toString() === viewId);
      if (record) {
        setTimeout(() => {
          handleView(record);
        }, 100);
      }
    }
  }, [deductions]);

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

  // Convert MonthlyDeductionRecord to MonthlyDeduction
  const convertRecordToDeduction = (record: MonthlyDeductionRecord): MonthlyDeduction => {
    return {
      transactionId: record.recordId,
      employeeId: record.employeeId,
      monthYear: record.monthYear,
      deductionType: record.transactionCode,
      deductionAmount: record.amount,
      status: 'N' as const, // Default status
      notes: record.description,
    };
  };

  // Handler functions
  const handleAdd = () => {
    setSelectedDeduction(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (record: MonthlyDeductionRecord) => {
    setSelectedDeduction(convertRecordToDeduction(record));
    setIsEditModalOpen(true);
  };

  const handleView = (record: MonthlyDeductionRecord) => {
    setSelectedDeduction(convertRecordToDeduction(record));
    setIsViewModalOpen(true);
  };

  const handleDelete = (record: MonthlyDeductionRecord) => {
    setSelectedDeduction(convertRecordToDeduction(record));
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (data: Partial<MonthlyDeduction>) => {
    if (!data.employeeId || !data.deductionType || !data.deductionAmount || !data.monthYear) {
      toast.showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      // Extract date from monthYear (YYYY-MM format)
      const [year, month] = data.monthYear.split('-').map(Number);
      const transactionDate = new Date(year, month - 1, 1).toISOString().split('T')[0];

      const request = {
        employeeNo: data.employeeId,
        typeCode: data.deductionType,
        transactionDate: transactionDate,
        amount: data.deductionAmount,
        notes: data.notes || '',
      };

      if (selectedDeduction) {
        // Note: Backend doesn't have update endpoint, so we'll show an error
        toast.showError('وظيفة التحديث غير متاحة. يرجى الحذف وإنشاء خصم جديد.');
        setIsEditModalOpen(false);
      } else {
        // Create new deduction
        await deductionsApi.submitDeductionRequest(request);
        toast.showSuccess('تم إنشاء الخصم بنجاح');
        setIsAddModalOpen(false);
        // Reload deductions
        loadDeductions();
      }
      setSelectedDeduction(null);
    } catch (error) {
      console.error('Error saving deduction:', error);
      toast.showError('فشل حفظ الخصم. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDeduction) return;

    try {
      const requestorNo = userContext.employeeId || 1; // Get from context or use default
      await deductionsApi.deleteDeduction(selectedDeduction.transactionId, requestorNo);
      toast.showSuccess('تم حذف الخصم بنجاح');
      setIsDeleteModalOpen(false);
      setSelectedDeduction(null);
      // Reload deductions
      loadDeductions();
    } catch (error) {
      console.error('Error deleting deduction:', error);
      toast.showError('فشل حذف الخصم. يرجى المحاولة مرة أخرى.');
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
    if (!deductions || deductions.length === 0) {
      toast.showError('لا توجد بيانات للتصدير');
      return;
    }

    const exportData = deductions.map(deduction => ({
      'رقم الموظف': deduction.employeeId,
      'اسم الموظف': getEmployeeName(deduction.employeeId),
      'الشهر': deduction.monthYear,
      'نوع المعاملة': getTransactionName(deduction.transactionCode),
      'المبلغ': deduction.amount,
      'الوصف': deduction.description || '',
      'تاريخ الإنشاء': formatDateGregorian(deduction.createdDate),
    }));

    exportDataToCSV(exportData, `deductions-${selectedMonth}`);
  };

  const columns = useMemo<MRT_ColumnDef<MonthlyDeductionRecord>[]>(
    () => [
      {
        accessorKey: 'employeeId',
        header: 'الموظف',
        size: 200,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: MonthlyDeductionRecord) => getEmployeeName(row.employeeId)
        },
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
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: MonthlyDeductionRecord) => getTransactionName(row.transactionCode)
        },
        Cell: ({ cell }) => getTransactionName(cell.getValue<number>()),
      },
      {
        accessorKey: 'amount',
        header: 'المبلغ',
        size: 150,
        filterVariant: 'range',
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
        filterVariant: 'date-range',
        Cell: ({ cell }) => formatDateGregorian(cell.getValue<Date>()),
      },
    ],
    [getEmployeeName, getTransactionName]
  );

  const table = useMaterialReactTable({
    columns,
    data: deductions,
    manualPagination: true,
    pageCount: deductionsResponse?.totalPages || 0,
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
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
    renderTopToolbar: ({ table }) => (
      <TableToolbarWrapper table={table}>
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
            disabled={loadingDeductions}
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
            إضافة خصم
          </Button>
          <Button
            variant="outlined"
            startIcon={<RemoveCircle />}
            onClick={handleExport}
            disabled={loadingDeductions || deductions.length === 0}
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
              الخصومات الشهرية - وضع ملء الشاشة
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
            {loadingDeductions ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : deductionsError ? (
              <Alert severity="error" sx={{ mb: 3 }}>
                فشل تحميل الخصومات. يرجى المحاولة مرة أخرى.
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
                    الخصومات الشهرية
                  </Typography>
                  <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                    عرض وإدارة الخصومات الشهرية (الغيابات، غرامات التأخير، إلخ)
                  </Typography>
                </Box>
              </Box>
            </Box>

            {loadingDeductions ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : deductionsError ? (
              <Alert severity="error" sx={{ mb: 3 }}>
                فشل تحميل الخصومات. يرجى المحاولة مرة أخرى.
              </Alert>
            ) : (
              tableWrapper
            )}
          </Box>
        </Box>
      </Box>

      {/* Forms */}
      <DeductionForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedDeduction(null);
        }}
        onSubmit={handleSubmit}
        loading={loadingDeductions}
        employees={accessibleEmployees}
        transactionTypes={transactionTypes}
      />

      <DeductionForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedDeduction(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedDeduction}
        loading={loadingDeductions}
        employees={accessibleEmployees}
        transactionTypes={transactionTypes}
      />

      <DeductionViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedDeduction(null);
        }}
        data={selectedDeduction}
        employees={employees}
        transactionTypes={transactionTypes}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDeduction(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف الخصم"
        message={`هل أنت متأكد أنك تريد حذف هذا الخصم؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedDeduction ? `المعاملة #${selectedDeduction.transactionId}` : undefined}
        loading={loadingDeductions}
      />
    </>
  );
}


