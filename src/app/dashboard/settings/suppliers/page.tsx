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
import type { Supplier } from '@/types';
import SupplierForm from '@/components/forms/SupplierForm';
import SupplierViewForm from '@/components/forms/SupplierViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { suppliersApi, mapSupplierResponseToFrontend } from '@/lib/api/suppliers';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

export default function SuppliersPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch data from backend
  const { data: suppliersData, loading: loadingSuppliers, error: suppliersError, execute: fetchSuppliers } = useApi(
    () => suppliersApi.getAllSuppliers(),
    { immediate: true }
  );

  // CRUD operations
  const createSupplier = useApiWithToast(
    (request: Parameters<typeof suppliersApi.createSupplier>[0]) => suppliersApi.createSupplier(request),
    {
      successMessage: 'تم إنشاء المورد بنجاح',
      errorMessage: 'فشل إنشاء المورد',
      onSuccess: () => {
        fetchSuppliers();
        setIsAddModalOpen(false);
        setSelectedSupplier(null);
      },
    }
  );

  const updateSupplier = useApiWithToast(
    ({ id, request }: { id: number; request: Parameters<typeof suppliersApi.updateSupplier>[1] }) =>
      suppliersApi.updateSupplier(id, request),
    {
      successMessage: 'تم تحديث المورد بنجاح',
      errorMessage: 'فشل تحديث المورد',
      onSuccess: () => {
        fetchSuppliers();
        setIsEditModalOpen(false);
        setSelectedSupplier(null);
      },
    }
  );

  const deleteSupplier = useApiWithToast(
    (id: number) => suppliersApi.deleteSupplier(id),
    {
      successMessage: 'تم حذف المورد بنجاح',
      errorMessage: 'فشل حذف المورد',
      onSuccess: () => {
        fetchSuppliers();
        setIsDeleteModalOpen(false);
        setSelectedSupplier(null);
      },
    }
  );

  // Map backend data to frontend format (show all suppliers - both active and inactive)
  const suppliers = useMemo(() => {
    if (!suppliersData) return [];
    return suppliersData.map(mapSupplierResponseToFrontend);
  }, [suppliersData]);

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

  const columns = useMemo<MRT_ColumnDef<Supplier>[]>(
    () => [
      {
        accessorKey: 'supplierId',
        header: 'الرمز',
        size: 80,
      },
      {
        accessorKey: 'supplierName',
        header: 'اسم المورد',
        size: 250,
      },
      {
        accessorKey: 'contactPerson',
        header: 'الشخص المسؤول',
        size: 180,
      },
      {
        accessorKey: 'email',
        header: 'البريد الإلكتروني',
        size: 200,
      },
      {
        accessorKey: 'phone',
        header: 'الهاتف',
        size: 150,
      },
      {
        accessorKey: 'isActive',
        header: 'الحالة',
        size: 100,
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue<boolean>() ? 'نشط' : 'غير نشط'}
            color={cell.getValue<boolean>() ? 'success' : 'default'}
            size="small"
          />
        ),
      },
    ],
    []
  );

  // Form handlers
  const handleAdd = () => {
    setSelectedSupplier(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsEditModalOpen(true);
  };

  const handleView = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsViewModalOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (data: Partial<Supplier>) => {
    const request = {
      supplierName: data.supplierName || '',
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    if (selectedSupplier?.supplierId) {
      // Update existing supplier
      await updateSupplier.execute({ id: selectedSupplier.supplierId, request });
    } else {
      // Create new supplier
      await createSupplier.execute(request);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSupplier?.supplierId) return;
    await deleteSupplier.execute(selectedSupplier.supplierId);
  };

  const table = useMaterialReactTable({
    columns,
    data: suppliers,
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
          مورد جديد
        </Button>
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
              إدارة الموردين - ملء الشاشة
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
                  إدارة الموردين
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  إدارة بيانات الموردين الأساسية
                </Typography>
              </Box>
            </Box>
          </Box>

          {loadingSuppliers ? (
            <LoadingSpinner />
          ) : suppliersError ? (
            <ErrorDisplay message={suppliersError} onRetry={fetchSuppliers} />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* Forms */}
      <SupplierForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedSupplier(null);
        }}
        onSubmit={handleSubmit}
        loading={createSupplier.loading}
      />

      <SupplierForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSupplier(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedSupplier}
        loading={updateSupplier.loading}
      />

      <SupplierViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedSupplier(null);
        }}
        data={selectedSupplier}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSupplier(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف المورد"
        message={`هل أنت متأكد من حذف المورد "${selectedSupplier?.supplierName}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedSupplier?.supplierName}
        loading={deleteSupplier.loading}
      />
    </>
  );
}


