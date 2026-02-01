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
import type { StoreItemCategory } from '@/types';
import useRouteProtection from '@/hooks/useRouteProtection';
import WarehouseCategoryForm from '@/components/forms/WarehouseCategoryForm';
import WarehouseCategoryViewForm from '@/components/forms/WarehouseCategoryViewForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import { warehouseApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import type { CategorySummary } from '@/lib/api/warehouse';

export default function WarehouseCategoriesPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Protect route
  useRouteProtection(['Admin', 'Warehouse Manager']);

  const [selectedCategory, setSelectedCategory] = useState<StoreItemCategory | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch categories from backend
  const { data: categoriesData, loading: isLoadingCategories, error: categoriesError, execute: loadCategories } = useApi(
    () => warehouseApi.getAllCategories(),
    { immediate: true }
  );

  // Map backend CategorySummary[] to frontend StoreItemCategory[]
  const categories = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData.map((cat: CategorySummary) => ({
      categoryCode: cat.categoryCode,
      categoryName: cat.categoryName,
      itemCount: cat.itemCount || 0,
    }));
  }, [categoriesData]);

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
    setSelectedCategory(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (category: StoreItemCategory) => {
    setSelectedCategory(category);
    setIsEditModalOpen(true);
  };

  const handleView = async (category: StoreItemCategory) => {
    try {
      // Fetch full category details from backend
      const fullCategory = await warehouseApi.getCategoryById(category.categoryCode);
      // Map to frontend format
      const mappedCategory: StoreItemCategory = {
        categoryCode: fullCategory.categoryCode,
        categoryName: fullCategory.categoryName,
      };
      setSelectedCategory(mappedCategory);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching category details:', error);
      // Fallback to using the category from the list
      setSelectedCategory(category);
      setIsViewModalOpen(true);
    }
  };

  const handleDelete = (category: StoreItemCategory) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  // Create/Update category
  interface SaveCategoryParams {
    isEdit: boolean;
    categoryCode?: number;
    data: Partial<StoreItemCategory>;
  }

  const { loading: isSaving, execute: saveCategory } = useApiWithToast(
    async (params: SaveCategoryParams) => {
      const categoryRequest = {
        categoryName: params.data.categoryName || '',
      };

      if (params.isEdit && params.categoryCode) {
        await warehouseApi.updateCategory(params.categoryCode, categoryRequest);
      } else {
        await warehouseApi.createCategory(categoryRequest);
      }
      await loadCategories();
    },
    {
      showSuccessToast: true,
      successMessage: (params: SaveCategoryParams) => params.isEdit ? 'تم تحديث الفئة بنجاح' : 'تم إنشاء الفئة بنجاح',
      onSuccess: () => {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedCategory(null);
      },
    }
  );

  const handleSubmit = async (data: Partial<StoreItemCategory>) => {
    try {
      const categoryCode = selectedCategory?.categoryCode;
      await saveCategory({
        isEdit: !!selectedCategory,
        categoryCode,
        data,
      });
    } catch (error) {
      console.error('Error saving category:', error);
      // Error is already handled by useApiWithToast
    }
  };

  const [showForceDelete, setShowForceDelete] = useState(false);

  // Delete category
  const { loading: isDeleting, execute: deleteCategory } = useApiWithToast(
    async (params: { categoryCode: number; force: boolean }) => {
      await warehouseApi.deleteCategory(params.categoryCode, params.force);
      await loadCategories();
    },
    {
      showSuccessToast: true,
      successMessage: (params: { categoryCode: number; force: boolean }) => params.force ? 'تم حذف الفئة قسراً بنجاح' : 'تم حذف الفئة بنجاح',
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setSelectedCategory(null);
        setShowForceDelete(false);
      },
    }
  );

  const handleDeleteConfirm = async () => {
    if (!selectedCategory) return;
    try {
      await deleteCategory({ categoryCode: selectedCategory.categoryCode, force: false });
    } catch (error: unknown) {
      // Check if error is about existing items
      const errorMsg = (error as { message?: string })?.message || '';
      if (errorMsg.includes('existing items') || errorMsg.includes('items')) {
        setShowForceDelete(true);
        // Don't close dialog, show force delete option
      } else {
        // Other error - close dialog
        setIsDeleteModalOpen(false);
        setSelectedCategory(null);
        setShowForceDelete(false);
      }
    }
  };

  const handleForceDelete = async () => {
    if (!selectedCategory) return;
    await deleteCategory({ categoryCode: selectedCategory.categoryCode, force: true });
  };

  const columns = useMemo<MRT_ColumnDef<StoreItemCategory>[]>(
    () => [
      {
        accessorKey: 'categoryCode',
        header: 'الرمز',
        size: 100,
      },
      {
        accessorKey: 'categoryName',
        header: 'اسم الفئة',
        size: 250,
      },
      {
        accessorKey: 'itemCount',
        header: 'عدد العناصر',
        size: 120,
        Cell: ({ cell }) => {
          const count = cell.getValue<number | undefined>();
          return (
            <Chip
              label={count ?? 0}
              size="small"
              sx={{
                backgroundColor: count && count > 0 ? '#DBEAFE' : '#F3F4F6',
                color: count && count > 0 ? '#1E40AF' : '#6B7280',
                fontWeight: 600,
                fontSize: '12px',
              }}
            />
          );
        },
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns: columns as unknown as MRT_ColumnDef<Record<string, unknown>>[],
    data: (categories || []) as unknown as Record<string, unknown>[],
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
          فئة جديدة
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
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="عرض التفاصيل">
          <IconButton
            size="small"
            sx={{ color: '#0c2b7a' }}
            onClick={() => handleView(row.original as unknown as StoreItemCategory)}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل">
          <IconButton
            size="small"
            sx={{ color: '#059669' }}
            onClick={() => handleEdit(row.original as unknown as StoreItemCategory)}
          >
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton
            size="small"
            sx={{ color: '#DC2626' }}
            onClick={() => handleDelete(row.original as unknown as StoreItemCategory)}
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
              فئات العناصر - ملء الشاشة
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
                  فئات العناصر
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  إدارة فئات عناصر المستودع
                </Typography>
              </Box>
            </Box>
          </Box>

          {isLoadingCategories ? (
            <LoadingSpinner />
          ) : categoriesError ? (
            <ErrorDisplay message={categoriesError} onRetry={loadCategories} />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* Forms */}
      <WarehouseCategoryForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedCategory(null);
        }}
        onSubmit={handleSubmit}
        loading={isSaving}
      />
      <WarehouseCategoryForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCategory(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedCategory}
        loading={isSaving}
      />
      <WarehouseCategoryViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
      />
      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCategory(null);
          setShowForceDelete(false);
        }}
        onConfirm={handleDeleteConfirm}
        onForceDelete={handleForceDelete}
        title="حذف الفئة"
        message={showForceDelete
          ? "هذه الفئة لديها عناصر موجودة. الحذف القسري سيحذف الفئة بشكل دائم بغض النظر عن العناصر. لا يمكن التراجع عن هذا الإجراء."
          : `هل أنت متأكد من حذف "${selectedCategory?.categoryName}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={selectedCategory?.categoryName}
        loading={isDeleting}
        showForceDelete={showForceDelete}
        warningMessage={showForceDelete
          ? "تحذير: سيتم حذف الفئة حتى لو كان لديها عناصر. هذا لا يمكن التراجع عنه."
          : "لا يمكن التراجع عن هذا الإجراء."}
      />
    </>
  );
}


