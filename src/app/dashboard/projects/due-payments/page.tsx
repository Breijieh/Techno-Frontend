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
  CircularProgress,
} from '@mui/material';
import {
  Edit,
  Visibility,
  Payment,
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
import type { ProjectDuePaymentRecord, PaymentStatus, ProjectDuePayment } from '@/types';
import useRouteProtection from '@/hooks/useRouteProtection';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import {
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import { projectsApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';

export default function DuePaymentsPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ProjectDuePaymentRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch overdue payments
  const { data: overduePayments = [], loading: isLoading, execute: loadDuePayments } = useApi(
    () => projectsApi.getOverduePayments(),
    { immediate: true }
  );

  // Map backend response to frontend format
  const duePayments = useMemo(() => {
    const payments = overduePayments || [];
    return payments.map((p: ProjectDuePayment) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payment = p as any;
      return {
        paymentId: payment.paymentId || 0,
        projectCode: payment.projectCode || 0,
        projectName: payment.projectName || `Project ${payment.projectCode}`, // Use backend projectName
        serialNumber: payment.sequenceNo || payment.serialNumber || 0,
        dueDate: new Date(payment.dueDate),
        dueAmount: Number(payment.dueAmount),
        paymentStatus: payment.paymentStatus === 'PAID' ? 'PAID' : payment.paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'UNPAID' as PaymentStatus,
        paidDate: payment.paymentDate ? new Date(payment.paymentDate) : undefined,
        paidAmount: payment.paidAmount ? Number(payment.paidAmount) : undefined,
      } as ProjectDuePaymentRecord;
    });
  }, [overduePayments]);

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

  // Form handlers
  const handleView = (payment: ProjectDuePaymentRecord) => {
    setSelectedPayment(payment);
    setIsViewModalOpen(true);
  };

  const handleEdit = (payment: ProjectDuePaymentRecord) => {
    setSelectedPayment(payment);
    setIsEditModalOpen(true);
  };

  // Update due payment
  const { execute: updateDuePayment } = useApiWithToast(
    async (paymentId: number, data: { paidAmount?: number; paidDate?: string }) => {
      if (data.paidAmount && data.paidDate) {
        // Record payment
        await projectsApi.recordPayment(paymentId, {
          paymentAmount: data.paidAmount,
          paymentDate: data.paidDate,
          notes: 'تم تسجيل الدفع من صفحة المدفوعات المستحقة',
        });
      } else {
        // Update payment schedule
        await projectsApi.updatePaymentSchedule(paymentId, {
          dueDate: data.paidDate,
          dueAmount: data.paidAmount,
        });
      }
      await loadDuePayments();
    },
    {
      showSuccessToast: true,
      successMessage: 'تم تحديث المدفوع المستحق بنجاح',
    }
  );

  const handleSubmit = async (data: Partial<ProjectDuePaymentRecord>) => {
    if (!selectedPayment) return;
    try {
      await updateDuePayment(selectedPayment.paymentId, {
        paidAmount: data.paidAmount,
        paidDate: data.paidDate ? new Date(data.paidDate).toISOString().split('T')[0] : undefined,
      });
      setIsEditModalOpen(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error updating due payment:', error);
      throw error;
    }
  };

  const formatPaymentForView = (payment: ProjectDuePaymentRecord) => {
    return [
      { label: 'المشروع', value: payment.projectName || `مشروع ${payment.projectCode}` },
      { label: 'الرقم التسلسلي', value: payment.serialNumber.toString() },
      { label: 'تاريخ الاستحقاق', value: new Date(payment.dueDate).toLocaleDateString('en-GB') },
      { label: 'المبلغ المستحق', value: `ر.س ${payment.dueAmount.toLocaleString('ar-SA')}` },
      { label: 'الحالة', value: payment.paymentStatus === 'PAID' ? 'مدفوع' : payment.paymentStatus === 'PARTIAL' ? 'جزئي' : 'غير مدفوع' },
      { label: 'تاريخ الدفع', value: payment.paidDate ? new Date(payment.paidDate).toLocaleDateString('en-GB') : '-' },
      { label: 'المبلغ المدفوع', value: payment.paidAmount ? `ر.س ${payment.paidAmount.toLocaleString('ar-SA')}` : '-' },
    ];
  };

  const columns = useMemo<MRT_ColumnDef<ProjectDuePaymentRecord>[]>(
    () => [
      {
        accessorKey: 'projectName',
        header: 'المشروع',
        size: 200,
        Cell: ({ row }) => row.original.projectName || `مشروع ${row.original.projectCode}`,
      },
      {
        accessorKey: 'serialNumber',
        header: 'الرقم التسلسلي',
        size: 100,
      },
      {
        accessorKey: 'dueDate',
        header: 'تاريخ الاستحقاق',
        size: 120,
        Cell: ({ cell }) => cell.getValue<Date>().toLocaleDateString('en-GB'),
      },
      {
        accessorKey: 'dueAmount',
        header: 'المبلغ المستحق',
        size: 150,
        Cell: ({ cell }) => `ر.س ${cell.getValue<number>().toLocaleString('ar-SA')}`,
      },
      {
        accessorKey: 'paymentStatus',
        header: 'الحالة',
        size: 120,
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          return (
            <Chip
              label={status === 'PAID' ? 'مدفوع' : status === 'PARTIAL' ? 'جزئي' : 'غير مدفوع'}
              color={status === 'PAID' ? 'success' : status === 'PARTIAL' ? 'warning' : 'default'}
              size="small"
            />
          );
        },
      },
      {
        accessorKey: 'paidDate',
        header: 'تاريخ الدفع',
        size: 120,
        Cell: ({ cell }) => cell.getValue<Date | undefined>()?.toLocaleDateString('en-GB') || '-',
      },
      {
        accessorKey: 'paidAmount',
        header: 'المبلغ المدفوع',
        size: 150,
        Cell: ({ cell }) => {
          const amount = cell.getValue<number | undefined>();
          return amount ? `ر.س ${amount.toLocaleString('ar-SA')}` : '-';
        },
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: duePayments || [],
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
        <Tooltip title="تحديث حالة الدفع">
          <IconButton
            size="small"
            sx={{ color: '#059669' }}
            onClick={() => handleEdit(row.original)}
          >
            <Edit fontSize="small" />
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
              إدارة المدفوعات المستحقة - وضع ملء الشاشة
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
                  >
                    إدارة المدفوعات المستحقة
                  </Typography>
                  <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                    تتبع وتحديث حالة دفع العملاء للمشاريع
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
          setSelectedPayment(null);
        }}
        title="تفاصيل المدفوع المستحق"
        fields={selectedPayment ? formatPaymentForView(selectedPayment) : []}
      />

      {/* Edit Dialog */}
      {selectedPayment && (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <AnimatedDialog
            open={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedPayment(null);
            }}
            title="تحديث حالة الدفع"
            maxWidth="sm"
            disableBackdropClick={isLoading}
            showCloseButton={!isLoading}
            actions={
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', width: '100%' }}>
                <Button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedPayment(null);
                  }}
                  variant="outlined"
                  disabled={isLoading}
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
                    if (!selectedPayment) return;
                    const updateData: Partial<ProjectDuePaymentRecord> = {
                      paymentStatus: 'PAID' as PaymentStatus,
                      paidDate: new Date(),
                      paidAmount: selectedPayment.dueAmount,
                    };
                    await handleSubmit(updateData);
                  }}
                  variant="contained"
                  disabled={isLoading || selectedPayment.paymentStatus === 'PAID'}
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
                  {isLoading ? (
                    <>
                      <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                      جاري التحديث...
                    </>
                  ) : (
                    'وضع علامة كمدفوع'
                  )}
                </Button>
              </Box>
            }
          >
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
                  المشروع
                </Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  {selectedPayment.projectName || `مشروع ${selectedPayment.projectCode}`}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 1 }}>
                  الرقم التسلسلي
                </Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  {selectedPayment.serialNumber}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 1 }}>
                  المبلغ المستحق
                </Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  ر.س {selectedPayment.dueAmount.toLocaleString('ar-SA')}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '14px', color: '#6B7280', mb: 1 }}>
                  الحالة الحالية
                </Typography>
                <Chip
                  label={selectedPayment.paymentStatus === 'PAID' ? 'مدفوع' : selectedPayment.paymentStatus === 'PARTIAL' ? 'جزئي' : 'غير مدفوع'}
                  color={selectedPayment.paymentStatus === 'PAID' ? 'success' : selectedPayment.paymentStatus === 'PARTIAL' ? 'warning' : 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              {selectedPayment.paymentStatus !== 'PAID' && (
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
                    النقر على &quot;وضع علامة كمدفوع&quot; سيقوم بتحديث حالة الدفع إلى مدفوع، وتعيين تاريخ الدفع لليوم، وتعيين المبلغ المدفوع إلى المبلغ المستحق الكامل.
                  </Typography>
                </Box>
              )}
            </Box>
          </AnimatedDialog>
        </LocalizationProvider>
      )}
    </>
  );
}


