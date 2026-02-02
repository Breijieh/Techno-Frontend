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
  Edit,
  Delete,
  CheckCircle,
  Visibility,
  CompareArrows,
  SwapHoriz,
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
import type { TransferTransaction, StoreItemTransfer } from '@/types';

interface InternalTransferTransaction extends TransferTransaction {
  itemName?: string;
  fromStoreName?: string;
  toStoreName?: string;
  fromStoreEnName?: string;
  fromStoreArName?: string;
  toStoreEnName?: string;
  toStoreArName?: string;
}
import TransferForm from '@/components/forms/TransferForm';
import TransferViewForm from '@/components/forms/TransferViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { warehouseApi, type StoreTransferResponse, type StoreTransferRequest } from '@/lib/api/warehouse';
import { projectsApi } from '@/lib/api/projects';
import { employeesApi } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

import { formatDate } from '@/lib/utils/dateFormatter';

export default function TransfersPage() {
  const router = useRouter();
  const toast = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StoreItemTransfer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch data from backend
  const { data: transfersData, loading: loadingTransfers, error: errorTransfers, execute: refetchTransfers } = useApi(
    () => warehouseApi.getAllStoreTransfers(),
    { immediate: true }
  );
  const { data: projects } = useApi(
    () => projectsApi.getActiveProjects(),
    { immediate: true }
  );
  const { data: employeesData } = useApi(
    () => employeesApi.getAllEmployees({ page: 0, size: 1000 }),
    { immediate: true }
  );

  // Extract employees array from paginated response
  const employees = useMemo(() => {
    return employeesData?.employees || [];
  }, [employeesData]);
  const { data: stores } = useApi(
    () => warehouseApi.getAllStores(),
    { immediate: true }
  );
  const { data: items } = useApi(
    () => warehouseApi.getAllItems(),
    { immediate: true }
  );

  // CRUD operations with toast
  const createTransfer = useApiWithToast(
    (request: StoreTransferRequest) => warehouseApi.createStoreTransfer(request),
    { successMessage: 'تم إنشاء النقلة بنجاح' }
  );
  const updateTransfer = useApiWithToast(
    (params: { id: number; request: StoreTransferRequest }) => warehouseApi.updateStoreTransfer(params.id, params.request),
    { successMessage: 'تم تحديث النقلة بنجاح' }
  );
  const deleteTransfer = useApiWithToast(
    (id: number) => warehouseApi.deleteStoreTransfer(id),
    { successMessage: 'تم حذف النقلة بنجاح' }
  );
  const completeTransfer = useApiWithToast(
    (id: number) => warehouseApi.completeStoreTransfer(id),
    { successMessage: 'تم إكمال النقلة بنجاح' }
  );

  // Mapper function: Flatten transfer lines to individual transactions
  const mapStoreTransferResponseToTransferTransactions = useCallback((transfer: StoreTransferResponse): InternalTransferTransaction[] => {
    if (!transfer.transferLines || transfer.transferLines.length === 0) {
      // Return a single transaction with transfer header info
      return [{
        transferNo: transfer.transferId,
        transferDate: new Date(transfer.transferDate),
        itemCode: 0,
        quantity: 0,
        fromStoreId: transfer.fromStoreCode,
        toStoreId: transfer.toStoreCode,
        status: transfer.transferStatus === 'RECEIVED' ? 'COMPLETED' : 'PENDING',
        transferredBy: transfer.transferredBy || 0,
        // Backend data for display
        itemName: undefined,
        fromStoreName: transfer.fromStoreEnName || transfer.fromStoreArName || transfer.fromStoreName,
        fromStoreEnName: transfer.fromStoreEnName,
        fromStoreArName: transfer.fromStoreArName,
        toStoreName: transfer.toStoreEnName || transfer.toStoreArName || transfer.toStoreName,
        toStoreEnName: transfer.toStoreEnName,
        toStoreArName: transfer.toStoreArName,
      }];
    }

    // Map each transfer line to a transaction row
    return transfer.transferLines.map((line) => {
      return {
        transferNo: transfer.transferId,
        transferDate: new Date(transfer.transferDate),
        itemCode: line.itemCode,
        quantity: line.quantity,
        fromStoreId: transfer.fromStoreCode,
        toStoreId: transfer.toStoreCode,
        status: transfer.transferStatus === 'RECEIVED' ? 'COMPLETED' : 'PENDING',
        transferredBy: transfer.transferredBy || 0,
        // Backend data for display - use backend-provided names
        itemName: line.itemName || undefined,
        fromStoreName: transfer.fromStoreEnName || transfer.fromStoreArName || transfer.fromStoreName,
        fromStoreEnName: transfer.fromStoreEnName,
        fromStoreArName: transfer.fromStoreArName,
        toStoreName: transfer.toStoreEnName || transfer.toStoreArName || transfer.toStoreName,
        toStoreEnName: transfer.toStoreEnName,
        toStoreArName: transfer.toStoreArName,
      } as TransferTransaction;
    });
  }, []);

  // Map all transfers to transactions (flattened)
  const transferTransactions = useMemo(() => {
    if (!transfersData) return [];
    return transfersData.flatMap(mapStoreTransferResponseToTransferTransactions);
  }, [transfersData, mapStoreTransferResponseToTransferTransactions]);

  // Protect route
  useRouteProtection(['Admin', 'Warehouse Manager']);

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
      // Prevent body scroll when in fullscreen
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
    setSelectedTransfer(null);
    setIsAddModalOpen(true);
  };

  const handleView = async (transaction: TransferTransaction) => {
    try {
      const transfer = await warehouseApi.getStoreTransferById(transaction.transferNo);
      // Convert StoreTransferResponse to StoreItemTransfer for viewing
      const transferData: StoreItemTransfer = {
        transactionNo: transfer.transferId,
        transactionDate: new Date(transfer.transferDate),
        fromProjectCode: transfer.fromProjectCode || 0,
        fromStoreCode: transfer.fromStoreCode,
        toProjectCode: transfer.toProjectCode || 0,
        toStoreCode: transfer.toStoreCode,
        requestStatus: transfer.transferStatus === 'RECEIVED' ? 'COMPLETED' : 'NEW',
        requestedBy: transfer.transferredBy || 0,
      };
      setSelectedTransfer(transferData);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching transfer details:', error);
      toast.showError('فشل تحميل تفاصيل النقل');
    }
  };

  const handleEdit = async (transaction: TransferTransaction) => {
    try {
      const transfer = await warehouseApi.getStoreTransferById(transaction.transferNo);
      console.log('[TransfersPage] handleEdit - Transfer received:', transfer);
      // Only allow editing if PENDING
      if (transfer.transferStatus !== 'PENDING') {
        toast.showWarning('يمكن تعديل عمليات النقل المعلقة فقط');
        return;
      }
      // Convert StoreTransferResponse to StoreItemTransfer for editing
      const transferData: StoreItemTransfer & { transferLines?: Array<{ itemCode: number; quantity: number; notes?: string }> } = {
        transactionNo: transfer.transferId,
        transactionDate: new Date(transfer.transferDate),
        fromProjectCode: transfer.fromProjectCode || 0,
        fromStoreCode: transfer.fromStoreCode,
        toProjectCode: transfer.toProjectCode || 0,
        toStoreCode: transfer.toStoreCode,
        requestStatus: 'NEW',
        requestedBy: transfer.transferredBy || 0,
        // Include transfer lines from backend for editing
        transferLines: transfer.transferLines?.map(line => ({
          itemCode: line.itemCode,
          quantity: line.quantity,
          notes: line.notes || '',
        })) || [],
      };
      console.log('[TransfersPage] Mapped transferData with transfer lines:', transferData);
      console.log('[TransfersPage] Transfer lines count:', transferData.transferLines?.length || 0);
      setSelectedTransfer(transferData);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching transfer details:', error);
      toast.showError('فشل تحميل تفاصيل النقل');
    }
  };

  const handleDelete = (transaction: TransferTransaction) => {
    // Convert TransferTransaction to StoreItemTransfer for deletion
    const transfer: StoreItemTransfer = {
      transactionNo: transaction.transferNo,
      transactionDate: transaction.transferDate,
      fromProjectCode: 0,
      fromStoreCode: transaction.fromStoreId,
      toProjectCode: 0,
      toStoreCode: transaction.toStoreId,
      requestStatus: transaction.status === 'COMPLETED' ? 'COMPLETED' : 'NEW',
      requestedBy: transaction.transferredBy,
    };
    setSelectedTransfer(transfer);
    setIsDeleteModalOpen(true);
  };

  const handleComplete = async (transaction: TransferTransaction) => {
    try {
      await completeTransfer.execute(transaction.transferNo);
      await refetchTransfers();
    } catch (error) {
      console.error('Error completing transfer:', error);
    }
  };

  const handleSubmit = async (data: Partial<StoreItemTransfer> & { transferLines?: Array<{ itemCode: number; quantity: number; notes?: string }> }) => {
    try {
      // Map form data to StoreTransferRequest
      if (!data.fromStoreCode || !data.toStoreCode) {
        toast.showError('مستودع المصدر ومستودع الوجهة مطلوبان');
        return;
      }

      if (data.fromStoreCode === data.toStoreCode) {
        toast.showError('يجب أن يكون مستودع المصدر ومستودع الوجهة مختلفين');
        return;
      }

      if (!data.transferLines || data.transferLines.length === 0) {
        toast.showError('عنصر واحد على الأقل مطلوب');
        return;
      }

      const request = {
        fromStoreCode: data.fromStoreCode,
        toStoreCode: data.toStoreCode,
        transferDate: data.transactionDate ? new Date(data.transactionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        notes: undefined,
        transferLines: data.transferLines.map(line => ({
          itemCode: line.itemCode,
          quantity: line.quantity,
          notes: line.notes,
        })),
      };

      if (selectedTransfer && selectedTransfer.transactionNo) {
        // Edit mode - only allow if PENDING
        await updateTransfer.execute({ id: selectedTransfer.transactionNo, request });
        setIsEditModalOpen(false);
      } else {
        // Add mode
        await createTransfer.execute(request);
        setIsAddModalOpen(false);
      }
      setSelectedTransfer(null);
      await refetchTransfers();
    } catch (error) {
      console.error('Error saving store transfer:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTransfer) return;
    try {
      await deleteTransfer.execute(selectedTransfer.transactionNo);
      setIsDeleteModalOpen(false);
      setSelectedTransfer(null);
      await refetchTransfers();
    } catch (error) {
      console.error('Error deleting store transfer:', error);
    }
  };

  const getItemName = useCallback((transaction: TransferTransaction) => {
    // Use backend-provided item name if available
    const t = transaction as InternalTransferTransaction;
    if (t.itemName || t.itemName) {
      return t.itemName || t.itemName || t.itemName;
    }
    // Fallback to item lookup
    const item = items?.find(i => i.itemCode === transaction.itemCode);
    return item?.itemName || item?.itemName || 'غير متاح';
  }, [items]);

  const getFromStoreName = useCallback((transaction: TransferTransaction) => {
    // Use backend-provided store name if available
    const t = transaction as InternalTransferTransaction;
    if (t.fromStoreEnName || t.fromStoreArName) {
      return t.fromStoreEnName || t.fromStoreArName || t.fromStoreName;
    }
    // Fallback to store lookup
    const store = stores?.find(s => s.storeCode === transaction.fromStoreId);
    return store?.storeName || store?.storeName || 'غير متاح';
  }, [stores]);

  const getToStoreName = useCallback((transaction: TransferTransaction) => {
    // Use backend-provided store name if available
    const t = transaction as InternalTransferTransaction;
    if (t.toStoreEnName || t.toStoreArName) {
      return t.toStoreEnName || t.toStoreArName || t.toStoreName;
    }
    // Fallback to store lookup
    const store = stores?.find(s => s.storeCode === transaction.toStoreId);
    return store?.storeName || store?.storeName || 'غير متاح';
  }, [stores]);

  const columns = useMemo<MRT_ColumnDef<TransferTransaction>[]>(
    () => [
      {
        accessorKey: 'transferNo',
        header: 'رقم النقل',
        size: 130,
      },
      {
        accessorKey: 'transferDate',
        header: 'التاريخ',
        size: 130,
        Cell: ({ cell }) => formatDate(cell.getValue<Date>()),
      },
      {
        accessorKey: 'itemCode',
        header: 'العنصر',
        size: 200,
        Cell: ({ row }) => getItemName(row.original),
      },
      {
        accessorKey: 'quantity',
        header: 'الكمية',
        size: 110,
      },
      {
        accessorKey: 'fromStoreId',
        header: 'من المستودع',
        size: 180,
        Cell: ({ row }) => (
          <Chip
            label={getFromStoreName(row.original)}
            size="small"
            sx={{
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              fontWeight: 600,
              fontSize: '11px',
            }}
          />
        ),
      },
      {
        accessorKey: 'toStoreId',
        header: 'إلى المستودع',
        size: 180,
        Cell: ({ row }) => (
          <Chip
            label={getToStoreName(row.original)}
            size="small"
            sx={{
              backgroundColor: '#D1FAE5',
              color: '#065F46',
              fontWeight: 600,
              fontSize: '11px',
            }}
          />
        ),
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        size: 120,
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          const colors = {
            PENDING: { bg: '#FEF3C7', text: '#92400E', label: 'في الانتظار' },
            COMPLETED: { bg: '#D1FAE5', text: '#065F46', label: 'مكتمل' },
          };
          const color = colors[status as keyof typeof colors] || colors.PENDING;
          return (
            <Chip
              label={color.label || status}
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
    [getItemName, getFromStoreName, getToStoreName],
  );

  const table = useMaterialReactTable<TransferTransaction>({
    columns: columns,
    data: transferTransactions || [],
    enableRowSelection: false,
    enableColumnFilters: true,
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
      sorting: [{ id: 'transferDate', desc: true }],
    },
    localization: mrtArabicLocalization,
    ...lightTableTheme,
    muiTableContainerProps: {
      sx: {
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
          نقلة جديدة
        </Button>
        <Tooltip title={isFullscreen ? 'خروج من ملء الشاشة' : 'دخول ملء الشاشة'}>
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderRowActions: ({ row }: { row: any }) => (
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
        {row.original.status === 'PENDING' && (
          <Tooltip title="تعديل">
            <IconButton
              size="small"
              sx={{ color: '#0c2b7a' }}
              onClick={() => handleEdit(row.original)}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {row.original.status === 'PENDING' && (
          <Tooltip title="إكمال النقلة">
            <IconButton
              size="small"
              sx={{ color: '#059669' }}
              onClick={() => handleComplete(row.original)}
              disabled={completeTransfer.loading}
            >
              <CheckCircle fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="حذف">
          <IconButton
            size="small"
            sx={{ color: '#DC2626' }}
            onClick={() => handleDelete(row.original)}
          >
            <Delete fontSize="small" />
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
        transition: isFullscreen ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
              النقلات - ملء الشاشة
            </Typography>
            <Tooltip title="خروج من ملء الشاشة (ESC)">
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
            {loadingTransfers ? (
              <LoadingSpinner />
            ) : errorTransfers ? (
              <ErrorDisplay error={errorTransfers} onRetry={refetchTransfers} />
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
              تحويل المخزون
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              تحويل العناصر بين المستودعات والمشاريع المختلفة
            </Typography>
          </Box>

          {loadingTransfers ? (
            <LoadingSpinner />
          ) : errorTransfers ? (
            <ErrorDisplay error={errorTransfers} onRetry={refetchTransfers} />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* Forms */}
      <TransferForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedTransfer(null);
        }}
        onSubmit={handleSubmit}
        loading={createTransfer.loading}
        projects={projects || []}
        employees={employees || []}
        stores={stores || []}
        items={items || []}
      />

      <TransferForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTransfer(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedTransfer}
        loading={updateTransfer.loading}
        projects={projects || []}
        employees={employees || []}
        stores={stores || []}
        items={items || []}
      />

      <TransferViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedTransfer(null);
        }}
        data={selectedTransfer}
        projects={projects || []}
        employees={employees || []}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedTransfer(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف معاملة النقلة"
        message={`هل أنت متأكد من حذف معاملة النقلة #${selectedTransfer?.transactionNo}؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedTransfer ? `نقلة #${selectedTransfer.transactionNo}` : undefined}
        loading={deleteTransfer.loading}
      />
    </>
  );
}


