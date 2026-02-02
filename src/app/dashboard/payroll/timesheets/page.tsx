'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Download,
  Schedule,
} from '@mui/icons-material';
import { getUserRole } from '@/lib/permissions';
import { filterEmployeesByRole, getUserContext } from '@/lib/dataFilters';
import useRouteProtection from '@/hooks/useRouteProtection';
import { exportDataToCSV } from '@/lib/utils/exportUtils';
import { employeesApi, departmentsApi, projectsApi } from '@/lib/api';
import { attendanceApi } from '@/lib/api/attendance';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';
import { useToast } from '@/contexts/ToastContext';

import type { DepartmentResponse, EmployeeListResponse } from '@/lib/api';
import type { ProjectSummary } from '@/lib/api/projects';
import type { Employee } from '@/types';
import { formatDate } from '@/lib/utils/dateFormatter';
import { AnimatedAutocomplete } from '@/components/common/FormFields';

export default function TimesheetsPage() {
  const router = useRouter();
  const userRole = getUserRole();
  const userContext = getUserContext();
  const toast = useToast();

  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'General Manager', 'Finance Manager', 'Project Manager', 'Employee']);

  // Fetch employees
  // Fetch employees
  const { data: employeesResponse, loading: loadingEmployees, error: employeesError } = useApi(
    useCallback(() => employeesApi.getAllEmployees({ size: 1000 }), []),
    { immediate: true }
  );

  const employees = useMemo(() => {
    if (!employeesResponse) return [];
    // Handle both content and employees properties (backend consistency issue)
    const list = employeesResponse.employees || employeesResponse.content || [];
    return list.map(mapEmployeeResponseToEmployee);
  }, [employeesResponse]);

  // Filter employees based on role
  const accessibleEmployees = useMemo(() => {
    return filterEmployeesByRole(
      employees,
      userRole,
      userContext.employeeId,
      userContext.projectCode,
      userContext.departmentCode
    );
  }, [employees, userRole, userContext]);

  // Fetch departments and projects
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  useEffect(() => {
    if (userRole !== 'Employee') {
      const loadFilters = async () => {
        try {
          const [depts, projs] = await Promise.all([
            departmentsApi.getAllDepartments(),
            projectsApi.getActiveProjects()
          ]);
          setDepartments(depts || []);
          setProjects(projs || []);
        } catch (error) {
          console.error('Error loading filters:', error);
        }
      };
      loadFilters();
    }
  }, [userRole]);

  // Filter accessible employees by selected department/project
  const filteredEmployees = useMemo(() => {
    let result = accessibleEmployees;
    if (selectedDepartment) {
      result = result.filter(e => e.departmentCode === selectedDepartment);
    }
    if (selectedProject) {
      result = result.filter(e => e.projectCode === selectedProject);
    }
    return result;
  }, [accessibleEmployees, selectedDepartment, selectedProject]);

  // Generate month options (6 months back, 6 months forward)
  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = formatDate(date, 'MMMM yyyy');
      options.push({ value: monthValue, label: monthName });
    }
    return options;
  }, []);

  // Set default selected employee based on role
  const [selectedEmployee, setSelectedEmployee] = useState<number>(0);

  // Set default month to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fetch timesheet function
  const fetchTimesheet = useCallback(async () => {
    if (!selectedEmployee) return null;
    return await attendanceApi.getEmployeeTimesheet(selectedEmployee, selectedMonth);
  }, [selectedEmployee, selectedMonth]);

  // Fetch timesheet data
  const { data: timesheet, loading: loadingTimesheet, error: timesheetError, execute: loadTimesheet } = useApiWithToast(
    fetchTimesheet,
    { silent: true }
  );

  // Track if we have set the initial default employee
  const hasSetDefaultEmployee = useRef(false);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    // For employees, ensure they can only see their own timesheet
    if (userRole === 'Employee' && userContext.employeeId) {
      if (selectedEmployee !== userContext.employeeId) {
        setSelectedEmployee(userContext.employeeId);
      }
    } else if (accessibleEmployees.length > 0 && selectedEmployee === 0 && !hasSetDefaultEmployee.current) {
      // Set first accessible employee as default ONLY ONCE
      setSelectedEmployee(accessibleEmployees[0].employeeId);
      hasSetDefaultEmployee.current = true;
    }
  }, [router, userRole, userContext.employeeId, accessibleEmployees, selectedEmployee]);

  // Load timesheet when employee or month changes
  useEffect(() => {
    if (selectedEmployee) {
      loadTimesheet();
    }
  }, [selectedEmployee, selectedMonth, loadTimesheet]);

  const handleExport = () => {
    try {
      if (!timesheet || !timesheet.days || timesheet.days.length === 0) {
        toast.showError('لا توجد بيانات جدول وقت للتصدير. يرجى تحديد موظف وشهر يحتوي على بيانات.');
        return;
      }

      const employee = employees.find(e => e.employeeId === selectedEmployee);
      const employeeName = employee?.fullName || timesheet.employeeName || 'غير معروف';

      // Prepare timesheet data for export
      const exportData = timesheet.days.map(day => ({
        'التاريخ': day.date,
        'اليوم': day.day,
        'الحالة': day.status,
        'الموظف': employeeName,
        'الشهر': selectedMonth,
        'ساعات العمل': day.workingHours?.toFixed(2) || '0',
        'ساعات إضافية': day.overtimeHours?.toFixed(2) || '0',
        'متأخر': day.isLate ? 'نعم' : 'لا',
      }));

      exportDataToCSV(exportData, `timesheet-${employeeName.replace(/\s+/g, '-')}-${selectedMonth}`);
      toast.showSuccess('تم تصدير جدول الوقت بنجاح');
    } catch (error) {
      console.error('Error exporting timesheet:', error);
      toast.showError('فشل تصدير جدول الوقت. يرجى المحاولة مرة أخرى.');
    }
  };

  const employee = employees.find(e => e.employeeId === selectedEmployee);

  const summary = useMemo(() => {
    if (!timesheet) {
      return {
        totalDays: 0,
        present: 0,
        absent: 0,
        leave: 0,
        late: 0,
        weekends: 0,
      };
    }
    return {
      totalDays: timesheet.totalDays,
      present: timesheet.present,
      absent: timesheet.absent,
      leave: timesheet.onLeave,
      late: timesheet.late,
      weekends: timesheet.weekends,
    };
  }, [timesheet]);

  return (
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
            جداول الوقت للموظفين
          </Typography>
          <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
            ملخص الحضور الشهري يوضح جميع الأيام مع حالة الحضور
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            padding: 3,
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            animation: 'fadeInUp 0.6s ease-out 0.3s both',
          }}
        >
          {/* Selection Controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {userRole !== 'Employee' && (
              <>
                <Box sx={{ minWidth: 200, flex: 1 }}>
                  <AnimatedAutocomplete
                    label="القسم"
                    value={departments.find(d => d.deptCode === selectedDepartment) || null}
                    onChange={(newValue) => {
                      const dept = newValue as DepartmentResponse | null;
                      setSelectedDepartment(dept ? dept.deptCode : null);
                      setSelectedEmployee(0); // Reset employee when filter changes
                    }}
                    options={departments}
                    getOptionLabel={(option) => (option as DepartmentResponse).deptName || ''}
                    getOptionKey={(option) => (option as DepartmentResponse).deptCode}
                    disabled={loadingEmployees} // Reusing loading state essentially
                  />
                </Box>
                <Box sx={{ minWidth: 200, flex: 1 }}>
                  <AnimatedAutocomplete
                    label="المشروع"
                    value={projects.find(p => p.projectCode === selectedProject) || null}
                    onChange={(newValue) => {
                      const proj = newValue as ProjectSummary | null;
                      setSelectedProject(proj ? proj.projectCode : null);
                      setSelectedEmployee(0); // Reset employee when filter changes
                    }}
                    options={projects}
                    getOptionLabel={(option) => (option as ProjectSummary).projectName || ''}
                    getOptionKey={(option) => (option as ProjectSummary).projectCode}
                    disabled={loadingEmployees}
                  />
                </Box>
                <Box sx={{ minWidth: 250, flex: 1.5 }}>
                  <AnimatedAutocomplete
                    label="الموظف"
                    value={employees.find(e => e.employeeId === selectedEmployee) || null}
                    onChange={(newValue) => {
                      const emp = newValue as Employee | null;
                      setSelectedEmployee(emp ? emp.employeeId : 0);
                    }}
                    options={filteredEmployees}
                    getOptionLabel={(option) => (option as Employee).fullName || ''}
                    getOptionKey={(option) => (option as Employee).employeeId}
                    disabled={loadingEmployees}
                  />
                </Box>
              </>
            )}
            <TextField
              select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              SelectProps={{ displayEmpty: true }}
              sx={{
                minWidth: 180,
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
              size="small"
            >
              {monthOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExport}
              disabled={!timesheet || !timesheet.days || timesheet.days.length === 0 || loadingTimesheet}
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
              تصدير
            </Button>
          </Box>

          {/* Loading State */}
          {(loadingEmployees || loadingTimesheet) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Error State */}
          {(timesheetError || employeesError) && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {timesheetError ? 'فشل تحميل بيانات جدول الوقت.' : `فشل تحميل قائمة الموظفين: ${employeesError}`}
            </Alert>
          )}

          {/* Employee Info */}
          {!loadingEmployees && employee && (
            <Box sx={{
              mb: 3,
              p: 2,
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827', mb: 1 }}>
                {employee.fullName || timesheet?.employeeName}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                المنصب: {employee.positionTitle || 'غير متوفر'} | القسم: {employee.departmentCode || 'غير متوفر'} |
                نوع العقد: {employee.contractType || 'غير متوفر'}
              </Typography>
            </Box>
          )}

          {/* Summary Statistics */}
          <Box sx={{ mb: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>إجمالي الأيام</Typography>
              <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                {summary.totalDays}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>حاضر</Typography>
              <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>
                {summary.present}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>غائب</Typography>
              <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#DC2626' }}>
                {summary.absent}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>في إجازة</Typography>
              <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#F59E0B' }}>
                {summary.leave}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>متأخر</Typography>
              <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#EA580C' }}>
                {summary.late}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>عطلة نهاية الأسبوع</Typography>
              <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#6B7280' }}>
                {summary.weekends}
              </Typography>
            </Box>
          </Box>

          {/* Calendar Grid */}
          {!loadingTimesheet && timesheet && timesheet.days && (
            <Table
              size="small"
              sx={{
                backgroundColor: '#FFFFFF',
                '& .MuiTableHead-root': {
                  backgroundColor: '#F9FAFB',
                },
                '& .MuiTableCell-root': {
                  borderColor: '#E5E7EB',
                },
              }}
            >
              <TableHead>
                <TableRow>
                  {['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'].map((day) => (
                    <TableCell
                      key={day}
                      align="center"
                      sx={{
                        fontWeight: 600,
                        fontSize: '12px',
                        color: '#374151',
                        backgroundColor: '#F9FAFB',
                        borderBottom: '1px solid #E5E7EB',
                      }}
                    >
                      {day}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  // Calculate first day of month and its day of week
                  const [year, month] = selectedMonth.split('-').map(Number);
                  const firstDay = new Date(year, month - 1, 1);
                  const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
                  // Convert to Monday = 0 format
                  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
                  const totalCells = Math.ceil((timesheet.days.length + startOffset) / 7) * 7;

                  return Array.from({ length: Math.ceil(totalCells / 7) }, (_, weekIndex) => (
                    <TableRow
                      key={weekIndex}
                      sx={{
                        backgroundColor: '#FFFFFF',
                        '&:hover': {
                          backgroundColor: '#F9FAFB',
                        },
                      }}
                    >
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const cellIndex = weekIndex * 7 + dayIndex;
                        const dayData = cellIndex >= startOffset && cellIndex < startOffset + timesheet.days.length
                          ? timesheet.days[cellIndex - startOffset]
                          : null;
                        return (
                          <TableCell
                            key={dayIndex}
                            align="center"
                            sx={{
                              height: '80px',
                              verticalAlign: 'top',
                              padding: '8px',
                              backgroundColor: '#FFFFFF',
                              borderBottom: '1px solid #F3F4F6',
                              borderRight: '1px solid #F3F4F6',
                            }}
                          >
                            {dayData && (
                              <Box>
                                <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 0.5, color: '#111827' }}>
                                  {dayData.day}
                                </Typography>
                                <Chip
                                  label={dayData.status}
                                  size="small"
                                  sx={{
                                    backgroundColor: dayData.color,
                                    color: dayData.textColor,
                                    fontWeight: 600,
                                    fontSize: '10px',
                                    height: '20px',
                                  }}
                                />
                              </Box>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>
    </Box>
  );
}


