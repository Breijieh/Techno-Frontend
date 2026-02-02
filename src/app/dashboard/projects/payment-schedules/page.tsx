'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectSummary } from '@/lib/api/projects';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  CheckCircle,
  Notifications,
  Fullscreen,
  FullscreenExit,
  Edit,
  Visibility,
  Delete,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import type { ProjectDuePayment } from '@/types';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import { FileDownload } from '@mui/icons-material';
import useRouteProtection from '@/hooks/useRouteProtection';
import { projectsApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { useToast } from '@/contexts/ToastContext';
import { CircularProgress, Alert } from '@mui/material';
import PaymentScheduleForm from '@/components/forms/PaymentScheduleForm';
import PaymentScheduleViewForm from '@/components/forms/PaymentScheduleViewForm';
import { Add } from '@mui/icons-material';
import { formatNumber } from '@/lib/utils/numberFormatter';

export default function PaymentSchedulesPage() {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<number | 'all'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ProjectDuePayment | null>(null);
  const toast = useToast();

  // Fetch projects
  const { data: projectsResponse, loading: loadingProjects } = useApi(
    () => projectsApi.getActiveProjects(),
    { immediate: true }
  );

  const projects = useMemo(() => {
    if (!projectsResponse) return [];
    // Handle both array and object with data property
    return Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse as { data?: unknown[] })?.data || [];
  }, [projectsResponse]);

  // Track if we've already loaded payments to prevent infinite loops
  const hasLoadedPayments = useRef(false);
  const projectsRef = useRef<Array<{ projectCode?: number }>>([]);

  // Fetch payment schedules for all projects
  const fetchPayments = useCallback(async () => {
    const projectsList = projects || [];
    if (projectsList.length === 0) {
      console.log('No projects found to fetch payments for');
      return [];
    }

    // Check if projects have changed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectsChanged = JSON.stringify(projectsList.map((p: any) => p.projectCode)) !==
      JSON.stringify(projectsRef.current.map((p: { projectCode?: number }) => p.projectCode));

    if (!projectsChanged && hasLoadedPayments.current) {
      console.log('Projects unchanged, skipping payment fetch');
      return [];
    }

    console.log(`Fetching payments for ${projectsList.length} projects`);
    projectsRef.current = projectsList as ProjectSummary[];
    hasLoadedPayments.current = true;

    // Fetch payments for all projects
    const paymentPromises = (projectsList as ProjectSummary[]).map(async (project) => {
      try {
        console.log(`[DEBUG] Fetching payments for project ${project.projectCode}...`);
        const payments = await projectsApi.getProjectPayments(project.projectCode);
        console.log(`[DEBUG] Project ${project.projectCode} response:`, payments);
        console.log(`[DEBUG] Project ${project.projectCode}: ${Array.isArray(payments) ? payments.length : 0} payments (type: ${typeof payments})`);

        if (!Array.isArray(payments)) {
          console.warn(`[DEBUG] Project ${project.projectCode}: Response is not an array:`, payments);
          return [];
        }

        return payments;
      } catch (error: unknown) {
        const apiError = error as { status?: number; message?: string };
        console.error(`[DEBUG] Error fetching payments for project ${project.projectCode}:`, {
          status: apiError?.status,
          message: apiError?.message,
          error: error
        });

        // If project doesn't exist, has no payments, or backend error - return empty array silently
        // This is expected behavior - not all projects have payment schedules
        if (apiError?.status === 404 || apiError?.message?.includes('not found')) {
          // Project not found - expected for some cases
          console.log(`[DEBUG] Project ${project.projectCode} not found (404)`);
          return [];
        }
        // Backend error (500, etc.) - likely project has no payment schedules yet
        // Silently return empty array - this is normal for new projects
        console.log(`[DEBUG] Project ${project.projectCode} returned error, treating as no payments`);
        return [];
      }
    });

    const results = await Promise.all(paymentPromises);
    const allPaymentsList = results.flat();
    console.log(`Total payments fetched: ${allPaymentsList.length}`);

    // Flatten and map to ProjectDuePayment format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (allPaymentsList as any[]).map((payment: any) => ({
      projectCode: payment.projectCode,
      serialNo: payment.sequenceNo || payment.serialNo,
      dueDate: payment.dueDate ? new Date(payment.dueDate) : new Date(),
      dueAmount: payment.dueAmount ? Number(payment.dueAmount) : 0,
      paymentStatus: payment.paymentStatus === 'PAID' ? 'PAID' : payment.paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'UNPAID',
      paidDate: payment.paymentDate ? new Date(payment.paymentDate) : undefined,
    }));
  }, [projects]);

  const { data: allPayments = [], loading: loadingPayments, error: paymentsError, execute: loadPayments } = useApi(
    fetchPayments,
    { immediate: false }
  );

  // Load payments when projects are loaded (only once)
  useEffect(() => {
    const projectsList = projects || [];

    // Only check after loading is complete
    if (loadingProjects) {
      return; // Still loading, wait
    }

    if (projectsList.length > 0 && !hasLoadedPayments.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log('Loading payments for projects:', (projectsList as any[]).map((p: { projectCode?: number }) => p.projectCode));
      loadPayments();
    } else if (projectsList.length === 0) {
      // Only log if we've actually finished loading and there are no projects
      console.log('No active projects found after loading completed');
      hasLoadedPayments.current = false;
      projectsRef.current = [];
    }
  }, [projects, loadingProjects, loadPayments]);

  // Protect route
  useRouteProtection(['Admin', 'Project Manager', 'Finance Manager', 'Regional Project Manager']);

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

  const filteredPayments = useMemo(() => {
    const payments = allPayments || [];
    if (selectedProject === 'all') return payments;
    return payments.filter(p => p.projectCode === selectedProject);
  }, [allPayments, selectedProject]);

  // Create payment schedule
  const { loading: isSaving, execute: createPaymentSchedule } = useApiWithToast(
    async (data: Partial<ProjectDuePayment> & {
      sequenceNo: number;
      paymentType?: 'INCOMING' | 'OUTGOING';
      paymentPercentage?: number;
      notes?: string;
    }) => {
      if (!data.projectCode || !data.sequenceNo || !data.dueDate || !data.dueAmount) {
        throw new Error('الحقول المطلوبة مفقودة');
      }

      // Format date to YYYY-MM-DD
      const dueDate = data.dueDate instanceof Date
        ? data.dueDate.toISOString().split('T')[0]
        : new Date(data.dueDate).toISOString().split('T')[0];

      // Build notes string with payment type, percentage, and description
      const notesParts: string[] = [];
      if (data.paymentType) {
        notesParts.push(`Payment Type: ${data.paymentType}`);
      }
      if (data.paymentPercentage !== undefined && data.paymentPercentage !== null) {
        notesParts.push(`Percentage: ${data.paymentPercentage}%`);
      }
      if (data.notes && data.notes.trim()) {
        notesParts.push(data.notes.trim());
      }
      const combinedNotes = notesParts.length > 0 ? notesParts.join('\n\n') : undefined;

      return await projectsApi.addPaymentSchedule(data.projectCode, {
        sequenceNo: data.sequenceNo,
        dueDate,
        dueAmount: data.dueAmount,
        notes: combinedNotes,
      });
    },
    {
      showSuccessToast: true,
      successMessage: 'تم إنشاء جدول الدفع بنجاح',
      onSuccess: () => {
        setIsAddModalOpen(false);
        setSelectedPayment(null);
        hasLoadedPayments.current = false; // Reset to allow reload
        loadPayments(); // Reload payment schedules
      },
    }
  );

  const handleAdd = () => {
    setSelectedPayment(null);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (data: Partial<ProjectDuePayment> & {
    sequenceNo: number;
    paymentType?: 'INCOMING' | 'OUTGOING';
    paymentPercentage?: number;
    notes?: string;
  }) => {
    await createPaymentSchedule(data);
  };

  // Mark payment as paid
  const { execute: markPaymentAsPaid } = useApiWithToast(
    async (params: { paymentId: number; payment: ProjectDuePayment }) => {
      // Find the payment ID from the backend response
      // Since we don't have paymentId in ProjectDuePayment, we need to find it
      const projectPayments = await projectsApi.getProjectPayments(params.payment.projectCode);
      const paymentSchedule = projectPayments.find((p: { sequenceNo?: number; serialNo?: number; paymentId?: number }) =>
        (p.sequenceNo || p.serialNo) === params.payment.serialNo
      );

      if (!paymentSchedule || !paymentSchedule.serialNo) {
        throw new Error('جدول الدفع غير موجود');
      }

      await projectsApi.recordPayment(paymentSchedule.serialNo, {
        paymentAmount: params.payment.dueAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: 'تم وضع علامة كمدفوع من صفحة جداول الدفع',
      });

      // Reload payments
      await loadPayments();
    },
    {
      showSuccessToast: true,
      successMessage: 'تم وضع علامة على الدفع كمدفوع بنجاح',
    }
  );

  const handleMarkAsPaid = async (payment: ProjectDuePayment) => {
    try {
      // Get payment ID by fetching project payments
      const projectPayments = await projectsApi.getProjectPayments(payment.projectCode);
      const paymentSchedule = projectPayments.find((p: { sequenceNo?: number; serialNo?: number; paymentId?: number }) =>
        (p.sequenceNo || p.serialNo) === payment.serialNo
      );

      if (!paymentSchedule || !paymentSchedule.paymentId) {
        toast.showError('لم يتم العثور على جدول الدفع');
        return;
      }

      await markPaymentAsPaid({ paymentId: paymentSchedule.paymentId, payment });
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      toast.showError('فشل وضع علامة على الدفع كمدفوع');
    }
  };

  const handleEdit = (payment: ProjectDuePayment) => {
    setSelectedPayment(payment);
    setIsEditModalOpen(true);
  };

  const handleView = (payment: ProjectDuePayment) => {
    setSelectedPayment(payment);
    setIsViewModalOpen(true);
  };

  const handleDelete = (payment: ProjectDuePayment) => {
    setSelectedPayment(payment);
    setIsDeleteModalOpen(true);
  };

  // Update payment schedule
  const { loading: isUpdating, execute: updatePaymentSchedule } = useApiWithToast(
    async (params: {
      paymentId: number; data: Partial<ProjectDuePayment> & {
        sequenceNo: number;
        paymentType?: 'INCOMING' | 'OUTGOING';
        paymentPercentage?: number;
        notes?: string;
      }
    }) => {
      // Format date to YYYY-MM-DD
      const dueDate = params.data.dueDate instanceof Date
        ? params.data.dueDate.toISOString().split('T')[0]
        : params.data.dueDate ? new Date(params.data.dueDate).toISOString().split('T')[0] : undefined;

      // Build notes string with payment type, percentage, and description
      const notesParts: string[] = [];
      if (params.data.paymentType) {
        notesParts.push(`Payment Type: ${params.data.paymentType}`);
      }
      if (params.data.paymentPercentage !== undefined && params.data.paymentPercentage !== null) {
        notesParts.push(`Percentage: ${params.data.paymentPercentage}%`);
      }
      if (params.data.notes && params.data.notes.trim()) {
        notesParts.push(params.data.notes.trim());
      }
      const combinedNotes = notesParts.length > 0 ? notesParts.join('\n\n') : undefined;

      return await projectsApi.updatePaymentSchedule(params.paymentId, {
        dueDate,
        dueAmount: params.data.dueAmount,
        notes: combinedNotes,
      });
    },
    {
      showSuccessToast: true,
      successMessage: 'تم تحديث جدول الدفع بنجاح',
      onSuccess: () => {
        setIsEditModalOpen(false);
        setSelectedPayment(null);
        hasLoadedPayments.current = false;
        loadPayments();
      },
    }
  );

  const handleUpdateSubmit = async (data: Partial<ProjectDuePayment> & {
    sequenceNo: number;
    paymentType?: 'INCOMING' | 'OUTGOING';
    paymentPercentage?: number;
    notes?: string;
  }) => {
    if (!selectedPayment) return;

    try {
      // Get payment ID by fetching project payments
      const projectPayments = await projectsApi.getProjectPayments(selectedPayment.projectCode);
      const paymentSchedule = projectPayments.find((p: { sequenceNo?: number; serialNo?: number; paymentId?: number }) =>
        (p.sequenceNo || p.serialNo) === selectedPayment.serialNo
      );

      if (!paymentSchedule || !paymentSchedule.paymentId) {
        toast.showError('لم يتم العثور على جدول الدفع');
        return;
      }

      await updatePaymentSchedule({ paymentId: paymentSchedule.paymentId, data });
    } catch (error) {
      console.error('Error updating payment schedule:', error);
      toast.showError('فشل تحديث جدول الدفع');
    }
  };

  // Delete payment schedule
  const { loading: isDeleting, execute: deletePaymentSchedule } = useApiWithToast(
    async (paymentId: number) => {
      return await projectsApi.deletePaymentSchedule(paymentId);
    },
    {
      showSuccessToast: true,
      successMessage: 'تم حذف جدول الدفع بنجاح',
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setSelectedPayment(null);
        hasLoadedPayments.current = false;
        loadPayments();
      },
    }
  );

  const handleConfirmDelete = async () => {
    if (!selectedPayment) return;

    try {
      // Get payment ID by fetching project payments
      const projectPayments = await projectsApi.getProjectPayments(selectedPayment.projectCode);
      const paymentSchedule = projectPayments.find((p: { sequenceNo?: number; serialNo?: number; paymentId?: number }) =>
        (p.sequenceNo || p.serialNo) === selectedPayment.serialNo
      );

      if (!paymentSchedule || !paymentSchedule.paymentId) {
        toast.showError('لم يتم العثور على جدول الدفع');
        return;
      }

      await deletePaymentSchedule(paymentSchedule.paymentId);
    } catch (error: unknown) {
      console.error('Error deleting payment schedule:', error);
      const errorMessage = error instanceof Error ? error.message : 'فشل حذف جدول الدفع';
      toast.showError(errorMessage);
    }
  };

  const getProjectName = useCallback((projectCode: number) => {
    const projectsList = projects || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = (projectsList as any[]).find((p: { projectCode?: number; projectName?: string }) => p.projectCode === projectCode);
    return project?.projectName || `المشروع #${projectCode}`;
  }, [projects]);

  const columns = useMemo<MRT_ColumnDef<ProjectDuePayment>[]>(
    () => [
      {
        accessorKey: 'serialNo',
        header: 'رقم الجدول',
        size: 120,
        Cell: ({ cell }) => {
          const serialNo = cell.getValue<number>();
          return (
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              #{serialNo}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'projectCode',
        header: 'المشروع',
        size: 250,
        Cell: ({ cell }) => getProjectName(cell.getValue<number>()),
      },
      {
        accessorKey: 'dueDate',
        header: 'تاريخ الاستحقاق',
        size: 140,
        Cell: ({ cell }) => {
          const dueDate = new Date(cell.getValue<Date>());
          const today = new Date();
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          return (
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
                {dueDate.toLocaleDateString('en-GB')}
              </Typography>
              {daysUntil > 0 && daysUntil <= 30 && (
                <Typography sx={{ fontSize: '11px', color: '#F59E0B' }}>
                  متبقي {daysUntil} يوم
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: 'dueAmount',
        header: 'المبلغ',
        size: 150,
        Cell: ({ cell }) => {
          const amount = cell.getValue<number>();
          let displayAmount: string;

          if (amount >= 1000000) {
            displayAmount = `ر.س ${(amount / 1000000).toFixed(2)}م`;
          } else if (amount >= 1000) {
            displayAmount = `ر.س ${(amount / 1000).toFixed(1)}ألف`;
          } else {
            displayAmount = `ر.س ${formatNumber(amount)}`;
          }

          return (
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0c2b7a' }}>
              {displayAmount}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'paymentStatus',
        header: 'الحالة',
        size: 130,
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          const colors = {
            PAID: { bg: '#D1FAE5', text: '#065F46' },
            UNPAID: { bg: '#FEE2E2', text: '#991B1B' },
            PARTIAL: { bg: '#FEF3C7', text: '#92400E' },
          };
          const color = colors[status as keyof typeof colors] || colors.UNPAID;
          return (
            <Chip
              label={
                status === 'PAID' ? 'مدفوع' :
                  status === 'UNPAID' ? 'غير مدفوع' :
                    status === 'PARTIAL' ? 'جزئي' : status
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
      },
      {
        accessorKey: 'paidDate',
        header: 'تاريخ الدفع',
        size: 130,
        Cell: ({ cell }) => {
          const paidDate = cell.getValue<Date>();
          return paidDate ? new Date(paidDate).toLocaleDateString('en-GB') : '-';
        },
      },
    ],
    [getProjectName],
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredPayments || [],
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
      sorting: [{ id: 'dueDate', desc: false }],
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
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          select
          size="small"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          sx={{
            minWidth: 220,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#FFFFFF',
              color: '#111827',
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
            '& .MuiInputLabel-root': {
              color: '#6B7280',
              '&.Mui-focused': {
                color: '#0c2b7a',
              },
            },
            '& .MuiSelect-select': {
              color: '#111827',
            },
          }}
        >
          <MenuItem value="all">جميع المشاريع</MenuItem>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(projects as any[] || []).map((project: { projectCode: number; projectName?: string }) => (
            <MenuItem key={project.projectCode} value={project.projectCode}>
              {project.projectName}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
          size="small"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
            color: '#FFFFFF',
            '& .MuiSvgIcon-root': {
              color: '#FFFFFF',
            },
            '&:hover': {
              background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
              '& .MuiSvgIcon-root': {
                color: '#FFFFFF',
              },
            },
          }}
        >
          إضافة جدول دفع
        </Button>
        <Button
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={handleExport}
          size="small"
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
    ),
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center' }}>
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
        {row.original.paymentStatus === 'UNPAID' && (
          <Tooltip title="وضع علامة كمدفوع">
            <IconButton
              size="small"
              sx={{ color: '#059669' }}
              onClick={() => handleMarkAsPaid(row.original)}
            >
              <CheckCircle fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    ),
    enableRowActions: true,
    positionActionsColumn: 'last',
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'الإجراءات',
        size: 220,
        minSize: 200,
        maxSize: 300,
      },
    },
  });

  const handleExport = () => {
    if (!filteredPayments || filteredPayments.length === 0) {
      toast.showError('لا توجد بيانات للتصدير');
      return;
    }

    const exportData = filteredPayments.map(payment => ({
      'رقم الجدول': `#${payment.serialNo}`,
      'المشروع': getProjectName(payment.projectCode),
      'تاريخ الاستحقاق': new Date(payment.dueDate).toLocaleDateString('en-GB'),
      'المبلغ': `ر.س ${formatNumber(payment.dueAmount)}`,
      'الحالة': payment.paymentStatus === 'PAID' ? 'مدفوع' : payment.paymentStatus === 'UNPAID' ? 'غير مدفوع' : 'جزئي',
      'تاريخ الدفع': payment.paidDate ? new Date(payment.paidDate).toLocaleDateString('en-GB') : '-',
    }));

    exportDataToCSV(exportData, `payment-schedules-${selectedProject === 'all' ? 'all' : getProjectName(selectedProject as number)}`);
    toast.showSuccess('تم تصدير جداول الدفع بنجاح');
  };

  // Calculate upcoming payments
  const upcomingPayments = filteredPayments.filter(p => {
    if (p.paymentStatus !== 'UNPAID') return false;
    const dueDate = new Date(p.dueDate);
    const today = new Date();
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 60;
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
              جداول الدفع - وضع ملء الشاشة
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
            {loadingPayments ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : paymentsError ? (
              <Alert severity="error" sx={{ mb: 3 }}>
                فشل تحميل جداول الدفع. يرجى المحاولة مرة أخرى.
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
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
              >
                جداول الدفع
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                تتبع تواريخ استحقاق مدفوعات المشروع مع الإشعارات التلقائية
              </Typography>
            </Box>

            {/* Loading State */}
            {(loadingProjects || loadingPayments) && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Error State */}
            {paymentsError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                فشل تحميل جداول الدفع. يرجى المحاولة مرة أخرى.
              </Alert>
            )}

            {/* Upcoming Payments Alert */}
            {!loadingPayments && upcomingPayments.length > 0 && (
              <Box
                sx={{
                  mb: 3,
                  padding: 2,
                  backgroundColor: '#FEF3C7',
                  borderRadius: '12px',
                  border: '1px solid #FCD34D',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  animation: 'fadeInUp 0.6s ease-out 0.3s both',
                }}
              >
                <Notifications sx={{ color: '#F59E0B', fontSize: 28 }} />
                <Box>
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#92400E' }}>
                    {upcomingPayments.length} دفعة مستحقة خلال 60 يوم
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#78350F' }}>
                    إجمالي المبلغ: ر.س {upcomingPayments.reduce((sum, p) => sum + p.dueAmount, 0).toLocaleString('ar-SA')}
                  </Typography>
                </Box>
              </Box>
            )}

            {!loadingPayments && !paymentsError && tableWrapper}
          </Box>
        </Box>
      </Box>

      {/* Add Payment Schedule Form */}
      <PaymentScheduleForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedPayment(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedPayment}
        loading={isSaving}
        projects={(projects as unknown as ProjectSummary[] || []).map((p: ProjectSummary) => ({
          projectCode: p.projectCode,
          projectName: p.projectName || undefined,
          totalProjectAmount: p.totalProjectAmount || 0,
        }))}
      />

      {/* Edit Payment Schedule Form */}
      <PaymentScheduleForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPayment(null);
        }}
        onSubmit={handleUpdateSubmit}
        initialData={selectedPayment}
        loading={isUpdating}
        projects={(projects as unknown as ProjectSummary[] || []).map((p: ProjectSummary) => ({
          projectCode: p.projectCode,
          projectName: p.projectName || undefined,
          totalProjectAmount: p.totalProjectAmount || 0,
        }))}
      />

      {/* View Payment Schedule Form */}
      <PaymentScheduleViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedPayment(null);
        }}
        data={selectedPayment}
        projects={(projects as unknown as ProjectSummary[] || []).map((p: ProjectSummary) => ({
          projectCode: p.projectCode,
          projectName: p.projectName || undefined,
        }))}
      />

      {/* Delete Confirmation Dialog */}
      {isDeleteModalOpen && selectedPayment && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <Box
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: 0,
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 2 }}>
              حذف جدول الدفع
            </Typography>
            <Typography sx={{ color: '#6B7280', mb: 3 }}>
              هل أنت متأكد أنك تريد حذف جدول الدفع #{selectedPayment.serialNo} للمشروع {getProjectName(selectedPayment.projectCode)}؟
              لا يمكن التراجع عن هذا الإجراء.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedPayment(null);
                }}
                variant="outlined"
                disabled={isDeleting}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#D1D5DB',
                  color: '#374151',
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleConfirmDelete}
                variant="contained"
                disabled={isDeleting}
                startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <Delete />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  '&:hover': {
                    backgroundColor: '#B91C1C',
                  },
                }}
              >
                {isDeleting ? 'جاري الحذف...' : 'حذف'}
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
}


