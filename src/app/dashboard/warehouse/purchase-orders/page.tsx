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
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Visibility,
  ShoppingCart,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  useMaterialReactTable,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import type { ItemPO as PurchaseOrder } from '@/types';
import PurchaseOrderForm from '@/components/forms/PurchaseOrderForm';
import PurchaseOrderViewForm from '@/components/forms/PurchaseOrderViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { warehouseApi, type PurchaseOrderResponse, type PurchaseOrderRequest } from '@/lib/api/warehouse';
import { projectsApi } from '@/lib/api/projects';
import { employeesApi } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

import { formatDate } from '@/lib/utils/dateFormatter';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const toast = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');

  // Fetch data from backend
  const { data: purchaseOrdersData, loading: loadingPOs, error: errorPOs, execute: refetchPOs } = useApi(
    () => warehouseApi.getAllPurchaseOrders(),
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

  // CRUD operations with toast
  const createPO = useApiWithToast(
    (request: PurchaseOrderRequest) => warehouseApi.createPurchaseOrder(request),
    { successMessage: 'تم إنشاء أمر الشراء بنجاح' }
  );
  const updatePO = useApiWithToast(
    (id: number | string, request: PurchaseOrderRequest) => warehouseApi.updatePurchaseOrder(Number(id), request),
    { successMessage: 'تم تحديث أمر الشراء بنجاح' }
  );
  const deletePO = useApiWithToast(
    (id: number | string) => warehouseApi.deletePurchaseOrder(Number(id)),
    { successMessage: 'تم حذف أمر الشراء بنجاح' }
  );
  const approvePO = useApiWithToast(
    (id: number | string, request: { notes?: string }) => warehouseApi.approvePurchaseOrder(Number(id), request),
    { successMessage: 'تم اعتماد أمر الشراء بنجاح' }
  );
  const rejectPO = useApiWithToast(
    (id: number | string, request: { notes: string }) => warehouseApi.rejectPurchaseOrder(Number(id), request),
    { successMessage: 'تم رفض أمر الشراء' }
  );
  const submitPO = useApiWithToast(
    (id: number | string) => warehouseApi.submitPurchaseOrderForApproval(Number(id)),
    { successMessage: 'تم إرسال أمر الشراء للموافقة' }
  );

  // Mapper functions
  const mapStatusToFrontend = (backendStatus: string): 'NEW' | 'INPROCESS' | 'COMPLETED' | 'REJECTED' => {
    switch (backendStatus) {
      case 'DRAFT':
        return 'NEW';
      case 'PENDING_APPROVAL':
        return 'INPROCESS';
      case 'APPROVED':
        return 'COMPLETED';
      case 'REJECTED':
        return 'REJECTED';
      default:
        return 'NEW';
    }
  };

  const mapPurchaseOrderResponseToItemPO = useCallback((po: PurchaseOrderResponse): PurchaseOrder => {
    return {
      transactionNo: po.poId,
      transactionDate: new Date(po.poDate),
      storeCode: po.storeCode,
      requestStatus: mapStatusToFrontend(po.poStatus),
      supplierName: po.supplierName,
      poAmount: po.totalAmount || 0,
      requestedBy: po.requestedBy || 0,
      // Additional backend fields
      poId: po.poId,
      poNumber: po.poNumber,
      storeName: po.storeName,
      projectCode: po.projectCode,
      projectName: po.projectName,
      poStatus: po.poStatus,
      requestedByName: po.requestedByName,
      approvalNotes: po.approvalNotes,
      orderLines: po.orderLines,
      // Map expectedDeliveryDate if it exists
      expectedDeliveryDate: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : undefined,
    } as PurchaseOrder;
  }, []);

  // Map purchase orders data
  const purchaseOrders = useMemo(() => {
    if (!purchaseOrdersData) return [];
    return purchaseOrdersData.map(mapPurchaseOrderResponseToItemPO);
  }, [purchaseOrdersData, mapPurchaseOrderResponseToItemPO]);

  // Protect route
  useRouteProtection(['Admin', 'Warehouse Manager', 'Finance Manager']);

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
    setSelectedPO(null);
    setIsAddModalOpen(true);
  };

  const handleView = async (po: PurchaseOrder) => {
    try {
      const fullPO = await warehouseApi.getPurchaseOrderById(po.poId || po.transactionNo);
      setSelectedPO(mapPurchaseOrderResponseToItemPO(fullPO));
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching purchase order details:', error);
      toast.showError('فشل تحميل تفاصيل أمر الشراء');
    }
  };

  const handleEdit = async (po: PurchaseOrder) => {
    console.log('[PurchaseOrdersPage] handleEdit called with PO:', {
      poId: po.poId,
      transactionNo: po.transactionNo,
      poStatus: po.poStatus,
      requestStatus: po.requestStatus,
      fullPO: po
    });

    // Check both poStatus (backend) and requestStatus (mapped) for compatibility
    const status = po.poStatus || (po.requestStatus === 'NEW' ? 'DRAFT' : null);
    console.log('[PurchaseOrdersPage] Resolved status:', status);

    // Only allow editing if status is DRAFT
    if (status !== 'DRAFT') {
      console.warn('[PurchaseOrdersPage] Edit blocked - status is not DRAFT:', status);
      toast.showWarning(`يمكن تعديل أوامر الشراء في حالة المسودة فقط. الحالة الحالية: ${status || po.requestStatus || 'غير معروف'}`);
      return;
    }
    try {
      console.log('[PurchaseOrdersPage] Fetching full PO details for ID:', po.poId || po.transactionNo);
      const fullPO = await warehouseApi.getPurchaseOrderById(po.poId || po.transactionNo);
      console.log('[PurchaseOrdersPage] Full PO received:', fullPO);
      const mappedPO = mapPurchaseOrderResponseToItemPO(fullPO);
      console.log('[PurchaseOrdersPage] Mapped PO:', mappedPO);
      setSelectedPO(mappedPO);
      setIsEditModalOpen(true);
      console.log('[PurchaseOrdersPage] Edit modal opened');
    } catch (error) {
      console.error('[PurchaseOrdersPage] Error fetching purchase order details:', error);
      toast.showError('فشل تحميل تفاصيل أمر الشراء');
    }
  };

  const handleDelete = (po: PurchaseOrder) => {
    // Check both poStatus (backend) and requestStatus (mapped) for compatibility
    const status = po.poStatus || (po.requestStatus === 'NEW' ? 'DRAFT' : po.requestStatus === 'REJECTED' ? 'REJECTED' : null);

    // Only allow deletion of DRAFT or REJECTED purchase orders
    // Use poStatus from backend if available for more accuracy
    if (status !== 'DRAFT' && status !== 'REJECTED' && po.requestStatus !== 'REJECTED') {
      toast.showWarning('يمكن حذف أوامر الشراء في حالة المسودة أو المرفوضة فقط');
      return;
    }

    setSelectedPO(po);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (data: Partial<PurchaseOrder>) => {
    console.log('[PurchaseOrdersPage] handleSubmit called with data:', data);
    console.log('[PurchaseOrdersPage] selectedPO:', selectedPO);

    try {
      // Map form data to backend request
      const request: PurchaseOrderRequest = {
        storeCode: data.storeCode || 0,
        poDate: data.transactionDate ? new Date(data.transactionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate).toISOString().split('T')[0] : undefined,
        supplierName: data.supplierName || '',
        orderLines: (data.orderLines || []).map((line) => ({
          itemCode: line.itemCode,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          notes: line.notes,
        })),
        approvalNotes: data.approvalNotes,
      };

      console.log('[PurchaseOrdersPage] Mapped request:', request);
      console.log('[PurchaseOrdersPage] Is edit mode?', !!(selectedPO && selectedPO.poId));

      if (selectedPO && selectedPO.poId) {
        // Edit mode
        console.log('[PurchaseOrdersPage] Updating PO with ID:', selectedPO.poId);
        await updatePO.execute(selectedPO.poId, request);
        console.log('[PurchaseOrdersPage] Update successful');
        setIsEditModalOpen(false);
      } else {
        // Add mode
        console.log('[PurchaseOrdersPage] Creating new PO');
        await createPO.execute(request);
        console.log('[PurchaseOrdersPage] Create successful');
        setIsAddModalOpen(false);
      }
      setSelectedPO(null);
      await refetchPOs();
    } catch (error) {
      console.error('[PurchaseOrdersPage] Error saving purchase order:', error);
      throw error; // Re-throw so form can handle it
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPO) return;
    try {
      const poId = selectedPO.poId || selectedPO.transactionNo;
      await deletePO.execute(poId);
      setIsDeleteModalOpen(false);
      setSelectedPO(null);
      await refetchPOs();
    } catch (error) {
      console.error('Error deleting purchase order:', error);
    }
  };

  const handleApprove = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setApprovalNotes('');
    setIsApproveModalOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedPO) return;
    try {
      const poId = selectedPO.poId || selectedPO.transactionNo;
      await approvePO.execute(poId, { notes: approvalNotes || undefined });
      setIsApproveModalOpen(false);
      setSelectedPO(null);
      setApprovalNotes('');
      await refetchPOs();
    } catch (error) {
      console.error('Error approving purchase order:', error);
    }
  };

  const handleReject = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setApprovalNotes('');
    setIsRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedPO) return;
    if (!approvalNotes.trim()) {
      toast.showWarning('يرجى تقديم سبب الرفض');
      return;
    }
    try {
      const poId = selectedPO.poId || selectedPO.transactionNo;
      await rejectPO.execute(poId, { notes: approvalNotes });
      setIsRejectModalOpen(false);
      setSelectedPO(null);
      setApprovalNotes('');
      await refetchPOs();
    } catch (error) {
      console.error('Error rejecting purchase order:', error);
    }
  };

  const handleSubmitForApproval = async (po: PurchaseOrder) => {
    try {
      const poId = po.poId || po.transactionNo;
      await submitPO.execute(poId);
      await refetchPOs();
    } catch (error) {
      console.error('Error submitting purchase order for approval:', error);
    }
  };

  const columns: MRT_ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: 'poNumber',
      header: 'رقم أمر الشراء',
      size: 130,
      Cell: ({ row }) => {
        const poNumber = row.original.poNumber;
        return poNumber ? `#${poNumber}` : `#${row.original.transactionNo}`;
      },
    },
    {
      accessorKey: 'transactionDate',
      header: 'تاريخ الطلب',
      size: 130,
      Cell: ({ cell }) => formatDate(cell.getValue<Date>()),
    },
    {
      accessorKey: 'storeName',
      header: 'المستودع',
      size: 180,
      Cell: ({ row }) => {
        const store = row.original.storeName || row.original.storeName || `المستودع #${row.original.storeCode}`;
        return store;
      },
    },
    {
      accessorKey: 'projectName',
      header: 'المشروع',
      size: 180,
      Cell: ({ row }) => {
        const project = row.original.projectName || row.original.projectName;
        return project || 'غير متاح';
      },
    },
    {
      accessorKey: 'supplierName',
      header: 'المورد',
      size: 200,
    },
    {
      accessorKey: 'poAmount',
      header: 'المبلغ الإجمالي',
      size: 140,
      Cell: ({ cell }) => {
        const amount = cell.getValue<number>();
        return (
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0c2b7a' }}>
            ر.س {amount ? amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </Typography>
        );
      },
    },
    {
      accessorKey: 'poStatus',
      header: 'الحالة',
      size: 150,
      Cell: ({ row }) => {
        const status = row.original.poStatus || row.original.requestStatus;
        const colors = {
          DRAFT: { bg: '#F3F4F6', text: '#6B7280', label: 'مسودة' },
          PENDING_APPROVAL: { bg: '#FEF3C7', text: '#92400E', label: 'في انتظار الموافقة' },
          APPROVED: { bg: '#D1FAE5', text: '#065F46', label: 'موافق عليه' },
          REJECTED: { bg: '#FEE2E2', text: '#991B1B', label: 'مرفوض' },
        };
        const color = colors[status as keyof typeof colors] || colors.DRAFT;
        return (
          <Chip
            label={color.label}
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
      accessorKey: 'requestedByName',
      header: 'طلب بواسطة',
      size: 150,
      Cell: ({ row }) => {
        const name = row.original.requestedByName;
        const id = row.original.requestedBy;
        return name || (id ? `الموظف #${id}` : 'غير متاح');
      },
    },
  ];

  const table = useMaterialReactTable<PurchaseOrder>({
    columns,
    data: purchaseOrders || [],
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
      sorting: [{ id: 'transactionDate', desc: true }],
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
          أمر شراء جديد
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
    renderRowActions: ({ row }: { row: MRT_Row<PurchaseOrder> }) => (
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
        <Tooltip title={row.original.poStatus === 'DRAFT' ? "تعديل" : "يمكن تعديل أوامر الشراء في حالة المسودة فقط"}>
          <span>
            <IconButton
              size="small"
              sx={{ color: row.original.poStatus === 'DRAFT' ? '#059669' : '#9CA3AF' }}
              onClick={() => handleEdit(row.original)}
              disabled={row.original.poStatus !== 'DRAFT'}
            >
              <Edit fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {row.original.poStatus === 'DRAFT' && (
          <Tooltip title="إرسال للموافقة">
            <IconButton
              size="small"
              sx={{ color: '#059669' }}
              onClick={() => handleSubmitForApproval(row.original)}
              disabled={submitPO.loading}
            >
              <CheckCircle fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {row.original.poStatus === 'PENDING_APPROVAL' && (
          <>
            <Tooltip title="موافقة">
              <IconButton
                size="small"
                sx={{ color: '#059669' }}
                onClick={() => handleApprove(row.original)}
                disabled={approvePO.loading}
              >
                <CheckCircle fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="رفض">
              <IconButton
                size="small"
                sx={{ color: '#DC2626' }}
                onClick={() => handleReject(row.original)}
                disabled={rejectPO.loading}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title={
          row.original.poStatus === 'DRAFT' || row.original.poStatus === 'REJECTED'
            ? "حذف"
            : "يمكن حذف أوامر الشراء في حالة المسودة أو المرفوضة فقط"
        }>
          <span>
            <IconButton
              size="small"
              sx={{
                color: (row.original.poStatus === 'DRAFT' || row.original.poStatus === 'REJECTED')
                  ? '#DC2626'
                  : '#9CA3AF'
              }}
              onClick={() => handleDelete(row.original)}
              disabled={row.original.poStatus !== 'DRAFT'}
            >
              <Delete fontSize="small" />
            </IconButton>
          </span>
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
              أوامر الشراء - ملء الشاشة
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
            {loadingPOs ? (
              <LoadingSpinner />
            ) : errorPOs ? (
              <ErrorDisplay message={errorPOs} onRetry={refetchPOs} />
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
              أوامر الشراء
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              إدارة واعتماد طلبات شراء الأصناف للمستودعات
            </Typography>
          </Box>

          {loadingPOs ? (
            <LoadingSpinner />
          ) : errorPOs ? (
            <ErrorDisplay message={errorPOs} onRetry={refetchPOs} />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* Forms */}
      <PurchaseOrderForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedPO(null);
        }}
        onSubmit={handleSubmit}
        loading={createPO.loading}
        stores={stores || []}
      />

      <PurchaseOrderForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPO(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedPO}
        loading={updatePO.loading}
        stores={stores || []}
      />

      <PurchaseOrderViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedPO(null);
        }}
        data={selectedPO}
        projects={projects || []}
        employees={employees || []}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedPO(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف أمر الشراء"
        message={`هل أنت متأكد من حذف أمر الشراء #${selectedPO?.transactionNo}؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedPO ? `أمر الشراء #${selectedPO.transactionNo}` : undefined}
        loading={deletePO.loading}
      />

      {/* Approval Dialog */}
      <Dialog open={isApproveModalOpen} onClose={() => setIsApproveModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>موافقة على أمر الشراء</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            هل أنت متأكد من الموافقة على أمر الشراء #{selectedPO?.transactionNo}؟
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="ملاحظات الموافقة (اختياري)"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsApproveModalOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleApproveConfirm}
            variant="contained"
            color="success"
            disabled={approvePO.loading}
          >
            {approvePO.loading ? 'جارٍ الاعتماد...' : 'موافقة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>رفض أمر الشراء</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            هل أنت متأكد من رفض أمر الشراء #{selectedPO?.transactionNo}؟
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="سبب الرفض *"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            required
            error={!approvalNotes.trim()}
            helperText={!approvalNotes.trim() ? 'سبب الرفض مطلوب' : ''}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRejectModalOpen(false)}>إلغاء</Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            color="error"
            disabled={rejectPO.loading || !approvalNotes.trim()}
          >
            {rejectPO.loading ? 'جارٍ الرفض...' : 'رفض'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}


