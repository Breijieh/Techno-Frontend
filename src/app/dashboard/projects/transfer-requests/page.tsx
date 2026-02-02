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
import type { TransferRequest } from '@/types';
import TransferRequestForm from '@/components/forms/TransferRequestForm';
import TransferRequestViewForm from '@/components/forms/TransferRequestViewForm';
import ApprovalDialog from '@/components/common/ApprovalDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { projectsApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { getUserContext } from '@/lib/dataFilters';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';

export default function TransferRequestsPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const userContext = getUserContext();

  // Fetch transfer requests
  const { data: transferRequestsData, execute: loadTransferRequests } = useApi(
    () => projectsApi.getAllTransferRequests(),
    { immediate: true }
  );

  // Ensure transferRequests is always an array
  const transferRequests = useMemo(() => {
    return Array.isArray(transferRequestsData) ? transferRequestsData : [];
  }, [transferRequestsData]);

  // Fetch projects
  const { data: projectsData, loading: projectsLoading } = useApi(
    () => projectsApi.getActiveProjects(),
    { immediate: true }
  );

  // Ensure projects is always an array
  const projects = useMemo(() => {
    return Array.isArray(projectsData) ? projectsData : [];
  }, [projectsData]);

  // Fetch employees - request larger page size to get all employees
  const { data: employeesResponse, loading: employeesLoading } = useApi(
    () => employeesApi.getAllEmployees({ page: 0, size: 1000 }),
    { immediate: true }
  );

  const employees = useMemo(() => {
    if (!employeesResponse) {
      console.warn('[TransferRequests] No employees response');
      return [];
    }
    if (!employeesResponse.employees || !Array.isArray(employeesResponse.employees)) {
      console.warn('[TransferRequests] Invalid employees response:', employeesResponse);
      return [];
    }
    const mapped = employeesResponse.employees.map(mapEmployeeResponseToEmployee);
    console.log('[TransferRequests] Mapped employees:', mapped.length, mapped);
    return mapped;
  }, [employeesResponse]);

  // Debug logging
  useEffect(() => {
    console.log('[TransferRequests] Projects loading:', projectsLoading, 'Data:', projects?.length || 0, projects);
    console.log('[TransferRequests] Employees loading:', employeesLoading, 'Data:', employees?.length || 0, employees);
    console.log('[TransferRequests] Employees response:', employeesResponse);
  }, [projects, employees, projectsLoading, employeesLoading, employeesResponse]);

  // Protect route
  useRouteProtection(['Admin', 'Project Manager', 'HR Manager', 'Regional Project Manager']);

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

  const getEmployeeName = useCallback((empId: number) => {
    const employeesList = employees || [];
    const employee = employeesList.find(e => e.employeeId === empId);
    return employee?.fullName || 'Unknown';
  }, [employees]);

  const getProjectName = useCallback((projectCode: number) => {
    const projectsList = projects || [];
    const project = projectsList.find(p => p.projectCode === projectCode);
    return project?.projectName || project?.projectName || 'غير متاح';
  }, [projects]);

  // Form handlers
  const handleAdd = () => {
    setSelectedRequest(null);
    setIsAddModalOpen(true);
  };

  const handleView = (request: TransferRequest) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleApproveClick = (request: TransferRequest) => {
    setSelectedRequest(request);
    setIsApprovalModalOpen(true);
  };

  const handleRejectClick = (request: TransferRequest) => {
    setSelectedRequest(request);
    setIsApprovalModalOpen(true);
  };

  // Create transfer request
  const { loading: isSaving, execute: saveTransferRequest } = useApiWithToast(
    async (data: Partial<TransferRequest>) => {
      await projectsApi.createTransferRequest(data);
      await loadTransferRequests();
    },
    {
      showSuccessToast: true,
      successMessage: 'تم إنشاء طلب النقل بنجاح',
    }
  );

  const handleSubmit = async (data: Partial<TransferRequest>) => {
    try {
      await saveTransferRequest(data);
      setIsAddModalOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error saving transfer request:', error);
      throw error;
    }
  };

  // Approve/Reject transfer request
  const { execute: processApproval } = useApiWithToast(
    async (params: { action: 'approve' | 'reject'; requestId: number; approverNo: number; reason?: string }) => {
      if (params.action === 'approve') {
        await projectsApi.approveTransfer(params.requestId);
      } else {
        await projectsApi.rejectTransfer(params.requestId, params.reason || 'No reason provided');
      }
      await loadTransferRequests();
    },
    {
      showSuccessToast: true,
      successMessage: (params) => params.action === 'approve' ? 'تم الموافقة على طلب النقل بنجاح' : 'تم رفض طلب النقل بنجاح',
    }
  );

  const handleApprovalAction = async (action: 'approve' | 'reject', notes?: string) => {
    if (!selectedRequest || !userContext.employeeId) return;
    try {
      await processApproval({
        action,
        requestId: selectedRequest.requestId,
        approverNo: userContext.employeeId,
        reason: notes,
      });
      setIsApprovalModalOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  };

  const columns = useMemo<MRT_ColumnDef<TransferRequest>[]>(
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
        Cell: ({ row }) => {
          const employeeName = row.original.employeeName;
          const employeeId = row.original.employeeId;
          // Use name from backend response, fallback to lookup, then to "Unknown"
          return employeeName || getEmployeeName(employeeId) || 'غير معروف';
        },
      },
      {
        accessorKey: 'fromProjectCode',
        header: 'من المشروع',
        size: 220,
        Cell: ({ row }) => {
          const projectName = row.original.fromProjectName;
          const projectCode = row.original.fromProjectCode;
          // Use name from backend response, fallback to lookup, then to "N/A"
          const displayName = projectName || getProjectName(projectCode) || 'غير متاح';
          return (
            <Chip
              label={displayName}
              size="small"
              sx={{
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
      },
      {
        accessorKey: 'toProjectCode',
        header: 'إلى المشروع',
        size: 220,
        Cell: ({ row }) => {
          const projectName = row.original.toProjectName;
          const projectCode = row.original.toProjectCode;
          // Use name from backend response, fallback to lookup, then to "N/A"
          const displayName = projectName || getProjectName(projectCode) || 'غير متاح';
          return (
            <Chip
              label={displayName}
              size="small"
              sx={{
                backgroundColor: '#D1FAE5',
                color: '#065F46',
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
        size: 250,
      },
      {
        accessorKey: 'nextApproverName',
        header: 'الموافق التالي',
        size: 160,
        Cell: ({ row }) => {
          const nextApproverName = row.original.nextApproverName;
          const status = row.original.transStatus || (row.original.status as string);

          if (status === 'A' || status === 'APPROVED') return 'موافق عليه';
          if (status === 'R' || status === 'REJECTED') return 'مرفوض';

          return nextApproverName || (status === 'P' || status === 'INPROCESS' ? 'قيد الموافقة' : '-');
        },
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        size: 130,
        Cell: ({ row }) => {
          const status = row.original.status;
          // Prefer transStatus if set, otherwise use status
          const transStatus = row.original.transStatus;

          const statusLabels: Record<string, string> = {
            NEW: 'جديد',
            INPROCESS: 'قيد الموافقة',
            APPROVED: 'موافق عليه',
            REJECTED: 'مرفوض',
            P: 'قيد الموافقة',
            A: 'موافق عليه',
            R: 'مرفوض',
          };
          const colors = {
            NEW: { bg: '#FEF3C7', text: '#92400E' },
            INPROCESS: { bg: '#DBEAFE', text: '#1E40AF' },
            APPROVED: { bg: '#D1FAE5', text: '#065F46' },
            REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
            P: { bg: '#DBEAFE', text: '#1E40AF' },
            A: { bg: '#D1FAE5', text: '#065F46' },
            R: { bg: '#FEE2E2', text: '#991B1B' },
          };

          // Determine key to use
          let key: string = status;
          if (transStatus) key = transStatus;
          else if (status === 'INPROCESS') key = 'P';

          const displayLabel = statusLabels[key] || status;
          const color = colors[key as keyof typeof colors] || colors.NEW;

          return (
            <Chip
              label={displayLabel}
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
        Cell: ({ cell }) => new Date(cell.getValue<Date>()).toLocaleDateString('en-GB'),
      },
    ],
    [getEmployeeName, getProjectName],
  );

  const table = useMaterialReactTable({
    columns,
    data: transferRequests || [],
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
          طلب نقل جديد
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
            onClick={() => handleView(row.original)}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        {row.original.status === 'NEW' && (
          <>
            <Tooltip title="موافقة">
              <IconButton
                size="small"
                sx={{ color: '#059669' }}
                onClick={() => handleApproveClick(row.original)}
              >
                <CheckCircle fontSize="small" />
              </IconButton>
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
              طلبات نقل الموظفين - ملء الشاشة
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
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
              >
                طلبات نقل الموظفين
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                إدارة نقل الموظفين بين المشاريع مع سير عمل الموافقة
              </Typography>
            </Box>

            {tableWrapper}
          </Box>
        </Box>
      </Box>

      {/* Forms */}
      <TransferRequestForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedRequest(null);
        }}
        onSubmit={handleSubmit}
        loading={isSaving}
        employees={employees || []}
        projects={projects || []}
      />

      <TransferRequestViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedRequest(null);
        }}
        data={selectedRequest}
        employees={employees}
        projects={projects}
      />

      <ApprovalDialog
        open={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setSelectedRequest(null);
        }}
        onApprove={(notes) => handleApprovalAction('approve', notes)}
        onReject={(notes) => handleApprovalAction('reject', notes)}
        title="الموافقة على طلب النقل"
        message={selectedRequest && selectedRequest.status === 'NEW'
          ? 'هل تريد الموافقة على طلب النقل هذا؟'
          : 'هل تريد رفض طلب النقل هذا؟'}
        itemName={selectedRequest ? `طلب #${selectedRequest.requestId}` : undefined}
        loading={isSaving}
      />
    </>
  );
}


