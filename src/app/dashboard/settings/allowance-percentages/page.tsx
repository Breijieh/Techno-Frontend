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
  TrendingUp,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import type { AllowancePercentage } from '@/types';
import AllowancePercentageForm from '@/components/forms/AllowancePercentageForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import useRouteProtection from '@/hooks/useRouteProtection';
import { useToast } from '@/contexts/ToastContext';
import { salaryStructureApi, mergeBreakdownsToFrontend, splitFrontendToBackendRequests } from '@/lib/api/salaryStructure';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

// Extend AllowancePercentage type to include serNo values for deletion
type AllowancePercentageWithSerNo = AllowancePercentage & { saudiSerNo?: number; foreignSerNo?: number };

export default function AllowancePercentagesPage() {
  const router = useRouter();
  const toast = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPercentage, setSelectedPercentage] = useState<AllowancePercentageWithSerNo | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Protect route
  useRouteProtection(['Admin', 'Finance Manager']);

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

  // Fetch data from backend
  const { data: breakdownsData, loading: loadingBreakdowns, error: breakdownsError, execute: fetchBreakdowns } = useApi(
    () => salaryStructureApi.getAllBreakdowns(),
    { immediate: true }
  );

  // Transform backend data to frontend format
  const percentages = useMemo(() => {
    if (!breakdownsData) return [];
    return mergeBreakdownsToFrontend(breakdownsData) as AllowancePercentageWithSerNo[];
  }, [breakdownsData]);

  // Create/Update breakdown (splits into S and F requests)
  const createBreakdown = useApiWithToast(
    async (requests: ReturnType<typeof splitFrontendToBackendRequests>) => {
      // Create both Saudi and Foreign breakdowns
      const results = await Promise.all(
        requests.map((request) => salaryStructureApi.createBreakdown(request))
      );
      return results;
    },
    {
      successMessage: 'تم إنشاء نسبة البدل بنجاح',
      onSuccess: () => {
        fetchBreakdowns();
        setIsAddModalOpen(false);
        setSelectedPercentage(null);
      },
    }
  );

  const updateBreakdown = useApiWithToast(
    async (requests: ReturnType<typeof splitFrontendToBackendRequests>) => {
      // Update both Saudi and Foreign breakdowns (POST handles update automatically)
      const results = await Promise.all(
        requests.map((request) => salaryStructureApi.createBreakdown(request))
      );
      return results;
    },
    {
      successMessage: 'تم تحديث نسبة البدل بنجاح',
      onSuccess: () => {
        fetchBreakdowns();
        setIsEditModalOpen(false);
        setSelectedPercentage(null);
      },
    }
  );

  // Delete breakdown (deletes both S and F records)
  const deleteBreakdown = useApiWithToast(
    async (serNos: number[]) => {
      // Delete both Saudi and Foreign breakdowns
      await Promise.all(serNos.map((serNo) => salaryStructureApi.deleteBreakdown(serNo)));
    },
    {
      successMessage: 'تم حذف نسبة البدل بنجاح',
      onSuccess: () => {
        fetchBreakdowns();
        setIsDeleteModalOpen(false);
        setSelectedPercentage(null);
      },
    }
  );

  const handleAdd = () => {
    setSelectedPercentage(null);
    setIsAddModalOpen(true);
  };

  const handleView = (percentage: AllowancePercentageWithSerNo) => {
    setSelectedPercentage(percentage);
    setIsViewModalOpen(true);
  };

  const handleEdit = (percentage: AllowancePercentageWithSerNo) => {
    setSelectedPercentage(percentage);
    setIsEditModalOpen(true);
  };

  const handleDelete = (percentage: AllowancePercentageWithSerNo) => {
    setSelectedPercentage(percentage);
    setIsDeleteModalOpen(true);
  };

  // Saudi total must not exceed 100%; Foreign total may exceed 100%
  const validateSaudiTotalOnly = (data: Partial<AllowancePercentage>): string | null => {
    const saudiPct = data.saudiPercentage ?? 0;
    const currentSaudiTotal = percentages.reduce(
      (sum, row) => sum + (selectedPercentage?.transactionCode === row.transactionCode ? 0 : (row.saudiPercentage ?? 0)),
      0
    );
    const newSaudiTotal = currentSaudiTotal + saudiPct;
    if (newSaudiTotal > 100.01) {
      return `إجمالي نسبة السعوديين يتجاوز 100%. الإجمالي الحالي: ${newSaudiTotal.toFixed(2)}%`;
    }
    return null;
  };

  const handleSubmit = async (data: Partial<AllowancePercentage>) => {
    try {
      // Add mode: prevent adding a transaction type that already exists (use Edit instead)
      if (!selectedPercentage && data.transactionCode !== undefined) {
        const alreadyExists = percentages.some(
          (row) => row.transactionCode === data.transactionCode
        );
        if (alreadyExists) {
          toast.showError('هذا النوع موجود مسبقاً. استخدم "تعديل" لتغيير النسب.');
          return;
        }
      }
      const saudiError = validateSaudiTotalOnly(data);
      if (saudiError) {
        toast.showError(saudiError);
        return;
      }
      // Split frontend data into two backend requests (S and F)
      const requests = splitFrontendToBackendRequests(data);

      if (selectedPercentage) {
        // Update mode - POST will handle update automatically
        await updateBreakdown.execute(requests);
      } else {
        // Create mode
        await createBreakdown.execute(requests);
      }
    } catch (error) {
      console.error('Error saving percentage:', error);
      // Error is handled by useApiWithToast
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPercentage) return;

    // Find both serNo values for deletion
    const serNos: number[] = [];
    if (selectedPercentage.saudiSerNo) {
      serNos.push(selectedPercentage.saudiSerNo);
    }
    if (selectedPercentage.foreignSerNo) {
      serNos.push(selectedPercentage.foreignSerNo);
    }

    if (serNos.length === 0) {
      // If serNo values are not available, try to find them from current data
      const currentBreakdowns = breakdownsData || [];
      const matchingSaudi = currentBreakdowns.find(
        (b) => b.transTypeCode === selectedPercentage.transactionCode && b.employeeCategory === 'S'
      );
      const matchingForeign = currentBreakdowns.find(
        (b) => b.transTypeCode === selectedPercentage.transactionCode && b.employeeCategory === 'F'
      );

      if (matchingSaudi) serNos.push(matchingSaudi.serNo);
      if (matchingForeign) serNos.push(matchingForeign.serNo);
    }

    if (serNos.length === 0) {
      console.error('Could not find serNo values for deletion');
      return;
    }

    try {
      await deleteBreakdown.execute(serNos);
    } catch (error) {
      console.error('Error deleting percentage:', error);
      // Error is handled by useApiWithToast
    }
  };

  const columns = useMemo<MRT_ColumnDef<AllowancePercentageWithSerNo>[]>(
    () => [
      {
        accessorKey: 'recordId',
        header: 'الرمز',
        size: 80,
      },
      {
        accessorKey: 'transactionName',
        header: 'نوع المعاملة',
        size: 250,
      },
      {
        accessorKey: 'saudiPercentage',
        header: 'نسبة السعودي %',
        size: 120,
        Cell: ({ row }) => `${row.original.saudiPercentage}%`,
      },
      {
        accessorKey: 'nonSaudiPercentage',
        header: 'نسبة غير السعودي %',
        size: 120,
        Cell: ({ row }) => `${row.original.nonSaudiPercentage}%`,
      },
      {
        accessorKey: 'isActive',
        header: 'الحالة',
        size: 100,
        Cell: ({ row }) => (
          <Chip
            label={row.original.isActive ? 'نشط' : 'غير نشط'}
            color={row.original.isActive ? 'success' : 'default'}
            size="small"
          />
        ),
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: percentages,
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
            color: '#FFFFFF',
            '& .MuiSvgIcon-root': {
              color: '#FFFFFF',
            },
            '&:hover': {
              background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
            },
          }}
        >
          إضافة نسبة
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
            onClick={() => handleView(row.original)}
            sx={{
              color: '#0c2b7a',
              '&:hover': {
                backgroundColor: 'rgba(12, 43, 122, 0.08)',
              },
            }}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل">
          <IconButton
            size="small"
            onClick={() => handleEdit(row.original)}
            sx={{
              color: '#059669',
              '&:hover': {
                backgroundColor: 'rgba(5, 150, 105, 0.08)',
              },
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton
            size="small"
            onClick={() => handleDelete(row.original)}
            sx={{
              color: '#DC2626',
              '&:hover': {
                backgroundColor: 'rgba(220, 38, 38, 0.08)',
              },
            }}
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

  const tableWrapper = loadingBreakdowns ? (
    <LoadingSpinner />
  ) : breakdownsError ? (
    <ErrorDisplay error={breakdownsError} onRetry={fetchBreakdowns} />
  ) : (
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
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
              نسب بدلات الرواتب - ملء الشاشة
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
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
              نسب البدلات
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              إدارة نسب تفصيل الراتب للموظفين السعوديين وغير السعوديين
            </Typography>
          </Box>
          {tableWrapper}
        </Box>
      </Box>

      {/* Modals */}
      <AllowancePercentageForm
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSubmit}
        loading={createBreakdown.loading}
        existingTransactionCodes={percentages.map((p) => p.transactionCode)}
      />

      <AllowancePercentageForm
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={selectedPercentage}
        loading={updateBreakdown.loading}
      />

      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="حذف نسبة البدل"
        message={`هل أنت متأكد من حذف تكوين النسبة لـ ${selectedPercentage?.transactionName}؟`}
        loading={deleteBreakdown.loading}
      />

      <ViewDetailsDialog
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedPercentage(null);
        }}
        title="تفاصيل نسبة البدل"
        fields={
          selectedPercentage
            ? [
              {
                label: 'الرقم',
                value: `#${selectedPercentage.recordId}`,
              },
              {
                label: 'نوع المعاملة',
                value: selectedPercentage.transactionName || 'غير متاح',
              },
              {
                label: 'النسبة السعودية',
                value: `${selectedPercentage.saudiPercentage}%`,
              },
              {
                label: 'النسبة غير السعودية',
                value: `${selectedPercentage.nonSaudiPercentage}%`,
              },
              {
                label: 'الحالة',
                value: selectedPercentage.isActive ? 'نشط' : 'غير نشط',
                type: 'chip',
                chipColor: selectedPercentage.isActive
                  ? { bg: '#D1FAE5', text: '#065F46' }
                  : { bg: '#F3F4F6', text: '#6B7280' },
              },
            ]
            : []
        }
      />
    </>
  );
}

