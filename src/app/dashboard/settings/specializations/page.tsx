'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Chip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Fullscreen,
  FullscreenExit,
  WorkOutline,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import SpecializationForm from '@/components/forms/SpecializationForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { specializationsApi, type SpecializationResponse } from '@/lib/api/specializations';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import type { SpecializationRequest } from '@/lib/api/specializations';

export default function SpecializationsPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selected, setSelected] = useState<SpecializationResponse | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: list, loading, error, execute: fetchList } = useApi(
    () => specializationsApi.getAll(false),
    { immediate: true }
  );

  const createSpec = useApiWithToast(
    async (request: SpecializationRequest) => specializationsApi.create(request),
    {
      successMessage: 'تم إنشاء التخصص بنجاح',
      onSuccess: () => {
        fetchList();
        setIsAddModalOpen(false);
        setSelected(null);
      },
    }
  );

  const updateSpec = useApiWithToast(
    async ({ id, request }: { id: number; request: SpecializationRequest }) =>
      specializationsApi.update(id, request),
    {
      successMessage: 'تم تحديث التخصص بنجاح',
      onSuccess: () => {
        fetchList();
        setIsEditModalOpen(false);
        setSelected(null);
      },
    }
  );

  const deleteSpec = useApiWithToast(
    async (id: number) => specializationsApi.delete(id),
    {
      successMessage: 'تم حذف التخصص بنجاح',
      onSuccess: () => {
        fetchList();
        setIsDeleteModalOpen(false);
        setSelected(null);
      },
    }
  );

  useRouteProtection(['Admin', 'HR Manager']);

  useEffect(() => {
    if (!sessionStorage.getItem('isLoggedIn')) router.push('/login');
  }, [router]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else document.body.style.overflow = '';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const handleAdd = () => {
    setSelected(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (row: SpecializationResponse) => {
    setSelected(row);
    setIsEditModalOpen(true);
  };

  const handleView = (row: SpecializationResponse) => {
    setSelected(row);
    setIsViewModalOpen(true);
  };

  const handleDelete = (row: SpecializationResponse) => {
    setSelected(row);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (request: SpecializationRequest) => {
    if (selected) {
      await updateSpec.execute({ id: selected.id, request });
    } else {
      await createSpec.execute(request);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selected) return;
    await deleteSpec.execute(selected.id);
  };

  const columns = useMemo<MRT_ColumnDef<SpecializationResponse>[]>(
    () => [
      { accessorKey: 'id', header: 'الرمز الداخلي', size: 80 },
      { accessorKey: 'code', header: 'رمز التخصص', size: 120 },
      { accessorKey: 'nameAr', header: 'الاسم بالعربية', size: 180 },
      { accessorKey: 'nameEn', header: 'الاسم بالإنجليزية', size: 180 },
      {
        accessorKey: 'displayOrder',
        header: 'ترتيب العرض',
        size: 100,
      },
      {
        accessorKey: 'isActive',
        header: 'الحالة',
        size: 100,
        Cell: ({ cell }) => {
          const v = cell.getValue<string>();
          return (
            <Chip
              label={v === 'Y' ? 'نشط' : 'غير نشط'}
              size="small"
              sx={{
                backgroundColor: v === 'Y' ? '#D1FAE5' : '#FEE2E2',
                color: v === 'Y' ? '#047857' : '#991B1B',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: list ?? [],
    enableRowSelection: false,
    enableColumnFilters: false,
    enableColumnResizing: true,
    enableStickyHeader: true,
    enableDensityToggle: true,
    enableFullScreenToggle: false,
    columnResizeMode: 'onChange',
    defaultColumn: { minSize: 80, maxSize: 500, size: 150 },
    initialState: { density: 'comfortable', pagination: { pageSize: 25, pageIndex: 0 } },
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
            '&:hover': { background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)' },
          }}
        >
          تخصص جديد
        </Button>
        <Tooltip title={isFullscreen ? 'إغلاق ملء الشاشة' : 'ملء الشاشة'}>
          <IconButton onClick={() => setIsFullscreen(!isFullscreen)} sx={{ color: '#0c2b7a' }}>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Tooltip>
      </Box>
    ),
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="عرض">
          <IconButton size="small" sx={{ color: '#0c2b7a' }} onClick={() => handleView(row.original)}>
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل">
          <IconButton size="small" sx={{ color: '#059669' }} onClick={() => handleEdit(row.original)}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => handleDelete(row.original)}>
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    enableRowActions: true,
    positionActionsColumn: 'last',
    displayColumnDefOptions: { 'mrt-row-actions': { header: 'الإجراءات', size: 200 } },
  });

  const viewFields = selected
    ? [
        { label: 'رمز التخصص', value: selected.code },
        { label: 'الاسم بالعربية', value: selected.nameAr },
        { label: 'الاسم بالإنجليزية', value: selected.nameEn },
        { label: 'ترتيب العرض', value: String(selected.displayOrder ?? 0) },
        { label: 'الحالة', value: selected.isActive === 'Y' ? 'نشط' : 'غير نشط' },
      ]
    : [];

  if (loading && !list) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} onRetry={fetchList} />;

  return (
    <>
      <Box sx={{ p: 2, width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <WorkOutline sx={{ color: '#0c2b7a', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#0c2b7a' }}>
            التخصصات
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          إدارة التخصصات (المسميات الوظيفية) المستخدمة في الموظفين وتعيينات العمالة.
        </Typography>
        <Box
          sx={{
            width: '100%',
            animation: isFullscreen ? 'none' : 'fadeInUp 0.6s ease-out 0.4s both',
            '@keyframes fadeInUp': {
              from: { opacity: 0, transform: 'translateY(20px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          <MaterialReactTable table={table} />
        </Box>
      </Box>

      <SpecializationForm
        open={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelected(null);
        }}
        onSubmit={handleSubmit}
        initialData={selected}
        loading={createSpec.loading || updateSpec.loading}
      />

      <ViewDetailsDialog
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelected(null);
        }}
        title="تفاصيل التخصص"
        fields={viewFields}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelected(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف التخصص"
        message="هل أنت متأكد من حذف هذا التخصص؟ قد يؤثر على الموظفين وتعيينات العمالة المرتبطة به."
        loading={deleteSpec.loading}
      />
    </>
  );
}
