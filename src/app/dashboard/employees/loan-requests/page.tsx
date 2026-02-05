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
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  Visibility,
  CalendarMonth,
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
import type { LoanRequest, LoanInstallment } from '@/types';
import LoanRequestForm from '@/components/forms/LoanRequestForm';
import LoanRequestViewForm from '@/components/forms/LoanRequestViewForm';
import ApprovalDialog from '@/components/common/ApprovalDialog';
import SmartRequestTimeline from '@/components/common/SmartRequestTimeline';
import { loansApi, type LoanDetailsResponse } from '@/lib/api/loans';
import { mapLoanDetailsResponseListToLoanRequestList, mapInstallmentDetailsResponseListToLoanInstallmentList } from '@/lib/mappers/loanMapper';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';
import { formatLocalDateYYYYMMDD, formatInvariantDate } from '@/lib/utils/dateFormatter';

export default function LoanRequestsPage() {
  const router = useRouter();
  const [selectedLoan, setSelectedLoan] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [loanResponses, setLoanResponses] = useState<LoanDetailsResponse[]>([]); // Store raw responses for employee names
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
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
    const response = loanResponses.find(r => r.employeeNo === empId);
    return response?.employeeName || `الموظف ${empId}`;
  }, [loanResponses]);

  // Fetch loan requests from API
  const { execute: fetchLoanRequests, loading: loadingLoans, error: loansError } = useApiWithToast(
    async () => {
      const params: Parameters<typeof loansApi.getAllLoans>[0] = {
        page: pagination.pageIndex,
        size: pagination.pageSize,
        sortBy: 'requestDate',
        sortDirection: 'desc',
      };

      // Apply role-based filtering
      if (userRole === 'Employee' && userContext.employeeId) {
        params.employeeNo = userContext.employeeId;
      }

      const response = await loansApi.getAllLoans(params);

      const mappedLoans = mapLoanDetailsResponseListToLoanRequestList(response.content);
      setLoanRequests(mappedLoans);
      setLoanResponses(response.content); // Store raw responses for employee names
      setTotalElements(response.totalElements);

      return response;
    },
    { silent: true, errorMessage: 'فشل تحميل طلبات السلف' }
  );

  // Fetch loan requests when pagination changes
  useEffect(() => {
    fetchLoanRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, userRole, userContext.employeeId]);

  // Form handlers
  const handleAdd = () => {
    setSelectedRequest(null);
    setIsAddModalOpen(true);
  };

  const handleView = (request: LoanRequest) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleApproveClick = (request: LoanRequest) => {
    setSelectedRequest(request);
    setApprovalAction('approve');
    setIsApprovalModalOpen(true);
  };

  const handleRejectClick = (request: LoanRequest) => {
    setSelectedRequest(request);
    setApprovalAction('reject');
    setIsApprovalModalOpen(true);
  };

  // Submit new loan request
  const { execute: submitLoanRequest, loading: submittingLoan } = useApiWithToast(
    async (data: Partial<LoanRequest>) => {
      if (!data.loanAmount || !data.numberOfInstallments || !data.firstPaymentDate || !data.employeeId) {
        throw new Error('يرجى ملء جميع الحقول المطلوبة');
      }

      // Use current user's employee ID if not provided
      const employeeNo = data.employeeId || userContext.employeeId || 0;
      if (!employeeNo) {
        throw new Error('رقم الموظف مطلوب');
      }

      const firstPaymentDate = data.firstPaymentDate instanceof Date
        ? formatLocalDateYYYYMMDD(data.firstPaymentDate)
        : data.firstPaymentDate;

      await loansApi.submitLoanRequest({
        employeeNo,
        loanAmount: data.loanAmount,
        noOfInstallments: data.numberOfInstallments,
        firstInstallmentDate: firstPaymentDate,
      });

      // Refresh the list
      await fetchLoanRequests();
      setIsAddModalOpen(false);
      setSelectedRequest(null);
    },
    {
      successMessage: 'تم إرسال طلب السلفة بنجاح',
      errorMessage: 'فشل إرسال طلب السلفة',
    }
  );

  const handleSubmit = async (data: Partial<LoanRequest>) => {
    await submitLoanRequest(data);
  };

  // Approve loan request
  const { execute: approveLoanRequest, loading: approvingLoan } = useApiWithToast(
    async (notes?: string) => {
      if (!selectedRequest || !userContext.employeeId) {
        throw new Error('معلومات مطلوبة مفقودة');
      }

      await loansApi.approveLoan(selectedRequest.loanId, {
        approverNo: userContext.employeeId,
        notes,
      });

      // Refresh the list
      await fetchLoanRequests();
      setIsApprovalModalOpen(false);
      setSelectedRequest(null);
      setApprovalAction(null);
    },
    {
      successMessage: 'تمت الموافقة على طلب السلفة بنجاح',
      errorMessage: 'فشل الموافقة على طلب السلفة',
    }
  );

  // Reject loan request
  const { execute: rejectLoanRequest, loading: rejectingLoan } = useApiWithToast(
    async (rejectionReason: string) => {
      if (!selectedRequest || !userContext.employeeId) {
        throw new Error('معلومات مطلوبة مفقودة');
      }

      if (!rejectionReason || rejectionReason.trim() === '') {
        throw new Error('سبب الرفض مطلوب');
      }

      await loansApi.rejectLoan(selectedRequest.loanId, {
        approverNo: userContext.employeeId,
        rejectionReason,
      });

      // Refresh the list
      await fetchLoanRequests();
      setIsApprovalModalOpen(false);
      setSelectedRequest(null);
      setApprovalAction(null);
    },
    {
      successMessage: 'تم رفض طلب السلفة بنجاح',
      errorMessage: 'فشل رفض طلب السلفة',
    }
  );

  const handleApprovalAction = async (action: 'approve' | 'reject', notes?: string) => {
    if (action === 'approve') {
      await approveLoanRequest(notes);
    } else {
      await rejectLoanRequest(notes || '');
    }
  };

  const isLoading = submittingLoan || approvingLoan || rejectingLoan;

  const columns = useMemo<MRT_ColumnDef<LoanRequest>[]>(
    () => [
      {
        accessorKey: 'loanId',
        header: 'رقم السلفة',
        size: 100,
      },
      {
        accessorKey: 'employeeId',
        header: 'الموظف',
        size: 180,
        Cell: ({ cell }) => {
          const employeeId = cell.getValue<number>();
          const response = loanResponses.find(r => r.employeeNo === employeeId);
          const name = response?.employeeName || `الموظف ${employeeId}`;
          return <Typography sx={{ fontSize: '14px', color: '#111827' }}>{name}</Typography>;
        },
        meta: {
          getFilterLabel: (row: LoanRequest) => {
            const response = loanResponses.find(r => r.employeeNo === row.employeeId);
            return response?.employeeName || `الموظف ${row.employeeId}`;
          }
        }
      },
      {
        accessorKey: 'loanAmount',
        header: 'مبلغ السلفة',
        size: 140,
        filterVariant: 'range',
        filterFn: 'betweenInclusive',
        Cell: ({ cell }) => (
          <Typography sx={{ fontWeight: 600, color: '#0c2b7a' }}>
            ر.س {cell.getValue<number>().toLocaleString('ar-SA')}
          </Typography>
        ),
      },
      {
        accessorKey: 'numberOfInstallments',
        header: 'الأقساط',
        size: 120,
        filterVariant: 'range',
        filterFn: 'betweenInclusive',
        Cell: ({ cell }) => `${cell.getValue<number>()} أشهر`,
      },
      {
        accessorKey: 'firstPaymentDate',
        header: 'الدفعة الأولى',
        size: 140,
        filterVariant: 'date-range',
        Cell: ({ cell }) => formatInvariantDate(cell.getValue<Date>()),
      },
      {
        accessorKey: 'remainingBalance',
        header: 'المتبقي',
        size: 140,
        filterVariant: 'range',
        filterFn: 'betweenInclusive',
        Cell: ({ cell }) => {
          const remaining = cell.getValue<number>();
          return (
            <Chip
              label={`ر.س ${remaining.toLocaleString('ar-SA')}`}
              size="small"
              sx={{
                backgroundColor: remaining > 0 ? '#FEF3C7' : '#D1FAE5',
                color: remaining > 0 ? '#92400E' : '#065F46',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        size: 130,
        filterVariant: 'multi-select',
        Cell: ({ cell, row }) => {
          const status = cell.getValue<string>();
          const colors = {
            NEW: { bg: '#FEF3C7', text: '#92400E' },
            INPROCESS: { bg: '#DBEAFE', text: '#1E40AF' },
            APPROVED: { bg: '#D1FAE5', text: '#065F46' },
            REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
          };
          const color = colors[status as keyof typeof colors] || colors.NEW;

          if (status === 'NEW' || status === 'INPROCESS') {
            const nextApprover = row.original.nextApproverName || (row.original.nextApproval ? `المستخدم #${row.original.nextApproval}` : null);
            const levelName = row.original.nextLevelName || (row.original.nextLevel ? `المستوى ${row.original.nextLevel}` : null);

            if (nextApprover || levelName) {
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Chip
                    label={
                      status === 'NEW' ? 'جديد' :
                        status === 'INPROCESS' ? 'قيد المعالجة' :
                          status === 'APPROVED' ? 'موافق عليه' :
                            status === 'REJECTED' ? 'مرفوض' :
                              status === 'COMPLETED' ? 'مكتمل' : status
                    }
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
                    {nextApprover && <span>في انتظار: {nextApprover}</span>}
                  </Typography>
                </Box>
              );
            }
          }

          return (
            <Chip
              label={
                status === 'NEW' ? 'جديد' :
                  status === 'INPROCESS' ? 'قيد المعالجة' :
                    status === 'APPROVED' ? 'موافق عليه' :
                      status === 'REJECTED' ? 'مرفوض' :
                        status === 'COMPLETED' ? 'مكتمل' : status
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
        accessorKey: 'requestDate',
        header: 'تاريخ الطلب',
        size: 130,
        Cell: ({ cell }) => formatInvariantDate(cell.getValue<Date>()),
      },
    ],
    [loanResponses],
  );

  const table = useMaterialReactTable({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: loanRequests as any,
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
    localization: mrtArabicLocalization,
    manualPagination: true,
    rowCount: totalElements,
    onPaginationChange: setPagination,
    state: {
      pagination,
      isLoading: loadingLoans,
      showAlertBanner: loansError !== null,
    },
    initialState: {
      density: 'comfortable',
      pagination: { pageSize: 25, pageIndex: 0 },
      showColumnFilters: false,
    },
    muiToolbarAlertBannerProps: loansError
      ? {
        color: 'error',
        children: typeof loansError === 'string' ? loansError : (loansError as { message?: string })?.message || 'فشل تحميل طلبات القروض',
      }
      : undefined,
    renderEmptyRowsFallback: () => (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography sx={{ color: '#6B7280', fontSize: '14px' }}>
          لم يتم العثور على طلبات سلف.
        </Typography>
      </Box>
    ),
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
          requestType="LOAN"
          requestId={(row.original as unknown as LoanRequest).loanId}
          orientation="horizontal"
          fallbackStatus={(row.original as unknown as LoanRequest).status as string | undefined}
          fallbackRequestDate={new Date((row.original as unknown as LoanRequest).requestDate)}
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
            طلب سلفة جديد
          </Button>
          <Tooltip title="تحديث البيانات">
            <span>
              <IconButton
                onClick={() => fetchLoanRequests()}
                disabled={loadingLoans}
                sx={{
                  color: '#0c2b7a',
                  '&:hover': {
                    backgroundColor: 'rgba(12, 43, 122, 0.08)',
                  },
                }}
              >
                {loadingLoans ? <CircularProgress size={20} /> : <Refresh />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}>
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
            onClick={() => handleView(row.original as unknown as LoanRequest)}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="عرض جدول الأقساط">
          <IconButton
            size="small"
            sx={{ color: '#0c2b7a' }}
            onClick={() => setSelectedLoan((row.original as unknown as LoanRequest).loanId)}
          >
            <CalendarMonth fontSize="small" />
          </IconButton>
        </Tooltip>
        {(row.original.status === 'NEW' || row.original.status === 'INPROCESS') && (
          <>
            <Tooltip title="موافقة">
              <IconButton
                size="small"
                sx={{ color: '#059669' }}
                onClick={() => handleApproveClick(row.original as unknown as LoanRequest)}
              >
                <CheckCircle fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="رفض">
              <IconButton
                size="small"
                sx={{ color: '#DC2626' }}
                onClick={() => handleRejectClick(row.original as unknown as LoanRequest)}
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

  });

  // Fetch installments for selected loan
  const [installmentSchedule, setInstallmentSchedule] = useState<LoanInstallment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);

  useEffect(() => {
    if (selectedLoan) {
      const fetchInstallments = async () => {
        setLoadingInstallments(true);
        try {
          const response = await loansApi.getLoanInstallments(selectedLoan);
          const mapped = mapInstallmentDetailsResponseListToLoanInstallmentList(response.installments);
          setInstallmentSchedule(mapped);
        } catch (error) {
          console.error('Failed to fetch installments:', error);
          setInstallmentSchedule([]);
        } finally {
          setLoadingInstallments(false);
        }
      };
      fetchInstallments();
    } else {
      setInstallmentSchedule([]);
    }
  }, [selectedLoan]);

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
      {loadingLoans ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress />
        </Box>
      ) : loansError ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {loansError}
          <Button onClick={() => fetchLoanRequests()} startIcon={<Refresh />} sx={{ ml: 2 }}>
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
              طلبات السلف - ملء الشاشة
            </Typography>
            <Tooltip title="الخروج من ملء الشاشة (ESC)">
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
              طلبات السلف
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              إدارة طلبات سلف الموظفين مع جدولة الأقساط التلقائية
            </Typography>
          </Box>

          {tableWrapper}
        </Box>
      </Box>

      {/* Forms */}
      <LoanRequestForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedRequest(null);
        }}
        onSubmit={handleSubmit}
        loading={isLoading}
      />

      <LoanRequestViewForm
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
        title={approvalAction === 'approve' ? 'الموافقة على طلب السلفة' : 'رفض طلب السلفة'}
        message={approvalAction === 'approve'
          ? 'هل أنت متأكد أنك تريد الموافقة على طلب السلفة هذا؟'
          : 'هل أنت متأكد أنك تريد رفض طلب السلفة هذا؟ يرجى تقديم سبب للرفض.'}
        itemName={selectedRequest ? `طلب السلفة #${selectedRequest.loanId} - ${getEmployeeName(selectedRequest.employeeId)} - ر.س ${selectedRequest.loanAmount.toLocaleString('ar-SA')}` : undefined}
        loading={isLoading}
        showNotes={true}
        requireNotes={approvalAction === 'reject'}
      />

      {/* Installment Schedule Dialog */}
      <Dialog
        open={selectedLoan !== null}
        onClose={() => setSelectedLoan(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, color: '#111827' }}>
          جدول الأقساط - القرض رقم #{selectedLoan}
        </DialogTitle>
        <DialogContent>
          {loadingInstallments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : installmentSchedule.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              لم يتم العثور على أقساط لهذا القرض.
            </Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>القسط</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>تاريخ الاستحقاق</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>المبلغ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>تاريخ الدفع</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {installmentSchedule.map((inst) => (
                  <TableRow key={inst.installmentNo}>
                    <TableCell>#{inst.installmentNo}</TableCell>
                    <TableCell>{new Date(inst.dueDate as unknown as string).toISOString().split('T')[0].split('-').reverse().join('/')}</TableCell>
                    <TableCell>ر.س {inst.installmentAmount.toLocaleString('ar-SA')}</TableCell>
                    <TableCell>
                      {inst.paidDate ? new Date(inst.paidDate as unknown as string).toISOString().split('T')[0].split('-').reverse().join('/') : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          inst.status === 'PAID' ? 'مدفوع' :
                            inst.status === 'PENDING' ? 'قيد الانتظار' :
                              inst.status === 'OVERDUE' ? 'متأخر' :
                                inst.status === 'POSTPONED' ? 'مؤجل' :
                                  inst.status
                        }
                        size="small"
                        sx={{
                          backgroundColor:
                            inst.status === 'PAID' ? '#D1FAE5' :
                              inst.status === 'OVERDUE' ? '#FEE2E2' :
                                inst.status === 'POSTPONED' ? '#FEF3C7' :
                                  '#F3F4F6',
                          color:
                            inst.status === 'PAID' ? '#065F46' :
                              inst.status === 'OVERDUE' ? '#991B1B' :
                                inst.status === 'POSTPONED' ? '#92400E' :
                                  '#374151',
                          fontWeight: 600,
                          fontSize: '10px',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


