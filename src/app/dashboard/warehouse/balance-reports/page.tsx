'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Chip,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Download,
  Assessment,
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
import type { StoreItemBalance as ItemBalance } from '@/types';
import { exportTableToCSV } from '@/lib/utils/exportUtils';
import useRouteProtection from '@/hooks/useRouteProtection';
import { warehouseApi, type BalanceResponse, type StoreSummary } from '@/lib/api/warehouse';
import { useApi } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

export default function BalanceReportsPage() {
  const router = useRouter();
  const [selectedStore, setSelectedStore] = useState<number | 'all'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch data from backend
  const { data: balancesData, loading: loadingBalances, error: errorBalances, execute: refetchBalances } = useApi(
    () => warehouseApi.getAllBalances(selectedStore === 'all' ? undefined : selectedStore),
    { immediate: true }
  );
  const { data: stores, loading: loadingStores, error: errorStores } = useApi(
    () => warehouseApi.getAllStores(),
    { immediate: true }
  );
  const { data: items, loading: loadingItems, error: errorItems } = useApi(
    () => warehouseApi.getAllItems(),
    { immediate: true }
  );

  // Protect route
  useRouteProtection(['Admin', 'Warehouse Manager', 'Project Manager']);

  // Refetch balances when store filter changes
  useEffect(() => {
    if (selectedStore !== undefined) {
      refetchBalances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

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

  // Mapper function: Convert BalanceResponse to StoreItemBalance with backend data
  const mapBalanceResponseToStoreItemBalance = (balance: BalanceResponse, stores: StoreSummary[]): ItemBalance & {
    itemName?: string;
    storeName?: string;
    balanceDetails?: BalanceResponse;
  } => {
    const store = stores.find(s => s.storeCode === balance.storeCode);
    return {
      projectCode: store?.projectCode || 0,
      storeCode: balance.storeCode,
      itemCode: balance.itemCode,
      itemBalance: balance.quantityOnHand,
      // Backend-provided names
      itemName: balance.itemName,
      storeName: balance.storeName,
      // Store full balance details for status calculation
      balanceDetails: balance,
    };
  };

  // Map balances to frontend format
  const balances = useMemo(() => {
    if (!balancesData || !stores || balancesData.length === 0) return [];
    return balancesData
      .filter(balance => balance != null)
      .map(balance => mapBalanceResponseToStoreItemBalance(balance, stores))
      .filter(balance => balance != null);
  }, [balancesData, stores]);

  const getItemName = useCallback((balance: ItemBalance) => {
    // Use backend-provided item name if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((balance as any).itemName) {
      return (balance as any).itemName;
    }
    // Fallback to item lookup
    const item = items?.find(i => i.itemCode === balance.itemCode);
    return item?.itemName || 'غير متاح';
  }, [items]);

  const getStoreName = useCallback((balance: ItemBalance) => {
    // Use backend-provided store name if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((balance as any).storeName) {
      return (balance as any).storeName;
    }
    // Fallback to store lookup
    const store = stores?.find(s => s.storeCode === balance.storeCode);
    return store?.storeName || 'غير متاح';
  }, [stores]);

  // Get balance details for status calculation
  const getBalanceDetails = useCallback((balance: ItemBalance): BalanceResponse | undefined => {
    // Use stored balance details if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((balance as any).balanceDetails) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (balance as any).balanceDetails;
    }
    // Fallback: find from balancesData
    return balancesData?.find(b => b.itemCode === balance.itemCode && b.storeCode === balance.storeCode);
  }, [balancesData]);

  const columns = useMemo<MRT_ColumnDef<ItemBalance>[]>(
    () => [
      {
        accessorKey: 'itemCode',
        header: 'العنصر',
        size: 220,
        Cell: ({ row }) => getItemName(row.original),
      },
      {
        accessorKey: 'storeCode',
        header: 'المستودع',
        size: 180,
        Cell: ({ row }) => getStoreName(row.original),
      },
      {
        accessorKey: 'itemBalance',
        header: 'الرصيد',
        size: 120,
        Cell: ({ row, cell }) => {
          const balance = cell.getValue<number>();
          const balanceDetails = getBalanceDetails(row.original);
          const reorderLevel = balanceDetails?.reorderLevel || 0;
          const color = balanceDetails?.isBelowReorderLevel
            ? '#DC2626'
            : balance <= reorderLevel * 1.5
              ? '#F59E0B'
              : '#059669';

          return (
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color }}>
              {balance}
            </Typography>
          );
        },
      },
      {
        id: 'status',
        header: 'الحالة',
        size: 140,
        Cell: ({ row }) => {
          const balance = row.original.itemBalance;
          const balanceDetails = getBalanceDetails(row.original);
          const reorderLevel = balanceDetails?.reorderLevel || 0;

          let label = 'جيد';
          let colors = { bg: '#D1FAE5', text: '#065F46' };

          if (balanceDetails?.isBelowReorderLevel || (reorderLevel > 0 && balance <= reorderLevel)) {
            label = 'أقل من الحد الأدنى';
            colors = { bg: '#FEE2E2', text: '#991B1B' };
          } else if (reorderLevel > 0 && balance <= reorderLevel * 1.5) {
            label = 'مخزون منخفض';
            colors = { bg: '#FEF3C7', text: '#92400E' };
          }

          return (
            <Chip
              label={label}
              size="small"
              sx={{
                backgroundColor: colors.bg,
                color: colors.text,
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
      },
    ],
    [getBalanceDetails, getItemName, getStoreName],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = useMaterialReactTable<any>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (balances || []) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getRowId: (row: any) => `${row.projectCode}-${row.storeCode}-${row.itemCode}`,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderTopToolbarCustomActions: ({ table }: { table: any }) => {
      const handleExport = () => {
        const rows = table.getPrePaginationRowModel().rows;

        // Filter out rows with null/undefined original data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validRows = rows.filter((row: any) => row.original != null && typeof row.original === 'object');

        if (validRows.length === 0) {
          console.warn('No data to export');
          return;
        }

        let storeName = 'all-stores';
        if (selectedStore !== 'all') {
          const store = stores?.find(s => s.storeCode === selectedStore);
          storeName = (store?.storeName || selectedStore.toString())
            .replace(/\s+/g, '-').toLowerCase();
        }

        exportTableToCSV(validRows, `stock-balance-report-${storeName}`, {
          itemCode: 'رمز العنصر',
          storeCode: 'رمز المستودع',
          itemBalance: 'الرصيد',
          projectCode: 'رمز المشروع',
        });
      };

      return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            select
            size="small"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            SelectProps={{ displayEmpty: true }}
            sx={{
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#FFFFFF',
                '& fieldset': {
                  borderColor: '#E5E7EB',
                },
                '&:hover fieldset': {
                  borderColor: '#0c2b7a',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#0c2b7a',
                  borderWidth: '2px',
                },
              },
              '& .MuiSelect-select': {
                color: selectedStore && selectedStore !== 'all' ? '#111827' : '#9CA3AF',
              },
            }}
          >
            <MenuItem value="all">جميع المستودعات</MenuItem>
            {stores?.map((store) => (
              <MenuItem key={store.storeCode} value={store.storeCode}>
                {store.storeName}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#0c2b7a',
              color: '#0c2b7a',
              '&:hover': {
                borderColor: '#0a266e',
                backgroundColor: 'rgba(12, 43, 122, 0.04)',
              },
            }}
          >
            تصدير التقرير
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
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

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
              تقارير أرصدة المخزون - ملء الشاشة
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
            {loadingBalances || loadingStores || loadingItems ? (
              <LoadingSpinner />
            ) : errorBalances || errorStores || errorItems ? (
              <ErrorDisplay
                message={errorBalances || errorStores || errorItems || 'فشل تحميل بيانات الأرصدة'}
                onRetry={() => {
                  refetchBalances();
                }}
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
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
            >
              تقارير أرصدة المخزون
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              أرصدة المخزون في الوقت الفعلي مع تنبيهات المخزون المنخفض
            </Typography>
          </Box>

          {loadingBalances || loadingStores || loadingItems ? (
            <LoadingSpinner />
          ) : errorBalances || errorStores || errorItems ? (
            <ErrorDisplay
              message={errorBalances || errorStores || errorItems || 'فشل تحميل بيانات الأرصدة'}
              onRetry={() => {
                refetchBalances();
              }}
            />
          ) : (
            tableWrapper
          )}
        </Box>
      </Box>
    </>
  );
}


