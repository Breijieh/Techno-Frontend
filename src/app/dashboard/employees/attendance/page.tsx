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
  CalendarMonth,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  useMaterialReactTable,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import useRouteProtection from '@/hooks/useRouteProtection';
import { attendanceApi } from '@/lib/api/attendance';
import { employeesApi, projectsApi } from '@/lib/api';
import { mapAttendanceResponseListToTransactionList } from '@/lib/mappers/attendanceMapper';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import type { AttendanceTransaction } from '@/types';
import type { AttendanceResponse } from '@/lib/api/attendance';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';

export default function AttendancePage() {
  const router = useRouter();
  const [filterDate, setFilterDate] = useState<string>('month');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceTransaction[]>([]);
  const [attendanceResponses, setAttendanceResponses] = useState<AttendanceResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [selectedProject, setSelectedProject] = useState<number | ''>('');
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Load filter options
  useEffect(() => {
    const loadFilters = async () => {
      setLoadingFilters(true);
      try {
        const [empResponse, projResponse] = await Promise.all([
          employeesApi.getAllEmployees({ size: 1000 }), // Get all employees for dropdown
          projectsApi.getAllProjects({ size: 1000 })     // Get all projects for dropdown
        ]);

        const employeeList = empResponse.employees ?? [];
        setEmployees(employeeList.map(e => ({
          id: e.employeeNo,
          name: e.employeeName ?? `موظف ${e.employeeNo}`
        })));

        const projectList = projResponse.content ?? [];
        setProjects(projectList.map(p => ({
          id: p.projectCode,
          name: p.projectName ?? `مشروع ${p.projectCode}`
        })));
      } catch (error) {
        console.error('Failed to load filter options:', error);
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilters();
  }, []);

  // Protect route based on role
  useRouteProtection();

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

  // Calculate date range based on filter selection
  const getDateRange = useCallback((filter: string): { startDate?: string; endDate?: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today': {
        const dateStr = today.toISOString().split('T')[0];
        return { startDate: dateStr, endDate: dateStr };
      }
      case 'week': {
        const startOfWeek = new Date(today);
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
        startOfWeek.setDate(diff);
        const endDate = today.toISOString().split('T')[0];
        return { startDate: startOfWeek.toISOString().split('T')[0], endDate };
      }
      case 'month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endDate = today.toISOString().split('T')[0];
        return { startDate: startOfMonth.toISOString().split('T')[0], endDate };
      }
      default:
        // 'all' - no date filter, or use a very wide range
        return {};
    }
  }, []);

  // Fetch attendance data
  const { execute: fetchAttendance, loading: loadingAttendance, error: attendanceError } = useApiWithToast(
    async () => {
      const dateRange = getDateRange(filterDate);
      const response = await attendanceApi.getAllAttendance({
        ...dateRange,
        employeeNo: selectedEmployee || undefined,
        projectCode: selectedProject || undefined,
        page: pagination.pageIndex,
        size: pagination.pageSize,
        sortBy: 'attendanceDate',
        sortDirection: 'desc',
      });

      const mappedAttendance = mapAttendanceResponseListToTransactionList(response.content);
      setAttendance(mappedAttendance);
      setAttendanceResponses(response.content);
      setTotalElements(response.totalElements);

      return response;
    },
    { silent: true }
  );

  // Reset to first page when filters change so results make sense
  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [filterDate, selectedEmployee, selectedProject]);

  // Fetch attendance when filters or pagination change
  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate, selectedEmployee, selectedProject, pagination.pageIndex, pagination.pageSize]);

  const columns = useMemo<MRT_ColumnDef<AttendanceTransaction>[]>(
    () => [
      {
        accessorKey: 'employeeName',
        header: 'الموظف',
        size: 200,
        enableGlobalFilter: true,
        Cell: ({ row }) => {
          const name = row.original.employeeName || `موظف ${row.original.employeeId}`;
          return <Typography sx={{ fontSize: '14px', color: '#111827' }}>{name}</Typography>;
        },
      },
      {
        accessorKey: 'attendanceDate',
        header: 'التاريخ',
        size: 130,
        filterVariant: 'date-range',
        enableGlobalFilter: false,
        Cell: ({ cell }) => new Date(cell.getValue<Date>()).toLocaleDateString('en-GB'),
      },
      {
        accessorKey: 'entryTime',
        header: 'وقت الدخول',
        size: 110,
        enableGlobalFilter: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<string | undefined>();
          if (!val) return '-';
          // Handle time string format (HH:mm:ss or HH:mm)
          const timeMatch = val.match(/(\d{2}):(\d{2})/);
          return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : val;
        },
      },
      {
        accessorKey: 'exitTime',
        header: 'وقت الخروج',
        size: 110,
        enableGlobalFilter: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<string | undefined>();
          if (!val) return '-';
          // Handle time string format (HH:mm:ss or HH:mm)
          const timeMatch = val.match(/(\d{2}):(\d{2})/);
          return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : val;
        },
      },
      {
        accessorKey: 'scheduledHours',
        header: 'المجدول',
        size: 110,
        enableGlobalFilter: false,
      },
      {
        accessorKey: 'workingHours',
        header: 'ساعات العمل',
        size: 130,
        enableGlobalFilter: false,
      },
      {
        accessorKey: 'overtimeCalc',
        header: 'ساعات إضافية',
        size: 110,
        enableGlobalFilter: false,
        Cell: ({ cell }) => {
          const overtime = cell.getValue<string>();
          return overtime !== '00:00' ? (
            <Chip
              label={overtime}
              size="small"
              sx={{
                backgroundColor: '#DBEAFE',
                color: '#1E40AF',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          ) : (
            <Typography sx={{ fontSize: '12px', color: '#9CA3AF' }}>-</Typography>
          );
        },
      },
      {
        accessorKey: 'delayedCalc',
        header: 'تأخير',
        size: 110,
        enableGlobalFilter: false,
        Cell: ({ cell }) => {
          const delayed = cell.getValue<string>();
          return delayed !== '00:00' ? (
            <Chip
              label={delayed}
              size="small"
              sx={{
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          ) : (
            <Typography sx={{ fontSize: '12px', color: '#9CA3AF' }}>-</Typography>
          );
        },
      },
      {
        accessorKey: 'earlyOutCalc',
        header: 'خروج مبكر',
        size: 110,
        enableGlobalFilter: false,
        Cell: ({ cell }) => {
          const earlyOut = cell.getValue<string>();
          return earlyOut !== '00:00' ? (
            <Chip
              label={earlyOut}
              size="small"
              sx={{
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          ) : (
            <Typography sx={{ fontSize: '12px', color: '#9CA3AF' }}>-</Typography>
          );
        },
      },
      {
        accessorKey: 'shortageHours',
        header: 'نقص ساعات',
        size: 110,
        enableGlobalFilter: false,
        Cell: ({ cell }) => {
          const shortage = cell.getValue<string>();
          return shortage !== '00:00' ? (
            <Chip
              label={shortage}
              size="small"
              sx={{
                backgroundColor: '#FECACA',
                color: '#7F1D1D',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          ) : (
            <Typography sx={{ fontSize: '12px', color: '#9CA3AF' }}>-</Typography>
          );
        },
      },
      {
        accessorKey: 'absenceFlag',
        header: 'الحالة',
        size: 160,
        filterVariant: 'multi-select',
        enableGlobalFilter: false,
        meta: {
          getFilterLabel: (row: AttendanceTransaction) => row.absenceFlag === 'Y' ? 'غائب' : 'حاضر'
        },
        Cell: ({ row }) => {
          const isAbsent = row.original.absenceFlag === 'Y';
          const isAutoCheckout = row.original.isAutoCheckout === 'Y';
          const isManualEntry = row.original.isManualEntry === 'Y';
          const isWeekendWork = row.original.isWeekendWork === 'Y';
          const isHolidayWork = row.original.isHolidayWork === 'Y';

          return (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                label={isAbsent ? 'غائب' : 'حاضر'}
                size="small"
                sx={{
                  backgroundColor: isAbsent ? '#FEE2E2' : '#D1FAE5',
                  color: isAbsent ? '#991B1B' : '#065F46',
                  fontWeight: 600,
                  fontSize: '10px',
                }}
              />
              {isAutoCheckout && (
                <Chip
                  label="تلقائي"
                  size="small"
                  sx={{
                    backgroundColor: '#E0E7FF',
                    color: '#3730A3',
                    fontWeight: 600,
                    fontSize: '10px',
                  }}
                />
              )}
              {isManualEntry && (
                <Chip
                  label="يدوي"
                  size="small"
                  sx={{
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    fontWeight: 600,
                    fontSize: '10px',
                  }}
                />
              )}
              {(isWeekendWork || isHolidayWork) && (
                <Chip
                  label={isHolidayWork ? 'عطلة' : 'نهاية أسبوع'}
                  size="small"
                  sx={{
                    backgroundColor: '#FCE7F3',
                    color: '#9D174D',
                    fontWeight: 600,
                    fontSize: '10px',
                  }}
                />
              )}
            </Box>
          );
        },
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: attendance,
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
    manualPagination: true,
    rowCount: totalElements,
    onPaginationChange: setPagination,
    state: {
      pagination,
      isLoading: loadingAttendance,
    },
    initialState: {
      density: 'compact',
      pagination: { pageSize: 25, pageIndex: 0 },
      showColumnFilters: false,
    },
    localization: mrtArabicLocalization,
    ...lightTableTheme,
    muiTableContainerProps: {
      sx: {
        ...(lightTableTheme.muiTableContainerProps as { sx?: Record<string, unknown> })?.sx,
        overflowX: 'auto',
        maxWidth: '100%',
        width: '100%',
      },
    },
    renderTopToolbar: ({ table }) => {
      const handleExport = () => {
        // Export all rows (respects filtering and sorting, but not pagination)
        const rows = table.getPrePaginationRowModel().rows;

        if (rows.length === 0) return;

        // Transform data to include employee names and formatted values
        const exportData = rows.map((row) => {
          const transaction = row.original;
          const response = attendanceResponses.find(r => r.transactionId === transaction.transactionId);
          // Use response name or fallback to transaction or generic
          const employeeName = response?.employeeName || transaction.employeeName || `موظف ${transaction.employeeId}`;

          return {
            employeeId: transaction.employeeId,
            employeeName,
            date: new Date(transaction.attendanceDate as string | Date).toLocaleDateString('en-GB'),
            entryTime: transaction.entryTime ? (() => {
              const timeMatch = transaction.entryTime.match(/(\d{2}):(\d{2})/);
              return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : transaction.entryTime;
            })() : 'غير متوفر',
            exitTime: transaction.exitTime ? (() => {
              const timeMatch = transaction.exitTime.match(/(\d{2}):(\d{2})/);
              return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : transaction.exitTime;
            })() : 'غير متوفر',
            scheduledHours: transaction.scheduledHours,
            workingHours: transaction.workingHours,
            overtime: transaction.overtimeCalc !== '00:00' ? transaction.overtimeCalc : 'غير متوفر',
            late: transaction.delayedCalc !== '00:00' ? transaction.delayedCalc : 'غير متوفر',
            earlyOut: transaction.earlyOutCalc !== '00:00' ? transaction.earlyOutCalc : 'غير متوفر',
            status: transaction.absenceFlag === 'Y' ? 'غائب' : 'حاضر',
          };
        });

        // Export with proper column headers
        exportDataToCSV(exportData, 'attendance-report', {
          employeeId: 'رقم الموظف',
          employeeName: 'اسم الموظف',
          date: 'التاريخ',
          entryTime: 'وقت الدخول',
          exitTime: 'وقت الخروج',
          scheduledHours: 'الساعات المجدولة',
          workingHours: 'ساعات العمل',
          overtime: 'ساعات إضافية',
          late: 'تأخير',
          earlyOut: 'خروج مبكر',
          status: 'الحالة',
        });
      };

      return (
        <TableToolbarWrapper
          table={table}
          showQuickFilters={false}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              select
              size="small"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              sx={{
                width: '180px',
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
                  color: '#111827',
                },
              }}
            >
              <MenuItem value="all">جميع التواريخ</MenuItem>
              <MenuItem value="today">اليوم</MenuItem>
              <MenuItem value="week">هذا الأسبوع</MenuItem>
              <MenuItem value="month">هذا الشهر</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              value={selectedEmployee === '' ? '' : String(selectedEmployee)}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedEmployee(v === '' ? '' : Number(v));
              }}
              disabled={loadingFilters}
              SelectProps={{ displayEmpty: true }}
              sx={{
                width: '200px',
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
                  color: selectedEmployee !== '' ? '#111827' : '#9CA3AF',
                },
              }}
            >
              <MenuItem value="">
                <em>الموظف</em>
              </MenuItem>
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={String(emp.id)}>{emp.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              value={selectedProject === '' ? '' : String(selectedProject)}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedProject(v === '' ? '' : Number(v));
              }}
              disabled={loadingFilters}
              SelectProps={{ displayEmpty: true }}
              sx={{
                width: '200px',
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
                  color: selectedProject !== '' ? '#111827' : '#9CA3AF',
                },
              }}
            >
              <MenuItem value="">
                <em>المشروع</em>
              </MenuItem>
              {projects.map((proj) => (
                <MenuItem key={proj.id} value={String(proj.id)}>{proj.name}</MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExport}
              disabled={attendance.length === 0 || loadingAttendance}
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
      );
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
        transition: isFullscreen ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), maxWidth 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
              تتبع الحضور - وضع ملء الشاشة
            </Typography>
            <Tooltip title="إغلاق وضع ملء الشاشة (ESC)">
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

      {/* Normal View */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: '#F8F9FC',
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
              تتبع الحضور
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              تتبع الحضور اليومي مع تسجيل الدخول والانصراف القائم على GPS والحسابات التلقائية
            </Typography>
          </Box>

          {attendanceError && !loadingAttendance && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                backgroundColor: '#FEE2E2',
                borderRadius: '8px',
                mb: 2,
              }}
            >
              <Typography sx={{ color: '#991B1B', fontWeight: 600, mb: 1 }}>
                خطأ في تحميل بيانات الحضور
              </Typography>
              <Typography sx={{ color: '#991B1B', fontSize: '14px' }}>
                {typeof attendanceError === 'string'
                  ? attendanceError
                  : (attendanceError as { message?: string })?.message || 'فشل تحميل سجلات الحضور. يرجى المحاولة مرة أخرى.'}
              </Typography>
              <Button
                variant="contained"
                onClick={() => fetchAttendance()}
                sx={{ mt: 2, backgroundColor: '#0c2b7a' }}
              >
                Retry
              </Button>
            </Box>
          )}

          {!attendanceError && !loadingAttendance && attendance.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                backgroundColor: '#F3F4F6',
                borderRadius: '8px',
                mb: 2,
              }}
            >
              <Typography sx={{ color: '#6B7280', fontWeight: 600, mb: 1 }}>
                لم يتم العثور على سجلات حضور
              </Typography>
              <Typography sx={{ color: '#6B7280', fontSize: '14px' }}>
                {filterDate === 'all'
                  ? 'لا توجد سجلات حضور متاحة.'
                  : `لم يتم العثور على سجلات حضور للنطاق الزمني المحدد.`}
              </Typography>
            </Box>
          )}

          {tableWrapper}
        </Box>
      </Box>
    </>
  );
}
