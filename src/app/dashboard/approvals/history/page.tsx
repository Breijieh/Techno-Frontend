'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Visibility,
  History,
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
import type { ApprovalRequest } from '@/types';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import { approvalsApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import type { UnifiedApprovalRequest } from '@/lib/api/approvals';
import type { EmployeeResponse } from '@/lib/api/employees';

export default function ApprovalHistoryPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'General Manager', 'Finance Manager', 'Project Manager', 'Employee']);

  // Fetch approval history from backend
  const { data: approvalHistory = [], loading: isLoadingHistory, error: errorHistory, execute: loadHistory } = useApi(
    () => approvalsApi.getAllApprovalHistory(),
    { immediate: true }
  );

  // Fetch employees as fallback for employee name lookup
  const { data: employeesData, loading: loadingEmployees, error: errorEmployees } = useApi(
    () => employeesApi.getAllEmployees(),
    { immediate: true }
  );

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

  const getEmployeeName = useCallback((empId: number, employeeName?: string) => {
    // First try to use the name from the approval request
    if (employeeName) {
      return employeeName;
    }
    // Fallback to employee lookup
    const employeeList = employeesData?.content || employeesData?.employees || [];
    const employee = employeeList.find((e: EmployeeResponse) => e.employeeNo === empId);
    return employee ? `${employee.employeeName || employee.employeeName || ''}`.trim() || 'غير معروف' : 'غير معروف';
  }, [employeesData]);

  const getRequestTypeLabel = useCallback((type: string) => {
    const typeMap: Record<string, string> = {
      'LEAVE': 'إجازة',
      'LOAN': 'قرض',
      'ALLOWANCE': 'بدل',
      'TRANSFER': 'تحويل',
      'PAYMENT': 'دفعة',
      'PAYROLL': 'رواتب',
      'MANUAL_ATTENDANCE': 'حضور يدوي',
    };
    return typeMap[type] || type;
  }, []);

  // Map UnifiedApprovalRequest to ApprovalRequest
  const mapToApprovalRequest = (unified: UnifiedApprovalRequest): ApprovalRequest => {
    return {
      requestId: unified.requestId,
      requestType: unified.requestType,
      requestedBy: unified.requestedBy,
      requestDate: new Date(unified.requestDate),
      amount: unified.amount,
      priority: unified.priority,
      status: unified.status,
      currentLevel: unified.currentLevel,
      approvedBy: unified.approvedBy,
      approvalDate: unified.approvalDate ? new Date(unified.approvalDate) : undefined,
      notes: unified.notes,
    };
  };

  const handleView = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setIsViewDialogOpen(true);
  };

  const getRequestDetails = (request: ApprovalRequest) => {
    const statusColors = {
      PENDING: { bg: '#FEF3C7', text: '#92400E' },
      APPROVED: { bg: '#D1FAE5', text: '#065F46' },
      REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
    };
    const statusColor = statusColors[request.status as keyof typeof statusColors] || statusColors.PENDING;

    const priorityColors = {
      HIGH: { bg: '#FEE2E2', text: '#991B1B' },
      MEDIUM: { bg: '#FEF3C7', text: '#92400E' },
      LOW: { bg: '#DBEAFE', text: '#1E40AF' },
    };
    const priorityColor = priorityColors[request.priority as keyof typeof priorityColors] || priorityColors.MEDIUM;

    // Look up the unified request to get requestedByName and approvedByName
    const unified = approvalHistory?.find(u => u.requestId === request.requestId);

    return [
      { label: 'رقم الطلب', value: request.requestId, type: 'text' as const },
      { label: 'النوع', value: getRequestTypeLabel(request.requestType), type: 'chip' as const, chipColor: { bg: '#E0E7FF', text: '#3730A3' } },
      { label: 'طلب بواسطة', value: getEmployeeName(request.requestedBy, unified?.requestedByName), type: 'text' as const },
      { label: 'تاريخ الطلب', value: request.requestDate, type: 'date' as const },
      {
        label: 'المبلغ',
        value: request.amount ?? null,
        type: request.amount ? ('currency' as const) : ('text' as const),
        renderCustom: !request.amount ? () => (
          <Typography sx={{ fontSize: '14px', color: '#9CA3AF' }}>-</Typography>
        ) : undefined,
      },
      { label: 'الأولوية', value: request.priority, type: 'chip' as const, chipColor: priorityColor },
      { label: 'المستوى الحالي', value: `المستوى ${request.currentLevel}`, type: 'text' as const },
      { label: 'الحالة', value: request.status, type: 'chip' as const, chipColor: statusColor },
      { label: 'وافق/رفض بواسطة', value: request.approvedBy ? getEmployeeName(request.approvedBy, unified?.approvedByName) : null, type: 'text' as const },
      { label: 'تاريخ الإجراء', value: request.approvalDate || null, type: 'date' as const },
      { label: 'ملاحظات', value: request.notes || null, type: 'text' as const },
    ];
  };

  // Map unified requests to ApprovalRequest format
  const mappedRequests = useMemo(() => {
    if (!approvalHistory || !Array.isArray(approvalHistory)) {
      return [];
    }
    return approvalHistory.map(mapToApprovalRequest);
  }, [approvalHistory]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') {
      return mappedRequests;
    }
    return mappedRequests.filter(r => r.status === statusFilter);
  }, [mappedRequests, statusFilter]);

  const columns = useMemo<MRT_ColumnDef<ApprovalRequest>[]>(
    () => [
      {
        accessorKey: 'requestId',
        header: 'رقم الطلب',
        size: 120,
      },
      {
        accessorKey: 'requestType',
        header: 'النوع',
        size: 130,
        Cell: ({ cell }) => {
          const type = cell.getValue<string>();
          return (
            <Chip
              label={getRequestTypeLabel(type)}
              size="small"
              sx={{
                backgroundColor: '#E0E7FF',
                color: '#3730A3',
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
        Cell: ({ row }) => {
          const unified = approvalHistory?.find(u => u.requestId === row.original.requestId);
          return getEmployeeName(row.original.requestedBy, unified?.requestedByName);
        },
      },
      {
        accessorKey: 'requestDate',
        header: 'تاريخ الطلب',
        size: 130,
        Cell: ({ cell }) => new Date(cell.getValue<Date>()).toLocaleDateString('en-GB'),
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        size: 120,
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          const colors = {
            PENDING: { bg: '#FEF3C7', text: '#92400E' },
            APPROVED: { bg: '#D1FAE5', text: '#065F46' },
            REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
          };
          const color = colors[status as keyof typeof colors] || colors.PENDING;
          return (
            <Chip
              label={status}
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
        accessorKey: 'approvedBy',
        header: 'وافق/رفض بواسطة',
        size: 180,
        Cell: ({ row }) => {
          const empId = row.original.approvedBy;
          if (!empId) return '-';
          const unified = approvalHistory?.find(u => u.requestId === row.original.requestId);
          return getEmployeeName(empId, unified?.approvedByName);
        },
      },
      {
        accessorKey: 'approvalDate',
        header: 'تاريخ الإجراء',
        size: 130,
        Cell: ({ cell }) => {
          const date = cell.getValue<Date | null>();
          return date ? new Date(date).toLocaleDateString('en-GB') : '-';
        },
      },
    ],
    [approvalHistory, getEmployeeName, getRequestTypeLabel],
  );

  const table = useMaterialReactTable({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: filteredRequests as any,
    enableRowSelection: false,
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
        overflowX: 'auto',
        maxWidth: '100%',
        width: '100%',
        ...(isFullscreen && { maxHeight: 'calc(100vh - 120px)' }),
      },
    },
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          select
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          SelectProps={{ displayEmpty: true }}
          sx={{
            minWidth: 180,
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
              color: statusFilter && statusFilter !== 'all' ? '#111827' : '#9CA3AF',
            },
          }}
        >
          <MenuItem value="all">جميع الحالات</MenuItem>
          <MenuItem value="PENDING">قيد الانتظار</MenuItem>
          <MenuItem value="APPROVED">موافق عليه</MenuItem>
          <MenuItem value="REJECTED">مرفوض</MenuItem>
        </TextField>
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
              سجل الموافقات - ملء الشاشة
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
            {isLoadingHistory || loadingEmployees ? (
              <LoadingSpinner />
            ) : errorHistory || errorEmployees ? (
              <ErrorDisplay
                error={errorHistory || errorEmployees || 'فشل تحميل سجل الموافقات'}
                onRetry={() => {
                  loadHistory();
                }}
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
              سجل الموافقات
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              السجل الكامل لجميع طلبات الموافقة وحالتها
            </Typography>
          </Box>

          {isLoadingHistory || loadingEmployees ? (
            <LoadingSpinner />
          ) : errorHistory || errorEmployees ? (
            <ErrorDisplay
              error={errorHistory || errorEmployees || 'فشل تحميل سجل الموافقات'}
              onRetry={() => {
                loadHistory();
              }}
            />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* View Details Dialog */}
      <ViewDetailsDialog
        open={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false);
          setSelectedRequest(null);
        }}
        title="تفاصيل الطلب"
        fields={selectedRequest ? getRequestDetails(selectedRequest) : []}
      />
    </>
  );
}


