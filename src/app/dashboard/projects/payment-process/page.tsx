// Force rebuild
'use client';

import { useEffect, useState, useMemo } from 'react';
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
  Edit,
  Visibility,
  Payment,
  Fullscreen,
  FullscreenExit,
  PlayArrow,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import type { ProjectPaymentProcessRecord } from '@/types';
import useRouteProtection from '@/hooks/useRouteProtection';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import ProcessPaymentDialog from '@/components/forms/ProcessPaymentDialog';
import { projectsApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import type { ProjectPaymentRequest } from '@/types';

export default function PaymentProcessPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProjectPaymentProcessRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<ProjectPaymentRequest | null>(null);

  // Fetch payment requests (process records are derived from processed payment requests)
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

  // Fetch projects
  const { data: projects = [] } = useApi(
    () => projectsApi.getActiveProjects(),
    { immediate: true }
  );

  // Derive payment process records from payment requests
  // Show all requests: pending, approved (ready-to-process), and processed
  const paymentProcessRecords = useMemo(() => {
    const requests = paymentRequests || [];
    const projectsList = projects || [];

    // Map all requests to payment process records
    return requests.map((req: ProjectPaymentRequest) => {
      const isApproved = req.transStatus === 'A';
      const isProcessed = req.isProcessed === 'Y';
      const isPending = req.transStatus === 'P';

      // Calculate percentages based on status
      let paidPercentage = 0;
      let remainPercentage = 100;

      if (isProcessed) {
        paidPercentage = 100;
        remainPercentage = 0;
      } else if (isApproved) {
        paidPercentage = 0;
        remainPercentage = 100; // Approved but not yet processed
      } else if (isPending) {
        paidPercentage = 0;
        remainPercentage = 100; // Pending approval
      }

      // Always prefer lookup from projects list over backend-provided name
      // The backend sometimes returns incorrect project names (like "oqw")
      let projectName = null;

      if (req.projectCode) {
        // Try to find project with type-safe comparison
        const project = projectsList.find((p: { projectCode?: number; projectName?: string }) => {
          const pCode = Number(p.projectCode);
          const rCode = Number(req.projectCode);
          return !isNaN(pCode) && !isNaN(rCode) && pCode === rCode;
        });
        if (project) {
          projectName = project.projectName || project.projectName;
        } else {
          // If not found in projects list, try backend-provided name as fallback
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          projectName = req.projectName || (req as any).projectName;
          // But reject obviously invalid names (too short or suspicious)
          if (projectName && (projectName.length < 4 || projectName.toLowerCase() === 'oqw' || projectName.toLowerCase() === 'wow')) {
            projectName = null;
          }
        }
      }

      // Final fallback to project code if name still not found
      if (!projectName) {
        projectName = `مشروع ${req.projectCode || 'غير معروف'}`;
      }

      // Note: Currently using requestNo as processId because:
      // 1. For unprocessed requests, there's no process record yet (no processNo exists)
      // 2. For processed requests, we don't have an API endpoint to fetch the actual processNo
      // TODO: When backend API is available to fetch payment process records, use actual processNo
      // The backend has separate processNo (auto-generated) and requestNo (foreign key)
      return {
        processId: req.requestNo, // Temporary: using requestNo until we can fetch actual processNo
        requestNo: req.requestNo,
        projectCode: req.projectCode,
        projectName: projectName, // Store project name directly in the record
        supplierName: req.supplierName || 'غير متاح',
        paymentAmount: req.paymentAmount || 0,
        paymentDueDate: req.requestDate || new Date(),
        paymentPercentage: 1.0, // 1.0 = 100% (will be multiplied by 100 in display)
        paidPercentage: paidPercentage / 100, // Convert to decimal (0-1 range)
        remainPercentage: remainPercentage / 100, // Convert to decimal (0-1 range)
        processedBy: isProcessed ? (req.approvedBy || req.requestedBy) : undefined,
        processedDate: isProcessed ? (req.approvedDate || req.requestDate) : undefined,
        transStatus: req.transStatus, // Store status for easier checking
        isProcessed: req.isProcessed, // Store processed flag
      } as ProjectPaymentProcessRecord;
    });
  }, [paymentRequests, projects]);

  // Protect route
  useRouteProtection(['Admin', 'Finance Manager', 'Project Manager']);

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

  const getProjectName = (requestNo: number) => {
    const requests = paymentRequests || [];
    const request = requests.find((r: ProjectPaymentRequest) => r.requestNo === requestNo);
    if (!request) {
      console.warn(`[PaymentProcess] Request ${requestNo} not found`);
      return 'غير متاح';
    }

    // First try to use project name from the request (backend includes it)
    if (request.projectName) {
      return request.projectName;
    }

    // Fallback to looking up in projects list
    const projectsList = projects || [];
    const project = projectsList.find((p: { projectCode?: number; projectName?: string }) => p.projectCode === request.projectCode);
    if (project) {
      return project.projectName || project.projectName || `مشروع ${request.projectCode}`;
    }

    // Last resort: use project code
    console.warn(`[PaymentProcess] Project ${request.projectCode} not found for request ${requestNo}`);
    return `مشروع ${request.projectCode}`;
  };


  // Get payment request by request number (needed for processing)
  const getPaymentRequestByRequestNo = (requestNo: number): ProjectPaymentRequest | null => {
    const requests = paymentRequests || [];
    const request = requests.find((r: ProjectPaymentRequest) => r.requestNo === requestNo);
    return request || null;
  };

  // Form handlers
  const handleView = (record: ProjectPaymentProcessRecord) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const handleEdit = (record: ProjectPaymentProcessRecord) => {
    setSelectedRecord(record);
    setIsEditModalOpen(true);
  };

  // Handle process payment action
  const handleProcess = (record: ProjectPaymentProcessRecord) => {
    const request = getPaymentRequestByRequestNo(record.requestNo);
    if (request) {
      setSelectedPaymentRequest(request);
      setIsProcessModalOpen(true);
    } else {
      console.error(`[PaymentProcess] Payment request ${record.requestNo} not found`);
    }
  };

  // Update payment process (if supported by backend)
  const { loading: isUpdating, execute: updatePaymentProcess } = useApiWithToast(
    async (processId: number, data: Partial<ProjectPaymentProcessRecord>) => {
      // Note: Backend may not have a direct update endpoint for payment process
      // This might need to be handled through payment request updates
      await projectsApi.updatePaymentProcess(processId, data);
      await loadPaymentRequests();
    },
    {
      showSuccessToast: true,
      successMessage: 'تم تحديث معالجة الدفع بنجاح',
    }
  );

  // Process payment (for approved requests)
  const { loading: isProcessingPayment, execute: processPayment } = useApiWithToast(
    async (params: {
      requestNo: number; processData: {
        paymentDate: string;
        paidAmount: number;
        paymentMethod: string;
        referenceNo?: string;
        bankName?: string;
        processNotes?: string;
      }
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await projectsApi.processPayment(params.requestNo, params.processData as any);
      await loadPaymentRequests();
    },
    {
      showSuccessToast: true,
      successMessage: 'تمت معالجة الدفع بنجاح',
    }
  );

  const handleProcessAction = async (processData: {
    paymentDate: string;
    paidAmount: number;
    paymentMethod: string;
    referenceNo?: string;
    bankName?: string;
    processNotes?: string;
  }) => {
    if (!selectedPaymentRequest) return;
    try {
      await processPayment({
        requestNo: selectedPaymentRequest.requestNo,
        processData,
      });
      setIsProcessModalOpen(false);
      setSelectedPaymentRequest(null);
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  };

  const handleSubmit = async (data: Partial<ProjectPaymentProcessRecord>) => {
    if (!selectedRecord) return;
    try {
      await updatePaymentProcess(selectedRecord.processId, data);
      setIsEditModalOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Error updating payment process record:', error);
      throw error;
    }
  };

  // Format amount for display
  const formatAmount = (amount: number | undefined) => {
    if (!amount || amount === 0) return '-';
    if (amount >= 1000000) {
      return `ر.س ${(amount / 1000000).toFixed(2)}م`;
    } else if (amount >= 1000) {
      return `ر.س ${(amount / 1000).toFixed(1)}ألف`;
    }
    return `ر.س ${amount.toLocaleString('ar-SA')}`;
  };

  const formatRecordForView = (record: ProjectPaymentProcessRecord) => {
    const projectName = record.projectName || `مشروع ${record.projectCode || 'غير معروف'}`;
    const transStatus = record.transStatus;
    const isProcessed = record.isProcessed === 'Y';
    const remain = record.remainPercentage;
    const paid = record.paidPercentage;

    // Determine status using the same logic as the table
    let status: string;
    if (transStatus === 'R') {
      status = 'REJECTED';
    } else if (isProcessed || (remain === 0 && paid === 1.0)) {
      status = 'PROCESSED';
    } else if (transStatus === 'A') {
      status = 'APPROVED';
    } else if (paid > 0) {
      status = 'IN PROCESS';
    } else {
      status = 'PENDING';
    }

    return [
      { label: 'رقم المعالجة', value: `#${record.processId}` },
      { label: 'رقم الطلب', value: `#${record.requestNo}` },
      { label: 'المشروع', value: projectName },
      { label: 'المورد', value: record.supplierName || 'غير متاح' },
      { label: 'المبلغ', value: formatAmount(record.paymentAmount) },
      { label: 'تاريخ المعالجة', value: record.processedDate ? new Date(record.processedDate).toLocaleDateString('en-GB') : 'لم تتم المعالجة' },
      { label: 'الحالة', value: status === 'REJECTED' ? 'مرفوض' : status === 'PROCESSED' ? 'معالج' : status === 'APPROVED' ? 'موافق عليه' : status === 'IN PROCESS' ? 'قيد المعالجة' : 'قيد الانتظار' },
    ];
  };

  const columns = useMemo<MRT_ColumnDef<ProjectPaymentProcessRecord>[]>(
    () => [
      {
        accessorKey: 'processId',
        header: 'رقم المعالجة',
        size: 120,
        Cell: ({ cell }) => {
          const processId = cell.getValue<number>();
          return (
            <Typography sx={{ fontWeight: 600, color: '#0c2b7a' }}>
              #{processId}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'requestNo',
        header: 'رقم الطلب',
        size: 120,
        Cell: ({ cell }) => {
          const requestNo = cell.getValue<number>();
          return (
            <Typography sx={{ fontWeight: 500 }}>
              #{requestNo}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'projectName',
        header: 'المشروع',
        size: 200,
        Cell: ({ row }) => {
          const projectName = row.original.projectName || `مشروع ${row.original.projectCode || 'غير متاح'}`;
          return (
            <Typography sx={{ fontSize: '14px' }}>
              {projectName}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'supplierName',
        header: 'المورد',
        size: 180,
        Cell: ({ cell }) => {
          const supplierName = cell.getValue<string | undefined>();
          return (
            <Typography sx={{ fontSize: '14px' }}>
              {supplierName || 'غير متاح'}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'paymentAmount',
        header: 'المبلغ',
        size: 150,
        Cell: ({ cell }) => {
          const amount = cell.getValue<number | undefined>();
          return (
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0c2b7a' }}>
              {formatAmount(amount)}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'processedDate',
        header: 'تاريخ المعالجة',
        size: 130,
        Cell: ({ cell, row }) => {
          const value = cell.getValue<Date | undefined>();
          const isProcessed = row.original.remainPercentage === 0 && row.original.paidPercentage === 1.0;

          if (value && isProcessed) {
            return (
              <Typography sx={{ fontSize: '14px', color: '#111827' }}>
                {new Date(value).toLocaleDateString('en-GB')}
              </Typography>
            );
          }

          return (
            <Typography sx={{ fontSize: '13px', color: '#6B7280', fontStyle: 'italic' }}>
              لم تتم المعالجة
            </Typography>
          );
        },
      },
      {
        id: 'status',
        header: 'الحالة',
        size: 140,
        Cell: ({ row }) => {
          const record = row.original;
          const transStatus = record.transStatus;
          const isProcessed = record.isProcessed === 'Y';
          const remain = record.remainPercentage;
          const paid = record.paidPercentage;

          // Check rejection first
          if (transStatus === 'R') {
            return <Chip label="مرفوض" color="error" size="small" />;
          }

          // Check if processed
          if (isProcessed || (remain === 0 && paid === 1.0)) {
            return <Chip label="معالج" color="success" size="small" />;
          }

          // Check if approved but not processed
          if (transStatus === 'A') {
            return <Chip label="موافق عليه" color="info" size="small" />;
          }

          // Check if in process (partial payment)
          if (paid > 0) {
            return <Chip label="قيد المعالجة" color="warning" size="small" />;
          }

          // Default to pending
          return <Chip label="قيد الانتظار" color="default" size="small" />;
        },
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: paymentProcessRecords || [],
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
        ...(isFullscreen && { maxHeight: 'calc(100vh - 120px)' }),
      },
    },
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: 1 }}>
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
      const record = row.original;
      // Use status from record if available, otherwise look up from request
      const isApproved = record.transStatus === 'A' || (() => {
        const request = getPaymentRequestByRequestNo(record.requestNo);
        return request?.transStatus === 'A';
      })();
      const isNotProcessed = record.isProcessed === 'N' || (() => {
        const request = getPaymentRequestByRequestNo(record.requestNo);
        return request?.isProcessed === 'N';
      })();
      const userRole = typeof window !== 'undefined' ? sessionStorage.getItem('userRole') || sessionStorage.getItem('userType') : null;
      const isFinanceManager = userRole === 'FINANCE_MANAGER' || userRole === 'Finance Manager' || userRole === 'ADMIN' || userRole === 'Admin';

      return (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="عرض التفاصيل">
            <IconButton
              size="small"
              sx={{ color: '#0c2b7a' }}
              onClick={() => handleView(record)}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="تحديث الدفع">
            <IconButton
              size="small"
              sx={{ color: '#059669' }}
              onClick={() => handleEdit(record)}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          {isApproved && isNotProcessed && isFinanceManager && (
            <Tooltip title="معالجة الدفع">
              <IconButton
                size="small"
                sx={{ color: '#0c2b7a' }}
                onClick={() => handleProcess(record)}
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
              إدارة معالجة الدفع - وضع ملء الشاشة
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
                  >
                    إدارة معالجة الدفع
                  </Typography>
                  <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                    تتبع وإدارة النسب المئوية للدفع لطلبات دفع المشاريع
                  </Typography>
                </Box>
              </Box>
            </Box>

            {tableWrapper}
          </Box>
        </Box>
      </Box>

      {/* View Dialog */}
      <ViewDetailsDialog
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedRecord(null);
        }}
        title="تفاصيل معالجة الدفع"
        fields={selectedRecord ? formatRecordForView(selectedRecord) : []}
      />

      {/* Edit/Update Dialog */}
      <AnimatedDialog
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRecord(null);
        }}
        title="تحديث معالجة الدفع"
        maxWidth="sm"
        disableBackdropClick={isUpdating}
        showCloseButton={!isUpdating}
        actions={
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', width: '100%' }}>
            <Button
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedRecord(null);
              }}
              variant="outlined"
              disabled={isUpdating}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderColor: '#D1D5DB',
                color: '#374151',
                '&:hover': {
                  borderColor: '#9CA3AF',
                  backgroundColor: '#F9FAFB',
                },
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={async () => {
                if (!selectedRecord) return;
                const newPaidPercentage = Math.min(
                  (selectedRecord.paidPercentage + 0.1),
                  1.0
                );
                const newRemainPercentage = Math.max(
                  selectedRecord.paymentPercentage - newPaidPercentage,
                  0
                );
                await handleSubmit({
                  paidPercentage: newPaidPercentage,
                  remainPercentage: newRemainPercentage,
                  processedDate: new Date(),
                });
              }}
              variant="contained"
              disabled={isUpdating || !selectedRecord || selectedRecord.remainPercentage === 0}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#FFFFFF',
                '&:hover': {
                  background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
                },
                '&:disabled': {
                  background: '#9CA3AF',
                },
              }}
            >
              {isUpdating ? 'جاري التحديث...' : 'تحديث الدفع'}
            </Button>
          </Box>
        }
      >
        {selectedRecord && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              padding: '8px 0',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 1 }}>
                رقم الطلب
              </Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                {selectedRecord.requestNo}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 1 }}>
                المشروع
              </Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                {getProjectName(selectedRecord.requestNo)}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 1 }}>
                  النسبة المطلوبة
                </Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  {(selectedRecord.paymentPercentage * 100).toFixed(1)}%
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 1 }}>
                  المدفوع حالياً
                </Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#059669' }}>
                  {(selectedRecord.paidPercentage * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 1 }}>
                النسبة المتبقية
              </Typography>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#DC2626' }}>
                {(selectedRecord.remainPercentage * 100).toFixed(1)}%
              </Typography>
            </Box>
            <Box
              sx={{
                padding: 2,
                backgroundColor: '#F0FDF4',
                borderRadius: '8px',
                border: '1px solid #D1FAE5',
              }}
            >
              <Typography sx={{ fontSize: '13px', color: '#065F46', fontWeight: 600, mb: 0.5 }}>
                معلومات التحديث
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#047857' }}>
                النقر على &quot;تحديث الدفع&quot; سيزيد النسبة المدفوعة بنسبة 10% (أو إلى 100% إذا كانت المتبقية أقل).
                سيتم حساب النسبة المتبقية تلقائياً.
              </Typography>
            </Box>
          </Box>
        )}
      </AnimatedDialog>

      {/* Process Payment Dialog */}
      <ProcessPaymentDialog
        open={isProcessModalOpen}
        onClose={() => {
          setIsProcessModalOpen(false);
          setSelectedPaymentRequest(null);
        }}
        onProcess={handleProcessAction}
        request={selectedPaymentRequest}
        loading={isProcessingPayment}
      />
    </>
  );
}


