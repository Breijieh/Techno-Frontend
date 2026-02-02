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
  Alert,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  Visibility,
  Fullscreen,
  FullscreenExit,
  Refresh,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
  type MRT_PaginationState,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import useRouteProtection from '@/hooks/useRouteProtection';
import { getUserRole } from '@/lib/permissions';
import { getUserContext } from '@/lib/dataFilters';
import type { LeaveRequest } from '@/types';
import LeaveRequestForm from '@/components/forms/LeaveRequestForm';
import LeaveRequestViewForm from '@/components/forms/LeaveRequestViewForm';
import ApprovalDialog from '@/components/common/ApprovalDialog';
import SmartRequestTimeline from '@/components/common/SmartRequestTimeline';
import { leavesApi, type LeaveDetailsResponse } from '@/lib/api/leaves';
import { authApi } from '@/lib/api/auth';
import { mapLeaveDetailsResponseListToLeaveRequestList } from '@/lib/mappers/leaveMapper';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { formatDate } from '@/lib/utils/dateFormatter';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';

export default function LeaveRequestsPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveResponses, setLeaveResponses] = useState<LeaveDetailsResponse[]>([]); // Store raw responses for employee names
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const userRole = getUserRole();
  const userContext = getUserContext();

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

  // Get employee name from API response
  const getEmployeeName = useCallback((empId: number): string => {
    const response = leaveResponses.find(r => r.employeeNo === empId);
    return response?.employeeName || `موظف ${empId}`;
  }, [leaveResponses]);

  // Fetch leave requests from API
  const { execute: fetchLeaveRequests, loading: loadingLeaves, error: leavesError } = useApiWithToast(
    async () => {
      // Map status filter: frontend uses NEW/INPROCESS/APPROVED/REJECTED, backend uses N/A/R
      // For now, we'll fetch all and let backend handle filtering by transStatus if needed
      const params: Parameters<typeof leavesApi.getAllLeaves>[0] = {
        page: pagination.pageIndex,
        size: pagination.pageSize,
        sortBy: 'requestDate',
        sortDirection: 'desc',
      };

      // Apply role-based filtering
      if (userRole === 'Employee' && userContext.employeeId) {
        params.employeeNo = userContext.employeeId;
      }
      // Project Managers can see all leaves for now (backend can enhance this later)

      const response = await leavesApi.getAllLeaves(params);

      const mappedLeaves = mapLeaveDetailsResponseListToLeaveRequestList(response.content);
      setLeaveRequests(mappedLeaves);
      setLeaveResponses(response.content); // Store raw responses for employee names
      setTotalElements(response.totalElements);

      return response;
    },
    { silent: true, errorMessage: 'فشل تحميل طلبات الإجازة' }
  );

  // Fetch leave requests when pagination changes
  useEffect(() => {
    fetchLeaveRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, userRole, userContext.employeeId]);

  // Form handlers
  const handleAdd = () => {
    setSelectedRequest(null);
    setIsAddModalOpen(true);
  };

  const handleView = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleApprove = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setApprovalAction('approve');
    setIsApprovalModalOpen(true);
  };

  const handleReject = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setApprovalAction('reject');
    setIsApprovalModalOpen(true);
  };

  // Submit new leave request
  const { execute: submitLeaveRequest, loading: submittingLeave } = useApiWithToast(
    async (data: Partial<LeaveRequest>) => {
      // Validate required fields - employeeId might be 0 if it will be taken from userContext
      if (!data.fromDate || !data.toDate || !data.reason) {
        throw new Error('يرجى ملء جميع الحقول المطلوبة');
      }

      // Use current user's employee ID if not provided
      const employeeNo = data.employeeId || userContext.employeeId || 0;
      if (!employeeNo) {
        throw new Error('رقم الموظف مطلوب');
      }

      const fromDate = data.fromDate instanceof Date
        ? data.fromDate.toISOString().split('T')[0]
        : new Date(data.fromDate).toISOString().split('T')[0];
      const toDate = data.toDate instanceof Date
        ? data.toDate.toISOString().split('T')[0]
        : new Date(data.toDate).toISOString().split('T')[0];

      await leavesApi.submitLeaveRequest({
        employeeNo,
        leaveFromDate: fromDate,
        leaveToDate: toDate,
        leaveReason: data.reason,
      });

      // Refresh the list
      await fetchLeaveRequests();
      setIsAddModalOpen(false);
      setSelectedRequest(null);
    },
    {
      successMessage: 'تم إرسال طلب الإجازة بنجاح',
      errorMessage: 'فشل إرسال طلب الإجازة',
    }
  );

  const handleSubmit = async (data: Partial<LeaveRequest>) => {
    await submitLeaveRequest(data);
  };

  // Approve leave request
  const { execute: approveLeaveRequest, loading: approvingLeave } = useApiWithToast(
    async (notes?: string) => {
      let approverNo = userContext.employeeId;

      // If employeeId is missing, check if user is Admin and use fallback
      if (!approverNo) {
        if (userRole === 'Admin') {
          // Admin might not have an employee ID, use 0 as system approver
          approverNo = 0;
        } else {
          try {
            const userInfo = await authApi.getCurrentUser();
            if (userInfo.employeeId || userInfo.employeeNo) {
              approverNo = userInfo.employeeId || userInfo.employeeNo;
              // Update session for future use
              if (approverNo) sessionStorage.setItem('employeeId', approverNo.toString());
            }
          } catch (e) {
            console.warn('Failed to fetch user info for approval', e);
          }
        }
      }

      if (approverNo === undefined || approverNo === null) {
        throw new Error('المعلومات المطلوبة مفقودة: معرف الموافق غير موجود. يرجى تسجيل الدخول مرة أخرى.');
      }

      if (!selectedRequest) {
        throw new Error('No request selected');
      }

      await leavesApi.approveLeave(selectedRequest.requestId, {
        approverNo,
        notes,
      });

      // Refresh the list
      await fetchLeaveRequests();
      setIsApprovalModalOpen(false);
      setSelectedRequest(null);
      setApprovalAction(null);
    },
    {
      successMessage: 'تمت الموافقة على طلب الإجازة بنجاح',
      errorMessage: 'فشل الموافقة على طلب الإجازة',
    }
  );

  // Reject leave request
  const { execute: rejectLeaveRequest, loading: rejectingLeave } = useApiWithToast(
    async (rejectionReason: string) => {
      let approverNo = userContext.employeeId;

      // If employeeId is missing, check if user is Admin and use fallback
      if (!approverNo) {
        if (userRole === 'Admin') {
          // Admin might not have an employee ID, use 0 as system approver
          approverNo = 0;
        } else {
          // For other roles, try to fetch it
          try {
            const userInfo = await authApi.getCurrentUser();
            if (userInfo.employeeId || userInfo.employeeNo) {
              approverNo = userInfo.employeeId || userInfo.employeeNo;
              // Update session for future use
              if (approverNo) sessionStorage.setItem('employeeId', approverNo.toString());
            }
          } catch (e) {
            console.warn('Failed to fetch user info for approval', e);
          }
        }
      }

      if (approverNo === undefined || approverNo === null) {
        throw new Error('المعلومات المطلوبة مفقودة: لم يتم العثور على معرف الموافق. يرجى إعادة تسجيل الدخول.');
      }

      if (!selectedRequest) {
        throw new Error('لم يتم اختيار طلب');
      }

      if (!rejectionReason || rejectionReason.trim() === '') {
        throw new Error('سبب الرفض مطلوب');
      }

      await leavesApi.rejectLeave(selectedRequest.requestId, {
        approverNo,
        rejectionReason,
      });

      // Refresh the list
      await fetchLeaveRequests();
      setIsApprovalModalOpen(false);
      setSelectedRequest(null);
      setApprovalAction(null);
    },
    {
      successMessage: 'تم رفض طلب الإجازة بنجاح',
      errorMessage: 'فشل رفض طلب الإجازة',
    }
  );

  const handleApprovalAction = async (action: 'approve' | 'reject', notes?: string) => {
    if (action === 'approve') {
      await approveLeaveRequest(notes);
    } else {
      await rejectLeaveRequest(notes || '');
    }
  };

  const isLoading = submittingLeave || approvingLeave || rejectingLeave;

  const columns = useMemo<MRT_ColumnDef<LeaveRequest>[]>(
    () => [
      {
        accessorKey: 'requestId',
        header: 'رقم الطلب',
        size: 110,
      },
      {
        accessorKey: 'employeeId',
        header: 'الموظف',
        size: 180,
        meta: {
          getFilterLabel: (row: LeaveRequest) => {
            const response = leaveResponses.find(r => r.employeeNo === row.employeeId);
            return response?.employeeName || `موظف ${row.employeeId}`;
          }
        },
        Cell: ({ cell }) => {
          const employeeId = cell.getValue<number>();
          const response = leaveResponses.find(r => r.employeeNo === employeeId);
          const name = response?.employeeName || `موظف ${employeeId}`;
          return <Typography sx={{ fontSize: '14px', color: '#111827' }}>{name}</Typography>;
        },
      },
      {
        accessorKey: 'leaveType',
        header: 'نوع الإجازة',
        size: 140,
        filterVariant: 'multi-select',
      },
      {
        accessorKey: 'fromDate',
        header: 'من تاريخ',
        size: 130,
        filterVariant: 'date-range',
        Cell: ({ cell }) => formatDate(cell.getValue<Date>()),
      },
      {
        accessorKey: 'toDate',
        header: 'إلى تاريخ',
        size: 130,
        filterVariant: 'date-range',
        Cell: ({ cell }) => formatDate(cell.getValue<Date>()),
      },
      {
        accessorKey: 'numberOfDays',
        header: 'الأيام',
        size: 90,
        filterVariant: 'range',
        filterFn: 'betweenInclusive',
        Cell: ({ cell }) => (
          <Chip
            label={`${cell.getValue<number>()} يوم`}
            size="small"
            sx={{
              backgroundColor: '#DBEAFE',
              color: '#1E40AF',
              fontWeight: 600,
              fontSize: '11px',
            }}
          />
        ),
      },
      {
        accessorKey: 'reason',
        header: 'السبب',
        size: 220,
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        size: 130,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: LeaveRequest) => {
            const labels: Record<string, string> = {
              NEW: 'جديد',
              INPROCESS: 'قيد المعالجة',
              APPROVED: 'موافق عليه',
              REJECTED: 'مرفوض',
            };
            return labels[row.status] || row.status;
          }
        },
        Cell: ({ cell, row }) => {
          const status = cell.getValue<string>();
          const statusLabels: Record<string, string> = {
            NEW: 'جديد',
            INPROCESS: 'قيد المعالجة',
            APPROVED: 'موافق عليه',
            REJECTED: 'مرفوض',
          };
          const colors = {
            NEW: { bg: '#FEF3C7', text: '#92400E' },
            INPROCESS: { bg: '#DBEAFE', text: '#1E40AF' },
            APPROVED: { bg: '#D1FAE5', text: '#065F46' },
            REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
          };
          const color = colors[status as keyof typeof colors] || colors.NEW;

          if (status === 'NEW' || status === 'INPROCESS') {
            const nextApprover = row.original.nextApproverName || (row.original.nextApproval ? `مستخدم رقم ${row.original.nextApproval}` : null);
            const levelName = row.original.nextLevelName || (row.original.nextLevel ? `المستوى ${row.original.nextLevel}` : null);

            if (nextApprover || levelName) {
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
                  <Typography variant="caption" sx={{ fontSize: '10px', color: '#6B7280' }}>
                    {levelName && <span style={{ display: 'block', fontWeight: 500 }}>{levelName}</span>}
                    {nextApprover && <span>في الانتظار: {nextApprover}</span>}
                  </Typography>
                </Box>
              );
            }
          }

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
      {
        accessorKey: 'requestDate',
        header: 'تاريخ الطلب',
        size: 130,
        filterVariant: 'date-range',
        Cell: ({ cell }) => formatDate(cell.getValue<Date>()),
      },
    ],
    [leaveResponses],
  );

  const table = useMaterialReactTable({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: leaveRequests as any,
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
    manualPagination: true,
    rowCount: totalElements,
    onPaginationChange: setPagination,
    state: {
      pagination,
      isLoading: loadingLeaves,
      showAlertBanner: leavesError !== null,
    },
    initialState: {
      density: 'comfortable',
      pagination: { pageSize: 25, pageIndex: 0 },
      showColumnFilters: false,
    },
    muiToolbarAlertBannerProps: leavesError
      ? {
        color: 'error',
        children: leavesError,
      }
      : undefined,
    renderEmptyRowsFallback: () => (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography sx={{ color: '#6B7280', fontSize: '14px' }}>
          لم يتم العثور على طلبات إجازة.
        </Typography>
      </Box>
    ),
    localization: mrtArabicLocalization,
    ...lightTableTheme,
    enableExpanding: true,
    muiTableContainerProps: {
      sx: {
        ...(lightTableTheme.muiTableContainerProps as { sx?: Record<string, unknown> })?.sx,
        overflowX: 'auto',
        maxWidth: '100%',
        width: '100%',
      },
    },
    displayColumnDefOptions: {
      'mrt-row-expand': {
        header: 'الجدول الزمني',
        size: 60,
      },
      'mrt-row-actions': {
        header: 'الإجراءات',
        size: 200,
      },
    },

    renderDetailPanel: ({ row }) => (
      <Box sx={{ p: 2, backgroundColor: '#F9FAFB' }}>
        <SmartRequestTimeline
          requestType="LEAVE"
          requestId={(row.original as unknown as LeaveRequest).requestId}
          orientation="horizontal"
          fallbackStatus={(row.original as unknown as LeaveRequest).status as string | undefined}
          fallbackRequestDate={new Date((row.original as unknown as LeaveRequest).requestDate)}
        />
      </Box>
    ),
    renderTopToolbar: ({ table }) => (
      <TableToolbarWrapper
        table={table}
        quickFilterGroups={[
          {
            id: 'status',
            label: 'حالة الطلب',
            options: [
              { label: 'جديد', value: 'NEW', color: '#F59E0B' },
              { label: 'قيد المعالجة', value: 'INPROCESS', color: '#3B82F6' },
              { label: 'موافق عليه', value: 'APPROVED', color: '#10B981' },
              { label: 'مرفوض', value: 'REJECTED', color: '#EF4444' },
            ]
          }
        ]}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            disabled={isLoading}
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
            طلب إجازة جديد
          </Button>
          <Tooltip title="تحديث البيانات">
            <span>
              <IconButton
                onClick={() => fetchLeaveRequests()}
                disabled={loadingLeaves}
                sx={{
                  color: '#0c2b7a',
                  '&:hover': {
                    backgroundColor: 'rgba(12, 43, 122, 0.08)',
                  },
                }}
              >
                {loadingLeaves ? <CircularProgress size={20} /> : <Refresh />}
              </IconButton>
            </span>
          </Tooltip>
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
          <IconButton size="small" sx={{ color: '#0c2b7a' }} onClick={() => handleView(row.original as any)}>
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        {(row.original.status === 'NEW' || row.original.status === 'INPROCESS') && (
          <>
            <Tooltip title="موافقة">
              <IconButton size="small" sx={{ color: '#059669' }} onClick={() => handleApprove(row.original as any)}>
                <CheckCircle fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="رفض">
              <IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => handleReject(row.original as any)}>
                <Cancel fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>
    ),
    enableRowActions: true,
    positionActionsColumn: 'last',

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
      {loadingLeaves ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress />
        </Box>
      ) : leavesError ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {leavesError}
          <Button onClick={() => fetchLeaveRequests()} startIcon={<Refresh />} sx={{ ml: 2 }}>
            إعادة المحاولة
          </Button>
        </Alert>
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
              طلبات الإجازة - وضع ملء الشاشة
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
              طلبات الإجازة
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              إدارة طلبات إجازات الموظفين مع سير عمل الموافقة
            </Typography>
          </Box>

          {tableWrapper}
        </Box>
      </Box>

      {/* Forms */}
      <LeaveRequestForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedRequest(null);
        }}
        onSubmit={handleSubmit}
        loading={isLoading}
      />
      <LeaveRequestViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedRequest(null);
        }}
        leaveRequest={selectedRequest}
      />
      <ApprovalDialog
        open={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setSelectedRequest(null);
          setApprovalAction(null);
        }}
        onApprove={(notes) => {
          if (approvalAction === 'approve') {
            handleApprovalAction('approve', notes);
          }
        }}
        onReject={(notes) => {
          if (approvalAction === 'reject') {
            handleApprovalAction('reject', notes);
          }
        }}
        title={approvalAction === 'approve' ? 'الموافقة على طلب الإجازة' : 'رفض طلب الإجازة'}
        message={approvalAction === 'approve'
          ? 'هل أنت متأكد أنك تريد الموافقة على طلب الإجازة هذا؟'
          : 'هل أنت متأكد أنك تريد رفض طلب الإجازة هذا؟ يرجى تقديم سبب للرفض.'}
        itemName={selectedRequest ? `طلب الإجازة #${selectedRequest.requestId} - ${getEmployeeName(selectedRequest.employeeId)}` : undefined}
        loading={isLoading}
        showNotes={true}
        requireNotes={approvalAction === 'reject'}
      />
    </>
  );
}


