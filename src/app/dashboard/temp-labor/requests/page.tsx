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
  Add,
  Edit,
  CheckCircle,
  Cancel,
  Visibility,
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
import type { TempLaborRequest } from '@/types';
import TempLaborRequestForm from '@/components/forms/TempLaborRequestForm';
import TempLaborRequestViewForm from '@/components/forms/TempLaborRequestViewForm';
import ApprovalDialog from '@/components/common/ApprovalDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { laborApi, projectsApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { mapLaborRequestResponsesToTempLaborRequests, mapTempLaborRequestToLaborRequestDto, mapLaborRequestResponseToTempLaborRequest } from '@/lib/mappers/laborMapper';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

export default function TempLaborRequestsPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toast = useToast();

  // Protect route
  useRouteProtection(['Admin', 'Project Manager', 'HR Manager']);
  const [selectedRequest, setSelectedRequest] = useState<TempLaborRequest | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);

  // Fetch labor requests from backend
  const { data: laborRequestsData, loading: isLoadingRequests, error: requestsError, execute: loadRequests } = useApi(
    () => laborApi.getAllLaborRequests(),
    { immediate: true }
  );

  // Fetch projects for form
  const { data: projects = [] } = useApi(
    () => projectsApi.getActiveProjects(),
    { immediate: true }
  );

  // Map backend responses to frontend format
  const requests = useMemo(() => {
    if (!laborRequestsData) return [];
    if (!Array.isArray(laborRequestsData)) {
      console.error('[TempLaborRequestsPage] laborRequestsData is not an array:', laborRequestsData);
      return [];
    }
    return mapLaborRequestResponsesToTempLaborRequests(laborRequestsData);
  }, [laborRequestsData]);

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

  // Form handlers
  const handleAdd = () => {
    setSelectedRequest(null);
    setIsAddModalOpen(true);
  };

  const handleView = (request: TempLaborRequest) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleEdit = async (request: TempLaborRequest) => {
    try {
      const fullRequest = await laborApi.getLaborRequestById(request.requestId);
      const mappedRequest = mapLaborRequestResponseToTempLaborRequest(fullRequest);
      (mappedRequest as TempLaborRequest & { projectCode?: number }).projectCode = fullRequest.projectCode;
      setSelectedRequest(mappedRequest as TempLaborRequest & { projectCode?: number });
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.showError('فشل تحميل تفاصيل الطلب');
    }
  };

  interface RequestParams {
    isEdit: boolean;
    requestId?: number;
    data: Partial<TempLaborRequest>;
    projectCode: number;
  }

  interface ApprovalParams {
    action: 'approve' | 'reject';
    requestId: number;
    notes?: string;
  }

  const { loading: isSaving, execute: saveLaborRequest } = useApiWithToast(
    async (params: RequestParams) => {
      const requestDto = mapTempLaborRequestToLaborRequestDto(params.data, params.projectCode);

      if (params.isEdit && params.requestId) {
        await laborApi.updateLaborRequest(params.requestId, requestDto);
      } else {
        await laborApi.createLaborRequest(requestDto);
      }
      await loadRequests();
    },
    {
      showSuccessToast: true,
      successMessage: (params: RequestParams) => {
        const p = params && typeof params === 'object' && 'isEdit' in params ? params : null;
        return p?.isEdit ? 'تم تحديث طلب العمالة بنجاح' : 'تم إنشاء طلب العمالة بنجاح';
      },
      onSuccess: () => {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedRequest(null);
      },
    }
  );

  const handleSubmit = async (data: Partial<TempLaborRequest> & { projectCode?: number }) => {
    try {
      const projectCode = data.projectCode || ((projects && projects.length > 0) ? projects[0].projectCode : 0);
      if (!projectCode) {
        toast.showError('يرجى اختيار مشروع');
        return;
      }

      await saveLaborRequest({
        isEdit: !!selectedRequest,
        requestId: selectedRequest?.requestId,
        data,
        projectCode,
      });
    } catch (error) {
      console.error('Error saving labor request:', error);
    }
  };

  const handleApproveClick = (request: TempLaborRequest) => {
    setSelectedRequest(request);
    setApprovalAction('approve');
    setIsApprovalModalOpen(true);
  };

  const handleRejectClick = (request: TempLaborRequest) => {
    setSelectedRequest(request);
    setApprovalAction('reject');
    setIsApprovalModalOpen(true);
  };

  const { loading: isProcessingApproval, execute: processApproval } = useApiWithToast(
    async (params: ApprovalParams) => {
      if (params.action === 'approve') {
        await laborApi.approveLaborRequest(params.requestId, params.notes);
      } else {
        await laborApi.rejectLaborRequest(params.requestId, params.notes || 'No reason provided');
      }
      await loadRequests();
    },
    {
      showSuccessToast: true,
      successMessage: (params: ApprovalParams) => {
        const p = params && typeof params === 'object' && 'action' in params ? params : null;
        return p?.action === 'approve' ? 'تم الموافقة على طلب العمالة بنجاح' : 'تم رفض طلب العمالة بنجاح';
      },
      onSuccess: () => {
        setIsApprovalModalOpen(false);
        setSelectedRequest(null);
        setApprovalAction(null);
      },
    }
  );

  const handleApprovalAction = async (action: 'approve' | 'reject', notes?: string) => {
    if (!selectedRequest) return;
    try {
      await processApproval({
        action,
        requestId: selectedRequest.requestId,
        notes,
      });
    } catch (error) {
      console.error('Error processing approval:', error);
    }
  };

  const columns = useMemo<MRT_ColumnDef<TempLaborRequest>[]>(
    () => [
      {
        accessorKey: 'requestId',
        header: 'رقم الطلب',
        size: 110,
      },
      {
        accessorKey: 'requestDate',
        header: 'تاريخ الطلب',
        size: 130,
        Cell: ({ cell }) => new Date(cell.getValue<Date>()).toLocaleDateString('en-GB'),
      },
      {
        accessorKey: 'projectName',
        header: 'المشروع',
        size: 180,
        Cell: ({ row }) => {
          const projectName = row.original.projectName;
          return projectName || `مشروع ${row.original.projectCode || 'غير متاح'}`;
        },
      },
      {
        accessorKey: 'specialization',
        header: 'التخصص',
        size: 150,
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue<string>()}
            size="small"
            sx={{
              backgroundColor: '#EDE9FE',
              color: '#6B21A8',
              fontWeight: 600,
              fontSize: '11px',
            }}
          />
        ),
      },
      {
        accessorKey: 'numberOfWorkers',
        header: 'عدد العمال المطلوب',
        size: 140,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0c2b7a' }}>
            {cell.getValue<number>()} عامل
          </Typography>
        ),
      },
      {
        accessorKey: 'fromDate',
        header: 'من تاريخ',
        size: 130,
        Cell: ({ cell }) => new Date(cell.getValue<Date>()).toLocaleDateString('en-GB'),
      },
      {
        accessorKey: 'toDate',
        header: 'إلى تاريخ',
        size: 130,
        Cell: ({ cell }) => new Date(cell.getValue<Date>()).toLocaleDateString('en-GB'),
      },
      {
        accessorKey: 'dailyWage',
        header: 'الأجر اليومي',
        size: 120,
        Cell: ({ cell }) => {
          const wage = cell.getValue<number>();
          return wage > 0 ? `ر.س ${wage.toFixed(2)}` : 'غير متاح';
        },
      },
      {
        accessorKey: 'requestedByName',
        header: 'طلب بواسطة',
        size: 150,
        Cell: ({ row }) => {
          const requestedByName = row.original.requestedByName;
          return requestedByName || 'غير متاح';
        },
      },
      {
        accessorKey: 'nextApproverName',
        header: 'الموافق التالي',
        size: 160,
        Cell: ({ row }) => {
          const nextApproverName = row.original.nextApproverName;
          const status = row.original.transStatus;
          const legacyStatus = row.original.status;

          if (status === 'A' || legacyStatus === 'APPROVED') return 'تمت الموافقة';
          if (status === 'R' || legacyStatus === 'REJECTED') return 'مرفوض';

          return nextApproverName || (status === 'P' ? 'قيد الموافقة' : '-');
        },
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        size: 130,
        Cell: ({ row }) => {
          const transStatus = row.original.transStatus;
          const status = row.original.status;

          let displayStatus = 'NEW';
          if (transStatus) {
            if (transStatus === 'P') displayStatus = 'PENDING';
            else if (transStatus === 'A') displayStatus = 'APPROVED';
            else if (transStatus === 'R') displayStatus = 'REJECTED';
          } else {
            displayStatus = status;
          }

          const colors = {
            NEW: { bg: '#FEF3C7', text: '#92400E' },
            PENDING: { bg: '#DBEAFE', text: '#1E40AF' },
            APPROVED: { bg: '#D1FAE5', text: '#065F46' },
            REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
          };

          const statusLabels: Record<string, string> = {
            NEW: 'جديد',
            PENDING: 'قيد الموافقة',
            APPROVED: 'موافق عليه',
            REJECTED: 'مرفوض',
          };

          const color = colors[displayStatus as keyof typeof colors] || colors.NEW;

          return (
            <Chip
              label={statusLabels[displayStatus] || displayStatus}
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
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns: columns as any,
    data: (requests || []) as any,
    renderEmptyRowsFallback: () => (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          color: '#6B7280',
        }}
      >
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          لم يتم العثور على طلبات عمالة
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          ابدأ بإنشاء طلب عمالة جديد لمشروعك.
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add sx={{ color: '#FFFFFF' }} />}
          onClick={handleAdd}
          sx={{
            background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
            color: '#FFFFFF !important',
            textTransform: 'none',
            fontWeight: 600,
            '& .MuiSvgIcon-root': {
              color: '#FFFFFF !important',
            },
            '&:hover': {
              background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
            },
          }}
        >
          طلب عمالة جديد
        </Button>
      </Box>
    ),
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
          طلب عمالة جديد
        </Button>
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
            onClick={() => handleView(row.original as unknown as TempLaborRequest)}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل">
          <IconButton
            size="small"
            sx={{ color: '#059669' }}
            onClick={() => handleEdit(row.original as unknown as TempLaborRequest)}
          >
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        {row.original.status === 'NEW' && (
          <>
            <Tooltip title="موافقة">
              <IconButton
                size="small"
                sx={{ color: '#059669' }}
                onClick={() => handleApproveClick(row.original as unknown as TempLaborRequest)}
              >
                <CheckCircle fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="رفض">
              <IconButton
                size="small"
                sx={{ color: '#DC2626' }}
                onClick={() => handleRejectClick(row.original as unknown as TempLaborRequest)}
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
              طلبات العمالة المؤقتة - ملء الشاشة
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
            {isLoadingRequests ? (
              <LoadingSpinner />
            ) : requestsError ? (
              <ErrorDisplay error={requestsError} onRetry={loadRequests} />
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
          display: 'flex',
          flexDirection: 'column',
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
              طلبات العمالة المؤقتة
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              طلب عمال مؤقتين بمهارات محددة للمشاريع
            </Typography>
          </Box>

          {isLoadingRequests ? (
            <LoadingSpinner />
          ) : requestsError ? (
            <ErrorDisplay error={requestsError} onRetry={loadRequests} />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* Forms */}
      <TempLaborRequestForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedRequest(null);
        }}
        onSubmit={handleSubmit}
        loading={isSaving}
        projects={(projects || [])}
      />

      <TempLaborRequestForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRequest(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedRequest}
        loading={isSaving}
        projects={(projects || [])}
      />

      <TempLaborRequestViewForm
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
        title={approvalAction === 'approve' ? 'الموافقة على طلب العمالة' : 'رفض طلب العمالة'}
        message={approvalAction === 'approve'
          ? 'هل أنت متأكد أنك تريد الموافقة على طلب العمالة هذا؟'
          : 'هل أنت متأكد أنك تريد رفض طلب العمالة هذا؟ يرجى تقديم سبب للرفض.'}
        itemName={selectedRequest ? `طلب العمالة #${selectedRequest.requestId}` : undefined}
        loading={isProcessingApproval}
        requireNotes={approvalAction === 'reject'}
      />
    </>
  );
}
