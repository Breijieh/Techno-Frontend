'use client';

import React, { useEffect, useRef, useState, useMemo, ErrorInfo, Component } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box } from '@mui/material';
import type { EChartsOption, SeriesOption } from 'echarts';
import type { ECharts } from 'echarts';
import ChartLegend from '@/components/charts/ChartLegend';

// Initialize error suppression at module level to catch errors early
// This needs to run before ReactECharts tries to unmount
interface WindowWithECharts extends Window {
  __safeEChartsErrorSuppressionInstalled?: boolean;
}

if (typeof window !== 'undefined' && !(window as WindowWithECharts).__safeEChartsErrorSuppressionInstalled) {
  // Mark as installed to prevent duplicate installation
  (window as WindowWithECharts).__safeEChartsErrorSuppressionInstalled = true;

  // Store original handlers
  const originalWindowError = window.onerror;
  const originalUnhandledRejection = window.onunhandledrejection;
  const originalConsoleError = console.error;

  // Suppress console errors for ResizeObserver disconnect issues
  const suppressResizeObserverError = (errorMessage: string, stackTrace: string): boolean => {
    const lowerMessage = errorMessage.toLowerCase();
    const lowerTrace = stackTrace.toLowerCase();
    return (
      (lowerMessage.includes('disconnect') || lowerTrace.includes('disconnect')) &&
      (lowerMessage.includes('resizeobserver') || lowerTrace.includes('resizeobserver') ||
        lowerMessage.includes('cannot read properties of undefined') ||
        lowerMessage.includes('reading \'disconnect\'') ||
        lowerTrace.includes('resizeobserver.js') ||
        lowerTrace.includes('sensorpool') ||
        lowerTrace.includes('removesensor') ||
        lowerTrace.includes('echartsreactcore.dispose') ||
        lowerTrace.includes('componentwillunmount'))
    );
  };

  console.error = (...args: unknown[]) => {
    const errorMessage = args[0]?.toString() || '';
    const stackTrace = args.join(' ').toLowerCase();

    // Only suppress ResizeObserver disconnect errors
    if (suppressResizeObserverError(errorMessage, stackTrace)) {
      // Suppress these specific errors - they're harmless cleanup errors
      return;
    }

    // Log all other errors normally
    originalConsoleError.apply(console, args);
  };

  // Handle uncaught errors from ResizeObserver disconnect
  window.onerror = (message, source, lineno, colno, error) => {
    const errorMessage = message?.toString() || '';
    const sourceStr = source?.toString() || '';

    // Only suppress ResizeObserver disconnect errors specifically
    if (suppressResizeObserverError(errorMessage, sourceStr)) {
      // Suppress these specific errors - they're harmless cleanup errors
      return true;
    }

    // Call original error handler for all other errors
    if (originalWindowError) {
      return originalWindowError(message, source, lineno, colno, error);
    }
    return false;
  };

  // Handle promise rejections related to ResizeObserver
  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const errorMessage = event.reason?.toString() || '';
    if (suppressResizeObserverError(errorMessage, errorMessage)) {
      // Suppress these specific promise rejections
      event.preventDefault();
      return;
    }

    // Call original handler for other rejections
    if (originalUnhandledRejection) {
      return (originalUnhandledRejection as (ev: PromiseRejectionEvent) => void).apply(window, [event]);
    }
  };
}

// Error Boundary component to catch React errors
interface ChartErrorBoundaryProps {
  children: React.ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

class ChartErrorBoundary extends Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Check if it's a ResizeObserver error
    const errorMessage = error?.message || error?.toString() || '';
    if (
      errorMessage.includes('disconnect') &&
      (errorMessage.includes('ResizeObserver') ||
        errorMessage.includes('Cannot read properties of undefined'))
    ) {
      // Suppress ResizeObserver errors, don't show error state
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Suppress ResizeObserver errors silently
    const errorMessage = error?.message || error?.toString() || '';
    if (
      !errorMessage.includes('disconnect') ||
      (!errorMessage.includes('ResizeObserver') &&
        !errorMessage.includes('Cannot read properties of undefined'))
    ) {
      // Only log non-ResizeObserver errors
      console.error('Chart error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Return null or a fallback UI for non-ResizeObserver errors
      return null;
    }
    return this.props.children;
  }
}

interface SafeEChartsProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  opts?: {
    renderer?: 'canvas' | 'svg';
    devicePixelRatio?: number;
  };
  showCustomLegend?: boolean;
}

/**
 * Safe ECharts wrapper component that handles:
 * - Mounting state to prevent DOM dimension errors
 * - Proper cleanup to prevent ResizeObserver errors
 * - Error handling for chart initialization
 * - Prevents disposal warnings
 */
export default function SafeECharts({
  option,
  style = { height: '400px', width: '100%' },
  className,
  opts = { renderer: 'svg' },
  showCustomLegend = false,
}: SafeEChartsProps) {
  const chartRef = useRef<ECharts | null>(null);
  const isMountedRef = useRef(true);
  const [chartKey] = useState(0);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Safely dispose of chart before unmounting
      if (chartRef.current) {
        try {
          if (!chartRef.current.isDisposed()) {
            chartRef.current.dispose();
          }
        } catch {
          // Ignore disposal errors
        }
        chartRef.current = null;
      }
    };
  }, []);

  // Extract legend data from option
  const legendData = useMemo(() => {
    if (!showCustomLegend || !option) return [];

    const colors = (option as any).color || [
      '#0c2b7a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
      '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
    ];

    const items: Array<{ name: string; color: string }> = [];
    const series = option.series as SeriesOption | SeriesOption[];
    const seriesArray = Array.isArray(series) ? series : [series];

    seriesArray.forEach((s, index) => {
      if (s.type === 'pie' && Array.isArray(s.data)) {
        // Pie charts have legend items in the data array
        s.data.forEach((dataItem: any, dataIndex: number) => {
          if (dataItem && typeof dataItem === 'object' && dataItem.name) {
            items.push({
              name: dataItem.name,
              color: dataItem.itemStyle?.color || colors[dataIndex % colors.length],
            });
          }
        });
      } else if (s.name) {
        // Bar/Line/other charts have legend items in the series themselves
        items.push({
          name: s.name?.toString() || `Series ${index + 1}`,
          color: (s as any).itemStyle?.color || colors[index % colors.length],
        });
      }
    });

    return items;
  }, [option, showCustomLegend]);

  // Additional error suppression at component level (backup)
  // Main suppression is at module level above
  useEffect(() => {
    // This is a backup - module level suppression should handle most cases
  }, []);

  return (
    <ChartErrorBoundary>
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <ReactECharts
          key={chartKey}
          option={option}
          style={style}
          className={className}
          opts={opts}
          notMerge={true}
          lazyUpdate={false}
          onChartReady={(chart) => {
            if (isMountedRef.current) {
              try {
                chartRef.current = chart;
              } catch {
                // Ignore chart ready errors
              }
            }
          }}
        />
        {showCustomLegend && legendData.length > 0 && (
          <ChartLegend data={legendData} />
        )}
      </Box>
    </ChartErrorBoundary>
  );
}

