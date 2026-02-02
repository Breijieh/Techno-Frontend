'use client';

import { useMemo, useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip, CircularProgress, Button } from '@mui/material';
import {
  TrendingUp,
  People,
  Business,
  AccountBalance,
  Notifications as NotificationsIcon,
  Warning,
  CheckCircle,
  AccessTime,
  Schedule,
  EventNote,
  AttachMoney,
  ReceiptLong,
  Assessment,
  Add,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import type { EChartsOption } from 'echarts';
import SafeECharts from '@/components/common/SafeECharts';
import StatCard from '@/components/dashboard/StatCard';
import WelcomeCard from '@/components/dashboard/WelcomeCard';
import { dashboardApi, notificationsApi } from '@/lib/api';
import { getResponsiveChartOption } from '@/lib/charts/echarts-config';
import type {
  DashboardStatsResponse,
  EmployeeDistributionResponse,
  AttendanceOverviewResponse,
  ProjectStatusResponse,
} from '@/lib/api/types';
import type { NotificationResponse } from '@/lib/api/notifications';
import { employeesApi, type EmployeeResponse } from '@/lib/api/employees';
import { attendanceApi, type AttendanceResponse } from '@/lib/api/attendance';
import { getTodayLocalDate } from '@/lib/utils/dateFormatter';
import VacationBalanceCard from './VacationBalanceCard';
import AttendanceStatsCard from './AttendanceStatsCard';
import AttendanceCheckIn from './AttendanceCheckIn';
import DailyOverviewCard from './DailyOverviewCard';
import type { DailyOverviewDto } from '@/lib/api/attendance';
import type { UserRole } from '@/types/roles';

interface RoleDashboardProps {
  role: UserRole | null;
}

export default function RoleDashboard({ role }: RoleDashboardProps) {
  // State for dashboard data
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsResponse | null>(null);
  const [employeeDistribution, setEmployeeDistribution] = useState<EmployeeDistributionResponse | null>(null);
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceOverviewResponse | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatusResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  // Employee specific state
  const [myEmployee, setMyEmployee] = useState<EmployeeResponse | null>(null);
  const [myAttendanceStats, setMyAttendanceStats] = useState<{ present: number; absent: number; late: number }>({ present: 0, absent: 0, late: 0 });
  const [dailyOverview, setDailyOverview] = useState<DailyOverviewDto | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const quickActions = [
    {
      title: 'تسجيل الدخول والانصراف',
      description: 'تسجيل حضورك',
      icon: <Schedule />,
      color: '#0c2b7a',
      route: '/dashboard/self-service/attendance',
    },
    {
      title: 'طلب إجازة',
      description: 'إرسال طلب إجازة',
      icon: <EventNote />,
      color: '#059669',
      route: '/dashboard/employees/leave-requests',
    },
    {
      title: 'طلب قرض',
      description: 'التقدم بطلب سلفة راتب',
      icon: <AttachMoney />,
      color: '#F59E0B',
      route: '/dashboard/employees/loan-requests',
    },
    {
      title: 'طلب بدل',
      description: 'إرسال طلب بدل',
      icon: <AttachMoney />,
      color: '#8B5CF6',
      route: '/dashboard/employees/allowance-requests',
    },
    {
      title: 'تأجيل قسط',
      description: 'طلب تأجيل دفعة قرض',
      icon: <ReceiptLong />,
      color: '#EC4899',
      route: '/dashboard/employees/installment-postpone',
    },
    {
      title: 'عرض كشف الراتب',
      description: 'التحقق من تفاصيل راتبك',
      icon: <ReceiptLong />,
      color: '#0c2b7a',
      route: '/dashboard/self-service/payroll',
    },
    {
      title: 'سجل الحضور',
      description: 'عرض سجل حضورك',
      icon: <Schedule />,
      color: '#10B981',
      route: '/dashboard/self-service/attendance-history',
    },
    {
      title: 'ملفي الشخصي',
      description: 'عرض تفاصيلك الشخصية',
      icon: <Assessment />,
      color: '#3B82F6',
      route: '/dashboard/self-service/profile',
    },
  ];

  // Fetch dashboard data on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch dashboard stats (required for all roles that see stats)
        if (role && role !== 'Employee' && role !== 'Warehouse Manager') {
          const [stats, distribution, attendance, projects, notifs] = await Promise.allSettled([
            dashboardApi.getDashboardStats(),
            role === 'Admin' || role === 'HR Manager' || role === 'General Manager'
              ? dashboardApi.getEmployeeDistribution()
              : Promise.resolve(null),
            role === 'Admin' || role === 'HR Manager' || role === 'General Manager'
              ? dashboardApi.getAttendanceOverview()
              : Promise.resolve(null),
            role === 'Admin' || role === 'Project Manager' || role === 'General Manager'
              ? dashboardApi.getProjectStatus()
              : Promise.resolve(null),
            notificationsApi.getMyNotifications({ page: 0, size: 3 }),
          ]);

          if (stats.status === 'fulfilled') {
            setDashboardStats(stats.value);
          } else {
            console.error('Failed to fetch dashboard stats:', stats.reason);
          }
          if (distribution.status === 'fulfilled' && distribution.value) {
            setEmployeeDistribution(distribution.value);
          } else if (distribution.status === 'rejected') {
            console.error('Failed to fetch employee distribution:', distribution.reason);
          }
          if (attendance.status === 'fulfilled' && attendance.value) {
            setAttendanceOverview(attendance.value);
          } else if (attendance.status === 'rejected') {
            console.error('Failed to fetch attendance overview:', attendance.reason);
          }
          if (projects.status === 'fulfilled' && projects.value) {
            setProjectStatus(projects.value);
          } else if (projects.status === 'rejected') {
            console.error('Failed to fetch project status:', projects.reason);
          }
          if (notifs.status === 'fulfilled') {
            setNotifications(notifs.value.content);
          } else {
            console.error('Failed to fetch notifications:', notifs.reason);
          }
        } else if (role === 'Employee') {
          // For employees, fetch personal data, attendance, and notifications
          try {
            const notifs = await notificationsApi.getMyNotifications({ page: 0, size: 5 });

            setNotifications(notifs.content);
          } catch (err) {
            console.error('Error fetching employee dashboard data:', err);
            // Don't block dashboard on error, just log
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('فشل تحميل بيانات لوحة التحكم');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [role]);

  // Fetch personal data (Profile & Attendance) for all roles
  useEffect(() => {
    const fetchPersonalData = async () => {
      setOverviewLoading(true);
      try {
        // Get first day of current month (local timezone)
        const now = new Date();
        const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const today = getTodayLocalDate();

        const [employee, attendanceData, overview] = await Promise.all([
          employeesApi.getMyEmployee(),
          attendanceApi.getMyAttendance({ startDate: firstDay, endDate: today, size: 100 }),
          attendanceApi.getDailyOverview()
        ]);

        setMyEmployee(employee);
        setDailyOverview(overview);

        // Calculate attendance stats
        const present = attendanceData.content.filter(a => a.entryTime !== null).length;
        const absent = attendanceData.content.filter(a => a.absenceFlag === 'Y').length;
        const late = attendanceData.content.filter(a => (a.delayedCalc || 0) > 0).length;

        setMyAttendanceStats({ present, absent, late });
      } catch (err) {
        console.error('Error fetching personal data:', err);
      } finally {
        setOverviewLoading(false);
      }
    };
    fetchPersonalData();
  }, []);

  // Get current month name for payroll display
  const currentMonthName = useMemo(() => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const now = new Date();
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  // Filter stats based on role
  const stats = useMemo(() => {
    if (!dashboardStats) return [];

    const baseStats = [
      {
        title: 'الموظفون النشطون',
        value: `${dashboardStats.activeEmployees}`,
        percentage: `إجمالي ${dashboardStats.totalEmployees}`,
        delay: 0.3,
        icon: <People />,
        color: '#0c2b7a',
        module: 'employees' as const,
      },
      {
        title: 'المشاريع النشطة',
        value: `${dashboardStats.activeProjects}`,
        percentage: `إجمالي ${dashboardStats.totalProjects}`,
        delay: 0.4,
        icon: <Business />,
        color: '#059669',
        module: 'projects' as const,
      },
      {
        title: 'كشف الرواتب الشهري',
        value: `${(dashboardStats.monthlyPayroll / 1000).toFixed(0)} الف ر.س`,
        percentage: currentMonthName,
        delay: 0.5,
        icon: <AccountBalance />,
        color: '#0c2b7a',
        module: 'payroll' as const,
      },
      {
        title: 'الموافقات المعلقة',
        value: `${dashboardStats.pendingApprovals}`,
        percentage: 'يتطلب إجراء',
        delay: 0.6,
        icon: <CheckCircle />,
        color: '#F59E0B',
        module: 'approvals' as const,
      },
    ];

    if (role === 'Admin') {
      return baseStats;
    }

    // Filter stats based on role permissions
    return baseStats.filter(() => {
      if (role === 'Employee') {
        return false; // Employees don't see management stats
      }
      if (role === 'Warehouse Manager') {
        return false; // Warehouse managers don't see these stats
      }
      // Other roles see relevant stats
      return true;
    });
  }, [dashboardStats, role, currentMonthName]);

  // Employee Distribution Chart (only for Admin, HR Manager, General Manager)
  const employeeDistributionOption = useMemo(() => {
    if (role !== 'Admin' && role !== 'HR Manager' && role !== 'General Manager') {
      return null;
    }

    if (!employeeDistribution) return null;

    const saudiCount = employeeDistribution.saudiCount;
    const nonSaudiCount = employeeDistribution.nonSaudiCount;

    const option = {
      title: {
        text: 'توزيع الموظفين',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' },
      },
      tooltip: {
        trigger: 'item' as const,
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        bottom: '0%',
        left: 'center',
        itemGap: 30,
        icon: 'circle'
      },
      series: [
        {
          name: 'الموظفون',
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
            position: 'center' as const,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 18,
              fontWeight: 'bold',
            },
          },
          labelLine: {
            show: false,
            position: 'center' as const,
          },
          data: [
            { value: saudiCount, name: 'سعودي', itemStyle: { color: '#0c2b7a' } },
            { value: nonSaudiCount, name: 'غير سعودي', itemStyle: { color: '#3b82f6' } },
          ],
        },
      ],
    } as EChartsOption;

    return getResponsiveChartOption(option, 'ar', false);
  }, [role, employeeDistribution]);

  // Monthly Attendance Chart (only for Admin, HR Manager, General Manager)
  const attendanceChartOption = useMemo(() => {
    if (role !== 'Admin' && role !== 'HR Manager' && role !== 'General Manager') {
      return null;
    }

    if (!attendanceOverview) return null;

    const option = {
      title: {
        text: 'نظرة عامة على الحضور الشهري',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' },
      },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
      },
      legend: {
        bottom: '0%',
        left: 'center',
        itemGap: 30,
        icon: 'circle',
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '25%', // Increased for labels
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: attendanceOverview.weeks,
        axisLabel: {
          interval: 0,
          rotate: 0,
          align: 'center',
          verticalAlign: 'middle',
          margin: 10,
          fontSize: 11,
          fontWeight: 600,
        },
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: 'حاضر',
          type: 'bar',
          data: attendanceOverview.present,
          itemStyle: { color: '#10B981' },
        },
        {
          name: 'غائب',
          type: 'bar',
          data: attendanceOverview.absent,
          itemStyle: { color: '#EF4444' },
        },
        {
          name: 'في إجازة',
          type: 'bar',
          data: attendanceOverview.onLeave,
          itemStyle: { color: '#F59E0B' },
        },
      ],
    } as EChartsOption;

    return getResponsiveChartOption(option, 'ar', false);
  }, [role, attendanceOverview]);

  // Project Status Chart (only for Admin, Project Manager, General Manager)
  const projectStatusOption = useMemo(() => {
    if (role !== 'Admin' && role !== 'Project Manager' && role !== 'General Manager') {
      return null;
    }

    if (!projectStatus || projectStatus.projectCodes.length === 0) return null;

    const option = {
      title: {
        text: 'حالة المشاريع',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 600, color: '#111827' },
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        bottom: '0%',
        left: 'center',
        itemGap: 30,
        icon: 'circle',
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '25%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: projectStatus.projectCodes,
        axisLabel: {
          interval: 'auto',
          rotate: 0,
          align: 'center',
          margin: 10,
        },
      },
      yAxis: {
        type: 'value',
        name: 'نسبة الإنجاز %',
      },
      series: [
        {
          name: 'التقدم',
          type: 'line',
          data: projectStatus.completionPercentages,
          smooth: true,
          itemStyle: { color: '#0c2b7a' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(12, 43, 122, 0.3)' },
                { offset: 1, color: 'rgba(12, 43, 122, 0.05)' },
              ],
            },
          },
        },
      ],
    } as EChartsOption;

    return getResponsiveChartOption(option, 'ar', false);
  }, [role, projectStatus]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error && role && role !== 'Employee') {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Employee-specific dashboard content
  if (role === 'Employee') {
    return (
      <Box>
        <WelcomeCard
          employeeName={myEmployee?.employeeName || myEmployee?.employeeName}
          nationalId={myEmployee?.nationalId}
        />

        {dailyOverview && (
          <Box sx={{ mt: 3 }}>
            <DailyOverviewCard overview={dailyOverview} loading={overviewLoading} />
          </Box>
        )}

        <Box sx={{ mt: 3 }}>
          <AttendanceCheckIn />
        </Box>

        {/* Quick Actions */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#111827' }}>
            الخدمات الذاتية
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 3,
            }}
          >
            {quickActions.map((action, index) => (
              <Paper
                key={action.title}
                sx={{
                  padding: 3,
                  borderRadius: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  animation: `fadeInUp 0.6s ease-out ${0.3 + index * 0.1}s both`,
                  '@keyframes fadeInUp': {
                    from: { opacity: 0, transform: 'translateY(20px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  },
                }}
                onClick={() => router.push(action.route)}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '12px',
                    backgroundColor: `${action.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <Box sx={{ color: action.color, fontSize: 28 }}>
                    {action.icon}
                  </Box>
                </Box>
                <Typography
                  sx={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#111827',
                    mb: 0.5,
                  }}
                >
                  {action.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '13px',
                    color: '#6B7280',
                  }}
                >
                  {action.description}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* Recent Activity */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
            },
            gap: 3,
            mt: 4,
          }}
        >
          {/* Leave Requests */}
          <Paper
            sx={{
              padding: 3,
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              animation: 'fadeInUp 0.6s ease-out 0.7s both',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                طلبات الإجازة الأخيرة
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={() => router.push('/dashboard/employees/leave-requests')}
                sx={{
                  textTransform: 'none',
                  borderColor: '#0c2b7a',
                  color: '#0c2b7a',
                }}
              >
                طلب جديد
              </Button>
            </Box>
            <Typography sx={{ fontSize: '14px', color: '#6B7280', fontStyle: 'italic' }}>
              لا توجد طلبات إجازة حديثة
            </Typography>
          </Paper>

          {/* Loan Requests */}
          <Paper
            sx={{
              padding: 3,
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              animation: 'fadeInUp 0.6s ease-out 0.8s both',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                طلبات القرض الأخيرة
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={() => router.push('/dashboard/employees/loan-requests')}
                sx={{
                  textTransform: 'none',
                  borderColor: '#0c2b7a',
                  color: '#0c2b7a',
                }}
              >
                طلب جديد
              </Button>
            </Box>
            <Typography sx={{ fontSize: '14px', color: '#6B7280', fontStyle: 'italic' }}>
              لا توجد طلبات قرض حديثة
            </Typography>
          </Paper>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(3, 1fr)',
            },
            gap: 3,
            mt: 3,
          }}
        >
          {/* Vacation Balance */}
          <Box sx={{ gridColumn: 'span 1' }}>
            <VacationBalanceCard balance={myEmployee?.leaveBalanceDays || 0} />
          </Box>

          {/* Attendance Stats */}
          <Box sx={{ gridColumn: 'span 1' }}>
            <AttendanceStatsCard
              present={myAttendanceStats.present}
              absent={myAttendanceStats.absent}
              late={myAttendanceStats.late}
              monthName={currentMonthName}
            />
          </Box>

          {/* Notifications / Recent */}
          <Paper
            sx={{
              gridColumn: 'span 1',
              padding: 3,
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              animation: 'fadeInUp 0.6s ease-out 0.4s both',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#111827' }}>
              الإشعارات الأخيرة
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto', maxHeight: '300px' }}>
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <Box key={notif.notificationId} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <NotificationsIcon
                      sx={{
                        color: notif.isRead ? '#9CA3AF' : '#0c2b7a',
                        fontSize: 20,
                        mt: 0.5,
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                        {notif.title}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                        {notif.message}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  لا توجد إشعارات
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <>
      {/* Page Title & Stats */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            animation: 'fadeInUp 0.6s ease-out 0.2s both',
            '@keyframes fadeInUp': {
              from: {
                opacity: 0,
                transform: 'translateY(20px)',
              },
              to: {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#111827',
                mb: 0.5,
              }}
            >
              النظرة العامة للوحة التحكم
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              {(() => {
                const now = new Date();
                const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                return `${days[now.getDay()]}، ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
              })()}
            </Typography>
          </Box>
        </Box>

        {/* Stats Cards */}
        {stats.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: `repeat(${stats.length}, 1fr)`,
              },
              gap: 3,
            }}
          >
            {stats.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                percentage={stat.percentage}
                delay={stat.delay}
              />
            ))}
          </Box>
        )}
      </Box>

      <WelcomeCard
        employeeName={myEmployee?.employeeName || myEmployee?.employeeName}
        nationalId={myEmployee?.nationalId}
      />

      {/* Quick Actions for HR/Admin */}
      {(role === 'HR Manager' || role === 'Admin') && (
        <Box sx={{ mt: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#111827' }}>
            إجراءات سريعة
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Paper
              component="a"
              href="/dashboard/employees"
              sx={{ p: 2, minWidth: 150, textDecoration: 'none', textAlign: 'center', borderRadius: '12px', bgcolor: '#F0F9FF', '&:hover': { bgcolor: '#E0F2FE' } }}
            >
              <People sx={{ color: '#0284C7', mb: 1 }} />
              <Typography sx={{ color: '#0C4A6E', fontWeight: 600, fontSize: '14px' }}>إدارة الموظفين</Typography>
            </Paper>
            <Paper
              component="a"
              href="/dashboard/approvals"
              sx={{ p: 2, minWidth: 150, textDecoration: 'none', textAlign: 'center', borderRadius: '12px', bgcolor: '#FDF2F8', '&:hover': { bgcolor: '#FCE7F3' } }}
            >
              <CheckCircle sx={{ color: '#DB2777', mb: 1 }} />
              <Typography sx={{ color: '#831843', fontWeight: 600, fontSize: '14px' }}>الموافقات</Typography>
            </Paper>
            <Paper
              component="a"
              href="/dashboard/payroll"
              sx={{ p: 2, minWidth: 150, textDecoration: 'none', textAlign: 'center', borderRadius: '12px', bgcolor: '#ECFDF5', '&:hover': { bgcolor: '#D1FAE5' } }}
            >
              <AccountBalance sx={{ color: '#059669', mb: 1 }} />
              <Typography sx={{ color: '#064E3B', fontWeight: 600, fontSize: '14px' }}>الرواتب</Typography>
            </Paper>
          </Box>
        </Box>
      )}

      {/* Quick Actions for Project Manager */}
      {role === 'Project Manager' && (
        <Box sx={{ mt: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#111827' }}>
            إجراءات سريعة
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Paper
              component="a"
              href="/dashboard/projects"
              sx={{ p: 2, minWidth: 150, textDecoration: 'none', textAlign: 'center', borderRadius: '12px', bgcolor: '#F0F9FF', '&:hover': { bgcolor: '#E0F2FE' } }}
            >
              <Business sx={{ color: '#0284C7', mb: 1 }} />
              <Typography sx={{ color: '#0C4A6E', fontWeight: 600, fontSize: '14px' }}>المشاريع</Typography>
            </Paper>
            <Paper
              component="a"
              href="/dashboard/approvals"
              sx={{ p: 2, minWidth: 150, textDecoration: 'none', textAlign: 'center', borderRadius: '12px', bgcolor: '#FDF2F8', '&:hover': { bgcolor: '#FCE7F3' } }}
            >
              <CheckCircle sx={{ color: '#DB2777', mb: 1 }} />
              <Typography sx={{ color: '#831843', fontWeight: 600, fontSize: '14px' }}>الموافقات</Typography>
            </Paper>
            <Paper
              component="a"
              href="/dashboard/temp-labor/requests"
              sx={{ p: 2, minWidth: 150, textDecoration: 'none', textAlign: 'center', borderRadius: '12px', bgcolor: '#FFFBEB', '&:hover': { bgcolor: '#FEF3C7' } }}
            >
              <People sx={{ color: '#D97706', mb: 1 }} />
              <Typography sx={{ color: '#92400E', fontWeight: 600, fontSize: '14px' }}>العمالة المؤقتة</Typography>
            </Paper>
          </Box>
        </Box>
      )}

      {/* Quick Actions for Project Secretary */}
      {role === 'Project Secretary' && (
        <Box sx={{ mt: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#111827' }}>
            إجراءات سريعة
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Paper
              component="a"
              href="/dashboard/projects"
              sx={{ p: 2, minWidth: 150, textDecoration: 'none', textAlign: 'center', borderRadius: '12px', bgcolor: '#F0F9FF', '&:hover': { bgcolor: '#E0F2FE' } }}
            >
              <Business sx={{ color: '#0284C7', mb: 1 }} />
              <Typography sx={{ color: '#0C4A6E', fontWeight: 600, fontSize: '14px' }}>المشاريع</Typography>
            </Paper>
            <Paper
              component="a"
              href="/dashboard/employees/attendance"
              sx={{ p: 2, minWidth: 150, textDecoration: 'none', textAlign: 'center', borderRadius: '12px', bgcolor: '#ECFDF5', '&:hover': { bgcolor: '#D1FAE5' } }}
            >
              <AccessTime sx={{ color: '#059669', mb: 1 }} />
              <Typography sx={{ color: '#064E3B', fontWeight: 600, fontSize: '14px' }}>سجل الحضور</Typography>
            </Paper>
            <Paper
              component="a"
              href="/dashboard/approvals"
              sx={{ p: 2, minWidth: 150, textDecoration: 'none', textAlign: 'center', borderRadius: '12px', bgcolor: '#FDF2F8', '&:hover': { bgcolor: '#FCE7F3' } }}
            >
              <CheckCircle sx={{ color: '#DB2777', mb: 1 }} />
              <Typography sx={{ color: '#831843', fontWeight: 600, fontSize: '14px' }}>الموافقات</Typography>
            </Paper>
          </Box>
        </Box>
      )}

      {/* Personal Stats for Roles (Vacation & Attendance) */}
      {(role === 'HR Manager' || role === 'Admin' || role === 'Project Manager' || role === 'Project Secretary') && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
            mb: 4,
            width: '100%'
          }}
        >
          <Box sx={{ height: '320px' }}>
            <VacationBalanceCard balance={myEmployee?.leaveBalanceDays || 0} />
          </Box>
          <Box sx={{ height: '320px' }}>
            <AttendanceStatsCard
              present={myAttendanceStats.present}
              absent={myAttendanceStats.absent}
              late={myAttendanceStats.late}
              monthName={currentMonthName}
            />
          </Box>
        </Box>
      )}

      {/* Charts Section */}
      {(employeeDistributionOption || attendanceChartOption || projectStatusOption) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: employeeDistributionOption && attendanceChartOption ? '1fr 2fr' : '1fr',
            },
            gap: 3,
            mt: 2,
          }}
        >
          {/* Employee Distribution */}
          {employeeDistributionOption && (
            <Paper
              sx={{
                padding: 3,
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                animation: 'fadeInUp 0.6s ease-out 0.7s both',
                minHeight: '350px',
              }}
            >
              <SafeECharts
                option={employeeDistributionOption as EChartsOption}
                showCustomLegend={true}
                style={{ height: '350px', width: '100%' }}
              />
            </Paper>
          )}

          {/* Attendance Chart */}
          {attendanceChartOption && (
            <Paper
              sx={{
                padding: 3,
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                animation: 'fadeInUp 0.6s ease-out 0.8s both',
                minHeight: '350px',
              }}
            >
              <SafeECharts
                option={attendanceChartOption as EChartsOption}
                showCustomLegend={true}
                style={{ height: '350px', width: '100%' }}
              />
            </Paper>
          )}

          {/* Project Status */}
          {projectStatusOption && (
            <Paper
              sx={{
                padding: 3,
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                animation: 'fadeInUp 0.6s ease-out 0.9s both',
                minHeight: '300px',
                gridColumn: {
                  xs: '1',
                  md: '1 / -1',
                },
              }}
            >
              <SafeECharts
                option={projectStatusOption as EChartsOption}
                showCustomLegend={true}
                style={{ height: '300px', width: '100%' }}
              />
            </Paper>
          )}
        </Box>
      )}

      {/* Alerts and Recent Activity */}
      {role !== 'Warehouse Manager' && dashboardStats && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
            },
            gap: 3,
            mt: 2,
          }}
        >
          {/* Alerts Section */}
          <Paper
            sx={{
              padding: 3,
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              animation: 'fadeInUp 0.6s ease-out 1.0s both',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#111827' }}>
              تنبيهات النظام
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Warning sx={{ color: '#F59E0B', fontSize: 28 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    {dashboardStats.expiringDocuments} مستند تنتهي صلاحيته قريباً
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                    تصاريح الإقامة والجوازات تحتاج إلى تجديد
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUp sx={{ color: '#EF4444', fontSize: 28 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    {dashboardStats.overtimeAlerts} تنبيه عمل إضافي
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                    موظفون تجاوزوا 50 ساعة عمل إضافي
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircle sx={{ color: '#F59E0B', fontSize: 28 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    {dashboardStats.pendingApprovals} موافقات معلقة
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                    طلبات إجازة وقروض وبدلات
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Recent Notifications */}
          <Paper
            sx={{
              padding: 3,
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              animation: 'fadeInUp 0.6s ease-out 1.1s both',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#111827' }}>
              الإشعارات الأخيرة
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <Box key={notif.notificationId} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <NotificationsIcon
                      sx={{
                        color: notif.isRead ? '#9CA3AF' : '#0c2b7a',
                        fontSize: 20,
                        mt: 0.5,
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                        {notif.title}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>
                        {notif.message}
                      </Typography>
                      <Typography sx={{ fontSize: '11px', color: '#9CA3AF' }}>
                        {new Date(notif.createdDate).toLocaleString('en-GB')}
                      </Typography>
                    </Box>
                    {notif.priority === 'H' && (
                      <Chip label="عالية" size="small" sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 600 }} />
                    )}
                  </Box>
                ))
              ) : (
                <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
                  لا توجد إشعارات
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>
      )}
    </>
  );
}
