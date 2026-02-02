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
  Visibility,
  Category,
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
import type { TransactionType } from '@/types';
import TransactionTypeForm from '@/components/forms/TransactionTypeForm';
import TransactionTypeViewForm from '@/components/forms/TransactionTypeViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { transactionTypesApi, mapBackendToFrontend, mapFrontendToBackend } from '@/lib/api/transactionTypes';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

export default function TransactionTypesPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedType, setSelectedType] = useState<TransactionType | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch transaction types from backend
  const { data: transactionTypesData, loading: loadingTypes, error: typesError, execute: fetchTransactionTypes } = useApi(
    () => transactionTypesApi.getAllTransactionTypes(),
    { immediate: true }
  );

  // Map backend data to frontend format
  const transactionTypes = useMemo(() => {
    if (!transactionTypesData) return [];
    return transactionTypesData.map(mapBackendToFrontend);
  }, [transactionTypesData]);

  // CRUD operations
  const createTransactionType = useApiWithToast(
    (request: Parameters<typeof transactionTypesApi.createTransactionType>[0]) =>
      transactionTypesApi.createTransactionType(request),
    {
      successMessage: 'تم إنشاء نوع المعاملة بنجاح',
      errorMessage: 'فشل إنشاء نوع المعاملة',
      onSuccess: () => {
        fetchTransactionTypes();
        setIsAddModalOpen(false);
        setSelectedType(null);
      },
    }
  );

  const updateTransactionType = useApiWithToast(
    ({ code, request }: { code: number; request: Parameters<typeof transactionTypesApi.updateTransactionType>[1] }) =>
      transactionTypesApi.updateTransactionType(code, request),
    {
      successMessage: 'تم تحديث نوع المعاملة بنجاح',
      errorMessage: 'فشل تحديث نوع المعاملة',
      onSuccess: () => {
        fetchTransactionTypes();
        setIsEditModalOpen(false);
        setSelectedType(null);
      },
    }
  );

  const deleteTransactionType = useApiWithToast(
    (code: number) => transactionTypesApi.deleteTransactionType(code),
    {
      successMessage: 'تم حذف نوع المعاملة بنجاح',
      errorMessage: 'فشل حذف نوع المعاملة',
      onSuccess: () => {
        fetchTransactionTypes();
        setIsDeleteModalOpen(false);
        setSelectedType(null);
      },
    }
  );

  // Protect route - Admin only
  useRouteProtection(['Admin']);

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
    setSelectedType(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (type: TransactionType) => {
    setSelectedType(type);
    setIsEditModalOpen(true);
  };

  const handleView = (type: TransactionType) => {
    setSelectedType(type);
    setIsViewModalOpen(true);
  };


  const handleSubmit = async (data: Partial<TransactionType>) => {
    if (selectedType) {
      // Edit mode - update the transaction type
      const request = mapFrontendToBackend(data, selectedType.transactionCode, false);
      await updateTransactionType.execute({ code: selectedType.transactionCode, request });
    } else {
      // Add mode - create new transaction type
      // Generate next type code: find max code and add 1, or use 100+ range for user-created types
      const maxCode = transactionTypes.length > 0
        ? Math.max(...transactionTypes.map((t) => t.transactionCode), 0)
        : 99;
      const nextCode = Math.max(maxCode + 1, 100); // Use 100+ range for user-created types
      const request = mapFrontendToBackend(data, nextCode, true);
      await createTransactionType.execute(request);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedType) return;
    await deleteTransactionType.execute(selectedType.transactionCode);
  };

  const columns = useMemo<MRT_ColumnDef<TransactionType>[]>(
    () => [
      {
        accessorKey: 'transactionCode',
        header: 'الرمز',
        size: 100,
      },
      {
        accessorKey: 'transactionNameEn',
        header: 'الاسم بالإنجليزية',
        size: 250,
      },
      {
        accessorKey: 'transactionNameAr',
        header: 'الاسم بالعربية',
        size: 250,
      },
      {
        accessorKey: 'transactionType',
        header: 'النوع',
        size: 150,
        Cell: ({ cell }) => {
          const type = cell.getValue<string>();
          const typeLabels: Record<string, string> = {
            ALLOWANCE: 'بدل',
            DEDUCTION: 'خصم',
          };
          return (
            <Chip
              label={typeLabels[type] || type}
              color={type === 'ALLOWANCE' ? 'success' : 'error'}
              size="small"
            />
          );
        },
      },
      {
        accessorKey: 'isSystem',
        header: 'النظام',
        size: 100,
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue<boolean>() ? 'نعم' : 'لا'}
            color={cell.getValue<boolean>() ? 'default' : 'primary'}
            size="small"
          />
        ),
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: transactionTypes,
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
            textTransform: 'none',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #0c2b7a 0%, #0a266e 100%)',
            '& .MuiSvgIcon-root': {
              color: '#FFFFFF',
            },
            '&:hover': {
              background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
            },
          }}
        >
          نوع جديد
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
        <Tooltip title="تعديل">
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
              أنواع المعاملات - ملء الشاشة
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
            {tableWrapper}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
                >
                  أنواع المعاملات
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  إدارة أنواع معاملات البدلات والخصومات
                </Typography>
              </Box>
            </Box>
          </Box>

          {loadingTypes ? (
            <LoadingSpinner />
          ) : typesError ? (
            <ErrorDisplay error={typesError} onRetry={fetchTransactionTypes} />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* Forms */}
      <TransactionTypeForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedType(null);
        }}
        onSubmit={handleSubmit}
        loading={createTransactionType.loading}
      />

      <TransactionTypeForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedType(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedType}
        loading={updateTransactionType.loading}
      />

      <TransactionTypeViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedType(null);
        }}
        data={selectedType}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedType(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف نوع المعاملة"
        message={`هل أنت متأكد أنك تريد حذف نوع المعاملة "${selectedType?.transactionNameEn}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedType?.transactionNameEn}
        loading={deleteTransactionType.loading}
      />
    </>
  );
}


