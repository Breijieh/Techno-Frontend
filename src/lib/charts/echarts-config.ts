/**
 * ECharts Configuration
 * 
 * This file contains shared configuration and utilities for ECharts charts.
 * Use ECharts for all chart/analysis visualizations in this project.
 */

import type { EChartsOption } from 'echarts';

/**
 * Chart translation labels
 */
export const chartTranslations = {
  en: {
    total: 'Total',
    count: 'Count',
    average: 'Average',
    percentage: 'Percentage',
    date: 'Date',
    amount: 'Amount',
    quantity: 'Quantity',
    employees: 'Employees',
    projects: 'Projects',
    clickToViewDetails: 'Click to view details',
    users: 'Users',
    actions: 'Actions',
    sar: 'SAR',
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    earlyOut: 'Early Out',
    active: 'Active',
    completed: 'Completed',
    onHold: 'On Hold',
    paid: 'Paid',
    unpaid: 'Unpaid',
    partial: 'Partial',
    good: 'Good',
    lowStock: 'Low Stock',
    critical: 'Critical',
    activeUsers: 'Active Users',
    dailyActiveUsers: 'Daily Active Users',
    moduleUsage: 'Module Usage',
    attendanceStatusDistribution: 'Attendance Status Distribution',
    dailyAttendanceTrend: 'Daily Attendance Trend',
    projectStatus: 'Project Status',
    paymentStatus: 'Payment Status',
    stockByCategory: 'Stock by Category',
    stockStatus: 'Stock Status',
  },
  ar: {
    total: 'الإجمالي',
    count: 'العدد',
    average: 'المتوسط',
    percentage: 'النسبة المئوية',
    date: 'التاريخ',
    amount: 'المبلغ',
    quantity: 'الكمية',
    employees: 'الموظفون',
    projects: 'المشاريع',
    clickToViewDetails: 'انقر لعرض التفاصيل',
    users: 'المستخدمون',
    actions: 'الإجراءات',
    sar: 'ريال',
    present: 'حاضر',
    absent: 'غائب',
    late: 'متأخر',
    earlyOut: 'مغادرة مبكرة',
    active: 'نشط',
    completed: 'مكتمل',
    onHold: 'معلق',
    paid: 'مدفوع',
    unpaid: 'غير مدفوع',
    partial: 'جزئي',
    good: 'جيد',
    lowStock: 'مخزون منخفض',
    critical: 'حرج',
    activeUsers: 'المستخدمون النشطون',
    dailyActiveUsers: 'المستخدمون النشطون اليوميون',
    moduleUsage: 'استخدام الوحدات',
    attendanceStatusDistribution: 'توزيع حالة الحضور',
    dailyAttendanceTrend: 'اتجاه الحضور اليومي',
    projectStatus: 'حالة المشروع',
    paymentStatus: 'حالة الدفع',
    stockByCategory: 'المخزون حسب الفئة',
    stockStatus: 'حالة المخزون',
  },
};

/**
 * Get chart translations based on language
 */
export const getChartTranslations = (language: 'en' | 'ar' = 'ar') => {
  return chartTranslations[language];
};

/**
 * Default ECharts theme configuration
 */
export const defaultChartTheme: EChartsOption = {
  color: ['#0c2b7a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: '"Almarai", "El Messiri", "IBM Plex Sans Arabic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  title: {
    textStyle: {
      fontWeight: 700,
      color: '#111827',
    },
  },
  grid: {
    containLabel: true,
    left: '3%',
    right: '4%',
    bottom: '5%',
    top: '12%',
  },
  legend: {
    itemGap: 25,
    textStyle: {
      color: '#4B5563',
      fontWeight: 600,
      padding: [0, 0, 0, 4], // Default padding for LTR
    },
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 0,
    shadowBlur: 10,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffsetX: 0,
    shadowOffsetY: 2,
    textStyle: {
      color: '#111827',
      fontWeight: 600,
    },
  },
};

/**
 * Responsive chart configuration
 */
export const getResponsiveChartOption = (
  baseOption: EChartsOption,
  language: 'en' | 'ar' = 'ar',
  showInternalLegend: boolean = true
): EChartsOption => {
  const isAr = language === 'ar';

  // Merge base legend with RTL/LTR specific settings
  const mergedLegend = baseOption.legend ? {
    ...defaultChartTheme.legend,
    ...(Array.isArray(baseOption.legend) ? baseOption.legend[0] : baseOption.legend),
    align: isAr ? 'right' : 'left',
    itemAlign: isAr ? 'right' : 'left',
    itemGap: 25,
    textStyle: {
      ...(defaultChartTheme.legend as any)?.textStyle,
      ...(Array.isArray(baseOption.legend) ? (baseOption.legend[0] as any)?.textStyle : (baseOption.legend as any)?.textStyle),
      padding: isAr ? [0, 12, 0, 0] : [0, 0, 0, 12],
      verticalAlign: 'middle',
    }
  } : undefined;

  return {
    ...defaultChartTheme,
    ...baseOption,
    legend: (showInternalLegend ? (mergedLegend || {
      ...defaultChartTheme.legend,
      align: isAr ? 'right' : 'left',
      itemAlign: isAr ? 'right' : 'left',
      itemGap: 25,
      textStyle: {
        ...(defaultChartTheme.legend as any)?.textStyle,
        padding: isAr ? [0, 12, 0, 0] : [0, 0, 0, 12],
        verticalAlign: 'middle',
      }
    }) : { show: false }) as any,
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
  };
};

/**
 * Common chart types configuration examples
 */
export const chartConfigs = {
  line: {
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
  },
  bar: {
    type: 'bar',
    barWidth: '60%',
  },
  pie: {
    type: 'pie',
    radius: ['40%', '70%'],
    avoidLabelOverlap: true,
    label: {
      show: true,
      formatter: '{b}: {c} ({d}%)',
    },
  },
  map3D: {
    type: 'map3D',
    // Add 3D map configurations as needed
  },
};
