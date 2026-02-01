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
  Add,
  Visibility,
  CheckCircle,
  PlayArrow,
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
import type { ProjectPaymentRequest } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';
import PaymentRequestForm from '@/components/forms/PaymentRequestForm';
import PaymentRequestViewForm from '@/components/forms/PaymentRequestViewForm';
import ApprovalDialog from '@/components/common/ApprovalDialog';
import ProcessPaymentDialog from '@/components/forms/ProcessPaymentDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { projectsApi, authApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import {
  getTransStatusDisplay,
  getTransStatusColor,
  getApprovalLevelDisplay
} from '@/lib/mappers/paymentRequestMapper';
import { formatNumber } from '@/lib/utils/numberFormatter';

export default function PaymentRequestsPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProjectPaymentRequest | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  // Get current user to check if they are the next approver
  const { data: currentUser } = useApi(
    () => authApi.getCurrentUser(),
    { immediate: true }
  );
  const currentEmployeeNo = currentUser?.employeeNo || currentUser?.employeeId;

  // Fetch projects
  const { data: projectsResponse } = useApi(
    () => projectsApi.getActiveProjects(),
    { immediate: true }
  );
  const projects = useMemo<ProjectSummary[]>(() => {
    if (!projectsResponse) return [];
    // Handle both array and object with data property
    return Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse as { data?: ProjectSummary[] })?.data || [];
  }, [projectsResponse]);

  // Fetch payment requests
  const { data: paymentRequestsRaw = [], execute: loadPaymentRequests } = useApi(
    () => projectsApi.getAllPaymentRequests(),
    { immediate: true }
  );

  // Filter out deleted requests and ensure proper typing
  const paymentRequests = useMemo(() => {
    if (!paymentRequestsRaw) return [];
    const requests = Array.isArray(paymentRequestsRaw) ? paymentRequestsRaw : [];
    return requests.filter((req: ProjectPaymentRequest) => req.isDeleted !== 'Y');
  }, [paymentRequestsRaw]);

  // Protect route
  useRouteProtection(['Admin', 'General Manager', 'Project Manager', 'Finance Manager', 'Regional Project Manager']);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

  // Handle URL search params for specific view
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const viewId = searchParams.get('viewId');
    if (viewId && paymentRequests.length > 0) {
      const request = paymentRequests.find(r => r.requestNo.toString() === viewId);
      if (request) {
        setTimeout(() => {
          handleView(request);
        }, 100);
      }
    }
  }, [paymentRequests]);

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

  // Form handlers
  const handleAdd = () => {
    setSelectedRequest(null);
    setIsAddModalOpen(true);
  };

  const handleView = (request: ProjectPaymentRequest) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };


  const handleProcess = (request: ProjectPaymentRequest) => {
    setSelectedRequest(request);
    setIsProcessModalOpen(true);
  };

  // Create payment request (backend doesn't support updates)
  const { loading: isSaving, execute: savePaymentRequest } = useApiWithToast(
    async (data: Partial<ProjectPaymentRequest>) => {
      await projectsApi.createPaymentRequest(data);
      await loadPaymentRequests();
    },
    {
      showSuccessToast: true,
      successMessage: 'تم إنشاء طلب الدفع بنجاح',
    }
  );

  const handleSubmit = async (data: Partial<ProjectPaymentRequest>) => {
    try {
      await savePaymentRequest(data);
      setIsAddModalOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error saving payment request:', error);
      throw error; // Re-throw to let form handle it
    }
  };

  // Approve payment request
  const { loading: isApproving, execute: approveRequest } = useApiWithToast(
    async (requestNo: number) => {
      await projectsApi.approvePaymentRequest(requestNo);
      await loadPaymentRequests();
    },
    {
      showSuccessToast: true,
      successMessage: 'تمت الموافقة على طلب الدفع بنجاح',
    }
  );

  // Reject payment request
  const { loading: isRejecting, execute: rejectRequest } = useApiWithToast(
    async (params: { requestNo: number; reason: string }) => {
      await projectsApi.rejectPaymentRequest(params.requestNo, params.reason);
      await loadPaymentRequests();
    },
    {
      showSuccessToast: true,
      successMessage: 'تم رفض طلب الدفع بنجاح',
    }
  );

  const handleApprovalAction = async (action: 'approve' | 'reject', notes?: string) => {
    if (!selectedRequest) return;

    try {
      if (action === 'approve') {
        await approveRequest(selectedRequest.requestNo);
      } else {
        await rejectRequest({
          requestNo: selectedRequest.requestNo,
          reason: notes || 'لم يتم تقديم سبب',
        });
      }

      setIsApprovalModalOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error; // Re-throw to let dialog handle it
    }
  };


  // Process payment (for approved requests)
  const { loading: isProcessingPayment, execute: processPayment } = useApiWithToast(
    async (params: {
      requestNo: number;
      processData: {
        paymentDate: string;
        paidAmount: number;
        paymentMethod: string;
        referenceNo?: string;
        bankName?: string;
        processNotes?: string;
      }
    }) => {
      await projectsApi.processPayment(params.requestNo, params.processData);
      await loadPaymentRequests();
    },
    {
      showSuccessToast: true,
      successMessage: 'تمت معالجة الدفع بنجاح',
    }
  );

  const handleProcessAction = async (formData: {
    paymentDate?: string;
    paidAmount: number;
    paymentMethod?: string;
    referenceNo?: string;
    bankName?: string;
    processNotes?: string;
  }) => {
    if (!selectedRequest) return;
    try {
      const processData = {
        paymentDate: formData.paymentDate || new Date().toISOString().split('T')[0],
        paidAmount: Number(formData.paidAmount),
        paymentMethod: formData.paymentMethod || 'BANK_TRANSFER',
        referenceNo: formData.referenceNo,
        bankName: formData.bankName,
        processNotes: formData.processNotes,
      };
      await processPayment({
        requestNo: selectedRequest.requestNo,
        processData,
      });
      setIsProcessModalOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  };

  const getProjectName = useCallback((projectCode: number) => {
    const project = projects.find((p) => p.projectCode === projectCode);
    return project?.projectName || project?.projectName || project?.projectName || `المشروع #${projectCode}`;
  }, [projects]);

  // Format amount for display
  const formatAmount = (amount: number) => {
    if (!amount || amount === 0) return '-';
    if (amount >= 1000000) {
      return `ر.س ${(amount / 1000000).toFixed(2)}م`;
    } else if (amount >= 1000) {
      return `ر.س ${(amount / 1000).toFixed(1)}ألف`;
    }
    return `ر.س ${formatNumber(amount)}`;
  };

  const columns = useMemo<MRT_ColumnDef<ProjectPaymentRequest>[]>(
    () => [
      {
        accessorKey: 'requestNo',
        header: 'رقم الطلب',
        size: 120,
        Cell: ({ cell }) => `#${cell.getValue<number>()}`,
      },
      {
        accessorKey: 'requestDate',
        header: 'تاريخ الطلب',
        size: 130,
        Cell: ({ cell }) => {
          const date = cell.getValue<Date>();
          return date ? new Date(date).toLocaleDateString('en-GB') : '-';
        },
      },
      {
        accessorKey: 'projectCode',
        header: 'المشروع',
        size: 200,
        Cell: ({ cell, row }) => {
          const projectCode = cell.getValue<number>();
          const projectName = row.original.projectName || row.original.projectName || getProjectName(projectCode);
          return projectName;
        },
      },
      {
        accessorKey: 'supplierName',
        header: 'المورد',
        size: 180,
        Cell: ({ cell, row }) => {
          const supplierName = cell.getValue<string>() || row.original.supplierName;
          return supplierName || (row.original.supplierCode ? `مورد #${row.original.supplierCode}` : '-');
        },
      },
      {
        accessorKey: 'paymentAmount',
        header: 'المبلغ',
        size: 140,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0c2b7a' }}>
            {formatAmount(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'paymentPurpose',
        header: 'الغرض',
        size: 200,
        Cell: ({ cell }) => {
          const purpose = cell.getValue<string>();
          return purpose ? (purpose.length > 50 ? `${purpose.substring(0, 50)}...` : purpose) : '-';
        },
      },
      {
        accessorKey: 'transStatus',
        header: 'الحالة',
        size: 140,
        Cell: ({ cell }) => {
          const transStatus = cell.getValue<'P' | 'A' | 'R'>();
          const statusDisplay = getTransStatusDisplay(transStatus);
          const statusColor = getTransStatusColor(transStatus);
          return (
            <Chip
              label={statusDisplay}
              size="small"
              sx={{
                backgroundColor: statusColor.bg,
                color: statusColor.text,
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
      },
      {
        accessorKey: 'requesterName',
        header: 'طلب بواسطة',
        size: 150,
        enableHiding: false,
        Cell: ({ cell, row }) => {
          const requesterName = cell.getValue<string>() || row.original.requesterName;
          return requesterName || `موظف #${row.original.requestedBy}`;
        },
      },
      {
        accessorKey: 'nextApproverName',
        header: 'الموافق التالي',
        size: 150,
        Cell: ({ cell, row }) => {
          const nextApproverName = cell.getValue<string>() || row.original.nextApproverName;
          const nextAppLevel = row.original.nextAppLevel;
          if (nextApproverName) {
            return `${nextApproverName}${nextAppLevel ? ` (${getApprovalLevelDisplay(nextAppLevel)})` : ''}`;
          }
          if (row.original.transStatus === 'A') {
            return 'موافق عليه';
          }
          if (row.original.transStatus === 'R') {
            return 'مرفوض';
          }
          return '-';
        },
      },
    ],
    [getProjectName],
  );

  const table = useMaterialReactTable<ProjectPaymentRequest>({
    columns: columns,
    data: paymentRequests || [],
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
      },
    },
    renderTopToolbarCustomActions: () => (
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
          طلب دفع جديد
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
    renderRowActions: ({ row }) => {
      const request = row.original;
      const isPending = request.transStatus === 'P';
      const isApproved = request.transStatus === 'A';
      const isNotProcessed = request.isProcessed === 'N';
      const isNextApprover = currentEmployeeNo && request.nextApproval === currentEmployeeNo;
      const userRole = typeof window !== 'undefined' ? sessionStorage.getItem('userRole') || sessionStorage.getItem('userType') : null;
      const isFinanceManager = userRole === 'FINANCE_MANAGER' || userRole === 'Finance Manager' || userRole === 'ADMIN' || userRole === 'Admin';

      return (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="عرض التفاصيل">
            <IconButton
              size="small"
              sx={{ color: '#0c2b7a' }}
              onClick={() => handleView(request)}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {isPending && isNextApprover && (
            <>
              <Tooltip title="موافقة">
                <IconButton
                  size="small"
                  sx={{ color: '#059669' }}
                  onClick={() => {
                    setSelectedRequest(request);
                    setIsApprovalModalOpen(true);
                  }}
                >
                  <CheckCircle fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="رفض">
                <IconButton
                  size="small"
                  sx={{ color: '#DC2626' }}
                  onClick={() => {
                    setSelectedRequest(request);
                    setIsApprovalModalOpen(true);
                  }}
                >
                  <PlayArrow fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
                </IconButton>
              </Tooltip>
            </>
          )}
          {isApproved && isNotProcessed && isFinanceManager && (
            <Tooltip title="معالجة الدفع">
              <IconButton
                size="small"
                sx={{ color: '#0c2b7a' }}
                onClick={() => handleProcess(request)}
              >
                <PlayArrow fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      );
    },
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
              طلبات الدفع للمشاريع - وضع ملء الشاشة
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
                طلبات الدفع للمشاريع
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                معالجة طلبات الدفع للموردين مع سير عمل الموافقة
              </Typography>
            </Box>

            {tableWrapper}
          </Box>
        </Box>
      </Box>

      {/* Forms */}
      <PaymentRequestForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedRequest(null);
        }}
        onSubmit={handleSubmit}
        loading={isSaving}
        projects={projects}
      />

      <PaymentRequestViewForm
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
        }}
        onApprove={(notes) => handleApprovalAction('approve', notes)}
        onReject={(notes) => handleApprovalAction('reject', notes)}
        title={selectedRequest?.transStatus === 'P' ? 'الموافقة على طلب الدفع' : 'إجراء طلب الدفع'}
        message={selectedRequest
          ? `طلب #${selectedRequest.requestNo}: ${selectedRequest.paymentPurpose || 'لم يتم تحديد الغرض'}`
          : 'اختر إجراءً لهذا طلب الدفع'}
        itemName={selectedRequest ? `طلب #${selectedRequest.requestNo}` : undefined}
        loading={isApproving || isRejecting}
        requireNotes={false}
      />

      <ProcessPaymentDialog
        open={isProcessModalOpen}
        onClose={() => {
          setIsProcessModalOpen(false);
          setSelectedRequest(null);
        }}
        onProcess={handleProcessAction}
        request={selectedRequest}
        loading={isProcessingPayment}
      />
    </>
  );
}


