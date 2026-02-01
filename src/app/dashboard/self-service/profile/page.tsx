'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  Email,
  Phone,
  CalendarToday,
  Work,
  LocationOn,
} from '@mui/icons-material';
import useRouteProtection from '@/hooks/useRouteProtection';
import { employeesApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';
import type { Employee } from '@/types';

export default function EmployeeProfilePage() {
  const router = useRouter();

  // Protect route - only employees
  useRouteProtection(['Employee', 'Admin']);

  // Get current user's employee data from API using /me endpoint
  const { data: employeeResponse, loading: loadingEmployee, error: employeeError } = useApi(
    () => employeesApi.getMyEmployee(),
    { immediate: true }
  );

  // Map employee response to Employee type
  const employee: Employee | null = useMemo(() => {
    if (!employeeResponse) return null;
    return mapEmployeeResponseToEmployee(employeeResponse);
  }, [employeeResponse]);

  // Show loading state
  if (loadingEmployee) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#F8F9FC' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  // Show error state if employee data could not be loaded
  if (!loadingEmployee) {
    if (employeeError || !employeeResponse || !employee) {
      return (
        <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper sx={{ p: 3, maxWidth: 600 }}>
            <Typography variant="h6" color="error" sx={{ mb: 1 }}>
              سجل الموظف غير موجود
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              لم يتم العثور على سجل موظف لحسابك.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              يبدو أن حساب المستخدم الخاص بك مرتبط برقم موظف، لكن سجل الموظف غير موجود في النظام.
            </Typography>
            {employeeError && (
              <Typography variant="body2" color="error" sx={{ mb: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                خطأ: {employeeError}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              يرجى الاتصال بمسؤول النظام لحل هذه المشكلة. يحتاجون إما إلى إنشاء سجل الموظف أو تحديث حساب المستخدم الخاص بك للربط بموظف موجود.
            </Typography>
          </Paper>
        </Box>
      );
    }
  }

  // At this point, we know employee and employeeResponse are not null
  if (!employee || !employeeResponse) {
    return null;
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F8F9FC',
      }}
    >
      <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/dashboard')}
            sx={{ textTransform: 'none' }}
          >
            رجوع
          </Button>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
              ملفي الشخصي
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              عرض معلوماتك الشخصية
            </Typography>
          </Box>
        </Box>

        <Paper
          sx={{
            padding: 4,
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
                {employee.fullName}
              </Typography>
              <Typography sx={{ fontSize: '16px', color: '#6B7280', mb: 2 }}>
                {employee.positionTitle}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={employee.contractType}
                  sx={{
                    backgroundColor: employee.contractType === 'TECHNO' ? '#DBEAFE' : '#FEF3C7',
                    color: employee.contractType === 'TECHNO' ? '#1E40AF' : '#92400E',
                    fontWeight: 600,
                  }}
                />
                <Chip
                  label={employee.status}
                  sx={{
                    backgroundColor: employee.status === 'ACTIVE' ? '#D1FAE5' : '#FEE2E2',
                    color: employee.status === 'ACTIVE' ? '#065F46' : '#991B1B',
                    fontWeight: 600,
                  }}
                />
                {employee.isSaudi && (
                  <Chip
                    label="سعودي"
                    sx={{
                      backgroundColor: '#F3F4F6',
                      color: '#111827',
                      fontWeight: 600,
                    }}
                  />
                )}
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>رقم الموظف</Typography>
              <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#0c2b7a' }}>
                #{employee.employeeId}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Personal Information */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 2 }}>
              المعلومات الشخصية
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 3,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>البريد الإلكتروني</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email sx={{ fontSize: '18px', color: '#6B7280' }} />
                  <Typography sx={{ fontSize: '14px', color: '#111827' }}>{employee.email}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>الهاتف</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone sx={{ fontSize: '18px', color: '#6B7280' }} />
                  <Typography sx={{ fontSize: '14px', color: '#111827' }}>{employee.phone}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>تاريخ الميلاد</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarToday sx={{ fontSize: '18px', color: '#6B7280' }} />
                  <Typography sx={{ fontSize: '14px', color: '#111827' }}>
                    {employee.dateOfBirth.toLocaleDateString('en-GB')}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>الجنسية</Typography>
                <Typography sx={{ fontSize: '14px', color: '#111827' }}>{employee.nationality}</Typography>
              </Box>
              {employee.nationalId && (
                <Box>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>رقم الهوية الوطنية</Typography>
                  <Typography sx={{ fontSize: '14px', color: '#111827' }}>{employee.nationalId}</Typography>
                </Box>
              )}
              {employee.residenceId && (
                <Box>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>رقم الإقامة</Typography>
                  <Typography sx={{ fontSize: '14px', color: '#111827' }}>{employee.residenceId}</Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Employment Information */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 2 }}>
              معلومات العمل
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 3,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>القسم</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Work sx={{ fontSize: '18px', color: '#6B7280' }} />
                  <Typography sx={{ fontSize: '14px', color: '#111827' }}>
                    {employeeResponse!.primaryDeptArName || employeeResponse!.primaryDeptEnName || 'غير متاح'}
                  </Typography>
                </Box>
              </Box>
              {employeeResponse!.primaryProjectCode && (
                <Box>
                  <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>المشروع</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn sx={{ fontSize: '18px', color: '#6B7280' }} />
                    <Typography sx={{ fontSize: '14px', color: '#111827' }}>
                      {employeeResponse!.primaryProjectArName || employeeResponse!.primaryProjectEnName || 'غير متاح'}
                    </Typography>
                  </Box>
                </Box>
              )}
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>تاريخ التعيين</Typography>
                <Typography sx={{ fontSize: '14px', color: '#111827' }}>
                  {employee.hireDate.toLocaleDateString('en-GB')}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>الراتب الشهري</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#0c2b7a' }}>
                  SAR {employee.monthlySalary.toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>رصيد الإجازات</Typography>
                <Typography sx={{ fontSize: '14px', color: '#111827' }}>
                  {employee.vacationBalance} يوم
                </Typography>
              </Box>
            </Box>
          </Box>

          {employee.passportNumber && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 2 }}>
                  بيانات الوثائق
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                    gap: 3,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>رقم جواز السفر</Typography>
                    <Typography sx={{ fontSize: '14px', color: '#111827' }}>{employee.passportNumber}</Typography>
                  </Box>
                  {employee.passportExpiry && (
                    <Box>
                      <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>تاريخ انتهاء جواز السفر</Typography>
                      <Typography sx={{ fontSize: '14px', color: '#111827' }}>
                        {employee.passportExpiry.toLocaleDateString('en-GB')}
                      </Typography>
                    </Box>
                  )}
                  {employee.residenceExpiry && (
                    <Box>
                      <Typography sx={{ fontSize: '12px', color: '#6B7280', mb: 0.5 }}>تاريخ انتهاء الإقامة</Typography>
                      <Typography sx={{ fontSize: '14px', color: '#111827' }}>
                        {employee.residenceExpiry.toLocaleDateString('en-GB')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
