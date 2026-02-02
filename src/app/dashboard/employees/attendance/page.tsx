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
  // ... existing state ...

  // ... (skipping to renderTopToolbar)

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
          entryTime: transaction.entryTime ? new Date(transaction.entryTime).toLocaleTimeString('en-GB') : 'غير متوفر',
          exitTime: transaction.exitTime ? new Date(transaction.exitTime).toLocaleTimeString('en-GB') : 'غير متوفر',
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
        quickFilterGroups={[
          {
            id: 'absenceFlag',
            label: 'الحضور',
            options: [
              { label: 'حاضر', value: 'N', color: '#10B981' },
              { label: 'غائب', value: 'Y', color: '#EF4444' },
            ]
          }
        ]}
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
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value === '' ? '' : Number(e.target.value))}
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
                color: selectedEmployee ? '#111827' : '#9CA3AF',
              },
            }}
          >
            <MenuItem value="">
              <em>الموظف</em>
            </MenuItem>
            {employees.map((emp) => (
              <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value === '' ? '' : Number(e.target.value))}
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
                color: selectedProject ? '#111827' : '#9CA3AF',
              },
            }}
          >
            <MenuItem value="">
              <em>المشروع</em>
            </MenuItem>
            {projects.map((proj) => (
              <MenuItem key={proj.id} value={proj.id}>{proj.name}</MenuItem>
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
    // remove valid renderTopToolbarCustomActions which is replaced
    renderTopToolbarCustomActions: undefined,
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
            تتبع الحضور اليومي مع تسجيل الدخول/الخروج القائم على GPS والحسابات التلقائية
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


