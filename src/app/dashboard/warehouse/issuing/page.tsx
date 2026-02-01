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
  Output,
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
import type { IssuingTransaction, StoreItemPayable } from '@/types';

interface InternalIssuingTransaction extends IssuingTransaction {
  itemName?: string;
  issuedByName?: string;
}
import IssuingForm from '@/components/forms/IssuingForm';
import IssuingViewForm from '@/components/forms/IssuingViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { warehouseApi, type GoodsIssueResponse, type GoodsIssueRequest } from '@/lib/api/warehouse';
import { projectsApi } from '@/lib/api/projects';
import { employeesApi } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

export default function IssuingPage() {
  const router = useRouter();
  const toast = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedIssuing, setSelectedIssuing] = useState<StoreItemPayable | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch data from backend
  const { data: issuesData, loading: loadingIssues, error: errorIssues, execute: refetchIssues } = useApi(
    () => warehouseApi.getAllGoodsIssues(),
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
  const createIssue = useApiWithToast(
    (request: GoodsIssueRequest) => warehouseApi.createGoodsIssue(request),
    { successMessage: 'تم إنشاء إصدار البضائع بنجاح' }
  );
  const updateIssue = useApiWithToast(
    (params: { id: number; request: GoodsIssueRequest }) => warehouseApi.updateGoodsIssue(params.id, params.request),
    { successMessage: 'تم تحديث إصدار البضائع بنجاح' }
  );
  const deleteIssue = useApiWithToast(
    (id: number) => warehouseApi.deleteGoodsIssue(id),
    { successMessage: 'تم حذف إصدار البضائع بنجاح' }
  );

  // Mapper function: Flatten issue lines to individual transactions
  const mapGoodsIssueResponseToIssuingTransactions = (issue: GoodsIssueResponse): InternalIssuingTransaction[] => {
    if (!issue.issueLines || issue.issueLines.length === 0) {
      // Return a single transaction with issue header info
      return [{
        issueNo: issue.issueId,
        issueDate: new Date(issue.issueDate),
        itemCode: 0,
        quantity: 0,
        projectCode: issue.projectCode,
        issuedBy: issue.issuedBy || 0,
        // Backend data for display
        itemName: undefined,
        issuedByName: issue.issuedByName,
      }];
    }

    // Map each issue line to a transaction row
    return issue.issueLines.map((line) => {
      return {
        issueNo: issue.issueId,
        issueDate: new Date(issue.issueDate),
        itemCode: line.itemCode,
        quantity: line.quantity,
        projectCode: issue.projectCode,
        issuedBy: issue.issuedBy || 0,
        // Backend data for display - use backend-provided names
        itemName: line.itemName || undefined,
        issuedByName: issue.issuedByName,
      } as IssuingTransaction & {
        itemName?: string;
        issuedByName?: string;
      };
    });
  };

  // Map all issues to transactions (flattened)
  const issuingTransactions = useMemo(() => {
    if (!issuesData) return [];
    return issuesData.flatMap(mapGoodsIssueResponseToIssuingTransactions);
  }, [issuesData]);

  // Protect route
  useRouteProtection(['Admin', 'Warehouse Manager', 'Project Manager']);

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
    setSelectedIssuing(null);
    setIsAddModalOpen(true);
  };

  const handleView = async (transaction: IssuingTransaction) => {
    try {
      const issue = await warehouseApi.getGoodsIssueById(transaction.issueNo);
      // Convert GoodsIssueResponse to StoreItemPayable for viewing
      const payable: StoreItemPayable = {
        transactionNo: issue.issueId,
        transactionDate: new Date(issue.issueDate),
        projectCode: issue.projectCode,
        storeCode: issue.storeCode,
        requestStatus: 'COMPLETED' as const,
        requestedBy: issue.issuedBy || 0,
      };
      setSelectedIssuing(payable);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching issue details:', error);
      toast.showError('فشل تحميل تفاصيل الإصدار');
    }
  };

  const handleEdit = async (transaction: IssuingTransaction) => {
    try {
      const issue = await warehouseApi.getGoodsIssueById(transaction.issueNo);
      console.log('[IssuingPage] handleEdit - Issue received:', issue);
      // Convert GoodsIssueResponse to StoreItemPayable for editing
      const payable: StoreItemPayable & { issueLines?: Array<{ itemCode: number; quantity: number; notes?: string }> } = {
        transactionNo: issue.issueId,
        transactionDate: new Date(issue.issueDate),
        projectCode: issue.projectCode,
        storeCode: issue.storeCode,
        requestStatus: 'COMPLETED' as const,
        requestedBy: issue.issuedBy || 0,
        // Include issue lines from backend for editing
        issueLines: issue.issueLines?.map(line => ({
          itemCode: line.itemCode,
          quantity: line.quantity,
          notes: line.notes || '',
        })) || [],
      };
      console.log('[IssuingPage] Mapped payable with issue lines:', payable);
      console.log('[IssuingPage] Issue lines count:', payable.issueLines?.length || 0);
      setSelectedIssuing(payable);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching issue details:', error);
      toast.showError('فشل تحميل تفاصيل الإصدار');
    }
  };

  const handleDelete = (transaction: IssuingTransaction) => {
    // Convert IssuingTransaction to StoreItemPayable for deletion
    const payable: StoreItemPayable = {
      transactionNo: transaction.issueNo,
      transactionDate: transaction.issueDate,
      projectCode: transaction.projectCode || 0,
      storeCode: 0,
      requestStatus: 'COMPLETED' as const,
      requestedBy: transaction.issuedBy,
    };
    setSelectedIssuing(payable);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (data: Partial<StoreItemPayable> & { issueLines?: Array<{ itemCode: number; quantity: number; notes?: string }> }) => {
    try {
      // Map form data to GoodsIssueRequest
      if (!data.storeCode || !data.projectCode) {
        toast.showError('المستودع والمشروع مطلوبان');
        return;
      }

      if (!data.issueLines || data.issueLines.length === 0) {
        toast.showError('عنصر واحد على الأقل مطلوب');
        return;
      }

      const request = {
        storeCode: data.storeCode,
        projectCode: data.projectCode,
        issueDate: data.transactionDate ? new Date(data.transactionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        issuedTo: undefined,
        purpose: undefined,
        notes: undefined,
        issueLines: data.issueLines.map(line => ({
          itemCode: line.itemCode,
          quantity: line.quantity,
          notes: line.notes,
        })),
      };

      if (selectedIssuing && selectedIssuing.transactionNo) {
        // Edit mode
        await updateIssue.execute({ id: selectedIssuing.transactionNo, request });
        setIsEditModalOpen(false);
      } else {
        // Add mode
        await createIssue.execute(request);
        setIsAddModalOpen(false);
      }
      setSelectedIssuing(null);
      await refetchIssues();
    } catch (error) {
      console.error('Error saving goods issue:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedIssuing) return;
    try {
      await deleteIssue.execute(selectedIssuing.transactionNo);
      setIsDeleteModalOpen(false);
      setSelectedIssuing(null);
      await refetchIssues();
    } catch (error) {
      console.error('Error deleting goods issue:', error);
    }
  };

  const getItemName = useCallback((transaction: IssuingTransaction) => {
    // Use backend-provided item name if available
    const t = transaction as InternalIssuingTransaction;
    if (t.itemName || t.itemName) {
      return t.itemName || t.itemName || t.itemName;
    }
    // Fallback to item lookup
    const item = items?.find(i => i.itemCode === transaction.itemCode);
    return item?.itemName || item?.itemName || 'غير متاح';
  }, [items]);

  const getIssuedByName = useCallback((transaction: IssuingTransaction) => {
    // Use backend-provided name if available
    const t = transaction as InternalIssuingTransaction;
    if (t.issuedByName) {
      return t.issuedByName;
    }
    // Fallback to employee lookup
    if (transaction.issuedBy) {
      const employee = employees?.find(e => e.employeeNo === transaction.issuedBy);
      return employee?.employeeName || employee?.employeeName || transaction.issuedBy.toString();
    }
    return 'غير متاح';
  }, [employees]);

  const getProjectName = useCallback((projectCode: number | null) => {
    if (!projectCode) return 'عام';
    const project = projects?.find(p => p.projectCode === projectCode);
    return project?.projectName || project?.projectName || 'عام';
  }, [projects]);

  const columns = useMemo<MRT_ColumnDef<IssuingTransaction>[]>(
    () => [
      {
        accessorKey: 'issueNo',
        header: 'رقم الإصدار',
        size: 130,
      },
      {
        accessorKey: 'issueDate',
        header: 'التاريخ',
        size: 130,
        Cell: ({ cell }) => new Date(cell.getValue<Date>()).toLocaleDateString('en-GB'),
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
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#DC2626' }}>
            -{cell.getValue<number>()}
          </Typography>
        ),
      },
      {
        accessorKey: 'projectCode',
        header: 'صُدر إلى',
        size: 180,
        Cell: ({ cell }) => {
          const projectCode = cell.getValue<number | null>();
          return projectCode ? getProjectName(projectCode) : 'عام';
        },
      },
      {
        accessorKey: 'issuedBy',
        header: 'صُدر بواسطة',
        size: 150,
        Cell: ({ row }) => getIssuedByName(row.original),
      },
    ],
    [getItemName, getIssuedByName, getProjectName],
  );

  const table = useMaterialReactTable<IssuingTransaction>({
    columns: columns,
    data: issuingTransactions || [],
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
      sorting: [{ id: 'issueDate', desc: true }],
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
          إصدار عناصر
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
              إصدار البضائع - ملء الشاشة
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
            {loadingIssues ? (
              <LoadingSpinner />
            ) : errorIssues ? (
              <ErrorDisplay message={errorIssues} onRetry={refetchIssues} />
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
              إصدار البضائع
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              إصدار العناصر من المستودع للمشاريع والأقسام
            </Typography>
          </Box>

          {loadingIssues ? (
            <LoadingSpinner />
          ) : errorIssues ? (
            <ErrorDisplay message={errorIssues} onRetry={refetchIssues} />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* Forms */}
      <IssuingForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedIssuing(null);
        }}
        onSubmit={handleSubmit}
        loading={createIssue.loading}
        projects={projects || []}
        employees={employees || []}
        stores={stores || []}
        items={items || []}
      />

      <IssuingForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedIssuing(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedIssuing}
        loading={updateIssue.loading}
        projects={projects || []}
        employees={employees || []}
        stores={stores || []}
        items={items || []}
      />

      <IssuingViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedIssuing(null);
        }}
        data={selectedIssuing}
        projects={projects || []}
        employees={employees || []}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedIssuing(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف معاملة الإصدار"
        message={`هل أنت متأكد من حذف معاملة الإصدار #${selectedIssuing?.transactionNo}؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedIssuing ? `إصدار #${selectedIssuing.transactionNo}` : undefined}
        loading={deleteIssue.loading}
      />
    </>
  );
}


