'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import {
  Download,
  Inventory2,
} from '@mui/icons-material';
import SafeECharts from '@/components/common/SafeECharts';
import type { EChartsOption } from 'echarts';
import useRouteProtection from '@/hooks/useRouteProtection';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import { warehouseApi } from '@/lib/api/warehouse';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { getChartTranslations, getResponsiveChartOption } from '@/lib/charts/echarts-config';

export default function InventoryReportsPage() {
  const router = useRouter();
  const [language] = useState<'en' | 'ar'>(() => {
    if (typeof window === 'undefined') return 'ar';
    const savedLanguage = sessionStorage.getItem('language') as 'en' | 'ar' | null;
    return savedLanguage || 'ar';
  });
  const chartT = getChartTranslations(language);

  // Protect route
  useRouteProtection(['Admin', 'Warehouse Manager']);

  const { showSuccess, showError } = useToast();

  // Fetch all data in parallel
  const {
    data: itemsData,
    loading: loadingItems,
    error: itemsError,
  } = useApi(() => warehouseApi.getAllItems(), { immediate: true });

  const {
    data: categoriesData,
    loading: loadingCategories,
    error: categoriesError,
  } = useApi(() => warehouseApi.getAllCategories(), { immediate: true });

  const {
    data: balancesData,
    loading: loadingBalances,
    error: balancesError,
  } = useApi(() => warehouseApi.getAllBalances(), { immediate: true });

  const {
    data: storesData,
    loading: loadingStores,
    error: storesError,
  } = useApi(() => warehouseApi.getAllStores(), { immediate: true });

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

  // Calculate statistics from real data
  const stats = useMemo(() => {
    const items = Array.isArray(itemsData) ? itemsData : [];
    const balances = Array.isArray(balancesData) ? balancesData : [];

    if (items.length === 0) {
      return {
        totalItems: 0,
        activeItems: 0,
        lowStock: 0,
        totalValue: 0,
      };
    }

    const activeItems = items.filter(i => i.isActive !== false).length;

    // Calculate low stock items (balance <= reorderLevel * 1.5)
    const lowStockCount = balances.filter(b => {
      const item = items.find(i => i.itemCode === b.itemCode);
      if (!item || !item.reorderLevel) return false;
      return b.quantityOnHand <= (item.reorderLevel * 1.5);
    }).length;

    // Calculate total value (sum of quantityOnHand for all balances)
    // Note: We don't have lastPurchasePrice in the current data structure
    const totalValue = balances.reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);

    return {
      totalItems: items.length,
      activeItems,
      lowStock: lowStockCount,
      totalValue,
    };
  }, [itemsData, balancesData]);

  const handleExport = () => {
    try {
      const items = Array.isArray(itemsData) ? itemsData : [];
      const categories = Array.isArray(categoriesData) ? categoriesData : [];
      const balances = Array.isArray(balancesData) ? balancesData : [];
      const stores = Array.isArray(storesData) ? storesData : [];

      if (items.length === 0) {
        showError('لا توجد بيانات مخزون متاحة للتصدير');
        return;
      }

      // Create maps for quick lookup
      const categoryMap = new Map(categories.map(c => [c.categoryCode, c]));
      const storeMap = new Map(stores.map(s => [s.storeCode, s]));

      // Prepare export data with item details and balances
      const exportData = items.map(item => {
        const category = categoryMap.get(item.categoryCode);
        // Get first balance for this item (or aggregate if multiple stores)
        const itemBalances = balances.filter(b => b.itemCode === item.itemCode);
        const totalBalance = itemBalances.reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);
        const firstBalance = itemBalances[0];
        const store = firstBalance ? storeMap.get(firstBalance.storeCode) : null;

        // Determine stock status
        let stockStatus = 'جيد';
        if (item.reorderLevel) {
          if (totalBalance <= item.reorderLevel) {
            stockStatus = 'حرج';
          } else if (totalBalance <= item.reorderLevel * 1.5) {
            stockStatus = 'مخزون منخفض';
          }
        }

        return {
          'Item Code': item.itemCode,
          'Item Name': item.itemName,
          'Category': category?.categoryName || 'غير متاح',
          'Store': store?.storeName || 'غير متاح',
          'Current Balance': totalBalance,
          'Min Stock': item.reorderLevel || 0,
          'Max Stock': 'غير متاح', // Not in current data structure
          'Last Purchase Price': 'غير متاح', // Not in current data structure
          'Total Value': `${totalBalance.toLocaleString()} ريال`, // Simplified value
          'Stock Status': stockStatus,
          'Is Active': item.isActive !== false ? 'نعم' : 'لا',
        };
      });

      // Add summary row
      const summaryRow = {
        'Item Code': '',
        'Item Name': 'ملخص',
        'Category': '',
        'Store': '',
        'Current Balance': '',
        'Min Stock': '',
        'Max Stock': '',
        'Last Purchase Price': '',
        'Total Value': `${stats.totalValue.toLocaleString()} ريال`,
        'Stock Status': `إجمالي العناصر: ${stats.totalItems}, نشط: ${stats.activeItems}, مخزون منخفض: ${stats.lowStock}`,
        'Is Active': '',
      };

      exportDataToCSV([...exportData, summaryRow], 'inventory-report', {
        'Item Code': 'رمز العنصر',
        'Item Name': 'اسم العنصر',
        'Category': 'الفئة',
        'Store': 'المستودع',
        'Current Balance': 'الرصيد الحالي',
        'Min Stock': 'الحد الأدنى للمخزون',
        'Max Stock': 'الحد الأقصى للمخزون',
        'Last Purchase Price': 'سعر الشراء الأخير',
        'Total Value': 'إجمالي القيمة',
        'Stock Status': 'حالة المخزون',
        'Is Active': 'نشط',
      });

      showSuccess('تم تصدير تقرير المخزون بنجاح');
    } catch (error) {
      console.error('Export error:', error);
      showError('فشل تصدير تقرير المخزون. يرجى المحاولة مرة أخرى.');
    }
  };

  const categoryChart = useMemo(() => {
    const items = Array.isArray(itemsData) ? itemsData : [];
    const categories = Array.isArray(categoriesData) ? categoriesData : [];
    const balances = Array.isArray(balancesData) ? balancesData : [];

    const categoryData = categories.map(cat => {
      const categoryItems = items.filter(i => i.categoryCode === cat.categoryCode);
      const categoryBalances = balances.filter(b =>
        categoryItems.some(item => item.itemCode === b.itemCode)
      );
      const totalQuantity = categoryBalances.reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);
      return { name: cat.categoryName, value: totalQuantity };
    });

    const option = {
      title: { text: chartT.stockByCategory, left: 'center', textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' } },
      tooltip: { trigger: 'item' as const },
      series: [{
        type: 'pie' as const,
        radius: ['40%', '70%'],
        data: categoryData,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      }],
    } as EChartsOption;

    return getResponsiveChartOption(option, 'ar');
  }, [itemsData, categoriesData, balancesData, chartT]);

  const stockStatusChart = useMemo(() => {
    const items = Array.isArray(itemsData) ? itemsData : [];
    const balances = Array.isArray(balancesData) ? balancesData : [];

    let good = 0, low = 0, critical = 0;

    balances.forEach(balance => {
      const item = items.find(i => i.itemCode === balance.itemCode);
      if (item && item.reorderLevel) {
        if (balance.quantityOnHand <= item.reorderLevel) {
          critical++;
        } else if (balance.quantityOnHand <= item.reorderLevel * 1.5) {
          low++;
        } else {
          good++;
        }
      } else {
        good++; // If no reorder level, consider it good
      }
    });

    const option = {
      title: { text: chartT.stockStatus, left: 'center', textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' } },
      tooltip: { trigger: 'item' as const },
      series: [{
        type: 'pie' as const,
        radius: ['40%', '70%'],
        data: [
          { value: good, name: chartT.good, itemStyle: { color: '#059669' } },
          { value: low, name: chartT.lowStock, itemStyle: { color: '#F59E0B' } },
          { value: critical, name: chartT.critical, itemStyle: { color: '#DC2626' } },
        ],
      }],
    } as EChartsOption;

    return getResponsiveChartOption(option, 'ar');
  }, [itemsData, balancesData, chartT]);

  return (
    <Box
      sx={{
        flex: 1,
        backgroundColor: '#F8F9FC',
      }}
    >
      <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
        {(loadingItems || loadingCategories || loadingBalances || loadingStores) && <LoadingSpinner />}
        {(itemsError || categoriesError || balancesError || storesError) && (
          <ErrorDisplay
            message={itemsError || categoriesError || balancesError || storesError || 'فشل تحميل بيانات المخزون'}
            onRetry={() => {
              // Retry will be handled by useApi hooks automatically
            }}
          />
        )}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeInUp 0.6s ease-out 0.2s both', '@keyframes fadeInUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
              تقارير المخزون
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              مستويات المخزون والفئات وتحليلات المستودع
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={loadingItems || loadingCategories || loadingBalances || loadingStores || !itemsData || itemsData.length === 0}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#0c2b7a',
              color: '#0c2b7a',
              '&:hover': {
                borderColor: '#0a266e',
                backgroundColor: 'rgba(12, 43, 122, 0.04)'
              },
              '&:disabled': {
                borderColor: '#D1D5DB',
                color: '#9CA3AF',
              },
            }}
          >
            تصدير التقرير
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 3,
            mb: 3,
          }}
        >
          {[
            { label: 'إجمالي العناصر', value: stats.totalItems, color: '#0c2b7a' },
            { label: 'العناصر النشطة', value: stats.activeItems, color: '#059669' },
            { label: 'عناصر المخزون المنخفض', value: stats.lowStock, color: '#F59E0B' },
            { label: 'إجمالي القيمة', value: `${(stats.totalValue / 1000).toFixed(0)} ألف ريال`, color: '#3b82f6' },
          ].map((stat, index) => (
            <Paper key={index} sx={{ padding: 2, borderRadius: '12px', animation: `fadeInUp 0.6s ease-out ${0.3 + index * 0.1}s both` }}>
              <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>{stat.label}</Typography>
              <Typography sx={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</Typography>
            </Paper>
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
            },
            gap: 3,
          }}
        >
          <Paper sx={{ padding: 3, borderRadius: '12px', animation: 'fadeInUp 0.6s ease-out 0.7s both', minHeight: '400px' }}>
            {loadingItems || loadingCategories || loadingBalances ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Typography>جاري التحميل...</Typography>
              </Box>
            ) : (
              <SafeECharts option={categoryChart} style={{ height: '400px', width: '100%' }} />
            )}
          </Paper>
          <Paper sx={{ padding: 3, borderRadius: '12px', animation: 'fadeInUp 0.6s ease-out 0.8s both', minHeight: '400px' }}>
            {loadingItems || loadingBalances ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Typography>جاري التحميل...</Typography>
              </Box>
            ) : (
              <SafeECharts option={stockStatusChart} style={{ height: '400px', width: '100%' }} />
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}


