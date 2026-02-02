'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  Paper,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Calculate,
  Download,
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
import useRouteProtection from '@/hooks/useRouteProtection';
import type { SalaryHeader } from '@/types';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import { useToast } from '@/contexts/ToastContext';
import { formatDateGregorian } from '@/lib/utils/dateFormatter';
import { payrollApi, employeesApi, departmentsApi, projectsApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';
import { formatNumber } from '@/lib/utils/numberFormatter';

export default function SalaryCalculationPage() {
  const router = useRouter();
  const toast = useToast();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calculationType, setCalculationType] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedDepartment] = useState<string>('');
  const [selectedProject] = useState<string>('');


  // Memoize the API function - it will change when selectedMonth changes
  const fetchPayrollData = useCallback(
    () => payrollApi.getPayrollByMonth(selectedMonth, { page: 0, size: 1000 }),
    [selectedMonth]
  );

  // Fetch payroll data for selected month
  const { data: payrollData, execute: loadPayroll } = useApi(
    fetchPayrollData,
    { immediate: true }
  );



  // Fetch employees for name lookup and filtering
  const { data: employeesResponse } = useApi(
    () => employeesApi.getAllEmployees({ size: 10000 }), // Large size to get all employees
    { immediate: true }
  );

  // Load Departments and Projects (loaded but not stored as they're not used)
  useEffect(() => {
    const loadFilters = async () => {
      try {
        await Promise.all([
          departmentsApi.getAllDepartments(),
          projectsApi.getActiveProjects(),
        ]);
        // Filters are loaded but not stored in state as they're not used in the component
      } catch (error) {
        console.error('Failed to load filters', error);
      }
    };
    loadFilters();
  }, []);

  const allSalaryHeaders = useMemo(() => payrollData?.content || [], [payrollData]);

  // Filter displayed data based on selection
  const salaryHeaders = useMemo(() => {
    if (calculationType === 'departments' && selectedDepartment) {
      return allSalaryHeaders.filter(sh => {
        const emp = employeesResponse?.employees?.find(e => e.employeeNo === sh.employeeNo);
        return emp?.primaryDeptCode === Number(selectedDepartment);
      });
    }
    if (calculationType === 'projects' && selectedProject) {
      return allSalaryHeaders.filter(sh => {
        const emp = employeesResponse?.employees?.find(e => e.employeeNo === sh.employeeNo);
        return emp?.primaryProjectCode === Number(selectedProject);
      });
    }
    return allSalaryHeaders;
  }, [allSalaryHeaders, calculationType, selectedDepartment, selectedProject, employeesResponse]);

  // Load payroll when month changes
  useEffect(() => {
    loadPayroll();
  }, [selectedMonth, loadPayroll]);

  // Protect route based on role
  useRouteProtection(['Admin', 'HR Manager', 'Finance Manager']);

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

  // Create employee lookup map
  const employeeMap = useMemo(() => {
    if (!employeesResponse?.employees) return new Map<number, string>();
    const map = new Map<number, string>();
    employeesResponse.employees.forEach(emp => {
      map.set(emp.employeeNo, emp.employeeName || emp.employeeName || 'Unknown');
    });
    return map;
  }, [employeesResponse]);

  const getEmployeeName = useCallback((empId: number) => {
    return employeeMap.get(empId) || 'غير معروف';
  }, [employeeMap]);

  // Handlers
  const handleCalculateSalaries = async () => {
    setIsCalculating(true);
    try {
      await payrollApi.calculatePayrollForAll({
        salaryMonth: selectedMonth,
        departmentCode: calculationType === 'departments' && selectedDepartment ? Number(selectedDepartment) : undefined,
        projectCode: calculationType === 'projects' && selectedProject ? Number(selectedProject) : undefined,
      });

      // Reload payroll data after calculation
      await loadPayroll();
    } catch (error) {
      console.error('Error calculating salaries:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExportToExcel = () => {
    if (!salaryHeaders || salaryHeaders.length === 0) {
      toast.showError('لا توجد بيانات للتصدير');
      return;
    }

    // Use exportDataToCSV with the actual data instead of table rows
    exportDataToCSV(salaryHeaders as unknown as Record<string, unknown>[], `salary-calculation-${selectedMonth}`);
  };

  const employeeFilterOptions = useMemo(() => {
    if (!employeesResponse?.employees) return [];
    return employeesResponse.employees
      .map(emp => ({
        text: emp.employeeName || emp.employeeName || `Unknown (${emp.employeeNo})`,
        value: emp.employeeNo // Keep value as number
      }))
      .sort((a, b) => a.text.localeCompare(b.text));
  }, [employeesResponse]);

  const columns = useMemo<MRT_ColumnDef<SalaryHeader>[]>(
    () => [
      {
        accessorKey: 'employeeNo',
        header: 'الموظف',
        size: 200,
        filterVariant: 'multi-select',
        filterSelectOptions: employeeFilterOptions, // Use explicit options to avoid MRT auto-generating/sorting numbers
        meta: {
          getFilterLabel: (row: SalaryHeader) => getEmployeeName(row.employeeNo)
        },
        sortingFn: (rowA, rowB) => {
          const nameA = getEmployeeName(rowA.original.employeeNo) || '';
          const nameB = getEmployeeName(rowB.original.employeeNo) || '';
          return nameA.localeCompare(nameB);
        },
        Cell: ({ cell }) => getEmployeeName(cell.getValue<number>()),
      },
      {
        accessorKey: 'salaryMonth',
        header: 'الشهر',
        size: 110,
      },
      {
        accessorKey: 'grossSalary',
        header: 'الراتب الأساسي',
        size: 130,
        filterVariant: 'range',
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
            {formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'totalAllowances',
        header: 'البدلات',
        size: 120,
        filterVariant: 'range',
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', color: '#059669' }}>
            +{formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'totalOvertime',
        header: 'الساعات الإضافية',
        size: 120,
        filterVariant: 'range',
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', color: '#0c2b7a' }}>
            +{formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'totalAbsence',
        header: 'حسم غياب',
        size: 120,
        filterVariant: 'range',
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', color: '#DC2626' }}>
            -{formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'totalDeductions',
        header: 'الخصومات',
        size: 120,
        filterVariant: 'range',
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', color: '#DC2626' }}>
            -{formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
      {
        accessorKey: 'totalLoans',
        header: 'القرض',
        size: 110,
        filterVariant: 'range',
        Cell: ({ cell }) => {
          const loan = cell.getValue<number>();
          return loan > 0 ? (
            <Typography sx={{ fontSize: '13px', color: '#DC2626' }}>
              -{formatNumber(loan)}
            </Typography>
          ) : (
            <Typography sx={{ fontSize: '13px', color: '#9CA3AF' }}>-</Typography>
          );
        },
      },
      {
        accessorKey: 'netSalary',
        header: 'الراتب الصافي',
        size: 140,
        filterVariant: 'range',
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0c2b7a' }}>
            ر.س {formatNumber(cell.getValue<number>())}
          </Typography>
        ),
      },
    ],
    [getEmployeeName]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = useMaterialReactTable<any>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: salaryHeaders as any,
    enableRowSelection: true,
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
        ...(lightTableTheme.muiTableContainerProps as { sx?: Record<string, unknown> })?.sx,
        maxHeight: isFullscreen ? 'calc(100vh - 120px)' : 'calc(100vh - 480px)',
        backgroundColor: '#FFFFFF',
        overflowX: 'auto',
        maxWidth: '100%',
        width: '100%',
      },
    },
    renderTopToolbar: ({ table }) => (
      <TableToolbarWrapper table={table}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={isFullscreen ? 'إغلاق وضع ملء الشاشة' : 'دخول وضع ملء الشاشة'}>
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
  });

  // Calculate totals
  const totals = useMemo(() => {
    return salaryHeaders.reduce(
      (acc, sal) => ({
        basicSalary: acc.basicSalary + (sal.grossSalary || 0),
        allowances: acc.allowances + (sal.totalAllowances || 0),
        overtime: acc.overtime + (sal.totalOvertime || 0),
        deductions: acc.deductions + (sal.totalDeductions || 0),
        absence: acc.absence + (sal.totalAbsence || 0),
        loans: acc.loans + (sal.totalLoans || 0),
        netSalary: acc.netSalary + (sal.netSalary || 0),
      }),
      { basicSalary: 0, allowances: 0, overtime: 0, deductions: 0, absence: 0, loans: 0, netSalary: 0 }
    );
  }, [salaryHeaders]);

  const tableWrapper = (
    <Box
      sx={{
        animation: isFullscreen ? 'none' : 'fadeInUp 0.6s ease-out 0.5s both',
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        width: '100%',
        height: isFullscreen ? '100%' : 'auto',
        overflow: 'hidden',
        transition: isFullscreen ? 'none' : 'width 0.3s ease, transform 0.3s ease',
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
              حساب الرواتب - وضع ملء الشاشة
            </Typography>
            <Tooltip title="الخروج من وضع ملء الشاشة (ESC)">
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
              padding: 0,
              overflow: 'auto',
              backgroundColor: '#F8F9FC',
            }}
          >
            {tableWrapper}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          backgroundColor: '#F8F9FC',
          opacity: isFullscreen ? 0 : 1,
          pointerEvents: isFullscreen ? 'none' : 'auto',
          transition: 'opacity 0.3s ease-out',
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
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
                حساب الرواتب
              </Typography>
              <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                حساب الرواتب الشهرية مع البدلات والخصومات وأقساط القروض التلقائية
              </Typography>
            </Box>

            {/* Calculation Controls */}
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
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    select
                    fullWidth
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    size="small"
                    SelectProps={{ displayEmpty: true }}
                    sx={{
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
                        const value = `${year}-${String(month).padStart(2, '0')}`;
                        const monthName = formatDateGregorian(date, { month: 'long' });
                        months.push(
                          <MenuItem key={value} value={value}>
                            {monthName} {year}
                          </MenuItem>
                        );
                      }
                      return months;
                    })()}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    select
                    fullWidth
                    value={calculationType}
                    onChange={(e) => setCalculationType(e.target.value)}
                    size="small"
                    SelectProps={{ displayEmpty: true }}
                    sx={{
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
                        color: calculationType && calculationType !== 'all' ? '#111827' : '#9CA3AF',
                      },
                    }}
                  >
                    <MenuItem value="all">موظفين تكنو</MenuItem>
                    <MenuItem value="departments">حسب الأقسام</MenuItem>
                    <MenuItem value="projects">حسب المشاريع</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<Calculate />}
                    fullWidth
                    onClick={handleCalculateSalaries}
                    disabled={isCalculating}
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
                      '&:disabled': {
                        backgroundColor: '#9CA3AF',
                      },
                    }}
                  >
                    {isCalculating ? 'جاري الحساب...' : 'حساب الرواتب'}
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    fullWidth
                    onClick={handleExportToExcel}
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
                    تصدير إلى Excel
                  </Button>
                </Grid>
              </Grid>

              {/* Summary Statistics */}
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #E5E7EB' }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                      إجمالي الأساسي
                    </Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                      ر.س {formatNumber(totals.basicSalary)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                      البدلات
                    </Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>
                      +{formatNumber(totals.allowances)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                      الساعات الإضافية
                    </Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#0c2b7a' }}>
                      +{formatNumber(totals.overtime)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                      حسم غياب
                    </Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#DC2626' }}>
                      -{formatNumber(totals.absence)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 1 }}>
                    <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                      الخصومات
                    </Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#DC2626' }}>
                      -{formatNumber(totals.deductions)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                      القروض
                    </Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#DC2626' }}>
                      -{formatNumber(totals.loans)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                      إجمالي الصافي
                    </Typography>
                    <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#0c2b7a' }}>
                      ر.س {formatNumber(totals.netSalary)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Paper>

            {/* Results Table */}
            {tableWrapper}
          </Box>
        </Box>
      </Box>
    </>
  );
}


