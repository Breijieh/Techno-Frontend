'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  LocalShipping,
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
import type { ReceivingTransaction, StoreItemReceivable } from '@/types';

interface InternalReceivingTransaction extends ReceivingTransaction {
  itemName?: string;
  storeName?: string;
  receivedByName?: string;
  projectCode?: number;
  projectName?: string;
  receiptNumber?: string;
  receiptType?: string;
  purchaseOrderId?: number;
  purchaseOrderNumber?: string;
}
import ReceivingForm from '@/components/forms/ReceivingForm';
import ReceivingViewForm from '@/components/forms/ReceivingViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { warehouseApi, type GoodsReceiptResponse, type GoodsReceiptRequest } from '@/lib/api/warehouse';
import { projectsApi } from '@/lib/api/projects';
import { employeesApi } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

import { formatDate } from '@/lib/utils/dateFormatter';

export default function ReceivingPage() {
  const router = useRouter();
  const toast = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedReceiving, setSelectedReceiving] = useState<StoreItemReceivable | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch data from backend
  const { data: receiptsData, loading: loadingReceipts, error: errorReceipts, execute: refetchReceipts } = useApi(
    () => warehouseApi.getAllGoodsReceipts(),
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
  const createReceipt = useApiWithToast(
    (request: GoodsReceiptRequest) => warehouseApi.createGoodsReceipt(request),
    { successMessage: 'تم إنشاء إيصال الاستلام بنجاح' }
  );
  const updateReceipt = useApiWithToast(
    (params: { id: number; request: GoodsReceiptRequest }) => warehouseApi.updateGoodsReceipt(params.id, params.request),
    { successMessage: 'تم تحديث إيصال الاستلام بنجاح' }
  );
  const deleteReceipt = useApiWithToast(
    (id: number) => warehouseApi.deleteGoodsReceipt(id),
    { successMessage: 'تم حذف إيصال الاستلام بنجاح' }
  );

  // Mapper function: Flatten receipt lines to individual transactions
  const mapGoodsReceiptResponseToReceivingTransactions = useCallback((receipt: GoodsReceiptResponse): InternalReceivingTransaction[] => {
    if (!receipt.receiptLines || receipt.receiptLines.length === 0) {
      // Return a single transaction with receipt header info (no lines case)
      return [{
        receiptNo: receipt.receiptId,
        receiptDate: new Date(receipt.receiptDate),
        itemCode: 0,
        quantity: 0,
        unitPrice: 0,
        totalAmount: 0,
        storeId: receipt.storeCode,
        receivedBy: receipt.receivedBy || 0,
        // Backend data for display
        itemName: undefined,
        storeName: receipt.storeName || undefined,
        receivedByName: receipt.receivedByName,
        projectCode: receipt.projectCode,
        projectName: receipt.projectName,
        receiptNumber: receipt.receiptNumber,
        receiptType: receipt.receiptType,
        purchaseOrderId: receipt.purchaseOrderId,
        purchaseOrderNumber: receipt.purchaseOrderNumber,
      }];
    }

    // Map each receipt line to a transaction row
    return receipt.receiptLines.map((line) => {
      return {
        receiptNo: receipt.receiptId,
        receiptDate: new Date(receipt.receiptDate),
        itemCode: line.itemCode,
        quantity: line.quantity,
        unitPrice: 0, // Not displayed - kept for type compatibility
        totalAmount: 0, // Not displayed - kept for type compatibility
        storeId: receipt.storeCode,
        receivedBy: receipt.receivedBy || 0,
        // Backend data for display - use backend-provided names
        itemName: line.itemName || undefined,
        storeName: receipt.storeName || undefined,
        receivedByName: receipt.receivedByName,
        projectCode: receipt.projectCode,
        projectName: receipt.projectName,
        receiptNumber: receipt.receiptNumber,
        receiptType: receipt.receiptType,
        purchaseOrderId: receipt.purchaseOrderId,
        purchaseOrderNumber: receipt.purchaseOrderNumber,
        lineId: line.lineId,
        lineNotes: line.notes,
      } as ReceivingTransaction;
    });
  }, []);

  // Map all receipts to transactions (flattened)
  const receivingTransactions = useMemo(() => {
    if (!receiptsData) return [];
    return receiptsData.flatMap(mapGoodsReceiptResponseToReceivingTransactions);
  }, [receiptsData, mapGoodsReceiptResponseToReceivingTransactions]);

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
    setSelectedReceiving(null);
    setIsAddModalOpen(true);
  };

  const handleView = async (transaction: ReceivingTransaction) => {
    try {
      const receipt = await warehouseApi.getGoodsReceiptById(transaction.receiptNo);
      // Convert GoodsReceiptResponse to StoreItemReceivable for viewing
      const receivable: StoreItemReceivable & { receiptLines?: Array<{ itemCode: number; quantity: number; notes?: string }> } = {
        transactionNo: receipt.receiptId,
        transactionDate: new Date(receipt.receiptDate),
        projectCode: receipt.projectCode || 0,
        storeCode: receipt.storeCode,
        requestStatus: 'COMPLETED' as const,
        supplierName: '',
        supplyDate: undefined,
        supplierInvoiceAttachment: undefined,
        itemsPOTransactionNo: receipt.purchaseOrderId,
        requestedBy: receipt.receivedBy || 0,
        // Include receipt lines from backend
        receiptLines: receipt.receiptLines?.map(line => ({
          itemCode: line.itemCode,
          quantity: line.quantity,
          notes: line.notes,
        })) || [],
      };
      setSelectedReceiving(receivable);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching receipt details:', error);
      toast.showError('فشل تحميل تفاصيل الاستلام');
    }
  };

  const handleEdit = async (transaction: ReceivingTransaction) => {
    console.log('[ReceivingPage] handleEdit called with transaction:', transaction);
    try {
      console.log('[ReceivingPage] Fetching receipt details for ID:', transaction.receiptNo);
      const receipt = await warehouseApi.getGoodsReceiptById(transaction.receiptNo);
      console.log('[ReceivingPage] Receipt received:', receipt);

      // Convert GoodsReceiptResponse to StoreItemReceivable for editing
      const receivable: StoreItemReceivable & { receiptLines?: Array<{ itemCode: number; quantity: number; notes?: string }> } = {
        transactionNo: receipt.receiptId,
        transactionDate: new Date(receipt.receiptDate),
        projectCode: receipt.projectCode || 0,
        storeCode: receipt.storeCode,
        requestStatus: 'COMPLETED' as const,
        supplierName: '',
        supplyDate: undefined,
        supplierInvoiceAttachment: undefined,
        itemsPOTransactionNo: receipt.purchaseOrderId,
        requestedBy: receipt.receivedBy || 0,
        // Include receipt lines from backend for editing
        receiptLines: receipt.receiptLines?.map(line => ({
          itemCode: line.itemCode,
          quantity: line.quantity,
          notes: line.notes || '',
        })) || [],
      };
      console.log('[ReceivingPage] Mapped receivable:', receivable);
      console.log('[ReceivingPage] Receipt lines count:', receivable.receiptLines?.length || 0);
      setSelectedReceiving(receivable);
      setIsEditModalOpen(true);
      console.log('[ReceivingPage] Edit modal opened');
    } catch (error) {
      console.error('[ReceivingPage] Error fetching receipt details:', error);
      toast.showError('فشل تحميل تفاصيل الاستلام');
    }
  };

  const handleDelete = (transaction: ReceivingTransaction) => {
    // Convert ReceivingTransaction to StoreItemReceivable for deletion
    const receivable: StoreItemReceivable = {
      transactionNo: transaction.receiptNo,
      transactionDate: transaction.receiptDate,
      projectCode: 0,
      storeCode: transaction.storeId,
      requestStatus: 'COMPLETED' as const,
      supplierName: '',
      supplyDate: undefined,
      supplierInvoiceAttachment: undefined,
      itemsPOTransactionNo: undefined,
      requestedBy: transaction.receivedBy,
    };
    setSelectedReceiving(receivable);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (data: Partial<StoreItemReceivable> & { receiptLines?: Array<{ itemCode: number; quantity: number; notes?: string }> }) => {
    console.log('[ReceivingPage] handleSubmit called with data:', data);
    console.log('[ReceivingPage] selectedReceiving:', selectedReceiving);

    try {
      // Map form data to GoodsReceiptRequest
      let receiptLines: Array<{ itemCode: number; quantity: number; notes?: string }> = [];

      // If receiptLines are provided from form, use them (for both create and edit)
      if (data.receiptLines && data.receiptLines.length > 0) {
        receiptLines = data.receiptLines;
        console.log('[ReceivingPage] Using receipt lines from form:', receiptLines);
      }
      // If PO is provided and no receipt lines, fetch PO and create receipt lines from PO (only for new receipts)
      else if (data.itemsPOTransactionNo && !selectedReceiving) {
        try {
          console.log('[ReceivingPage] Fetching PO details for ID:', data.itemsPOTransactionNo);
          const po = await warehouseApi.getPurchaseOrderById(data.itemsPOTransactionNo);
          receiptLines = po.orderLines.map(line => ({
            itemCode: line.itemCode,
            quantity: line.quantity,
            notes: line.notes || '',
          }));
          console.log('[ReceivingPage] Created receipt lines from PO:', receiptLines);
        } catch (error) {
          console.error('[ReceivingPage] Error fetching PO details:', error);
          toast.showError('فشل جلب تفاصيل أمر الشراء');
          return;
        }
      } else {
        // No items and no PO - show error
        toast.showError('يرجى إضافة عنصر واحد على الأقل أو الربط بأمر شراء');
        return;
      }

      const request = {
        storeCode: data.storeCode || 0,
        receiptDate: data.transactionDate ? new Date(data.transactionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        receiptType: (data.itemsPOTransactionNo && data.itemsPOTransactionNo > 0) ? 'PO' as const : 'MANUAL' as const,
        purchaseOrderId: (data.itemsPOTransactionNo && data.itemsPOTransactionNo > 0) ? data.itemsPOTransactionNo : undefined,
        notes: undefined,
        receiptLines,
      };

      console.log('[ReceivingPage] Final request with purchaseOrderId:', request.purchaseOrderId);

      console.log('[ReceivingPage] Mapped request:', request);
      console.log('[ReceivingPage] Is edit mode?', !!(selectedReceiving && selectedReceiving.transactionNo));

      if (selectedReceiving && selectedReceiving.transactionNo) {
        // Edit mode
        console.log('[ReceivingPage] Updating receipt with ID:', selectedReceiving.transactionNo);
        await updateReceipt.execute({ id: selectedReceiving.transactionNo, request });
        console.log('[ReceivingPage] Update successful');
        setIsEditModalOpen(false);
      } else {
        // Add mode
        console.log('[ReceivingPage] Creating new receipt');
        await createReceipt.execute(request);
        console.log('[ReceivingPage] Create successful');
        setIsAddModalOpen(false);
      }
      setSelectedReceiving(null);
      await refetchReceipts();
    } catch (error) {
      console.error('[ReceivingPage] Error saving goods receipt:', error);
      throw error; // Re-throw so form can handle it
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReceiving) return;
    try {
      await deleteReceipt.execute(selectedReceiving.transactionNo);
      setIsDeleteModalOpen(false);
      setSelectedReceiving(null);
      await refetchReceipts();
    } catch (error) {
      console.error('Error deleting goods receipt:', error);
    }
  };

  const getItemName = useCallback((transaction: ReceivingTransaction) => {
    // Use backend-provided item name if available
    const t = transaction as InternalReceivingTransaction;
    if (t.itemName || t.itemName) {
      return t.itemName || t.itemName || 'غير متاح';
    }
    // Fallback to lookup if backend didn't provide it
    if (transaction.itemCode) {
      const item = items?.find(i => i.itemCode === transaction.itemCode);
      return item?.itemName || item?.itemName || 'غير متاح';
    }
    return 'غير متاح';
  }, [items]);

  const getStoreName = useCallback((transaction: ReceivingTransaction) => {
    // Use backend-provided store name if available
    const t = transaction as InternalReceivingTransaction;
    if (t.storeName || t.storeName) {
      return t.storeName || t.storeName || 'غير متاح';
    }
    // Fallback to lookup if backend didn't provide it
    const store = stores?.find(s => s.storeCode === transaction.storeId);
    return store?.storeName || store?.storeName || 'غير متاح';
  }, [stores]);

  const getReceivedByName = useCallback((transaction: ReceivingTransaction) => {
    // Use backend-provided name if available
    const t = transaction as InternalReceivingTransaction;
    if (t.receivedByName) {
      return t.receivedByName;
    }
    // Fallback to employee lookup
    if (transaction.receivedBy) {
      const employee = employees?.find(e => e.employeeNo === transaction.receivedBy);
      return employee?.employeeName || employee?.employeeName || transaction.receivedBy.toString();
    }
    return 'غير متاح';
  }, [employees]);

  const columns = useMemo<MRT_ColumnDef<ReceivingTransaction>[]>(
    () => [
      {
        accessorKey: 'receiptNo',
        header: 'رقم الإيصال',
        size: 130,
      },
      {
        accessorKey: 'receiptDate',
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
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
            +{cell.getValue<number>()}
          </Typography>
        ),
      },
      {
        accessorKey: 'storeId',
        header: 'المستودع',
        size: 150,
        Cell: ({ row }) => getStoreName(row.original),
      },
      {
        accessorKey: 'receivedBy',
        header: 'تم الاستلام بواسطة',
        size: 150,
        Cell: ({ row }) => getReceivedByName(row.original),
      },
    ],
    [getItemName, getStoreName, getReceivedByName],
  );

  const table = useMaterialReactTable<ReceivingTransaction>({
    columns: columns,
    data: receivingTransactions || [],
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
    localization: mrtArabicLocalization,
    ...lightTableTheme,
    initialState: {
      ...lightTableTheme.initialState,
      density: 'comfortable',
      pagination: { pageSize: 25, pageIndex: 0 },
      sorting: [{ id: 'receiptDate', desc: true }],
    },
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
          إيصال جديد
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
        <Tooltip title="تعديل">
          <IconButton
            size="small"
            sx={{ color: '#0c2b7a' }}
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
              استلام البضائع - ملء الشاشة
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
              padding: '24px',
              overflow: 'auto',
              backgroundColor: '#F8F9FC',
            }}
          >
            {loadingReceipts ? (
              <LoadingSpinner />
            ) : errorReceipts ? (
              <ErrorDisplay message={errorReceipts} onRetry={refetchReceipts} />
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
              استلام البضائع
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              تسجيل المخزون الوارد من الموردين وتحديث المخزون
            </Typography>
          </Box>

          {loadingReceipts ? (
            <LoadingSpinner />
          ) : errorReceipts ? (
            <ErrorDisplay message={errorReceipts} onRetry={refetchReceipts} />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* Forms */}
      <ReceivingForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedReceiving(null);
        }}
        onSubmit={handleSubmit}
        loading={createReceipt.loading}
        projects={projects || []}
        employees={employees || []}
        stores={stores || []}
        items={items || []}
      />

      <ReceivingForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedReceiving(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedReceiving}
        loading={updateReceipt.loading}
        projects={projects || []}
        employees={employees || []}
        stores={stores || []}
        items={items || []}
      />

      <ReceivingViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedReceiving(null);
        }}
        data={selectedReceiving}
        projects={projects || []}
        employees={employees || []}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedReceiving(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف معاملة الاستلام"
        message={`هل أنت متأكد من حذف معاملة الاستلام #${selectedReceiving?.transactionNo}؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedReceiving ? `إيصال #${selectedReceiving.transactionNo}` : undefined}
        loading={deleteReceipt.loading}
      />
    </>
  );
}


