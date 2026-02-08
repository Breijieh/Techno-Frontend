'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Divider,
    Chip,
    Avatar,
    Grid,
    Paper,
    Tabs,
    Tab,
    IconButton,
    CircularProgress,
    Stack,
    useTheme,
    alpha,
    Button,
} from '@mui/material';
import {
    Person,
    Work,
    Description,
    AccountBalanceWallet,
    Email,
    Phone,
    LocationOn,
    CalendarToday,
    Badge,
    Business,
    SupervisorAccount,
    Translate,
    Close,
    Download,
} from '@mui/icons-material';
import { Employee } from '@/types';
import { formatDate } from '@/lib/utils/dateFormatter';
import { formatNumber } from '@/lib/utils/numberFormatter';
import { resolveImageUrl } from '@/lib/utils/imageUtils';
import { employeeContractAllowancesApi, projectsApi, loansApi, deductionsApi, attendanceApi, leavesApi, laborApi, salaryStructureApi, type EmployeeTimesheet as ApiEmployeeTimesheet, type LaborAssignmentResponse } from '@/lib/api';
import type { EmployeeContractAllowanceResponse, SalaryBreakdownResponse } from '@/lib/api';
import type { LoanRequest, TransferRequest, LeaveBalance, LeaveRequest } from '@/types';
import type { DeductionRequest } from '@/lib/mappers/deductionMapper';
import {
    History, Money, TrendingDown, Update, Assessment, Assignment,
    Alarm, Timeline, CalendarMonth, Sick, Flight, HourglassEmpty,
    CheckCircleOutline, ErrorOutline, WarningAmber
} from '@mui/icons-material';

interface EnhancedEmployeeViewProps {
    employee: Employee;
    onClose: () => void;
    departments: Array<{ deptCode: number; deptName: string }>;
    managers: Employee[];
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`employee-tabpanel-${index}`}
            aria-labelledby={`employee-tab-${index}`}
            {...other}
            style={{ padding: '24px 0' }}
        >
            {value === index && children}
        </div>
    );
}

const InfoItem = ({
    label,
    value,
    icon,
    type = 'text',
    chipColor
}: {
    label: string;
    value: any;
    icon?: React.ReactNode;
    type?: 'text' | 'date' | 'currency' | 'boolean' | 'chip';
    chipColor?: { bg: string; text: string };
}) => {
    const theme = useTheme();

    const renderValue = () => {
        if (value === null || value === undefined || value === '') {
            return (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    غير متوفر
                </Typography>
            );
        }

        switch (type) {
            case 'date':
                return (
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {value instanceof Date ? formatDate(value) : formatDate(new Date(value))}
                    </Typography>
                );
            case 'currency':
                return (
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        ر.س {formatNumber(value)}
                    </Typography>
                );
            case 'boolean':
                return (
                    <Chip
                        label={value ? 'نعم' : 'لا'}
                        size="small"
                        sx={{
                            bgcolor: value ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.grey[500], 0.1),
                            color: value ? 'success.dark' : 'grey.700',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            height: 20
                        }}
                    />
                );
            case 'chip':
                return (
                    <Chip
                        label={String(value)}
                        size="small"
                        sx={{
                            bgcolor: chipColor?.bg || alpha(theme.palette.primary.main, 0.1),
                            color: chipColor?.text || 'primary.dark',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            height: 20
                        }}
                    />
                );
            default:
                return (
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {String(value)}
                    </Typography>
                );
        }
    };

    return (
        <Box sx={{ mb: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                {icon && (
                    <Box sx={{ display: 'flex', '& .MuiSvgIcon-root': { fontSize: 16, color: 'text.secondary' } }}>
                        {icon}
                    </Box>
                )}
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {label}
                </Typography>
            </Stack>
            <Box sx={{ pl: icon ? 3 : 0 }}>
                {renderValue()}
            </Box>
        </Box>
    );
};

export default function EnhancedEmployeeView({
    employee,
    onClose,
    departments,
    managers,
}: EnhancedEmployeeViewProps) {
    const theme = useTheme();
    const [tabValue, setTabValue] = useState(0);
    const [allowances, setAllowances] = useState<EmployeeContractAllowanceResponse[]>([]);
    const [transfers, setTransfers] = useState<TransferRequest[]>([]);
    const [loans, setLoans] = useState<LoanRequest[]>([]);
    const [deductions, setDeductions] = useState<DeductionRequest[]>([]);
    const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
    const [recentLeaves, setRecentLeaves] = useState<LeaveRequest[]>([]);
    const [attendanceStats, setAttendanceStats] = useState<ApiEmployeeTimesheet | null>(null);
    const [assignments, setAssignments] = useState<LaborAssignmentResponse[]>([]);
    const [salaryBreakdowns, setSalaryBreakdowns] = useState<SalaryBreakdownResponse[]>([]);
    const [loadingAllowances, setLoadingAllowances] = useState(false);
    const [loadingExtraInfo, setLoadingExtraInfo] = useState(false);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoadingAllowances(true);
            setLoadingExtraInfo(true);
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

            // Fetch Allowances
            try {
                const data = await employeeContractAllowancesApi.getAllowancesByEmployee(employee.employeeId);
                setAllowances(data);
            } catch (err) {
                console.error('Failed to fetch allowances:', err);
                setAllowances([]);
            }

            // Fetch Transfers
            try {
                const data = await projectsApi.getAllTransferRequests(employee.employeeId);
                setTransfers(data);
            } catch (err) {
                console.error('Failed to fetch transfers:', err);
                setTransfers([]);
            }

            // Fetch Loans
            try {
                const data = await loansApi.getEmployeeLoans(employee.employeeId);
                setLoans(data);
            } catch (err) {
                console.error('Failed to fetch loans:', err);
                setLoans([]);
            }

            // Fetch Deductions
            try {
                const data = await deductionsApi.getEmployeeDeductions(employee.employeeId);
                setDeductions(data);
            } catch (err) {
                console.error('Failed to fetch deductions:', err);
                setDeductions([]);
            }

            // Fetch Leave Balance
            try {
                const data = await leavesApi.getLeaveBalance(employee.employeeId);
                setLeaveBalance(data);
            } catch (err) {
                console.error('Failed to fetch leave balance:', err);
                setLeaveBalance(null);
            }

            // Fetch Recent Leaves
            try {
                const data = await leavesApi.getEmployeeLeaves(employee.employeeId);
                setRecentLeaves(data);
            } catch (err) {
                console.error('Failed to fetch recent leaves:', err);
                setRecentLeaves([]);
            }

            // Fetch Attendance
            try {
                const data = await attendanceApi.getEmployeeTimesheet(employee.employeeId, currentMonth);
                setAttendanceStats(data);
            } catch (err) {
                console.error('Failed to fetch attendance:', err);
                setAttendanceStats(null);
            }

            // Fetch Labor Assignments
            try {
                const data = await laborApi.getEmployeeAssignments(employee.employeeId);
                setAssignments(data);
            } catch (err) {
                console.error('Failed to fetch labor assignments:', err);
                setAssignments([]);
            }

            // Fetch Salary Breakdowns
            try {
                const data = await salaryStructureApi.getAllBreakdowns();
                setSalaryBreakdowns(data);
            } catch (err) {
                console.error('Failed to fetch salary breakdowns:', err);
                setSalaryBreakdowns([]);
            }

            setLoadingAllowances(false);
            setLoadingExtraInfo(false);
        };

        fetchAllData();
    }, [employee.employeeId]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const getDepartmentName = (deptCode: number) => {
        return departments.find((d) => d.deptCode === deptCode)?.deptName || 'غير متوفر';
    };

    const getManagerName = (managerId?: number) => {
        if (!managerId) return 'غير متوفر';
        return managers.find((e) => e.employeeId === managerId)?.fullName || 'غير متوفر';
    };

    const getExpiryAlert = (expiryDate?: Date | string) => {
        if (!expiryDate) return null;
        const diffTime = new Date(expiryDate).getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return { label: `منتهي منذ ${Math.abs(diffDays)} يوم`, color: 'error' as const };
        if (diffDays <= 30) return { label: `ينتهي خلال ${diffDays} يوم`, color: 'warning' as const };
        return { label: `باقي ${diffDays} يوم`, color: 'success' as const };
    };

    const getServiceDuration = () => {
        const hire = new Date(employee.hireDate);
        const now = new Date();
        let years = now.getFullYear() - hire.getFullYear();
        let months = now.getMonth() - hire.getMonth();

        if (months < 0) {
            years--;
            months += 12;
        }

        const yearsText = years > 0 ? `${years} سنة` : '';
        const monthsText = months > 0 ? `${months} شهر` : '';

        return [yearsText, monthsText].filter(Boolean).join(' و ');
    };

    const contractColors: Record<string, { bg: string; text: string }> = {
        TECHNO: { bg: alpha(theme.palette.primary.main, 0.1), text: theme.palette.primary.dark },
        TEMPORARY: { bg: alpha(theme.palette.warning.main, 0.1), text: theme.palette.warning.dark },
        DAILY: { bg: alpha(theme.palette.secondary.main, 0.1), text: theme.palette.secondary.dark },
    };

    const statusColors: Record<string, { bg: string; text: string }> = {
        ACTIVE: { bg: alpha(theme.palette.success.main, 0.1), text: theme.palette.success.dark },
        ON_LEAVE: { bg: alpha(theme.palette.info.main, 0.1), text: theme.palette.info.dark },
        INACTIVE: { bg: alpha(theme.palette.error.main, 0.1), text: theme.palette.error.dark },
        TERMINATED: { bg: alpha(theme.palette.grey[500], 0.1), text: theme.palette.grey[700] },
    };

    const profileImageUrl = resolveImageUrl(employee.profilePictureUrl);

    return (
        <Box sx={{ position: 'relative', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
            {/* Header with Background Pattern */}
            <Box
                sx={{
                    height: 150,
                    background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
                    borderRadius: '16px 16px 0 0',
                    position: 'relative',
                    mb: 5
                }}
            >
                {/* Profile Section Overlay */}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -30,
                        left: 24,
                        right: 24,
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 2
                    }}
                >
                    <Box sx={{ position: 'relative' }}>
                        <Avatar
                            src={profileImageUrl || undefined}
                            sx={{
                                width: 100,
                                height: 100,
                                border: '4px solid #fff',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                bgcolor: 'primary.main',
                                fontSize: '2rem'
                            }}
                        >
                            {employee.fullName.charAt(0)}
                        </Avatar>
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 8,
                                right: 0,
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                bgcolor: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            <Box
                                sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    bgcolor: employee.status === 'ACTIVE' ? 'success.main' : 'grey.400'
                                }}
                            />
                        </Box>
                    </Box>

                    <Box sx={{ mb: 1, flex: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            {employee.fullName}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ color: alpha('#fff', 0.8), fontWeight: 500 }}>
                                {employee.positionTitle}
                            </Typography>
                            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: alpha('#fff', 0.6) }} />
                            <Typography variant="body2" sx={{ color: alpha('#fff', 0.6) }}>
                                ID: {employee.employeeId}
                            </Typography>
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ mb: 1, display: { xs: 'none', sm: 'flex' } }}>
                        <Chip
                            label={employee.status === 'ACTIVE' ? 'نشط' : employee.status}
                            size="small"
                            sx={{
                                bgcolor: statusColors[employee.status]?.bg,
                                color: statusColors[employee.status]?.text,
                                fontWeight: 700
                            }}
                        />
                        <Chip
                            label={employee.contractType}
                            size="small"
                            sx={{
                                bgcolor: contractColors[employee.contractType]?.bg,
                                color: contractColors[employee.contractType]?.text,
                                fontWeight: 700
                            }}
                        />
                    </Stack>
                </Box>
            </Box>

            {/* Tabs Section */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="employee details tabs"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        minHeight: 48,
                        '& .MuiTab-root': {
                            minHeight: 48,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            color: 'text.secondary',
                            '&.Mui-selected': {
                                color: 'primary.main',
                            }
                        }
                    }}
                >
                    <Tab icon={<Person sx={{ fontSize: 18 }} />} iconPosition="start" label="عام" />
                    <Tab icon={<Work sx={{ fontSize: 18 }} />} iconPosition="start" label="التوظيف" />
                    <Tab icon={<Description sx={{ fontSize: 18 }} />} iconPosition="start" label="المستندات" />
                    <Tab icon={<AccountBalanceWallet sx={{ fontSize: 18 }} />} iconPosition="start" label="المالية" />
                    <Tab icon={<CalendarMonth sx={{ fontSize: 18 }} />} iconPosition="start" label="الحضور" />
                    <Tab icon={<Sick sx={{ fontSize: 18 }} />} iconPosition="start" label="الإجازات" />
                </Tabs>
            </Box>

            {/* Tab Panels */}
            <Box sx={{ px: 3, flex: 1, overflowY: 'auto', maxHeight: '500px' }}>
                {/* General Tab */}
                <TabPanel value={tabValue} index={0}>
                    <Grid container spacing={3} sx={{ width: '100%' }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <InfoItem label="الاسم الأول" value={employee.firstName} icon={<Person />} />
                            <InfoItem label="اسم العائلة" value={employee.lastName} icon={<Person />} />
                            <InfoItem label="البريد الإلكتروني" value={employee.email} icon={<Email />} />
                            <InfoItem label="رقم الهاتف" value={employee.phone} icon={<Phone />} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <InfoItem label="الجنسية" value={employee.nationality} icon={<Translate />} />
                            <InfoItem label="مواطن سعودي" value={employee.isSaudi} type="boolean" icon={<LocationOn />} />
                            <InfoItem label="تاريخ الميلاد" value={employee.dateOfBirth} type="date" icon={<CalendarToday />} />
                            <InfoItem label="مدة الخدمة" value={getServiceDuration()} icon={<Timeline />} />
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Employment Tab */}
                <TabPanel value={tabValue} index={1}>
                    <Grid container spacing={3} sx={{ width: '100%' }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <InfoItem label="القسم" value={getDepartmentName(employee.departmentCode)} icon={<Business />} />
                            <InfoItem label="المنصب" value={employee.positionTitle} icon={<Badge />} />
                            <InfoItem label="المدير" value={getManagerName(employee.managerId)} icon={<SupervisorAccount />} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <InfoItem label="تاريخ التوظيف" value={employee.hireDate} type="date" icon={<CalendarToday />} />
                            <InfoItem label="نوع العقد" value={employee.contractType} type="chip" chipColor={contractColors[employee.contractType]} icon={<Description />} />
                            <InfoItem label="الحالة" value={employee.status} type="chip" chipColor={statusColors[employee.status]} icon={<Person />} />
                            {employee.terminationDate && (
                                <InfoItem label="تاريخ إنهاء العقد" value={employee.terminationDate} type="date" icon={<CalendarToday />} />
                            )}
                        </Grid>
                    </Grid>

                    {/* Project History */}
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <History sx={{ fontSize: 18 }} />
                            سجل المشاريع والتنقلات
                        </Typography>
                        {loadingExtraInfo ? (
                            <CircularProgress size={20} />
                        ) : transfers.length > 0 ? (
                            <Stack spacing={2}>
                                {transfers.map((transfer) => (
                                    <Paper
                                        key={transfer.requestId}
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: alpha(theme.palette.divider, 0.5)
                                        }}
                                    >
                                        <Grid container spacing={2} sx={{ width: '100%' }}>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <Typography variant="caption" color="text.secondary">من مشروع</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{transfer.fromProjectName || 'غير محدد'}</Typography>
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <Typography variant="caption" color="text.secondary">إلى مشروع</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>{transfer.toProjectName}</Typography>
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <Typography variant="caption" color="text.secondary">التاريخ</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(transfer.requestDate)}</Typography>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                لا يوجد سجل تنقلات لهذا الموظف
                            </Typography>
                        )}
                    </Box>

                    {/* Labor Assignments */}
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Assignment sx={{ fontSize: 18 }} />
                            مهام العمل المؤقتة (Labor Assignments)
                        </Typography>
                        {loadingExtraInfo ? (
                            <CircularProgress size={20} />
                        ) : assignments.length > 0 ? (
                            <Stack spacing={2}>
                                {assignments.map((assignment) => (
                                    <Paper
                                        key={assignment.assignmentNo}
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            bgcolor: alpha(theme.palette.success.main, 0.03),
                                            borderLeft: `4px solid ${theme.palette.success.main}`,
                                            borderRadius: '0 8px 8px 0'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{assignment.projectName || `مشروع ${assignment.projectCode}`}</Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                    {formatDate(assignment.startDate)} - {formatDate(assignment.endDate)}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={`يومي: ${formatNumber(assignment.dailyRate)}`}
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                            />
                                        </Box>
                                    </Paper>
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                لا يوجد مهام عمل مؤقتة مسجلة
                            </Typography>
                        )}
                    </Box>
                </TabPanel>

                {/* Documents Tab */}
                <TabPanel value={tabValue} index={2}>
                    <Grid container spacing={3} sx={{ width: '100%' }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="subtitle2" color="primary">الإقامة</Typography>
                                    {getExpiryAlert(employee.residenceExpiry) && (
                                        <Chip
                                            size="small"
                                            label={getExpiryAlert(employee.residenceExpiry)?.label}
                                            color={getExpiryAlert(employee.residenceExpiry)?.color}
                                            variant="outlined"
                                        />
                                    )}
                                </Box>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>{employee.residenceId}</Typography>
                                <Typography variant="caption" color="text.secondary">تنتهي في: {formatDate(employee.residenceExpiry)}</Typography>
                            </Paper>
                            <InfoItem label="الهوية الوطنية" value={employee.nationalId} icon={<Badge />} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="subtitle2" color="primary">جواز السفر</Typography>
                                    {getExpiryAlert(employee.passportExpiry) && (
                                        <Chip
                                            size="small"
                                            label={getExpiryAlert(employee.passportExpiry)?.label}
                                            color={getExpiryAlert(employee.passportExpiry)?.color}
                                            variant="outlined"
                                        />
                                    )}
                                </Box>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>{employee.passportNumber || 'N/A'}</Typography>
                                <Typography variant="caption" color="text.secondary">ينتهي في: {formatDate(employee.passportExpiry)}</Typography>
                            </Paper>
                            <InfoItem label="رقم التأمينات الاجتماعية" value={employee.socialInsuranceNo || 'غير مسجل'} icon={<Badge />} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <InfoItem label="التخصص" value={employee.specializationCode || 'غير متوفر'} icon={<Translate />} />
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Financials Tab */}
                <TabPanel value={tabValue} index={3}>
                    <Grid container spacing={3} sx={{ width: '100%' }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: alpha(theme.palette.primary.main, 0.1)
                                }}
                            >
                                <InfoItem label="الراتب الشهري الأساسي" value={employee.monthlySalary} type="currency" icon={<AccountBalanceWallet />} />
                                <Divider sx={{ my: 1.5 }} />
                                <InfoItem label="رصيد الإجازات" value={`${employee.vacationBalance} يوم`} icon={<CalendarToday />} />
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AccountBalanceWallet sx={{ fontSize: 18 }} />
                                البدلات (التعاقدية)
                            </Typography>

                            {loadingAllowances ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                    <CircularProgress size={24} />
                                </Box>
                            ) : allowances.length > 0 ? (
                                <Stack spacing={1.5}>
                                    {allowances.map((allowance) => (
                                        <Paper
                                            key={allowance.recordId}
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                bgcolor: allowance.isActive ? alpha(theme.palette.success.main, 0.03) : alpha(theme.palette.grey[500], 0.03),
                                                borderRadius: 2,
                                                border: '1px solid',
                                                borderColor: allowance.isActive ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.grey[500], 0.1),
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {allowance.transactionName}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    النسبة: {allowance.salaryPercentage}%
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                                ر.س {formatNumber((employee.monthlySalary * allowance.salaryPercentage) / 100)}
                                            </Typography>
                                        </Paper>
                                    ))}

                                    <Divider />

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>الإجمالي مع البدلات</Typography>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                            ر.س {formatNumber(
                                                employee.monthlySalary +
                                                allowances.reduce((acc, curr) => acc + (employee.monthlySalary * curr.salaryPercentage) / 100, 0)
                                            )}
                                        </Typography>
                                    </Box>
                                </Stack>
                            ) : (
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', textAlign: 'center', p: 3 }}>
                                    لا توجد بدلات مسجلة لهذا الموظف
                                </Typography>
                            )}
                        </Grid>
                    </Grid>

                    {/* Loans & Deductions Section */}
                    <Grid container spacing={3} sx={{ mt: 1, width: '100%' }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Money sx={{ fontSize: 18 }} />
                                السلف والقروض النشطة
                            </Typography>
                            {loadingExtraInfo ? (
                                <CircularProgress size={20} />
                            ) : loans.length > 0 ? (
                                <Stack spacing={1.5}>
                                    {loans.map((loan) => (
                                        <Paper
                                            key={loan.loanId}
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                bgcolor: alpha(theme.palette.warning.main, 0.03),
                                                borderRadius: 2,
                                                border: '1px solid',
                                                borderColor: alpha(theme.palette.warning.main, 0.1)
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>قرض مبلغ: {formatNumber(Number(loan.loanAmount))} ر.س</Typography>
                                                <Chip label={loan.status === 'APPROVED' ? 'معتمد' : 'تحت المعالجة'} size="small" color={loan.status === 'APPROVED' ? 'success' : 'warning'} />
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="caption" color="text.secondary">المتبقي: {formatNumber(Number(loan.remainingBalance || 0))} ر.س</Typography>
                                                <Typography variant="caption" color="text.secondary">الأقساط: {loan.numberOfInstallments}</Typography>
                                            </Box>
                                        </Paper>
                                    ))}
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>لا توجد قروض نشطة</Typography>
                            )}
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingDown sx={{ fontSize: 18 }} />
                                الخصومات الأخيرة
                            </Typography>
                            {loadingExtraInfo ? (
                                <CircularProgress size={20} />
                            ) : deductions.length > 0 ? (
                                <Stack spacing={1.5}>
                                    {deductions.map((deduction) => (
                                        <Paper
                                            key={deduction.requestId}
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                bgcolor: alpha(theme.palette.error.main, 0.03),
                                                borderRadius: 2,
                                                border: '1px solid',
                                                borderColor: alpha(theme.palette.error.main, 0.1)
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{deduction.deductionType || 'خصم'}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{formatDate(deduction.requestDate)}</Typography>
                                                </Box>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                                                    -{formatNumber(Number(deduction.deductionAmount))} ر.س
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    ))}
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>لا توجد خصومات مسجلة</Typography>
                            )}
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Attendance Tab */}
                <TabPanel value={tabValue} index={4}>
                    <Grid container spacing={3} sx={{ width: '100%' }}>
                        <Grid size={{ xs: 12 }}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Assessment sx={{ fontSize: 18 }} />
                                    إحصائيات الحضور (الشهر الحالي)
                                </Typography>
                                {loadingExtraInfo ? (
                                    <CircularProgress size={20} />
                                ) : attendanceStats ? (
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 6, md: 3 }}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 700 }}>{attendanceStats.present}</Typography>
                                                <Typography variant="caption" color="text.secondary">حضور</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 3 }}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 700 }}>{attendanceStats.absent}</Typography>
                                                <Typography variant="caption" color="text.secondary">غياب</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 3 }}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 700 }}>{attendanceStats.late}</Typography>
                                                <Typography variant="caption" color="text.secondary">تأخير</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 3 }}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>{attendanceStats.totalOvertimeHours}</Typography>
                                                <Typography variant="caption" color="text.secondary">إضافي (ساعة)</Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">لا توجد بيانات حضور متاحة</Typography>
                                )}
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>سجل الساعات اليومي (آخر 5 أيام)</Typography>
                            {attendanceStats?.days && attendanceStats.days.length > 0 ? (
                                <Stack spacing={1}>
                                    {attendanceStats.days.slice(-5).reverse().map((day, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{
                                                p: 1.5,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderBottom: '1px solid',
                                                borderColor: 'divider'
                                            }}
                                        >
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(day.date)}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {day.entryTime || '--:--'} - {day.exitTime || '--:--'}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={day.status}
                                                size="small"
                                                color={day.status === 'Present' ? 'success' : 'error'}
                                                variant="outlined"
                                                sx={{ height: 20, fontSize: '0.65rem' }}
                                            />
                                        </Box>
                                    ))}
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>لا يوجد سجل يومي متاح</Typography>
                            )}
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Leaves Tab */}
                <TabPanel value={tabValue} index={5}>
                    <Grid container spacing={3} sx={{ width: '100%' }}>
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Sick sx={{ fontSize: 18 }} />
                                أرصدة الإجازات المتبقية
                            </Typography>
                            {loadingExtraInfo ? (
                                <CircularProgress size={20} />
                            ) : leaveBalance ? (
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 4 }}>
                                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h6" color="primary.main">{leaveBalance.annualLeaveBalance}</Typography>
                                            <Typography variant="caption">سنوية</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid size={{ xs: 4 }}>
                                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h6" color="error.main">{leaveBalance.sickLeaveBalance}</Typography>
                                            <Typography variant="caption">مرضية</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid size={{ xs: 4 }}>
                                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h6" color="warning.main">{leaveBalance.emergencyLeaveBalance}</Typography>
                                            <Typography variant="caption">طارئة</Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            ) : (
                                <Typography variant="body2" color="text.secondary">لا توجد بيانات أرصدة</Typography>
                            )}
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1.5, fontWeight: 700 }}>أحدث طلبات الإجازات</Typography>
                            {recentLeaves.length > 0 ? (
                                <Stack spacing={1.5}>
                                    {recentLeaves.slice(0, 3).map((leave) => (
                                        <Paper key={leave.requestId} elevation={0} sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.02), borderRadius: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{leave.leaveType || 'إجازة'}</Typography>
                                                <Chip label={leave.status} size="small" color={leave.status === 'APPROVED' ? 'success' : 'warning'} variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDate(leave.fromDate)} - {formatDate(leave.toDate)} ({leave.numberOfDays} أيام)
                                            </Typography>
                                        </Paper>
                                    ))}
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>لا توجد طلبات إجازة سابقة</Typography>
                            )}
                        </Grid>
                    </Grid>
                </TabPanel>
            </Box>

            {/* Footer Actions */}
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => {/* Implement export single employee */ }}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                    تصدير PDF
                </Button>
                <Button
                    variant="contained"
                    onClick={onClose}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
                    }}
                >
                    إغلاق
                </Button>
            </Box>

            {/* Absolute Close Icon */}
            <IconButton
                onClick={onClose}
                sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    color: alpha('#fff', 0.8),
                    '&:hover': { color: '#fff', bgcolor: alpha('#fff', 0.1) }
                }}
            >
                <Close />
            </IconButton>
        </Box>
    );
}
