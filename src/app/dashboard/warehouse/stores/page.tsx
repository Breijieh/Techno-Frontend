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
  Visibility,
  Delete,
  Warehouse as WarehouseIcon,
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
import type { ProjectStore } from '@/types';
import useRouteProtection from '@/hooks/useRouteProtection';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import { TextField, MenuItem } from '@mui/material';
import { warehouseApi, projectsApi, employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import type { StoreSummary } from '@/lib/api/warehouse';
import type { ProjectSummary } from '@/lib/api/projects';
import type { EmployeeResponse } from '@/lib/api/employees';

export default function WarehouseStoresPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<ProjectStore | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<ProjectStore | null>(null);
  const [showForceDelete, setShowForceDelete] = useState(false);
  const toast = useToast();

  // Protect route
  useRouteProtection(['Admin', 'Warehouse Manager', 'Project Manager']);

  // Fetch stores from backend
  const { data: storesData = [], loading: isLoadingStores, error: storesError, execute: loadStores } = useApi(
    () => warehouseApi.getAllStores(),
    { immediate: true }
  );

  // Fetch projects for dropdown
  const { data: projectsData = [] } = useApi(
    () => projectsApi.getActiveProjects(),
    { immediate: true }
  );

  // Fetch employees for dropdown (for manager selection if needed)
  const { data: employeesData } = useApi(
    () => employeesApi.getAllEmployees({ page: 0, size: 1000 }),
    { immediate: true }
  );

  // Map StoreSummary[] to ProjectStore[]
  const stores = useMemo(() => {
    if (!storesData || !Array.isArray(storesData)) return [];
    return storesData.map((store: StoreSummary) => ({
      storeCode: store.storeCode,
      projectCode: store.projectCode,
      projectName: store.projectName,
      storeName: store.storeName,
      storeLocation: store.storeLocation,
      isActive: store.isActive,
      itemCount: store.itemCount,
      storeManagerId: store.storeManagerId,
      storeManagerName: store.storeManagerName,
    } as ProjectStore));
  }, [storesData]);

  // Extract projects array from response
  const projects = useMemo(() => {
    if (!projectsData || !Array.isArray(projectsData)) return [];
    return projectsData;
  }, [projectsData]);

  // Extract employees array from response
  const employees = useMemo(() => {
    if (!employeesData?.employees || !Array.isArray(employeesData.employees)) return [];
    return employeesData.employees;
  }, [employeesData]);

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
    setSelectedStore(null);
    setIsAddModalOpen(true);
  };

  const handleView = async (store: ProjectStore) => {
    try {
      // Fetch full store details from backend
      const fullStore = await warehouseApi.getStoreById(store.storeCode);
      const mappedStore: ProjectStore = {
        storeCode: fullStore.storeCode,
        projectCode: fullStore.projectCode,
        projectName: fullStore.projectName,
        storeName: fullStore.storeName,
        storeLocation: fullStore.storeLocation,
        isActive: fullStore.isActive,
        itemCount: fullStore.itemCount,
      };
      setSelectedStore(mappedStore);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching store details:', error);
      // Fallback to using the store from the list
      setSelectedStore(store);
      setIsViewModalOpen(true);
    }
  };

  const handleEdit = async (store: ProjectStore) => {
    try {
      // Fetch full store details from backend for editing
      const fullStore = await warehouseApi.getStoreById(store.storeCode);
      const mappedStore: ProjectStore = {
        storeCode: fullStore.storeCode,
        projectCode: fullStore.projectCode,
        projectName: fullStore.projectName,
        storeName: fullStore.storeName,
        storeLocation: fullStore.storeLocation,
        isActive: fullStore.isActive,
        itemCount: fullStore.itemCount,
      };
      setSelectedStore(mappedStore);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching store details:', error);
      // Fallback to using the store from the list
      setSelectedStore(store);
      setIsEditModalOpen(true);
    }
  };

  const handleDelete = (store: ProjectStore) => {
    setStoreToDelete(store);
    setIsDeleteDialogOpen(true);
  };

  // Save store (create/update)
  interface SaveStoreParams {
    isEdit: boolean;
    storeCode?: number;
    storeRequest: {
      projectCode: number;
      storeName: string;
      storeLocation?: string;
      isActive: boolean;
      storeManagerId?: number;
    };
  }

  const { loading: isSaving, execute: saveStore } = useApiWithToast(
    async (params: SaveStoreParams) => {
      if (params.isEdit && params.storeCode) {
        await warehouseApi.updateStore(params.storeCode, params.storeRequest);
      } else {
        await warehouseApi.createStore(params.storeRequest);
      }
      await loadStores();
    },
    {
      showSuccessToast: true,
      successMessage: (params) => params.isEdit ? 'تم تحديث المستودع بنجاح' : 'تم إنشاء المستودع بنجاح',
      onSuccess: () => {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedStore(null);
      },
    }
  );

  // Delete store
  const { loading: isDeleting, execute: deleteStore } = useApiWithToast(
    async (params: { storeCode: number; force: boolean }) => {
      await warehouseApi.deleteStore(params.storeCode); // Note: backend doesn't support force delete yet
      await loadStores();
    },
    {
      showSuccessToast: true,
      successMessage: (params) => params.force ? 'تم حذف المستودع قسراً بنجاح' : 'تم تعطيل المستودع بنجاح',
      showErrorToast: false, // We'll handle error display manually in handleDeleteConfirm
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setStoreToDelete(null);
        setShowForceDelete(false);
      },
    }
  );

  const handleSubmit = async (data: Partial<ProjectStore>) => {
    try {
      const storeRequest = {
        projectCode: data.projectCode || selectedStore?.projectCode || (projects.length > 0 ? projects[0].projectCode : 1),
        storeName: data.storeName || selectedStore?.storeName || '',
        storeLocation: data.storeLocation || selectedStore?.storeLocation || undefined,
        isActive: data.isActive !== undefined ? data.isActive : (selectedStore?.isActive !== undefined ? selectedStore.isActive : true),
        storeManagerId: data.storeManagerId !== undefined ? data.storeManagerId : (selectedStore?.storeManagerId || undefined),
      };

      await saveStore({
        isEdit: !!selectedStore,
        storeCode: selectedStore?.storeCode,
        storeRequest,
      });
    } catch (error) {
      console.error('Error saving store:', error);
      // Error is already handled by useApiWithToast
    }
  };

  const handleDeleteConfirm = async () => {
    if (!storeToDelete) return;
    try {
      await deleteStore({ storeCode: storeToDelete.storeCode, force: false });
    } catch (error: unknown) {
      // Extract error message from various possible error structures
      const errorMessage = (error as { message?: string; error?: string })?.message || (error as { error?: string })?.error || String(error) || '';
      console.log('[Store Delete] Error caught:', errorMessage, error);

      // Check if error is about existing balances
      const isBalanceError =
        errorMessage.toLowerCase().includes('existing balances') ||
        errorMessage.toLowerCase().includes('balances') ||
        errorMessage.toLowerCase().includes('stock') ||
        errorMessage.toLowerCase().includes('transfer all');

      if (isBalanceError) {
        console.log('[Store Delete] Showing force delete option');
        setShowForceDelete(true);
        // Show info toast about force delete option
        toast.showWarning('المستودع لديه مخزون موجود. استخدم "الحذف القسري" للحذف على أي حال.');
      } else {
        console.log('[Store Delete] Other error, closing dialog');
        // Show error toast for other errors
        toast.showError(errorMessage || 'فشل حذف المستودع');
        // Other error - close dialog
        setIsDeleteDialogOpen(false);
        setStoreToDelete(null);
        setShowForceDelete(false);
      }
    }
  };

  const handleForceDelete = async () => {
    if (!storeToDelete) return;
    await deleteStore({ storeCode: storeToDelete.storeCode, force: true });
  };

  const formatStoreForView = (store: ProjectStore) => {
    return [
      { label: 'المشروع', value: getProjectName(store.projectCode) },
      { label: 'رمز المستودع', value: store.storeCode },
      { label: 'الاسم الإنجليزي', value: store.storeName },
      { label: 'الاسم العربي', value: store.storeName },
      { label: 'موقع المستودع', value: store.storeLocation || 'غير متاح' },
      { label: 'الحالة', value: store.isActive ? 'نشط' : 'غير نشط' },
      { label: 'عدد العناصر', value: store.itemCount?.toString() || '0' },
    ];
  };

  const getProjectName = useCallback((projectCode: number) => {
    const project = projects.find((p: ProjectSummary) => p.projectCode === projectCode);
    return project?.projectName || `المشروع ${projectCode}`;
  }, [projects]);

  const getManagerName = useCallback((store: ProjectStore) => {
    // First try to use storeManagerName from backend
    if (store.storeManagerName) {
      return store.storeManagerName;
    }
    // Fallback to lookup by ID
    if (store.storeManagerId) {
      const employee = employees.find((e: EmployeeResponse) => e.employeeNo === store.storeManagerId);
      return employee ? `${employee.employeeName || ''}`.trim() || `ID: ${store.storeManagerId}` : `ID: ${store.storeManagerId}`;
    }
    return 'غير متاح';
  }, [employees]);

  const columns: MRT_ColumnDef<ProjectStore>[] = [
    {
      accessorKey: 'projectCode',
      header: 'المشروع',
      size: 200,
      Cell: ({ cell }) => getProjectName(cell.getValue<number>()),
    },
    {
      accessorKey: 'storeCode',
      header: 'رمز المستودع',
      size: 120,
    },
    {
      accessorKey: 'storeName',
      header: 'اسم المستودع',
      size: 250,
    },
    {
      accessorKey: 'storeManagerId',
      header: 'مدير المستودع',
      size: 200,
      Cell: ({ row }) => getManagerName(row.original),
    },
  ];

  const table = useMaterialReactTable<ProjectStore>({
    columns,
    data: stores || [],
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
          مستودع جديد
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
            onClick={() => handleView(row.original as unknown as ProjectStore)}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل">
          <IconButton
            size="small"
            sx={{ color: '#059669' }}
            onClick={() => handleEdit(row.original as unknown as ProjectStore)}
          >
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton
            size="small"
            sx={{ color: '#DC2626' }}
            onClick={() => handleDelete(row.original as unknown as ProjectStore)}
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
              إدارة المستودعات - ملء الشاشة
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
            {isLoadingStores ? (
              <LoadingSpinner />
            ) : storesError ? (
              <ErrorDisplay
                message="فشل تحميل المستودعات. يرجى المحاولة مرة أخرى."
                onRetry={loadStores}
              />
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
                >
                  إدارة المستودعات
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  إدارة مستودعات المستودع لكل مشروع
                </Typography>
              </Box>
            </Box>
          </Box>

          {isLoadingStores ? (
            <LoadingSpinner />
          ) : storesError ? (
            <ErrorDisplay
              message="فشل تحميل المستودعات. يرجى المحاولة مرة أخرى."
              onRetry={loadStores}
            />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>

      {/* View Details Dialog */}
      <ViewDetailsDialog
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedStore(null);
        }}
        title="تفاصيل المستودع"
        fields={selectedStore ? formatStoreForView(selectedStore) : []}
      />

      {/* Add Store Dialog */}
      <AnimatedDialog
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedStore(null);
        }}
        title="إضافة مستودع جديد"
        maxWidth="md"
      >
        <StoreFormDialogContent
          onSubmit={handleSubmit}
          onCancel={() => setIsAddModalOpen(false)}
          loading={isSaving}
          projects={projects}
          employees={employees}
        />
      </AnimatedDialog>

      {/* Edit Store Dialog */}
      <AnimatedDialog
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStore(null);
        }}
        title="تعديل المستودع"
        maxWidth="md"
      >
        <StoreFormDialogContent
          initialData={selectedStore}
          onSubmit={handleSubmit}
          onCancel={() => setIsEditModalOpen(false)}
          loading={isSaving}
          projects={projects}
          employees={employees}
        />
      </AnimatedDialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setStoreToDelete(null);
          setShowForceDelete(false);
        }}
        onConfirm={handleDeleteConfirm}
        onForceDelete={handleForceDelete}
        title="حذف المستودع"
        message={showForceDelete
          ? "هذا المستودع لديه أرصدة مخزون موجودة. الحذف القسري سيحذف المستودع وجميع سجلات الأرصدة الخاصة به بشكل دائم. لا يمكن التراجع عن هذا الإجراء."
          : `هل أنت متأكد من حذف "${storeToDelete?.storeName}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        itemName={storeToDelete?.storeName}
        loading={isDeleting}
        showForceDelete={showForceDelete}
        warningMessage={showForceDelete
          ? "تحذير: سيتم حذف المستودع وجميع سجلات الأرصدة المرتبطة به. هذا لا يمكن التراجع عنه."
          : "لا يمكن التراجع عن هذا الإجراء."}
      />
    </>
  );
}

// Store Form Dialog Content Component
interface StoreFormDialogContentProps {
  initialData?: ProjectStore | null;
  onSubmit: (data: Partial<ProjectStore>) => void;
  onCancel: () => void;
  loading?: boolean;
  projects?: ProjectSummary[];
  employees?: EmployeeResponse[];
}

function StoreFormDialogContent({ initialData, onSubmit, onCancel, loading, projects = [], employees = [] }: StoreFormDialogContentProps) {
  const [formData, setFormData] = useState<Partial<ProjectStore>>({
    projectCode: initialData?.projectCode || (projects.length > 0 ? projects[0].projectCode : 1),
    storeName: initialData?.storeName || '',
    storeLocation: initialData?.storeLocation || '',
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    storeManagerId: initialData?.storeManagerId,
  });

  useEffect(() => {
    if (initialData) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setFormData({
          projectCode: initialData.projectCode,
          storeName: initialData.storeName,
          storeLocation: initialData.storeLocation || '',
          isActive: initialData.isActive !== undefined ? initialData.isActive : true,
          storeManagerId: initialData.storeManagerId,
        });
      }, 0);
    } else {
      setTimeout(() => {
        setFormData({
          projectCode: projects.length > 0 ? projects[0].projectCode : 1,
          storeName: '',
          storeLocation: '',
          isActive: true,
          storeManagerId: undefined,
        });
      }, 0);
    }
  }, [initialData, projects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
        <TextField
          select
          label="المشروع"
          value={formData.projectCode || ''}
          onChange={(e) => setFormData({ ...formData, projectCode: Number(e.target.value) })}
          required
          fullWidth
          disabled={loading || projects.length === 0}
        >
          {projects.length === 0 ? (
            <MenuItem disabled value="">
              {loading ? 'جارٍ تحميل المشاريع...' : 'لا توجد مشاريع متاحة'}
            </MenuItem>
          ) : (
            projects.map((project: ProjectSummary) => (
              <MenuItem key={project.projectCode} value={project.projectCode}>
                {project.projectName}
              </MenuItem>
            ))
          )}
        </TextField>
        <TextField
          label="الاسم الإنجليزي"
          value={formData.storeName || ''}
          onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
          required
          fullWidth
        />
        <TextField
          label="الاسم العربي"
          value={formData.storeName || ''}
          onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
          required
          fullWidth
        />
        <TextField
          label="موقع المستودع"
          value={formData.storeLocation || ''}
          onChange={(e) => setFormData({ ...formData, storeLocation: e.target.value })}
          fullWidth
          placeholder="وصف الموقع (اختياري)"
        />
        <TextField
          select
          label="مدير المستودع"
          value={formData.storeManagerId || ''}
          onChange={(e) => setFormData({ ...formData, storeManagerId: e.target.value ? Number(e.target.value) : undefined })}
          fullWidth
          disabled={loading || employees.length === 0}
        >
          <MenuItem value="">
            <em>لا يوجد (لا يوجد مدير)</em>
          </MenuItem>
          {employees.length === 0 ? (
            <MenuItem disabled value="">
              {loading ? 'جارٍ تحميل الموظفين...' : 'لا يوجد موظفين متاحين'}
            </MenuItem>
          ) : (
            employees.map((employee: EmployeeResponse) => (
              <MenuItem key={employee.employeeNo} value={employee.employeeNo}>
                {employee.employeeName || employee.employeeName || `الموظف #${employee.employeeNo}`}
              </MenuItem>
            ))
          )}
        </TextField>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
          <Button onClick={onCancel} disabled={loading}>
            إلغاء
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'جارٍ الحفظ...' : initialData ? 'تحديث' : 'إنشاء'}
          </Button>
        </Box>
      </Box>
    </form>
  );
}


