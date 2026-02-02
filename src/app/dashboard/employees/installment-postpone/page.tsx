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
import InstallmentPostponementForm from '@/components/forms/InstallmentPostponementForm';
import InstallmentPostponementViewForm from '@/components/forms/InstallmentPostponementViewForm';
import ApprovalDialog from '@/components/common/ApprovalDialog';
import { loansApi, type PostponementDetailsResponse } from '@/lib/api/loans';
import { mapPostponementResponseListToPostponementRequestList, type PostponementRequest } from '@/lib/mappers/postponementMapper';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';

export default function InstallmentPostponePage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [postponementRequests, setPostponementRequests] = useState<PostponementRequest[]>([]);
  const [postponementResponses, setPostponementResponses] = useState<PostponementDetailsResponse[]>([]); // Store raw responses for employee names
  const [selectedRequest, setSelectedRequest] = useState<PostponementRequest | null>(null);
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
    const response = postponementResponses.find(r => r.employeeNo === empId);
    return response?.employeeName || `الموظف ${empId}`;
  }, [postponementResponses]);

  // Fetch postponement requests from API
  const { execute: fetchPostponementRequests, loading: loadingPostponements, error: postponementsError } = useApiWithToast(
    async () => {
      const params: Parameters<typeof loansApi.getAllPostponementRequests>[0] = {
        page: pagination.pageIndex,
        size: pagination.pageSize,
        sortBy: 'requestDate',
        sortDirection: 'desc',
      };

      // Apply role-based filtering
      if (userRole === 'Employee' && userContext.employeeId) {
        params.employeeNo = userContext.employeeId;
      }

      const response = await loansApi.getAllPostponementRequests(params);

      const mappedPostponements = mapPostponementResponseListToPostponementRequestList(response.content);
      setPostponementRequests(mappedPostponements);
      setPostponementResponses(response.content); // Store raw responses for employee names
      setTotalElements(response.totalElements);

      return response;
    },
    { silent: true, errorMessage: 'فشل تحميل طلبات التأجيل' }
  );

  // Fetch postponement requests when pagination changes
  useEffect(() => {
    fetchPostponementRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, userRole, userContext.employeeId]);

  // Form handlers
  const handleAdd = () => {
    setSelectedRequest(null);
    setIsAddModalOpen(true);
  };

  const handleView = (request: PostponementRequest) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleApproveClick = (request: PostponementRequest) => {
    setSelectedRequest(request);
    setApprovalAction('approve');
    setIsApprovalModalOpen(true);
  };

  const handleRejectClick = (request: PostponementRequest) => {
    setSelectedRequest(request);
    setApprovalAction('reject');
    setIsApprovalModalOpen(true);
  };

  // Submit new postponement request
  const { execute: submitPostponementRequest, loading: submittingPostponement } = useApiWithToast(
    async (data: Partial<PostponementRequest & { installmentId?: number }>) => {
      if (!data.loanId || !data.originalMonth || !data.newMonth || !data.reason) {
        throw new Error('يرجى ملء جميع الحقول المطلوبة');
      }

      // The form provides installmentId
      if (!data.installmentId) {
        throw new Error('Installment ID is required');
      }

      // Convert newMonth (YYYY-MM) to LocalDate (first day of month)
      const [year, month] = data.newMonth.split('-').map(Number);
      const newDueDate = new Date(year, month - 1, 1).toISOString().split('T')[0];

      await loansApi.submitPostponementRequest({
        loanId: data.loanId,
        installmentId: data.installmentId,
        newDueDate,
        postponementReason: data.reason,
      });

      // Refresh the list
      await fetchPostponementRequests();
      setIsAddModalOpen(false);
      setSelectedRequest(null);
    },
    { successMessage: 'تم إرسال طلب التأجيل بنجاح' }
  );

  // Approve/reject postponement request
  const { execute: handleApprovalAction, loading: processingApproval } = useApiWithToast(
    async (action: 'approve' | 'reject', notes?: string) => {
      if (!selectedRequest) {
        throw new Error('No request selected');
      }

      const approverNo = userContext.employeeId || 0;
      if (!approverNo) {
        throw new Error('معرف الموافق مطلوب');
      }

      if (action === 'approve') {
        await loansApi.approvePostponement(selectedRequest.requestId, {
          approverNo,
        });
      } else {
        if (!notes || notes.trim() === '') {
          throw new Error('سبب الرفض مطلوب');
        }
        await loansApi.rejectPostponement(selectedRequest.requestId, {
          approverNo,
          rejectionReason: notes,
        });
      }

      // Refresh the list
      await fetchPostponementRequests();
      setIsApprovalModalOpen(false);
      setSelectedRequest(null);
      setApprovalAction(null);
    },
    { successMessage: approvalAction === 'approve' ? 'تمت الموافقة على طلب التأجيل بنجاح' : 'تم رفض طلب التأجيل بنجاح' }
  );

  const columns = useMemo<MRT_ColumnDef<PostponementRequest>[]>(
    () => [
      {
        accessorKey: 'requestId',
        header: 'رقم الطلب',
        size: 110,
      },
      {
        accessorKey: 'employeeId',
        header: 'الموظف',
        size: 200,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: PostponementRequest) => {
            const employeeName = row.employeeName;
            return employeeName || getEmployeeName(row.employeeId);
          }
        },
        Cell: ({ row }) => {
          // Use employeeName from mapped data if available, otherwise use getEmployeeName
          const employeeName = row.original.employeeName;
          return employeeName || getEmployeeName(row.original.employeeId);
        },
      },
      {
        accessorKey: 'loanId',
        header: 'رقم القرض',
        size: 110,
        Cell: ({ cell }) => `#${cell.getValue<number>()}`,
      },
      {
        accessorKey: 'originalMonth',
        header: 'الشهر الأصلي',
        size: 140,
        filterVariant: 'date-range',
        Cell: ({ cell }) => {
          const monthStr = cell.getValue<string>();
          if (!monthStr) return 'غير متاح';
          const [year, month] = monthStr.split('-').map(Number);
          const date = new Date(year, month - 1, 1);
          return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
        },
      },
      {
        accessorKey: 'newMonth',
        header: 'الشهر الجديد',
        size: 140,
        Cell: ({ cell }) => {
          const monthStr = cell.getValue<string>();
          if (!monthStr) return 'غير متاح';
          const [year, month] = monthStr.split('-').map(Number);
          const date = new Date(year, month - 1, 1);
          return (
            <Chip
              label={date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })}
              size="small"
              sx={{
                backgroundColor: '#DBEAFE',
                color: '#1E40AF',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
      },
      {
        accessorKey: 'reason',
        header: 'السبب',
        size: 280,
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        size: 130,
        filterVariant: 'multi-select',
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          const colors = {
            NEW: { bg: '#FEF3C7', text: '#92400E' },
            INPROCESS: { bg: '#DBEAFE', text: '#1E40AF' },
            APPROVED: { bg: '#D1FAE5', text: '#065F46' },
            REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
          };
          const color = colors[status as keyof typeof colors] || colors.NEW;
          return (
            <Chip
              label={
                status === 'NEW' ? 'جديد' :
                  status === 'INPROCESS' ? 'قيد المعالجة' :
                    status === 'APPROVED' ? 'موافق عليه' :
                      status === 'REJECTED' ? 'مرفوض' : status
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
        meta: {
          getFilterLabel: (row: PostponementRequest) => {
            const labels: Record<string, string> = {
              NEW: 'جديد',
              INPROCESS: 'قيد المعالجة',
              APPROVED: 'موافق عليه',
              REJECTED: 'مرفوض',
            };
            return labels[row.status] || row.status;
          }
        }
      },
      {
        accessorKey: 'requestDate',
        header: 'تاريخ الطلب',
        size: 130,
        filterVariant: 'date-range',
        Cell: ({ cell }) => new Date(cell.getValue<Date>()).toLocaleDateString('en-GB'),
      },
    ],
    [getEmployeeName],
  );

  const table = useMaterialReactTable({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: postponementRequests as any,
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
    },
    initialState: {
      density: 'comfortable',
      showColumnFilters: false,
    },
    renderEmptyRowsFallback: () => (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          لم يتم العثور على طلبات تأجيل.
        </Typography>
      </Box>
    ),
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
      <TableToolbarWrapper table={table}>
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
            طلب تأجيل جديد
          </Button>
          <Tooltip title="تحديث البيانات">
            <IconButton
              onClick={() => fetchPostponementRequests()}
              sx={{
                color: '#0c2b7a',
                '&:hover': {
                  backgroundColor: 'rgba(12, 43, 122, 0.08)',
                },
              }}
            >
              <Refresh />
            </IconButton>
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
          <IconButton
            size="small"
            sx={{ color: '#0c2b7a' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={() => handleView(row.original as any)}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        {(row.original.status === 'NEW' || row.original.status === 'INPROCESS') && (
          <>
            <Tooltip title="موافقة">
              <IconButton
                size="small"
                sx={{ color: '#059669' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => handleApproveClick(row.original as any)}
              >
                <CheckCircle fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="رفض">
              <IconButton
                size="small"
                sx={{ color: '#DC2626' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => handleRejectClick(row.original as any)}
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
      {loadingPostponements ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : postponementsError ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {typeof postponementsError === 'string' ? postponementsError : (postponementsError as { message?: string })?.message || 'فشل تحميل طلبات التأجيل'}
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
              طلبات تأجيل الأقساط - وضع ملء الشاشة
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
              طلبات تأجيل الأقساط
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              إدارة طلبات تأجيل دفع أقساط القروض إلى أشهر مختلفة
            </Typography>
          </Box>

          {tableWrapper}
        </Box>
      </Box>

      {/* Forms */}
      <InstallmentPostponementForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedRequest(null);
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSubmit={submitPostponementRequest as any}
        loading={submittingPostponement}
      />

      <InstallmentPostponementViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedRequest(null);
        }}
        data={selectedRequest}
      />

      <ApprovalDialog
        open={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setSelectedRequest(null);
          setApprovalAction(null);
        }}
        onApprove={(notes) => handleApprovalAction('approve', notes)}
        onReject={(notes) => handleApprovalAction('reject', notes)}
        title={selectedRequest ? `طلب التأجيل #${selectedRequest.requestId}` : 'طلب التأجيل'}
        message={
          selectedRequest
            ? `هل أنت متأكد أنك تريد ${approvalAction === 'approve' ? 'الموافقة على' : 'رفض'} طلب التأجيل هذا؟`
            : 'هل أنت متأكد أنك تريد تنفيذ هذا الإجراء؟'
        }
        itemName={selectedRequest ? `رقم القرض: #${selectedRequest.loanId}` : undefined}
        loading={processingApproval}
      />
    </>
  );
}


