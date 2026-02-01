'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  Paper,
  Alert,
} from '@mui/material';
import {
  Download,
  Summarize,
} from '@mui/icons-material';
import SafeECharts from '@/components/common/SafeECharts';
import { getUserRole } from '@/lib/permissions';
import { filterPayrollByRole, filterEmployeesByRole } from '@/lib/dataFilters';
import useRouteProtection from '@/hooks/useRouteProtection';
import { payrollApi, employeesApi, departmentsApi, reportsApi } from '@/lib/api';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';
import type { Employee } from '@/types';
import { formatDateGregorian } from '@/lib/utils/dateFormatter';
import type { DepartmentResponse } from '@/lib/api/departments';
import type { EmployeeResponse } from '@/lib/api/employees';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatNumber } from '@/lib/utils/numberFormatter';

export default function PayrollReportsPage() {
  const router = useRouter();
  const toast = useToast();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const userRole = getUserRole();

  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'General Manager', 'Finance Manager', 'Employee']);

  // Get current user's employee data for Employee role
  const { data: employeeResponse, loading: loadingEmployee, error: employeeError } = useApi<EmployeeResponse>(
    () => employeesApi.getMyEmployee(),
    { immediate: userRole === 'Employee' }
  );

  // Extract employeeNo for Employee role
  const employeeNo = userRole === 'Employee' ? employeeResponse?.employeeNo : undefined;

  // Fetch payroll data for selected month
  const { data: payrollData, loading: loadingPayroll, execute: loadPayroll } = useApi(
    () => payrollApi.getPayrollByMonth(selectedMonth, { page: 0, size: 1000 }),
    { immediate: false }
  );

  // Fetch employees (cache once on mount)
  const { data: employeesData, execute: loadEmployees } = useApi(
    () => employeesApi.getAllEmployees({ page: 0, size: 1000 }),
    { immediate: false }
  );

  // Fetch departments (cache once on mount)
  const { data: departmentsData, execute: loadDepartments } = useApi(
    () => departmentsApi.getAllDepartments(),
    { immediate: false }
  );

  const salaryHeaders = useMemo(() => payrollData?.content || [], [payrollData]);

  // Load data on mount
  useEffect(() => {
    loadPayroll();
    loadEmployees();
    loadDepartments();
  }, [loadPayroll, loadEmployees, loadDepartments]);

  // Reload payroll when month changes
  useEffect(() => {
    loadPayroll();
  }, [selectedMonth, loadPayroll]);

  // Map employees data when loaded
  useEffect(() => {
    if (employeesData?.employees) {
      const mappedEmployees = employeesData.employees.map(mapEmployeeResponseToEmployee);
      setEmployees(mappedEmployees);
    }
  }, [employeesData]);

  // Set departments when loaded
  useEffect(() => {
    if (departmentsData) {
      setDepartments(departmentsData);
    }
  }, [departmentsData]);

  // Filter payroll and employees based on role
  const filteredPayroll = useMemo(() => {
    return filterPayrollByRole(
      salaryHeaders,
      userRole,
      employeeNo, // Use employeeNo from API for Employee role
      employees, // Pass employees for project/department filtering
      undefined, // projectCode - not used for Employee role filtering
      undefined  // departmentCode - not used for Employee role filtering
    );
  }, [salaryHeaders, userRole, employeeNo, employees]);

  const filteredEmployees = useMemo(() => {
    return filterEmployeesByRole(
      employees,
      userRole,
      employeeNo, // Use employeeNo from API for Employee role
      undefined, // projectCode - not used for Employee role filtering
      undefined  // departmentCode - not used for Employee role filtering
    );
  }, [employees, userRole, employeeNo]);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const blob = await reportsApi.exportPayrollMonthlySummary(selectedMonth, 'EXCEL');

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payroll_Report_${selectedMonth}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.showSuccess('تم تصدير التقرير بنجاح');
    } catch (error) {
      console.error('Error exporting report:', error);
      const errorMessage = error instanceof Error ? error.message : 'فشل تصدير التقرير';
      toast.showError(`فشل التصدير: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Salary Distribution Chart
  const salaryDistributionOption = useMemo(() => {
    const ranges = [
      { name: '< 5K', min: 0, max: 5000, count: 0 },
      { name: '5K - 10K', min: 5000, max: 10000, count: 0 },
      { name: '10K - 15K', min: 10000, max: 15000, count: 0 },
      { name: '15K - 20K', min: 15000, max: 20000, count: 0 },
      { name: '20K+', min: 20000, max: Infinity, count: 0 },
    ];

    filteredEmployees.forEach(emp => {
      const range = ranges.find(r => emp.monthlySalary >= r.min && emp.monthlySalary < r.max);
      if (range) range.count++;
    });

    return {
      title: {
        text: 'توزيع الرواتب',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' },
      },
      tooltip: {
        trigger: 'item' as const,
        formatter: '{b}: {c} موظف ({d}%)',
      },
      legend: {
        bottom: '0%',
        left: 'center',
      },
      series: [
        {
          name: 'نطاق الراتب',
          type: 'pie' as const,
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 18,
              fontWeight: 'bold' as const,
            },
          },
          data: ranges.map((r, i) => ({
            value: r.count,
            name: r.name,
            itemStyle: {
              color: ['#0c2b7a', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'][i]
            },
          })),
        },
      ],
    };
  }, [filteredEmployees]);

  // Department-wise costs
  const departmentCostsOption = useMemo(() => {
    // Calculate costs from payroll data for selected month
    const deptCosts = departments.map(dept => {
      // Get payroll records for employees in this department for selected month
      const deptPayroll = filteredPayroll.filter(p => {
        const emp = employees.find(e => e.employeeId === p.employeeNo);
        return emp && emp.departmentCode === dept.deptCode;
      });

      const totalCost = deptPayroll.reduce((sum, p) => sum + (p.netSalary || 0), 0);
      return {
        name: dept.deptName || dept.deptName || `Department ${dept.deptCode}`,
        cost: totalCost,
      };
    }).filter(d => d.cost > 0); // Only show departments with payroll

    return {
      title: {
        text: 'تكاليف الرواتب حسب القسم',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' },
      },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const item = Array.isArray(params) ? params[0] : params;
          if (!item) return '';
          return `${item.name || ''}<br/>SAR ${item.value?.toLocaleString() || 0}`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category' as const,
        data: deptCosts.map(d => d.name.split(' ')[0]), // Short names
        axisLabel: {
          rotate: 0,
          interval: 0,
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'value' as const,
        name: 'ر.س',
      },
      series: [
        {
          name: 'تكلفة الرواتب',
          type: 'bar' as const,
          data: deptCosts.map(d => d.cost),
          itemStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#0f3a94' },
                { offset: 1, color: '#0c2b7a' },
              ],
            },
            borderRadius: [8, 8, 0, 0],
          },
        },
      ],
    };
  }, [departments, filteredPayroll, employees]);

  // Calculate totals
  const totals = useMemo(() => {
    // Payroll data is already filtered by selected month from API, but apply role-based filtered payroll
    // Note: monthYear field from backend might be salaryMonth, so we use all filtered payroll
    return filteredPayroll.reduce(
      (acc, sal) => ({
        employees: acc.employees + 1,
        basicSalary: acc.basicSalary + (sal.grossSalary || 0),
        allowances: acc.allowances + (sal.totalAllowances || 0),
        overtime: acc.overtime + (sal.totalOvertime || 0),
        deductions: acc.deductions + (sal.totalDeductions || 0),
        absence: acc.absence + (sal.totalAbsence || 0),
        loans: acc.loans + (sal.totalLoans || 0),
        netSalary: acc.netSalary + (sal.netSalary || 0),
      }),
      { employees: 0, basicSalary: 0, allowances: 0, overtime: 0, deductions: 0, absence: 0, loans: 0, netSalary: 0 }
    );
  }, [filteredPayroll]);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
        {/* Loading State */}
        {(loadingPayroll || (userRole === 'Employee' && loadingEmployee)) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <LoadingSpinner />
          </Box>
        )}

        {/* Error State for Employee role */}
        {userRole === 'Employee' && employeeError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            خطأ في تحميل بيانات الموظف: {employeeError}
          </Alert>
        )}

        {/* Error State */}
        {!loadingPayroll && salaryHeaders.length === 0 && payrollData === null && (
          <Alert severity="info" sx={{ mb: 3 }}>
            لا توجد بيانات رواتب متاحة للشهر المحدد. يرجى اختيار شهر مختلف أو حساب الرواتب أولاً.
          </Alert>
        )}

        <Box
          sx={{
            mb: 3,
            animation: 'fadeInUp 0.6s ease-out 0.2s both',
            '@keyframes fadeInUp': {
              from: { opacity: 0, transform: 'translateY(20px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
            display: loadingPayroll ? 'none' : 'block',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
              >
                تقارير الرواتب
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                تحليلات واتجاهات شاملة للرواتب
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportReport}
              disabled={isExporting || loadingPayroll}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderColor: '#0c2b7a',
                color: '#0c2b7a',
                '&:hover': {
                  borderColor: '#0a266e',
                  backgroundColor: 'rgba(12, 43, 122, 0.04)',
                },
                '&:disabled': {
                  borderColor: '#E5E7EB',
                  color: '#9CA3AF',
                },
              }}
            >
              {isExporting ? 'جاري التصدير...' : 'تصدير التقرير'}
            </Button>
          </Box>
        </Box>

        {/* Controls & Summary */}
        <Paper
          elevation={0}
          sx={{
            padding: 3,
            borderRadius: '12px',
            mb: 3,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            animation: 'fadeInUp 0.6s ease-out 0.3s both',
          }}
        >
          <Box sx={{ mb: 3 }}>
            <TextField
              select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              size="small"
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
                  color: selectedMonth ? '#111827' : '#9CA3AF',
                },
              }}
            >
              {(() => {
                const months = [];
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth() + 1;

                // Generate months: 6 months back to 6 months forward
                for (let i = -6; i <= 6; i++) {
                  const date = new Date(currentYear, currentMonth - 1 + i, 1);
                  const year = date.getFullYear();
                  const month = date.getMonth() + 1;
                  const monthValue = `${year}-${String(month).padStart(2, '0')}`;
                  const monthName = formatDateGregorian(date, { month: 'long', year: 'numeric' });
                  months.push({ value: monthValue, label: monthName });
                }

                return months.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ));
              })()}
            </TextField>
          </Box>

          {/* Summary Statistics */}
          <Box sx={{ pt: 2, borderTop: '1px solid #E5E7EB' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  md: 'repeat(4, 1fr)',
                  lg: 'repeat(8, 1fr)',
                },
                gap: 2,
              }}
            >
              <Paper
                sx={{
                  padding: 2,
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                  إجمالي الرواتب
                </Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#0c2b7a' }}>
                  ر.س {formatNumber(totals.netSalary)}
                </Typography>
              </Paper>
              <Paper
                sx={{
                  padding: 2,
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                  الموظفون
                </Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>
                  {totals.employees}
                </Typography>
              </Paper>
              <Paper
                sx={{
                  padding: 2,
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                  متوسط الراتب
                </Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#F59E0B' }}>
                  ر.س {totals.employees > 0 ? formatNumber(Math.round(totals.basicSalary / totals.employees)) : '0'}
                </Typography>
              </Paper>
              <Paper
                sx={{
                  padding: 2,
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                  إجمالي البدلات
                </Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
                  ر.س {formatNumber(totals.allowances)}
                </Typography>
              </Paper>
              <Paper
                sx={{
                  padding: 2,
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                  إجمالي الإضافي
                </Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#0c2b7a' }}>
                  ر.س {formatNumber(totals.overtime)}
                </Typography>
              </Paper>
              <Paper
                sx={{
                  padding: 2,
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                  إجمالي الغياب
                </Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#DC2626' }}>
                  ر.س {formatNumber(totals.absence)}
                </Typography>
              </Paper>
              <Paper
                sx={{
                  padding: 2,
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                  إجمالي القروض
                </Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#DC2626' }}>
                  ر.س {formatNumber(totals.loans)}
                </Typography>
              </Paper>
              <Paper
                sx={{
                  padding: 2,
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                  إجمالي الخصومات
                </Typography>
                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#DC2626' }}>
                  ر.س {formatNumber(totals.deductions)}
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Paper>

        {/* Charts - Hide aggregate charts for Employee role */}
        {!loadingPayroll && userRole !== 'Employee' && (
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
            <Paper
              elevation={0}
              sx={{
                padding: 3,
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                animation: 'fadeInUp 0.6s ease-out 0.5s both',
                minHeight: '400px',
              }}
            >
              <SafeECharts option={salaryDistributionOption as any} showCustomLegend={true} style={{ height: '400px', width: '100%' }} />
            </Paper>
            <Paper
              elevation={0}
              sx={{
                padding: 3,
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                animation: 'fadeInUp 0.6s ease-out 0.6s both',
                minHeight: '400px',
              }}
            >
              <SafeECharts option={departmentCostsOption as any} showCustomLegend={true} style={{ height: '400px', width: '100%' }} />
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
}


