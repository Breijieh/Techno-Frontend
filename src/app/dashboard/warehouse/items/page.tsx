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
  Visibility,
  Delete,
  Inventory2,
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
import { ItemResponse, type StoreSummary, type CategorySummary, type ItemRequest } from '@/lib/api/warehouse';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import StoreItemForm from '@/components/forms/StoreItemForm';
import { TextField, MenuItem } from '@mui/material';
import useRouteProtection from '@/hooks/useRouteProtection';
import { warehouseApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';


// Extended item type for form (includes fields shown in columns)
interface ExtendedWarehouseItem extends ItemResponse {
  storeName?: string;
  availableQuantity?: number;
  unit?: string;
  categoryName?: string;
  // Compatibility fields for form
  itemName: string; // Ensure string type to match ItemResponse
  reorderPoint?: number; // For form display
  storeCode?: number; // For initial quantity
  itemDescription?: string; // For form display
}

export default function WarehouseItemsPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Protect route
  useRouteProtection(['Admin', 'Warehouse Manager']);
  const [selectedItem, setSelectedItem] = useState<ExtendedWarehouseItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ExtendedWarehouseItem | null>(null);
  const [showForceDelete, setShowForceDelete] = useState(false);

  // Fetch items
  const { data: itemsResponse = [], execute: loadItems } = useApi(
    () => warehouseApi.getAllItems(),
    { immediate: true }
  );

  // Map ItemResponse[] to ExtendedWarehouseItem[]
  const items = useMemo(() => {
    if (!itemsResponse || !Array.isArray(itemsResponse)) return [];
    const mapItem = (item: ItemResponse): ExtendedWarehouseItem => ({
      itemCode: item.itemCode,
      itemName: item.itemName,
      categoryCode: item.categoryCode, // Changed from itemCategoryCode
      // Preserve totalQuantity from backend (could be 0, null, or actual value)
      totalQuantity: item.totalQuantity !== null && item.totalQuantity !== undefined ? item.totalQuantity : 0, // Changed from totalItemQuantity
      // Include backend fields for direct display
      categoryName: item.categoryName,
      unitOfMeasure: item.unitOfMeasure,
      reorderLevel: item.reorderLevel,
      isActive: item.isActive,
      itemDescription: item.itemDescription,
    });
    return (itemsResponse as ItemResponse[]).map(mapItem);
  }, [itemsResponse]);

  // Fetch categories
  const { data: categoriesData = [] } = useApi(
    () => warehouseApi.getAllCategories(),
    { immediate: true }
  );

  // Fetch stores for initial quantity selection
  const { data: storesData = [] } = useApi(
    async () => {
      const stores = await warehouseApi.getAllStores();
      return stores;
    },
    { immediate: true }
  );

  // Map backend CategorySummary[] to frontend StoreItemCategory[]
  const categories = useMemo(() => {
    if (!categoriesData || !Array.isArray(categoriesData)) return [];
    return categoriesData.map((cat: CategorySummary) => ({
      categoryCode: cat.categoryCode,
      categoryName: cat.categoryName,
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
    setSelectedItem(null);
    setIsAddModalOpen(true);
  };

  const handleView = async (item: ExtendedWarehouseItem) => {
    try {
      // Fetch full item details from backend
      const fullItem = await warehouseApi.getItemById(item.itemCode);
      const mappedItem: ExtendedWarehouseItem = {
        itemCode: fullItem.itemCode,
        itemName: fullItem.itemName,
        categoryCode: fullItem.categoryCode, // Changed from itemCategoryCode
        totalQuantity: fullItem.totalQuantity || 0, // Changed from totalItemQuantity
        // Preserve all backend fields for display
        categoryName: fullItem.categoryName,
        unitOfMeasure: fullItem.unitOfMeasure,
        isActive: fullItem.isActive,
      };
      setSelectedItem(mappedItem);
      setIsViewModalOpen(true);
    } catch (error) {
      // Fallback to using the item from the list (should already have backend fields)
      setSelectedItem(item);
      setIsViewModalOpen(true);
    }
  };

  const handleEdit = async (item: ExtendedWarehouseItem) => {
    try {
      // Fetch full item details from backend for editing
      const fullItem = await warehouseApi.getItemById(item.itemCode);
      const mappedItem = {
        itemCode: fullItem.itemCode,
        itemName: fullItem.itemName,
        categoryCode: fullItem.categoryCode, // Changed from itemCategoryCode
        totalQuantity: fullItem.totalQuantity || 0, // Changed from totalItemQuantity
        // Preserve all backend fields for editing - use both names for compatibility
        categoryName: fullItem.categoryName,
        unitOfMeasure: fullItem.unitOfMeasure || '',
        reorderLevel: fullItem.reorderLevel,
        isActive: fullItem.isActive,
        // Also map to form names for compatibility
        reorderPoint: fullItem.reorderLevel,
      } as ExtendedWarehouseItem;
      setSelectedItem(mappedItem);
      setIsEditModalOpen(true);
    } catch (error) {
      // Fallback to using the item from the list (should already have backend fields)
      setSelectedItem(item);
      setIsEditModalOpen(true);
    }
  };

  const formatItemForView = (item: ExtendedWarehouseItem) => {
    const itemData = item as ExtendedWarehouseItem;
    const categoryName = itemData?.categoryName || getCategoryName(item);
    const unit = itemData?.unitOfMeasure || '';
    const quantity = item.totalQuantity || 0; // Changed from totalItemQuantity
    const reorderLevel = itemData?.reorderLevel;
    // Check isActive - handle both boolean and undefined (default to true if not specified)
    const isActive = itemData?.isActive !== undefined ? itemData.isActive : true;
    return [
      { label: 'رمز العنصر', value: item.itemCode },
      { label: 'اسم العنصر (إنجليزي)', value: item.itemName },
      { label: 'اسم العنصر (عربي)', value: item.itemName },
      { label: 'الفئة', value: categoryName },
      { label: 'وحدة القياس', value: unit || 'غير متاح' },
      { label: 'نقطة إعادة الطلب', value: reorderLevel !== null && reorderLevel !== undefined ? `${Number(reorderLevel).toFixed(2)} ${unit}`.trim() : 'غير محدد' },
      { label: 'كمية المخزون', value: unit ? `${quantity.toFixed(2)} ${unit}`.trim() : `${quantity.toFixed(2)}` },
      { label: 'الحالة', value: isActive ? 'نشط' : 'غير نشط' },
    ];
  };

  // Save item (create/update)
  const { loading: isSaving, execute: saveItem } = useApiWithToast(
    async (params: { isEdit: boolean; itemCode?: number; itemRequest: ItemRequest }) => {
      if (params.isEdit && params.itemCode) {
        await warehouseApi.updateItem(params.itemCode, params.itemRequest);
      } else {
        await warehouseApi.createItem(params.itemRequest);
      }
      await loadItems();
    },
    {
      showSuccessToast: true,
      successMessage: (params: { isEdit: boolean }) => params.isEdit ? 'تم تحديث العنصر بنجاح' : 'تم إنشاء العنصر بنجاح',
      onSuccess: () => {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedItem(null);
      },
    }
  );

  // Delete item
  const { loading: isDeleting, execute: deleteItem } = useApiWithToast(
    async (params: { itemCode: number; force: boolean }) => {
      await warehouseApi.deleteItem(params.itemCode); // Note: backend deleteItem doesn't take force param yet
      await loadItems();
    },
    {
      showSuccessToast: true,
      successMessage: (params: { force: boolean }) => params.force ? 'تم حذف العنصر قسراً بنجاح' : 'تم حذف العنصر بنجاح',
    }
  );

  const handleDelete = (item: ExtendedWarehouseItem) => {
    setItemToDelete(item);
    setShowForceDelete(false);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteItem({ itemCode: itemToDelete.itemCode, force: false });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      setShowForceDelete(false);
    } catch (error: unknown) {
      // Check if error is about existing stock
      const err = error as { message?: string };
      if (err?.message?.includes('existing stock') || err?.message?.includes('stock')) {
        setShowForceDelete(true);
        // Don't close dialog, show force delete option
      } else {
        // Other error - close dialog
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
        setShowForceDelete(false);
      }
    }
  };

  const handleForceDelete = async () => {
    if (!itemToDelete) return;
    await deleteItem({ itemCode: itemToDelete.itemCode, force: true });
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
    setShowForceDelete(false);
  };

  const getCategoryName = useCallback((item: ExtendedWarehouseItem) => {
    // Use categoryName directly from backend if available
    const itemData = item as ExtendedWarehouseItem;
    if (itemData?.categoryName) {
      return itemData.categoryName;
    }
    // Fallback to lookup from categories list
    const code = item.categoryCode; // Changed from itemCategoryCode
    const category = (categories || []).find(c => c.categoryCode === code);
    return category?.categoryName || 'غير متاح';
  }, [categories]);

  const handleSubmit = async (formData: Partial<ExtendedWarehouseItem>) => {
    try {
      const isEdit = !!selectedItem;
      const initialQuantity = formData.totalQuantity || 0; // Changed from totalItemQuantity
      const storeCode = formData.storeCode;
      const selectedItemData = selectedItem as ExtendedWarehouseItem;

      const itemRequest: ItemRequest = {
        categoryCode: formData.categoryCode || selectedItemData?.categoryCode || selectedItem?.categoryCode || (categories.length > 0 ? categories[0].categoryCode : 1), // Changed from itemCategoryCode
        itemName: formData.itemName || selectedItem?.itemName || '',
        unitOfMeasure: formData.unitOfMeasure || selectedItemData?.unitOfMeasure || '', // Required field
        itemDescription: selectedItemData?.itemDescription || undefined, // Optional field
        reorderLevel: formData.reorderPoint !== undefined && formData.reorderPoint !== null ? Number(formData.reorderPoint) : undefined,
        isActive: formData.isActive !== undefined ? formData.isActive : (selectedItemData?.isActive !== undefined ? selectedItemData.isActive : true),
      };

      // Include initial quantity and store code ONLY when creating new item (not when editing)
      // When editing, stock changes should be done through Goods Receipt/Issue workflows
      if (!isEdit && initialQuantity > 0) {
        if (!storeCode) {
          throw new Error('المستودع مطلوب عند تحديد الكمية الأولية');
        }
        itemRequest.initialQuantity = initialQuantity;
        itemRequest.storeCode = storeCode;
      } else if (isEdit && initialQuantity > 0) {
      } else {
      }

      await saveItem({
        isEdit: !!selectedItem,
        itemCode: selectedItem?.itemCode,
        itemRequest,
      });
    } catch (error) {
      // Error is already handled by useApiWithToast
    }
  };


  const columns = useMemo<MRT_ColumnDef<ExtendedWarehouseItem>[]>(
    () => [
      {
        accessorKey: 'itemCode',
        header: 'الرمز',
        size: 90,
        filterVariant: 'multi-select',
      },
      {
        accessorKey: 'itemName',
        header: 'اسم العنصر',
        size: 200,
      },
      {
        accessorKey: 'itemDescription',
        header: 'الوصف',
        size: 250,
        Cell: ({ cell }) => (
          <Tooltip title={cell.getValue<string>() || ''}>
            <Typography noWrap sx={{ fontSize: '13px', maxWidth: '250px' }}>
              {cell.getValue<string>() || '-'}
            </Typography>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'categoryName',
        header: 'الفئة',
        size: 180,
        filterVariant: 'multi-select',
        Cell: ({ row }) => {
          const categoryName = row.original.categoryName;
          return categoryName || getCategoryName(row.original);
        },
      },
      {
        accessorKey: 'unitOfMeasure',
        header: 'الوحدة',
        size: 100,
        filterVariant: 'multi-select',
        Cell: ({ cell }) => {
          const unit = cell.getValue() as string;
          if (!unit) return '-';
          return (
            <Chip
              label={unit}
              size="small"
              sx={{
                backgroundColor: '#E0E7FF',
                color: '#3730A3',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
      },
      {
        accessorKey: 'totalQuantity',
        header: 'المخزون',
        size: 120,
        filterVariant: 'range',
        Cell: ({ cell, row }) => {
          const quantity = cell.getValue() as number | null | undefined;
          const unit = row.original.unitOfMeasure || '';
          // Handle null/undefined properly, but if it's 0, show 0 (not "N/A")
          const qtyValue = quantity !== null && quantity !== undefined ? Number(quantity) : 0;
          return `${qtyValue.toFixed(2)} ${unit}`.trim();
        },
      },
      {
        accessorKey: 'reorderLevel',
        header: 'نقطة إعادة الطلب',
        size: 130,
        filterVariant: 'range',
        Cell: ({ cell, row }) => {
          const reorderLevel = cell.getValue() as number | null | undefined;
          const unit = row.original.unitOfMeasure || '';
          if (reorderLevel === null || reorderLevel === undefined) {
            return '-';
          }
          return `${Number(reorderLevel).toFixed(2)} ${unit}`.trim();
        },
      },
      {
        accessorKey: 'isActive',
        header: 'الحالة',
        size: 100,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: ExtendedWarehouseItem) => row.isActive ? 'نشط' : 'غير نشط'
        },
        Cell: ({ cell }) => {
          const isActive = cell.getValue() as boolean;
          return (
            <Chip
              label={isActive ? 'نشط' : 'غير نشط'}
              size="small"
              sx={{
                backgroundColor: isActive ? '#D1FAE5' : '#F3F4F6',
                color: isActive ? '#065F46' : '#6B7280',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
      },
    ],
    [getCategoryName]
  );

  // Map items for table display - only use backend fields
  const tableData = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    return items.map(item => {
      const data = item as ExtendedWarehouseItem;
      // Use totalQuantity from backend directly if available, otherwise use totalQuantity
      const quantity = data?.totalQuantity !== null && data?.totalQuantity !== undefined
        ? data.totalQuantity
        : (item.totalQuantity || 0); // Changed from totalItemQuantity
      return {
        ...item,
        itemName: item.itemName,
        // Use backend fields directly - no fake data
        categoryName: data?.categoryName,
        unitOfMeasure: data?.unitOfMeasure,
        reorderLevel: data?.reorderLevel,
        totalQuantity: quantity, // Preserve actual backend value (including 0 if that's the real value)
        isActive: data?.isActive !== undefined ? data.isActive : true,
      } as ExtendedWarehouseItem;
    });
  }, [items]);

  const table = useMaterialReactTable({
    columns: columns,
    data: tableData,
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
    renderTopToolbar: ({ table }) => (
      <TableToolbarWrapper table={table}>
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
            عنصر جديد
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
      </TableToolbarWrapper>
    ),
    enableRowActions: true,
    positionActionsColumn: 'last',
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'الإجراءات',
        size: 200,
      },
    },
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="عرض التفاصيل">
          <IconButton
            size="small"
            sx={{ color: '#0c2b7a' }}
            onClick={() => {
              const originalItem = (items || []).find(i => i.itemCode === row.original.itemCode);
              if (originalItem) handleView(originalItem);
            }}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل">
          <IconButton
            size="small"
            sx={{ color: '#059669' }}
            onClick={() => {
              const originalItem = (items || []).find(i => i.itemCode === row.original.itemCode);
              if (originalItem) handleEdit(originalItem);
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton
            size="small"
            sx={{ color: '#dc2626' }}
            onClick={() => {
              const originalItem = (items || []).find(i => i.itemCode === row.original.itemCode);
              if (originalItem) handleDelete(originalItem);
            }}
            disabled={isDeleting}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ),
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
        height: isFullscreen ? '100%' : 'auto',
        overflow: 'hidden',
        transition: isFullscreen ? 'none' : 'all 0.3s ease',
        '& .MuiPaper-root': {
          width: '100%',
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
              إدارة العناصر - ملء الشاشة
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
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
              إدارة العناصر
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              إدارة عناصر المستودع مع مستويات المخزون ونقاط إعادة الطلب
            </Typography>
          </Box>

          {tableWrapper}
        </Box>
      </Box>

      {/* View Details Dialog */}
      <ViewDetailsDialog
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedItem(null);
        }}
        title="تفاصيل العنصر"
        fields={selectedItem ? formatItemForView(selectedItem) : []}
      />

      {/* Add Item Dialog */}
      <StoreItemForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={async (data) => {
          // Adapt form data back to ExtendedWarehouseItem or ItemRequest
          const itemData: any = {
            ...data,
            // Re-map back if needed, but the form uses compatible field names mostly.
            // totalQuantity in form is initialQuantity for creation
          };
          await handleSubmit(itemData);
        }}
        initialData={null}
        loading={isSaving}
        categories={categories || []}
        stores={storesData || []}
      />

      {/* Edit Item Dialog */}
      <StoreItemForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={async (data) => {
          await handleSubmit(data as Partial<ExtendedWarehouseItem>);
        }}
        initialData={selectedItem}
        loading={isSaving}
        categories={categories || []}
        stores={storesData || []}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setItemToDelete(null);
          setShowForceDelete(false);
        }}
        onConfirm={handleDeleteConfirm}
        onForceDelete={handleForceDelete}
        title="حذف العنصر"
        message={showForceDelete
          ? "هذا العنصر لديه مخزون موجود. الحذف القسري سيحذف العنصر وجميع سجلات المخزون الخاصة به بشكل دائم. لا يمكن التراجع عن هذا الإجراء."
          : `هل أنت متأكد من حذف "${itemToDelete?.itemName}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={itemToDelete?.itemName}
        loading={isDeleting}
        showForceDelete={showForceDelete}
        warningMessage={showForceDelete
          ? "تحذير: سيتم حذف العنصر وجميع سجلات المخزون المرتبطة به. هذا لا يمكن التراجع عنه."
          : "لا يمكن التراجع عن هذا الإجراء."}
      />
    </>
  );
}


