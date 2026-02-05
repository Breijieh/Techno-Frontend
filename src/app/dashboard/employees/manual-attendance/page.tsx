'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Visibility,
  CheckCircle,
  Fullscreen,
  FullscreenExit,
  Refresh,
  AccessTime,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
  type MRT_PaginationState,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import type { ManualAttendanceRequest } from '@/types';
import ManualAttendanceForm from '@/components/forms/ManualAttendanceForm';
import useRouteProtection from '@/hooks/useRouteProtection';
import { manualAttendanceRequestApi, type ManualAttendanceRequestResponse } from '@/lib/api/attendance';
import { mapManualAttendanceResponseListToManualAttendanceRequestList } from '@/lib/mappers/manualAttendanceMapper';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { getUserContext } from '@/lib/dataFilters';
import { getUserRole } from '@/lib/permissions';
import { employeesApi } from '@/lib/api';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';
import { formatDateShort } from '@/lib/utils/dateFormatter';

export default function ManualAttendancePage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [requests, setRequests] = useState<ManualAttendanceRequest[]>([]);
  const [requestResponses, setRequestResponses] = useState<ManualAttendanceRequestResponse[]>([]); // Store raw responses for employee names
  const [totalElements, setTotalElements] = useState(0);
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [selectedRequest, setSelectedRequest] = useState<ManualAttendanceRequest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [entryTimeFrom, setEntryTimeFrom] = useState<string>('');
  const [entryTimeTo, setEntryTimeTo] = useState<string>('');
  const [exitTimeFrom, setExitTimeFrom] = useState<string>('');
  const [exitTimeTo, setExitTimeTo] = useState<string>('');

  const userContext = getUserContext();
  const userRole = getUserRole();

  // Load employees for filter (only for Admins/HR/Managers)
  useEffect(() => {
    if (userRole && ['Admin', 'HR Manager', 'General Manager', 'Project Manager'].includes(userRole)) {
      const loadEmployees = async () => {
        setLoadingFilters(true);
        try {
          const response = await employeesApi.getAllEmployees({ size: 1000 });
          setEmployees(response.employees.map(e => ({
            id: e.employeeNo,
            name: e.employeeName || e.employeeName || `موظف ${e.employeeNo}`
          })));
        } catch (error) {
          console.error('Failed to load employees:', error);
        } finally {
          setLoadingFilters(false);
        }
      };
      loadEmployees();
    }
  }, [userRole]);

  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'Project Manager', 'Project Secretary']);

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

  const handleView = (request: ManualAttendanceRequest) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleApprove = (request: ManualAttendanceRequest) => {
    setSelectedRequest(request);
    setIsApproveModalOpen(true);
  };

  // Fetch manual attendance requests from API
  const { execute: fetchRequests, loading: loadingRequests, error: requestsError } = useApiWithToast(
    async () => {
      try {
        const params: Parameters<typeof manualAttendanceRequestApi.getAllManualAttendanceRequests>[0] = {
          page: pagination.pageIndex,
          size: pagination.pageSize,
          sortBy: 'requestDate',
          sortDirection: 'desc',
        };

        // Apply status filter
        if (filterStatus !== 'ALL') {
          params.transStatus = filterStatus === 'PENDING' ? 'N' : filterStatus === 'APPROVED' ? 'A' : 'R';
        }

        // Apply role-based filtering
        if (selectedEmployee) {
          params.employeeNo = selectedEmployee;
        } else if (userRole === 'Employee') {
          // Regular employees can only see their own requests
          // (Though they likely shouldn't access this page)
          params.employeeNo = userContext.employeeId || 0;
        }
        // Hours filter: entry time and exit time from / to
        if (entryTimeFrom) params.entryTimeFrom = entryTimeFrom;
        if (entryTimeTo) params.entryTimeTo = entryTimeTo;
        if (exitTimeFrom) params.exitTimeFrom = exitTimeFrom;
        if (exitTimeTo) params.exitTimeTo = exitTimeTo;
        // Admins/Managers see ALL by default if no employee selected

        const response = await manualAttendanceRequestApi.getAllManualAttendanceRequests(params);

        // Handle undefined or invalid response
        if (!response) {
          console.warn('No response from API - this might indicate the endpoint is not available');
          setRequests([]);
          setRequestResponses([]);
          setTotalElements(0);
          return { content: [], totalElements: 0, totalPages: 0, size: 0, number: 0, first: true, last: true };
        }

        // Ensure content is an array
        const content = Array.isArray(response.content) ? response.content : [];
        const totalElements = typeof response.totalElements === 'number' ? response.totalElements : 0;

        const mappedRequests = mapManualAttendanceResponseListToManualAttendanceRequestList(content);
        setRequests(mappedRequests);
        setRequestResponses(content); // Store raw responses for employee names
        setTotalElements(totalElements);

        return response;
      } catch (error) {
        console.error('Error fetching manual attendance requests:', error);
        setRequests([]);
        setRequestResponses([]);
        setTotalElements(0);
        throw error; // Re-throw to let useApiWithToast handle it
      }
    },
    { silent: true }
  );

  // Fetch requests when pagination or filter changes
  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, filterStatus, selectedEmployee, entryTimeFrom, entryTimeTo, exitTimeFrom, exitTimeTo]);

  // Process approve/reject request
  const { execute: processRequest, loading: processingRequest } = useApiWithToast(
    async (action: 'approve' | 'reject', rejectionReason?: string) => {
      if (!selectedRequest) return;

      const approverNo = userContext.employeeId || 0; // Get from context

      if (action === 'approve') {
        await manualAttendanceRequestApi.approveManualAttendanceRequest(selectedRequest.requestId, {
          approverNo,
        });
      } else {
        await manualAttendanceRequestApi.rejectManualAttendanceRequest(selectedRequest.requestId, {
          approverNo,
          rejectionReason: rejectionReason || 'No reason provided',
        });
      }

      setIsApproveModalOpen(false);
      setSelectedRequest(null);
      // Refresh the list
      await fetchRequests();
    },
    { successMessage: 'تم معالجة الطلب بنجاح' }
  );

  const handleSubmit = async (data: Partial<ManualAttendanceRequest>, action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    await processRequest(action, data.rejectionReason);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get employee name from API response
  const getEmployeeName = useCallback((employeeId: number): string => {
    const response = requestResponses.find(r => r.employeeNo === employeeId);
    return response?.employeeName || `موظف ${employeeId}`;
  }, [requestResponses]);

  const columns = useMemo<MRT_ColumnDef<ManualAttendanceRequest>[]>(
    () => [
      {
        accessorKey: 'requestId',
        header: 'رقم الطلب',
        size: 120,
      },
      {
        accessorKey: 'employeeName',
        header: 'الموظف',
        size: 200,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: ManualAttendanceRequest) => row.employeeName || getEmployeeName(row.employeeId)
        },
        Cell: ({ row }) => {
          // Use employeeName from API response if available, otherwise use getEmployeeName
          return row.original.employeeName || getEmployeeName(row.original.employeeId);
        },
      },
      {
        accessorKey: 'attendanceDate',
        header: 'التاريخ',
        size: 120,
        filterVariant: 'date-range',
        Cell: ({ row }) => formatDateShort(row.original.attendanceDate),
      },
      {
        accessorKey: 'entryTime',
        header: 'وقت الدخول',
        size: 120,
        enableColumnFilter: true,
        filterVariant: 'text',
        Filter: ({ column }) => {
          const meta = column.columnDef.meta as {
            entryTimeFrom: string;
            entryTimeTo: string;
            setEntryTimeFrom: (v: string) => void;
            setEntryTimeTo: (v: string) => void;
          } | undefined;
          if (!meta) return null;
          const { entryTimeFrom, entryTimeTo, setEntryTimeFrom, setEntryTimeTo } = meta;
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 0.5, minWidth: 200 }}>
              <TextField
                size="small"
                type="time"
                label="من"
                value={entryTimeFrom}
                onChange={(e) => setEntryTimeFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    '& fieldset': { borderColor: '#E5E7EB' },
                    '&:hover fieldset': { borderColor: '#0c2b7a' },
                  },
                }}
              />
              <TextField
                size="small"
                type="time"
                label="إلى"
                value={entryTimeTo}
                onChange={(e) => setEntryTimeTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    '& fieldset': { borderColor: '#E5E7EB' },
                    '&:hover fieldset': { borderColor: '#0c2b7a' },
                  },
                }}
              />
            </Box>
          );
        },
        meta: {
          entryTimeFrom,
          entryTimeTo,
          setEntryTimeFrom,
          setEntryTimeTo,
        },
      },
      {
        accessorKey: 'exitTime',
        header: 'وقت الخروج',
        size: 120,
        enableColumnFilter: true,
        filterVariant: 'text',
        Filter: ({ column }) => {
          const meta = column.columnDef.meta as {
            exitTimeFrom: string;
            exitTimeTo: string;
            setExitTimeFrom: (v: string) => void;
            setExitTimeTo: (v: string) => void;
          } | undefined;
          if (!meta) return null;
          const { exitTimeFrom: from, exitTimeTo: to, setExitTimeFrom: setFrom, setExitTimeTo: setTo } = meta;
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 0.5, minWidth: 200 }}>
              <TextField
                size="small"
                type="time"
                label="من"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    '& fieldset': { borderColor: '#E5E7EB' },
                    '&:hover fieldset': { borderColor: '#0c2b7a' },
                  },
                }}
              />
              <TextField
                size="small"
                type="time"
                label="إلى"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    '& fieldset': { borderColor: '#E5E7EB' },
                    '&:hover fieldset': { borderColor: '#0c2b7a' },
                  },
                }}
              />
            </Box>
          );
        },
        meta: {
          exitTimeFrom,
          exitTimeTo,
          setExitTimeFrom,
          setExitTimeTo,
        },
      },
      {
        accessorKey: 'reason',
        header: 'السبب',
        size: 250,
      },
      {
        accessorKey: 'requestStatus',
        header: 'الحالة',
        size: 120,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: ManualAttendanceRequest) => {
            const labels: Record<string, string> = {
              'PENDING': 'قيد الانتظار',
              'APPROVED': 'موافق عليه',
              'REJECTED': 'مرفوض',
            };
            return labels[row.requestStatus] || row.requestStatus;
          }
        },
        Cell: ({ row }) => {
          const status = row.original.requestStatus;
          const statusLabels: Record<string, string> = {
            'PENDING': 'قيد الانتظار',
            'APPROVED': 'موافق عليه',
            'REJECTED': 'مرفوض',
          };
          return (
            <Chip
              label={statusLabels[status] || status}
              color={getStatusColor(status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
              size="small"
            />
          );
        },
      },
      {
        accessorKey: 'requestedDate',
        header: 'تاريخ الطلب',
        size: 150,
        filterVariant: 'date-range',
        Cell: ({ row }) => new Date(row.original.requestedDate).toLocaleString('ar-SA'),
      },
    ],
    [getEmployeeName, entryTimeFrom, entryTimeTo, exitTimeFrom, exitTimeTo]
  );

  const table = useMaterialReactTable({
    columns,
    data: requests,
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
          لم يتم العثور على طلبات حضور يدوي.
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
        ...(isFullscreen && { maxHeight: 'calc(100vh - 120px)' }),
      },
    },
    renderTopToolbar: ({ table }) => (
      <TableToolbarWrapper table={table}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="تحديث">
            <IconButton
              onClick={() => fetchRequests()}
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

          {userRole && ['Admin', 'HR Manager', 'General Manager', 'Project Manager'].includes(userRole) && (
            <TextField
              select
              size="small"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={loadingFilters}
              SelectProps={{ displayEmpty: true }}
              sx={{
                width: '200px',
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
                  color: selectedEmployee ? '#111827' : '#9CA3AF',
                },
              }}
            >
              <MenuItem value="">
                <em>الموظف</em>
              </MenuItem>
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
              ))}
            </TextField>
          )}
          <Button
            variant={filterStatus === 'ALL' ? 'contained' : 'outlined'}
            onClick={() => setFilterStatus('ALL')}
            size="small"
          >
            الكل
          </Button>
          <Button
            variant={filterStatus === 'PENDING' ? 'contained' : 'outlined'}
            onClick={() => setFilterStatus('PENDING')}
            size="small"
            sx={{ color: filterStatus === 'PENDING' ? '#fff' : '#ed6c02' }}
          >
            قيد الانتظار
          </Button>
          <Button
            variant={filterStatus === 'APPROVED' ? 'contained' : 'outlined'}
            onClick={() => setFilterStatus('APPROVED')}
            size="small"
            sx={{ color: filterStatus === 'APPROVED' ? '#fff' : '#2e7d32' }}
          >
            موافق عليه
          </Button>
          <Button
            variant={filterStatus === 'REJECTED' ? 'contained' : 'outlined'}
            onClick={() => setFilterStatus('REJECTED')}
            size="small"
            sx={{ color: filterStatus === 'REJECTED' ? '#fff' : '#d32f2f' }}
          >
            مرفوض
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
      </TableToolbarWrapper>
    ),
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="عرض">
          <IconButton
            onClick={() => handleView(row.original)}
            sx={{
              color: '#0c2b7a',
              '&:hover': {
                backgroundColor: 'rgba(12, 43, 122, 0.08)',
              },
            }}
          >
            <Visibility />
          </IconButton>
        </Tooltip>
        {row.original.requestStatus === 'PENDING' && (
          <Tooltip title="موافقة/رفض">
            <IconButton
              onClick={() => handleApprove(row.original)}
              sx={{
                color: '#0c2b7a',
                '&:hover': {
                  backgroundColor: 'rgba(12, 43, 122, 0.08)',
                },
              }}
            >
              <CheckCircle />
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
      {loadingRequests ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : requestsError ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {typeof requestsError === 'string' ? requestsError : (requestsError as { message?: string })?.message || 'فشل تحميل طلبات الحضور اليدوي'}
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
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
              موافقة الحضور اليدوي - ملء الشاشة
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
          <Box
            sx={{
              flex: 1,
              padding: 0,
              animation: 'fadeInUp 0.6s ease-out 0.2s both',
              '@keyframes fadeInUp': {
                from: { opacity: 0, transform: 'translateY(20px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
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
                موافقة الحضور اليدوي
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                مراجعة والموافقة على طلبات الحضور اليدوي للموظفين
              </Typography>
            </Box>
            {tableWrapper}
          </Box>
        </Box>
      </Box>

      {/* Modals */}
      <ManualAttendanceForm
        open={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={selectedRequest}
        loading={false}
        mode="view"
      />

      <ManualAttendanceForm
        open={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={selectedRequest}
        loading={processingRequest}
        mode="approve"
      />
    </>
  );
}


