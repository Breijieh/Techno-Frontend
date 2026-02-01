'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Typography,
} from '@mui/material';
import {
    Save,
    Cancel,
} from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import {
    AnimatedTextField,
    AnimatedSelect,
    AnimatedSwitch,
    AnimatedMultiSelect,
} from '@/components/common/FormFields';
import type { UserAccount, UserType } from '@/types';
import { employeesApi } from '@/lib/api/employees';
import { projectsApi } from '@/lib/api/projects';
import { useApi } from '@/hooks/useApi';

interface AdminUserFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<UserAccount> & { assignedProjectId?: number; assignedProjectIds?: number[] }) => Promise<void>;
    initialData?: UserAccount | null;
    loading?: boolean;
}

export default function AdminUserForm({
    open,
    onClose,
    onSubmit,
    initialData,
    loading = false,
}: AdminUserFormProps) {
    const isEdit = !!initialData;

    const [formData, setFormData] = useState<Partial<UserAccount> & { assignedProjectId?: number; assignedProjectIds?: number[] }>({
        username: '',
        password: '',
        nationalId: '',
        userType: 'PROJECT_MANAGER' as UserType,
        isActive: true,
        employeeId: undefined,
        assignedProjectId: undefined,
        assignedProjectIds: [],
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch employees for dropdown
    const { data: employeesData } = useApi(
        () => employeesApi.getAllEmployees({ size: 1000 }),
        { immediate: true }
    );

    // Fetch projects for assignment
    const { data: projectsData } = useApi(
        () => projectsApi.getAllProjects({ size: 1000 }),
        { immediate: true }
    );

    useEffect(() => {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
            if (initialData) {
                setFormData({
                    username: initialData.username,
                    userType: initialData.userType,
                    isActive: initialData.isActive,
                    employeeId: initialData.employeeId,
                    password: '', // Don't pre-fill password
                    assignedProjectId: (initialData as any).projectCode, // Assuming projectCode comes in initialData for single project
                    // For multi-project, we might need a separate fetch or field if it's not in UserAccount
                    // Since UserAccount doesn't natively carry list of managed projects in DTO yet, 
                    // we might just start fresh or relying on what's available.
                    // For now, let's leave assignedProjectId mapped. 
                    // If we need to fetch user's managed projects, that requires an extra API call.
                    assignedProjectIds: [],
                });
            } else {
                setFormData({
                    username: '',
                    password: '',
                    nationalId: '',
                    userType: 'PROJECT_MANAGER', // Default to PM for this form
                    isActive: true,
                    employeeId: undefined,
                    assignedProjectId: undefined,
                    assignedProjectIds: [],
                });
            }
            setErrors({});
        }, 0);
    }, [initialData, open]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.username?.trim()) {
            newErrors.username = 'اسم المستخدم مطلوب';
        } else if (formData.username.length < 3) {
            newErrors.username = 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
        }

        if (!isEdit && !formData.nationalId?.trim()) {
            newErrors.nationalId = 'الهوية الوطنية مطلوبة';
        } else if (formData.nationalId && formData.nationalId.length > 20) {
            newErrors.nationalId = 'الهوية الوطنية يجب أن تكون 20 حرفاً أو أقل';
        }

        if (!isEdit && !formData.password) {
            newErrors.password = 'كلمة المرور مطلوبة';
        } else if (formData.password && formData.password.length < 6) {
            newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        const submitData = {
            ...formData,
            // Only include password if it's provided
            ...(formData.password ? { password: formData.password } : {}),
        };

        await onSubmit(submitData);
    };

    const employeeOptions = employeesData?.employees?.map((emp) => ({
        value: emp.employeeNo,
        label: `${emp.employeeName || emp.employeeName} (${emp.employeeNo})`,
    })) || [];

    const projectOptions = projectsData?.content?.map((proj) => ({
        value: proj.projectCode,
        label: `${proj.projectName} - ${proj.projectName} (${proj.projectCode})`,
    })) || [];

    const adminRoles = [
        { value: 'ADMIN', label: 'مدير النظام' },
        { value: 'GENERAL_MANAGER', label: 'المدير العام' },
        { value: 'HR_MANAGER', label: 'مدير الموارد البشرية' },
        { value: 'FINANCE_MANAGER', label: 'مدير المالية' },
        { value: 'PROJECT_MANAGER', label: 'مدير المشروع' },
        { value: 'REGIONAL_PROJECT_MANAGER', label: 'مدير مشاريع إقليمي' },
        { value: 'PROJECT_SECRETARY', label: 'سكرتير مشروع' },
        { value: 'PROJECT_ADVISOR', label: 'مستشار مشروع' },
        { value: 'WAREHOUSE_MANAGER', label: 'مدير المستودع' },
    ];

    return (
        <AnimatedDialog
            open={open}
            onClose={onClose}
            title={isEdit ? 'تعديل مسؤول إداري' : 'إضافة مسؤول إداري جديد'}
            maxWidth="md"
            disableBackdropClick={loading}
            showCloseButton={!loading}
            actions={
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', width: '100%' }}>
                    <Button
                        onClick={onClose}
                        variant="outlined"
                        startIcon={<Cancel />}
                        disabled={loading}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderColor: '#D1D5DB',
                            color: '#374151',
                            '&:hover': {
                                borderColor: '#9CA3AF',
                                backgroundColor: '#F9FAFB',
                            },
                        }}
                    >
                        إلغاء
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Save />}
                        disabled={loading}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
                            color: '#FFFFFF',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
                            },
                            '&:disabled': {
                                background: '#9CA3AF',
                            },
                        }}
                    >
                        {loading ? 'جارٍ الحفظ...' : isEdit ? 'تحديث' : 'إنشاء'}
                    </Button>
                </Box>
            }
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    paddingTop: 2,
                }}
            >
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    بيانات الحساب الأساسية
                </Typography>

                <AnimatedTextField
                    label="اسم المستخدم"
                    value={formData.username || ''}
                    onChange={(val: string) => setFormData({ ...formData, username: val })}
                    error={!!errors.username}
                    helperText={errors.username}
                    required
                    autoFocus
                    disabled={isEdit}
                />

                {!isEdit && (
                    <AnimatedTextField
                        label="الهوية الوطنية"
                        value={formData.nationalId || ''}
                        onChange={(val: string) => setFormData({ ...formData, nationalId: val })}
                        error={!!errors.nationalId}
                        helperText={errors.nationalId}
                        required
                    />
                )}

                <AnimatedTextField
                    label={isEdit ? 'كلمة مرور جديدة (اتركها فارغة للاحتفاظ بالحالية)' : 'كلمة المرور'}
                    value={formData.password || ''}
                    onChange={(val: string) => setFormData({ ...formData, password: val })}
                    error={!!errors.password}
                    helperText={errors.password}
                    required={!isEdit}
                    type="password"
                />

                <AnimatedSelect
                    label="الدور الوظيفي (نوع المستخدم)"
                    value={formData.userType || 'PROJECT_MANAGER'}
                    onChange={(val: string | number) => setFormData({ ...formData, userType: val as UserType })}
                    options={adminRoles}
                    required
                />

                <AnimatedSelect
                    label="ربط بموظف (اختياري)"
                    value={formData.employeeId || 0}
                    onChange={(val: string | number) => setFormData({ ...formData, employeeId: val === 0 ? undefined : (val as number) })}
                    options={[{ value: 0, label: 'لا يوجد موظف' }, ...employeeOptions]}
                    helperText="يمكن ربط حساب المسؤول بملف موظف موجود"
                />

                {/* Conditional Project Assignment Fields */}
                {formData.userType === 'PROJECT_MANAGER' && (
                    <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px dashed #e0e0e0' }}>
                        <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                            تعيين المشروع (لمدير المشروع)
                        </Typography>
                        <AnimatedSelect
                            label="المشروع المدار"
                            value={formData.assignedProjectId || 0}
                            onChange={(val: string | number) => setFormData({ ...formData, assignedProjectId: val === 0 ? undefined : (val as number) })}
                            options={[{ value: 0, label: 'غير معين' }, ...projectOptions]}
                            helperText="حدد المشروع الذي سيديره هذا المستخدم"
                        />
                    </Box>
                )}

                {formData.userType === 'REGIONAL_PROJECT_MANAGER' && (
                    <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px dashed #e0e0e0' }}>
                        <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                            تعيين المشاريع (لمدير المشاريع الإقليمي)
                        </Typography>
                        <AnimatedMultiSelect
                            label="المشاريع المدارة إقليمياً"
                            value={formData.assignedProjectIds || []}
                            onChange={(vals: (string | number)[]) => setFormData({ ...formData, assignedProjectIds: vals as number[] })}
                            options={projectOptions}
                            helperText="حدد المشاريع التي تقع تحت إشراف هذا المدير الإقليمي"
                        />
                    </Box>
                )}

                <AnimatedSwitch
                    label="نشط"
                    checked={formData.isActive ?? true}
                    onChange={(val: boolean) => setFormData({ ...formData, isActive: val })}
                    helperText="المستخدمون غير النشطين لا يمكنهم تسجيل الدخول"
                />
            </Box>
        </AnimatedDialog>
    );
}
