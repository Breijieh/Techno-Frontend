'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Paper,
    Typography,
    Grid,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    ReceiptLong,
    CheckCircle,
    Summarize,
    Schedule,
    AttachMoney,
    RemoveCircle,
    ArrowForward,
} from '@mui/icons-material';
import useRouteProtection from '@/hooks/useRouteProtection';
import { getUserRole } from '@/lib/permissions';
import type { UserRole } from '@/types/roles';

export default function PayrollDashboardPage() {
    const router = useRouter();
    const userRole = getUserRole();

    // Protect route - allow authenticated users (role-based card filtering below)
    useRouteProtection();

    const payrollModules = [
        {
            title: 'حساب الراتب',
            icon: <ReceiptLong sx={{ fontSize: 40 }} />,
            description: 'حساب ومعالجة كشوف الرواتب الشهرية للموظفين',
            path: '/dashboard/payroll/calculation',
            color: '#0c2b7a', // Primary Blue
            allowedRoles: ['Admin', 'HR Manager', 'Finance Manager'] as UserRole[],
        },
        {
            title: 'اعتماد الرواتب',
            icon: <CheckCircle sx={{ fontSize: 40 }} />,
            description: 'مراجعة واعتماد كشوف الرواتب النهائية',
            path: '/dashboard/payroll/approval',
            color: '#059669', // Emerald Green
            allowedRoles: ['Admin', 'HR Manager', 'General Manager', 'Finance Manager'] as UserRole[],
        },
        {
            title: 'التقارير',
            icon: <Summarize sx={{ fontSize: 40 }} />,
            description: 'عرض وتحميل تقارير الرواتب والمدفوعات',
            path: '/dashboard/payroll/reports',
            color: '#7C3AED', // Violet
            allowedRoles: ['Admin', 'HR Manager', 'General Manager', 'Finance Manager', 'Employee'] as UserRole[],
        },
        {
            title: 'سجلات الحضور',
            icon: <Schedule sx={{ fontSize: 40 }} />,
            description: 'إدارة ومراجعة سجلات الحضور والانصراف',
            path: '/dashboard/payroll/timesheets',
            color: '#F59E0B', // Amber
            allowedRoles: ['Admin', 'HR Manager', 'General Manager', 'Finance Manager', 'Project Manager', 'Employee'] as UserRole[],
        },
        {
            title: 'البدلات',
            icon: <AttachMoney sx={{ fontSize: 40 }} />,
            description: 'إدارة بدلات الموظفين والمكافآت',
            path: '/dashboard/payroll/allowances',
            color: '#2563EB', // Blue
            allowedRoles: ['Admin', 'HR Manager', 'Finance Manager'] as UserRole[],
        },
        {
            title: 'الخصومات',
            icon: <RemoveCircle sx={{ fontSize: 40 }} />,
            description: 'إدارة الخصومات والجزاءات',
            path: '/dashboard/payroll/deductions',
            color: '#DC2626', // Red
            allowedRoles: ['Admin', 'HR Manager', 'Finance Manager'] as UserRole[],
        },
    ];

    const filteredModules = payrollModules.filter(module =>
        userRole === 'Admin' || (userRole && module.allowedRoles.includes(userRole))
    );

    return (
        <Box sx={{ flex: 1 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mb: 1 }}>
                    إدارة كشوف الرواتب
                </Typography>
                <Typography sx={{ color: '#6B7280', fontSize: '1.1rem' }}>
                    لوحة التحكم المركزية لإدارة عمليات الرواتب والحضور
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {filteredModules.map((module, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={module.title}>
                        <Paper
                            onClick={() => router.push(module.path)}
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: '16px',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E7EB',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                                '@keyframes fadeInUp': {
                                    from: { opacity: 0, transform: 'translateY(20px)' },
                                    to: { opacity: 1, transform: 'translateY(0)' },
                                },
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 12px 24px -10px rgba(0, 0, 0, 0.1)',
                                    borderColor: module.color,
                                    '& .icon-bg': {
                                        transform: 'scale(1.1) rotate(5deg)',
                                        opacity: 0.15,
                                    },
                                    '& .action-icon': {
                                        transform: 'translateX(-4px)', // Move left for RTL
                                        opacity: 1,
                                    }
                                },
                            }}
                        >
                            {/* Decorative Background Icon */}
                            <Box
                                className="icon-bg"
                                sx={{
                                    position: 'absolute',
                                    right: -20,
                                    bottom: -20,
                                    color: module.color,
                                    opacity: 0.05,
                                    transform: 'scale(2.5)',
                                    transition: 'all 0.4s ease',
                                    zIndex: 0,
                                }}
                            >
                                {module.icon}
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, position: 'relative', zIndex: 1 }}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: '12px',
                                        backgroundColor: `${module.color}15`, // Digits for opacity commonly supported
                                        color: module.color,
                                    }}
                                >
                                    {module.icon}
                                </Box>
                                <Box
                                    className="action-icon"
                                    sx={{
                                        opacity: 0,
                                        transition: 'all 0.3s ease',
                                        color: module.color,
                                        transform: 'translateX(10px)'
                                    }}
                                >
                                    <ArrowForward />
                                </Box>
                            </Box>

                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 1, position: 'relative', zIndex: 1 }}>
                                {module.title}
                            </Typography>

                            <Typography sx={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: 1.5, position: 'relative', zIndex: 1, flex: 1 }}>
                                {module.description}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
