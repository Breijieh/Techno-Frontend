'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateGregorian } from '@/lib/utils/dateFormatter';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  History,
  Fullscreen,
  FullscreenExit,
  Refresh,
  Warning,
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import useRouteProtection from '@/hooks/useRouteProtection';
import type { SalaryHeader, Employee } from '@/types';
import ApprovalDialog from '@/components/common/ApprovalDialog';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import { AnimatedSelect } from '@/components/common/FormFields';
import { payrollApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { getUserContext } from '@/lib/dataFilters';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';
import { useToast } from '@/contexts/ToastContext';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';
import { formatNumber } from '@/lib/utils/numberFormatter';

export default function PayrollApprovalPage() {
  const router = useRouter();
  const toast = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedSalary, setSelectedSalary] = useState<SalaryHeader | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const userContext = getUserContext();

  // Fetch pending payroll for selected month
  const { data: payrollData, loading: isLoading, execute: loadPayroll } = useApi(
    () => payrollApi.getPayrollByMonth(selectedMonth, { page: 0, size: 1000 }),
    { immediate: false }
  );

  // Fetch employees for name lookup
  const { data: employeesData, execute: loadEmployees } = useApi(
    () => employeesApi.getAllEmployees({ page: 0, size: 1000 }),
    { immediate: false }
  );

  const salaryHeaders = payrollData?.content || [];

  // Load payroll on mount and when month changes
  useEffect(() => {
    loadPayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  // Load employees on mount
  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map employees data when it's loaded
  useEffect(() => {
    if (employeesData?.employees) {
      const mappedEmployees = employeesData.employees.map(mapEmployeeResponseToEmployee);
      setEmployees(mappedEmployees);
    }
  }, [employeesData]);

  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'General Manager', 'Finance Manager']);

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

  const employeeMap = useMemo(() => {
    return employees.reduce((acc, emp) => {
      // Prioritize fullName, fallback to employeeName (if exists in runtime but not type), then generic fallback
      acc[emp.employeeId] = emp.fullName || (emp as any).employeeName || 'غير معروف';
      return acc;
    }, {} as Record<number, string>);
  }, [employees]);

  const getEmployeeName = useCallback((empId: number) => {
    return employeeMap[empId] || 'غير معروف';
  }, [employeeMap]);

  // Merge and sort all salaries
  const tableData = useMemo(() => {
    // Clone array to avoid mutating original
    const allSalaries = [...salaryHeaders];

    return allSalaries.sort((a, b) => {
      // Primary Sort: Status (Pending 'N' -> Rejected 'R' -> Approved 'A')
      // Map statuses to weights: N=0, R=1, A=2 for ascending sort
      const getStatusWeight = (status: string) => {
        if (status === 'N') return 0;
        if (status === 'R') return 1;
        if (status === 'A') return 2;
        return 3;
      };

      const weightA = getStatusWeight(a.transStatus);
      const weightB = getStatusWeight(b.transStatus);

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      // Secondary Sort: Employee Name
      const nameA = getEmployeeName(a.employeeNo);
      const nameB = getEmployeeName(b.employeeNo);
      return nameA.localeCompare(nameB, 'ar');
    });
  }, [salaryHeaders, getEmployeeName]);

  const approvedSalaries = useMemo(() => salaryHeaders.filter(s => s.transStatus === 'A'), [salaryHeaders]);

  // Form handlers
  const handleView = (salary: SalaryHeader) => {
    setSelectedSalary(salary);
    setIsViewModalOpen(true);
  };

  const handleApproveClick = (salary: SalaryHeader) => {
    setSelectedSalary(salary);
    setApprovalAction('approve');
    setIsApprovalModalOpen(true);
  };

  const handleRejectClick = (salary: SalaryHeader) => {
    setSelectedSalary(salary);
    setApprovalAction('reject');
    setIsApprovalModalOpen(true);
  };

  const handleApprovalAction = async (action: 'approve' | 'reject', notes?: string) => {
    if (!selectedSalary || !userContext.employeeId) return;

    try {
      if (action === 'approve') {
        await payrollApi.approvePayroll(selectedSalary.salaryId, {
          approverNo: userContext.employeeId,
          notes,
        });
        toast.showSuccess('تمت الموافقة على الراتب بنجاح');
      } else {
        await payrollApi.rejectPayroll(selectedSalary.salaryId, {
          approverNo: userContext.employeeId,
          rejectionReason: notes || 'No reason provided',
        });
        toast.showSuccess('تم رفض الراتب بنجاح');
      }

      // Reload payroll data
      await loadPayroll();

      setIsApprovalModalOpen(false);
      setSelectedSalary(null);
      setApprovalAction(null);
    } catch (error) {
      console.error('Error processing approval:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast.showError(`فشل ${action === 'approve' ? 'الموافقة على' : 'رفض'} الراتب: ${errorMessage}`);
      throw error; // Re-throw to let dialog handle it
    }
  };

  const handleApprovalHistory = () => {
    setIsHistoryModalOpen(true);
  };

  const formatSalaryForView = (salary: SalaryHeader) => {
    return [
      { label: 'رقم الراتب', value: salary.salaryId.toString() },
      { label: 'الموظف', value: getEmployeeName(salary.employeeNo) },
      { label: 'الشهر', value: salary.salaryMonth },
      { label: 'الراتب الأساسي', value: `ر.س ${formatNumber(salary.grossSalary)}` },
      { label: 'إجمالي البدلات', value: `ر.س ${formatNumber(salary.totalAllowances)}` },
      { label: 'الساعات الإضافية', value: `ر.س ${formatNumber(salary.totalOvertime)}` },
      { label: 'إجمالي الخصومات', value: `ر.س ${formatNumber(salary.totalDeductions)}` },
      { label: 'حسم غياب/تأخير', value: `ر.س ${formatNumber(salary.totalAbsence)}` },
      { label: 'قسط القرض', value: `ر.س ${formatNumber(salary.totalLoans)}` },
      { label: 'الراتب الصافي', value: `ر.س ${formatNumber(salary.netSalary)}` },
      { label: 'الحالة', value: salary.transStatus === 'A' ? 'موافق عليه' : salary.transStatus === 'N' ? 'قيد الانتظار' : 'مرفوض' },
      ...(salary.rejectionReason ? [{ label: 'سبب الرفض', value: salary.rejectionReason }] : []),
    ];
  };

  const columns = useMemo<MRT_ColumnDef<SalaryHeader>[]>(
    () => [
      {
        accessorKey: 'salaryId',
        header: 'رقم الراتب',
        size: 110,
      },
      {
        id: 'employeeNo',
        header: 'الموظف',
        size: 200,
        accessorFn: (row) => getEmployeeName(row.employeeNo),
        filterVariant: 'multi-select',
      },
      {
        accessorKey: 'salaryMonth',
        header: 'الشهر',
        size: 110,
      },
      {
        accessorKey: 'grossSalary',
        header: 'الراتب الأساسي',
        size: 130,
        filterVariant: 'range',
        filterFn: 'betweenInclusive',
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
            {formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'totalAllowances',
        header: 'البدلات',
        size: 120,
        filterVariant: 'range',
        filterFn: 'betweenInclusive',
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', color: '#059669' }}>
            +{formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'totalDeductions',
        header: 'الخصومات',
        size: 120,
        filterVariant: 'range',
        filterFn: 'betweenInclusive',
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', color: '#DC2626' }}>
            -{formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'netSalary',
        header: 'الراتب الصافي',
        size: 140,
        filterVariant: 'range',
        filterFn: 'betweenInclusive',
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0c2b7a' }}>
            ر.س {formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'nextLevel',
        header: 'مستوى الموافقة',
        size: 140,
        Cell: ({ row }) => {
          const level = row.original.nextLevel || 0;
          const steps = ['مراجعة الموارد البشرية', 'مراجعة المالية', 'موافقة المدير العام'];

          return (
            <Box sx={{ maxWidth: 300 }}>
              <Stepper activeStep={level > 0 ? level - 1 : 0} alternativeLabel>
                {steps.map((label, index) => (
                  <Step key={label} completed={level > index + 1}>
                    <StepLabel>
                      <Typography sx={{ fontSize: '10px' }}>{label}</Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          );
        },
      },
      {
        id: 'transStatus',
        header: 'الحالة',
        size: 120,
        accessorFn: (row) => {
          const labels: Record<string, string> = {
            A: 'موافق عليه',
            N: 'قيد الانتظار',
            R: 'مرفوض',
          };
          return labels[row.transStatus] || row.transStatus;
        },
        filterVariant: 'multi-select',
        Cell: ({ row }) => {
          const status = row.original.transStatus;
          return (
            <Chip
              label={status === 'A' ? 'موافق عليه' : status === 'N' ? 'قيد الانتظار' : 'مرفوض'}
              size="small"
              sx={{
                backgroundColor: status === 'A' ? '#D1FAE5' : status === 'N' ? '#FEF3C7' : '#FEE2E2',
                color: status === 'A' ? '#065F46' : status === 'N' ? '#92400E' : '#B91C1C',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
      },
      {
        accessorKey: 'blockingReason',
        header: 'سبب الحظر',
        size: 200,
        Cell: ({ row }) => {
          const blockingReason = row.original.blockingReason;
          if (!blockingReason) return null;
          return (
            <Chip
              icon={<Warning sx={{ fontSize: '14px !important' }} />}
              label={blockingReason}
              size="small"
              sx={{
                backgroundColor: '#FEF2F2',
                color: '#B91C1C',
                border: '1px solid #FECACA',
                fontWeight: 600,
                fontSize: '11px',
                maxWidth: '180px',
                '& .MuiChip-label': {
                  whiteSpace: 'normal',
                  lineHeight: 1.3,
                  padding: '4px 8px',
                },
                '& .MuiChip-icon': {
                  color: '#DC2626',
                },
              }}
            />
          );
        },
      },
    ],
    [getEmployeeName],
  );

  const table = useMaterialReactTable({
    columns,
    data: tableData,
    enableRowSelection: true,
    memoMode: 'cells', // Optimization: Only re-render changed cells
    enableRowVirtualization: true, // Optimization: Virtualize rows for performance
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
    ...lightTableTheme,
    initialState: {
      ...lightTableTheme.initialState,
      density: 'comfortable',
      pagination: { pageSize: 25, pageIndex: 0 },
    },
    localization: mrtArabicLocalization,
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
            id: 'transStatus',
            label: 'حالة القيد',
            options: [
              { label: 'قيد الانتظار', value: 'N', color: '#F59E0B' },
              { label: 'موافق عليه', value: 'A', color: '#10B981' },
              { label: 'مرفوض', value: 'R', color: '#EF4444' },
            ]
          }
        ]}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            disabled={table.getSelectedRowModel().rows.length === 0 || isBulkApproving}
            onClick={handleBulkApprove}
            sx={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
              },
              '&:disabled': {
                backgroundColor: '#E5E7EB',
              },
            }}
          >
            {isBulkApproving ? 'جاري الموافقة...' : `موافقة مجمعة (${table.getSelectedRowModel().rows.length})`}
          </Button>
          <Button
            variant="outlined"
            startIcon={<History />}
            onClick={handleApprovalHistory}
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
            سجل الموافقات
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
        {row.original.transStatus === 'N' && (
          <>
            <Tooltip title={row.original.blockingReason ? row.original.blockingReason : "موافقة"}>
              <span>
                <IconButton
                  size="small"
                  sx={{ color: row.original.blockingReason ? '#9CA3AF' : '#059669' }}
                  onClick={() => handleApproveClick(row.original)}
                  disabled={!!row.original.blockingReason}
                >
                  <CheckCircle fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="رفض">
              <IconButton
                size="small"
                sx={{ color: '#DC2626' }}
                onClick={() => handleRejectClick(row.original)}
              >
                <Cancel fontSize="small" />
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
      },
    },
    muiTableBodyRowProps: ({ row }) => {
      const hasBlockingReason = !!row.original.blockingReason;
      const isApproved = row.original.transStatus === 'A';

      return {
        sx: {
          backgroundColor: hasBlockingReason ? '#FEE2E2' : isApproved ? '#DCFCE7' : undefined,
          borderLeft: hasBlockingReason ? '4px solid #DC2626' : isApproved ? '4px solid #16A34A' : undefined,
          '&:hover': {
            backgroundColor: hasBlockingReason ? '#FECACA' : isApproved ? '#BBF7D0' : undefined,
          },
          '& td': {
            backgroundColor: hasBlockingReason || isApproved ? 'inherit !important' : undefined,
          },
        },
      };
    },
  });

  const handleBulkApprove = async () => {
    if (!userContext.employeeId) {
      toast.showError('سياق المستخدم غير متاح');
      return;
    }

    const selectedIds = table.getSelectedRowModel().rows.map(row => row.original.salaryId);

    if (selectedIds.length === 0) {
      toast.showWarning('لم يتم تحديد رواتب');
      return;
    }

    setIsBulkApproving(true);
    try {
      // Approve each salary sequentially
      let successCount = 0;
      let errorCount = 0;

      for (const salaryId of selectedIds) {
        try {
          await payrollApi.approvePayroll(salaryId, {
            approverNo: userContext.employeeId,
            notes: 'موافقة مجمعة',
          });
          successCount++;
        } catch (error) {
          console.error(`Error approving salary ${salaryId}:`, error);
          errorCount++;
        }
      }

      // Reload payroll data
      await loadPayroll();
      table.resetRowSelection();

      if (errorCount === 0) {
        toast.showSuccess(`تمت الموافقة بنجاح على ${successCount} راتب`);
      } else {
        toast.showWarning(`تمت الموافقة على ${successCount} راتب، فشل ${errorCount}`);
      }
    } catch (error) {
      console.error('Error bulk approving salaries:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast.showError(`فشلت الموافقة المجمعة: ${errorMessage}`);
    } finally {
      setIsBulkApproving(false);
    }
  };

  // History table configuration
  const historyColumns = useMemo<MRT_ColumnDef<SalaryHeader>[]>(
    () => [
      {
        accessorKey: 'salaryId',
        header: 'رقم الراتب',
        size: 110,
      },
      {
        accessorKey: 'employeeNo',
        header: 'الموظف',
        size: 200,
        Cell: ({ cell }) => getEmployeeName(cell.getValue<number>()),
      },
      {
        accessorKey: 'salaryMonth',
        header: 'الشهر',
        size: 110,
      },
      {
        accessorKey: 'grossSalary',
        header: 'الراتب الأساسي',
        size: 130,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
            {formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'totalAllowances',
        header: 'البدلات',
        size: 120,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', color: '#059669' }}>
            +{formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'totalDeductions',
        header: 'الخصومات',
        size: 120,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', color: '#DC2626' }}>
            -{formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'netSalary',
        header: 'الراتب الصافي',
        size: 140,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0c2b7a' }}>
            ر.س {formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'approvedDate',
        header: 'تاريخ الموافقة',
        size: 140,
        Cell: ({ cell }) => {
          const date = cell.getValue<Date | undefined>();
          return date ? (
            <Typography sx={{ fontSize: '13px', color: '#111827' }}>
              {formatDateGregorian(new Date(date))}
            </Typography>
          ) : (
            <Typography sx={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>
              غير متاح
            </Typography>
          );
        },
      },
      {
        accessorKey: 'transStatus',
        header: 'الحالة',
        size: 120,
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          return (
            <Chip
              label={status === 'A' ? 'موافق عليه' : status === 'N' ? 'قيد الانتظار' : 'مرفوض'}
              size="small"
              sx={{
                backgroundColor: status === 'A' ? '#D1FAE5' : status === 'N' ? '#FEF3C7' : '#FEE2E2',
                color: status === 'A' ? '#065F46' : status === 'N' ? '#92400E' : '#B91C1C',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
      },
    ],
    [getEmployeeName],
  );

  const historyTable = useMaterialReactTable({
    columns: historyColumns,
    data: approvedSalaries,
    enableColumnFilters: false,
    enablePagination: true,
    enableColumnResizing: true,
    enableStickyHeader: true,
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 80,
      maxSize: 500,
      size: 150,
    },
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
      sorting: [{ id: 'approvedDate', desc: true }],
    },
    localization: mrtArabicLocalization,
    ...lightTableTheme,
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
              موافقة الرواتب - وضع ملء الشاشة
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
                موافقة الرواتب
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                مراجعة والموافقة على الرواتب المحسوبة مع سير عمل متعدد المستويات
              </Typography>
            </Box>

            {/* controls */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 2, width: 300 }}>
                {/* Year Select */}
                <Box sx={{ flex: 1 }}>
                  <AnimatedSelect
                    label="السنة"
                    value={selectedMonth.split('-')[0]}
                    onChange={(val) => {
                      const currentMonth = selectedMonth.split('-')[1];
                      setSelectedMonth(`${val}-${currentMonth}`);
                    }}
                    options={Array.from({ length: 11 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      return { value: String(year), label: String(year) };
                    })}
                  />
                </Box>

                {/* Month Select */}
                <Box sx={{ flex: 1.5 }}>
                  <AnimatedSelect
                    label="الشهر"
                    value={selectedMonth.split('-')[1]}
                    onChange={(val) => {
                      const currentYear = selectedMonth.split('-')[0];
                      setSelectedMonth(`${currentYear}-${val}`);
                    }}
                    options={[
                      { value: '01', label: 'يناير' },
                      { value: '02', label: 'فبراير' },
                      { value: '03', label: 'مارس' },
                      { value: '04', label: 'أبريل' },
                      { value: '05', label: 'مايو' },
                      { value: '06', label: 'يونيو' },
                      { value: '07', label: 'يوليو' },
                      { value: '08', label: 'أغسطس' },
                      { value: '09', label: 'سبتمبر' },
                      { value: '10', label: 'أكتوبر' },
                      { value: '11', label: 'نوفمبر' },
                      { value: '12', label: 'ديسمبر' },
                    ]}
                  />
                </Box>
              </Box>

              <Button
                disabled={isLoading}
                onClick={() => loadPayroll()}
                variant="outlined"
                startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
                sx={{
                  height: 40,
                  borderColor: '#D1D5DB',
                  color: '#374151',
                  '&:hover': {
                    borderColor: '#9CA3AF',
                    backgroundColor: '#F9FAFB',
                  },
                }}
              >
                تحديث
              </Button>
            </Box>

            {tableWrapper}
          </Box>
        </Box>
      </Box>

      {/* Forms */}
      <ViewDetailsDialog
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedSalary(null);
        }}
        title="تفاصيل الراتب"
        fields={selectedSalary ? formatSalaryForView(selectedSalary) : []}
      />

      <ApprovalDialog
        open={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setSelectedSalary(null);
          setApprovalAction(null);
        }}
        onApprove={(notes) => handleApprovalAction('approve', notes)}
        onReject={(notes) => handleApprovalAction('reject', notes)}
        title={approvalAction === 'approve' ? 'الموافقة على الراتب' : 'رفض الراتب'}
        message={approvalAction === 'approve'
          ? 'هل أنت متأكد أنك تريد الموافقة على حساب الراتب هذا؟'
          : 'هل أنت متأكد أنك تريد رفض حساب الراتب هذا؟'}
        itemName={selectedSalary ? `رقم الراتب: ${selectedSalary.salaryId} - ${getEmployeeName(selectedSalary.employeeNo)}` : undefined}
        loading={isLoading || isBulkApproving}
      />

      {/* Approval History Dialog */}
      <AnimatedDialog
        open={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="سجل موافقات الرواتب"
        maxWidth="lg"
        actions={
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={() => setIsHistoryModalOpen(false)}
              sx={{
                backgroundColor: '#0c2b7a',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#0a266e',
                },
              }}
            >
              إغلاق
            </Button>
          </Box>
        }
      >
        <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
          <MaterialReactTable table={historyTable} />
        </Box>
      </AnimatedDialog>
    </>
  );
}


