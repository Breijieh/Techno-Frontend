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
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  PendingActions,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_TableInstance,
  useMaterialReactTable,
} from 'material-react-table';

import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import { getUserRole } from '@/lib/permissions';
import useRouteProtection from '@/hooks/useRouteProtection';
import ApprovalDialog from '@/components/common/ApprovalDialog';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import { approvalsApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import type { UnifiedApprovalRequest } from '@/lib/api/approvals';
import type { EmployeeResponse } from '@/lib/api/employees';
import { formatDate } from '@/lib/utils/dateFormatter';

export default function PendingApprovalsPage() {
  const router = useRouter();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UnifiedApprovalRequest | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const userRole = getUserRole();

  const toast = useToast();

  // Get current user's employee data (needed for both Employee role and managers who approve)
  const { data: employeeResponse } = useApi<EmployeeResponse>(
    () => employeesApi.getMyEmployee(),
    { immediate: userRole === 'Employee' }
  );

  // Extract employeeNo
  const employeeNo = employeeResponse?.employeeNo;

  // Fetch pending approvals
  // For Employee role, use employeeNo from API; for other roles, use 0 to get all pending approvals for them
  // Fetch pending approvals
  // For Employee role, use employeeNo from API; for other roles, use 0 to get all pending approvals for them
  const { data: approvalRequests = [], loading: isLoading, error: errorApprovals, execute: loadApprovals } = useApi(
    () => {
      const approverId = userRole === 'Employee' ? (employeeNo || 0) : 0;
      return approvalsApi.getAllPendingApprovals(approverId);
    },
    { immediate: userRole !== 'Employee' || !!employeeNo }
  );

  // Fetch employees as fallback for employee name lookup (only for non-Employee roles)
  const { data: employees = [], loading: loadingEmployees, error: errorEmployees } = useApi(
    () => employeesApi.getAllEmployees(),
    { immediate: userRole !== 'Employee' }
  );

  // Load approvals on mount or when employeeNo becomes available (for Employee role)
  useEffect(() => {
    if (userRole === 'Employee' && employeeNo !== undefined) {
      loadApprovals();
    } else if (userRole !== 'Employee') {
      // For admins/managers, we can load immediately, but we might also want to reload if employeeNo appears
      // to handle hybrid cases where an admin IS also an employee
      // But preventing double-load is good. immediate: true handles the initial load.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeNo, userRole]);

  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'General Manager', 'Finance Manager', 'Project Manager', 'Project Secretary', 'Regional Project Manager', 'Employee']);

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

  // Helper to find employee name
  const getEmployeeName = useCallback((empId: number) => {
    // Handle both array (if API changed) and EmployeeListResponse object
    const empList = Array.isArray(employees)
      ? employees
      : (employees as { employees?: EmployeeResponse[] })?.employees || [];

    if (!Array.isArray(empList)) return `موظف #${empId}`;

    const emp = empList.find((e: EmployeeResponse) => e.employeeNo === empId);
    return emp ? `${emp.employeeName} (${emp.employeeNo})` : `موظف #${empId}`;
  }, [employees]);

  // Approval handlers
  const handleView = (request: UnifiedApprovalRequest) => {
    setSelectedRequest(request);
    setIsViewDialogOpen(true);
  };

  const handleApprove = (request: UnifiedApprovalRequest) => {
    setSelectedRequest(request);
    setApprovalAction('approve');
    setIsApprovalDialogOpen(true);
  };

  const handleReject = (request: UnifiedApprovalRequest) => {
    setSelectedRequest(request);
    setApprovalAction('reject');
    setIsApprovalDialogOpen(true);
  };

  const handleApproveSelected = (table: MRT_TableInstance<UnifiedApprovalRequest>) => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    // For bulk approve, approve the first one and show dialog
    // In a real app, you might want to show a bulk approval dialog
    const firstRequest = selectedRows[0].original as UnifiedApprovalRequest;
    handleApprove(firstRequest);
  };

  const handleRejectSelected = (table: MRT_TableInstance<UnifiedApprovalRequest>) => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    // For bulk reject, reject the first one and show dialog
    const firstRequest = selectedRows[0].original as UnifiedApprovalRequest;
    handleReject(firstRequest);
  };

  // Approval/rejection operations with toast
  const approveRequest = useApiWithToast(
    async (requestType: UnifiedApprovalRequest['requestType'], requestId: number, approverNo: number, notes?: string) => {
      await approvalsApi.approveRequest(requestType, requestId, approverNo, notes);
    },
    { successMessage: 'تمت الموافقة على الطلب بنجاح' }
  );

  const rejectRequest = useApiWithToast(
    async (requestType: UnifiedApprovalRequest['requestType'], requestId: number, approverNo: number, rejectionReason: string) => {
      await approvalsApi.rejectRequest(requestType, requestId, approverNo, rejectionReason);
    },
    { successMessage: 'تم رفض الطلب بنجاح' }
  );

  const handleApprovalConfirm = async (notes?: string, rejectionReason?: string) => {
    // Employees cannot approve or reject if they don't have an employee number
    if (!selectedRequest) return;

    // For Employee role, strictly require employeeNo
    if (userRole === 'Employee' && !employeeNo) {
      toast.showError('تعذر تحميل ملف الموظف.');
      return;
    }

    try {
      // Use 0 as approverNo for Admins/Managers who don't have an employee profile
      // The backend will handle the authorization check mostly based on Roles for admins
      const approverId = employeeNo || 0;

      if (approvalAction === 'approve') {
        await approveRequest.execute(
          selectedRequest.requestType,
          selectedRequest.requestId,
          approverId,
          notes
        );
      } else if (approvalAction === 'reject') {
        await rejectRequest.execute(
          selectedRequest.requestType,
          selectedRequest.requestId,
          approverId,
          rejectionReason || 'لم يتم تقديم سبب'
        );
      }

      // Reload approvals
      await loadApprovals();

      setIsApprovalDialogOpen(false);
      setSelectedRequest(null);
      setApprovalAction(null);
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error; // Re-throw to let dialog handle it
    }
  };

  const getRequestDetails = (request: UnifiedApprovalRequest) => {
    const commonFields = [
      { label: 'رقم الطلب', value: `#${request.requestId}` },
      { label: 'النوع', value: request.requestType },
      { label: 'طلب بواسطة', value: request.requestedByName || getEmployeeName(request.requestedBy) },
      { label: 'تاريخ الطلب', value: formatDate(request.requestDate) },
      { label: 'الحالة', value: request.status },
      { label: 'المستوى الحالي', value: request.currentLevelName || `المستوى ${request.currentLevel}` },
    ];

    if (request.nextApproval) {
      commonFields.push({ label: 'الموافق التالي', value: getEmployeeName(request.nextApproval) });
    }

    interface DetailField {
      label: string;
      value: string | number | undefined;
      type?: 'date' | 'currency';
    }

    const typeSpecificFields: DetailField[] = [];
    const details = request.details || {};

    if (request.requestType === 'LEAVE') {
      const leaveDetails = details as Record<string, unknown>;
      typeSpecificFields.push(
        { label: 'الإجازة من', value: leaveDetails.leaveFromDate as string, type: 'date' },
        { label: 'الإجازة إلى', value: leaveDetails.leaveToDate as string, type: 'date' },
        { label: 'الأيام', value: leaveDetails.leaveDays as number | undefined },
        { label: 'السبب', value: (leaveDetails.leaveReason as string) || '-' }
      );
    } else if (request.requestType === 'LOAN') {
      const loanDetails = details as Record<string, unknown>;
      typeSpecificFields.push(
        { label: 'مبلغ القرض', value: loanDetails.loanAmount as number | undefined, type: 'currency' },
        { label: 'الأقساط', value: loanDetails.noOfInstallments as number | undefined },
        { label: 'الدفعة الشهرية', value: loanDetails.installmentAmount as number | undefined, type: 'currency' },
        { label: 'الرصيد المتبقي', value: loanDetails.remainingBalance as number | undefined, type: 'currency' }
      );
    } else if (request.amount) {
      typeSpecificFields.push({ label: 'المبلغ', value: request.amount, type: 'currency' });
    }

    if (request.notes) {
      typeSpecificFields.push({ label: 'ملاحظات', value: request.notes });
    }

    return [...commonFields, ...typeSpecificFields];
  };

  // Filter pending requests based on role
  // The API already filters by approver, so we just filter by status
  const pendingRequests = useMemo(() => {
    if (!approvalRequests || !Array.isArray(approvalRequests)) {
      return [];
    }
    return approvalRequests.filter(r => r.status === 'PENDING');
  }, [approvalRequests]);

  const columns = useMemo<MRT_ColumnDef<UnifiedApprovalRequest>[]>(
    () => [
      {
        accessorKey: 'requestId',
        header: 'رقم الطلب',
        size: 120,
      },
      {
        accessorKey: 'requestType',
        header: 'النوع',
        size: 140,
        Cell: ({ cell }) => {
          const type = cell.getValue<string>();
          const colors: { [key: string]: { bg: string; text: string } } = {
            LEAVE: { bg: '#E0E7FF', text: '#3730A3' },
            LOAN: { bg: '#FEF3C7', text: '#92400E' },
            ALLOWANCE: { bg: '#D1FAE5', text: '#065F46' },
            TRANSFER: { bg: '#FED7AA', text: '#9A3412' },
            PAYMENT: { bg: '#EDE9FE', text: '#6B21A8' },
          };
          const color = colors[type] || { bg: '#F3F4F6', text: '#6B7280' };

          return (
            <Chip
              label={type}
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
        accessorKey: 'requestedBy',
        header: 'طلب بواسطة',
        size: 180,
        Cell: ({ row }) => getEmployeeName(row.original.requestedBy),
      },
      {
        accessorKey: 'requestDate',
        header: 'تاريخ الطلب',
        size: 140,
        Cell: ({ cell }) => formatDate(cell.getValue<Date>()),
      },
      {
        accessorKey: 'amount',
        header: 'المبلغ',
        size: 130,
        Cell: ({ cell }) => {
          const amount = cell.getValue<number | null>();
          return amount ? (
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0c2b7a' }}>
              SAR {amount.toLocaleString()}
            </Typography>
          ) : '-';
        },
      },
      {
        accessorKey: 'priority',
        header: 'الأولوية',
        size: 100,
        Cell: ({ cell }) => {
          const priority = cell.getValue<string>();
          const colors = {
            HIGH: { bg: '#FEE2E2', text: '#991B1B' },
            MEDIUM: { bg: '#FEF3C7', text: '#92400E' },
            LOW: { bg: '#DBEAFE', text: '#1E40AF' },
          };
          const color = colors[priority as keyof typeof colors] || colors.MEDIUM;
          return (
            <Chip
              label={priority}
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
        accessorKey: 'currentLevel',
        header: 'الخطوة الحالية',
        size: 160,
        Cell: ({ row }) => {
          const name = row.original.currentLevelName;
          const level = row.original.currentLevel;
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Chip
                label={name || `Level ${level}`}
                size="small"
                variant="outlined"
                color="primary"
                sx={{
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '11px',
                  borderColor: '#E0E7FF',
                  backgroundColor: '#EEF2FF',
                  color: '#4F46E5'
                }}
              />
              <Typography variant="caption" sx={{ fontSize: '10px', color: '#6B7280', mt: 0.5 }}>
                {level === 1 ? 'الموافقة الأولى' : `مستوى الموافقة ${level}`}
              </Typography>
            </Box>
          );
        },
      },
    ],
    [getEmployeeName],
  );

  const table = useMaterialReactTable({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: pendingRequests as any,
    enableRowSelection: true,
    enableColumnFilters: true,
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
      sorting: [{ id: 'requestDate', desc: true }],
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
    renderTopToolbarCustomActions: ({ table }) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Hide Approve/Reject buttons for Employee role - they can only view */}
        {userRole !== 'Employee' && (
          <>
            <Button
              variant="contained"
              startIcon={<CheckCircle />}
              disabled={table.getSelectedRowModel().rows.length === 0}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => handleApproveSelected(table as any)}
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
              موافقة ({table.getSelectedRowModel().rows.length})
            </Button>
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              disabled={table.getSelectedRowModel().rows.length === 0}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => handleRejectSelected(table as any)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderColor: '#DC2626',
                color: '#DC2626',
                '&:hover': {
                  borderColor: '#B91C1C',
                  backgroundColor: 'rgba(220, 38, 38, 0.04)',
                },
                '&:disabled': {
                  borderColor: '#E5E7EB',
                  color: '#9CA3AF',
                },
              }}
            >
              رفض ({table.getSelectedRowModel().rows.length})
            </Button>
          </>
        )}
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={() => handleView(row.original as any)}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        {/* Hide Approve/Reject action buttons for Employee role - they can only view */}
        {userRole !== 'Employee' && (
          <>
            <Tooltip title="موافقة">
              <IconButton
                size="small"
                sx={{ color: '#059669' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => handleApprove(row.original as any)}
              >
                <CheckCircle fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="رفض">
              <IconButton
                size="small"
                sx={{ color: '#DC2626' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => handleReject(row.original as any)}
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
              الموافقات المعلقة - ملء الشاشة
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
            {isLoading || loadingEmployees ? (
              <LoadingSpinner />
            ) : errorApprovals ? (
              <ErrorDisplay
                error={errorApprovals || errorEmployees || 'فشل تحميل الموافقات المعلقة'}
                onRetry={loadApprovals}
              />
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
            sx={{ fontWeight: 700, color: '#111827' }}
          >
            الموافقات المعلقة
          </Typography>
          <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
            مراجعة والموافقة على الطلبات المعلقة مع سير عمل متعدد المستويات
          </Typography>
        </Box>

        {isLoading || loadingEmployees ? (
          <LoadingSpinner />
        ) : errorApprovals ? (
          <ErrorDisplay
            error={errorApprovals || errorEmployees || 'فشل تحميل الموافقات المعلقة'}
            onRetry={loadApprovals}
          />
        ) : (
          tableWrapper
        )}
      </Box>

      {/* Approval Dialog */}
      <ApprovalDialog
        open={isApprovalDialogOpen}
        onClose={() => {
          setIsApprovalDialogOpen(false);
          setSelectedRequest(null);
          setApprovalAction(null);
        }}
        onApprove={handleApprovalConfirm}
        onReject={handleApprovalConfirm}
        title={approvalAction === 'approve' ? 'الموافقة على الطلب' : 'رفض الطلب'}
        message={
          approvalAction === 'approve'
            ? `هل أنت متأكد أنك تريد الموافقة على طلب ${selectedRequest?.requestType} هذا؟`
            : `هل أنت متأكد أنك تريد رفض طلب ${selectedRequest?.requestType} هذا؟`
        }
        itemName={selectedRequest ? `Request #${selectedRequest.requestId}` : undefined}
        loading={approveRequest.loading || rejectRequest.loading}
        approveLabel={approvalAction === 'approve' ? 'موافقة' : 'تأكيد الرفض'}
        showReject={false}
      />

      {/* View Details Dialog */}
      <ViewDetailsDialog
        open={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false);
          setSelectedRequest(null);
        }}
        title="تفاصيل الطلب"
        fields={selectedRequest ? getRequestDetails(selectedRequest) : []}
        maxWidth="sm"
      />
    </>
  );
}

