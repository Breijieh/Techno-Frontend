'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Save,
  Cancel,
} from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import {
  AnimatedTextField,
  AnimatedSelect,
  AnimatedAutocomplete,
} from '@/components/common/FormFields';
import type { Department } from '@/types';
import { departmentsApi, type DepartmentResponse } from '@/lib/api/departments';
import { employeesApi, type EmployeeResponse } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';

interface DepartmentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Department>) => Promise<void>;
  initialData?: Department | null;
  loading?: boolean;
  departments?: DepartmentResponse[];
  employees?: EmployeeResponse[];
}

// Custom Smart Row component to replace problematic Grid
const SmartRow = ({ children, spacing = 2 }: { children: React.ReactNode; spacing?: number }) => (
  <Box sx={{ display: 'flex', gap: spacing, mb: spacing, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
    {children}
  </Box>
);

const SmartField = ({ children, flex = 1 }: { children: React.ReactNode; flex?: number | string }) => (
  <Box sx={{ flex, minWidth: { xs: '100%', md: '0' } }}>
    {children}
  </Box>
);

export default function DepartmentForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  departments: propDepartments,
  employees: propEmployees,
}: DepartmentFormProps) {
  const isEdit = !!initialData;

  // Fetch departments for parent department dropdown (only if not provided via props)
  const { data: fetchedDepartments } = useApi(
    () => departmentsApi.getAllDepartments(),
    { immediate: open && !propDepartments }
  );

  const departmentsData = propDepartments || fetchedDepartments;

  // Fetch employees for manager dropdown (only if not provided via props)
  const { data: fetchedEmployees } = useApi(
    () => employeesApi.getAllEmployees({ page: 0, size: 1000, sortBy: 'employeeNo', sortDirection: 'asc' }),
    { immediate: open && !propEmployees }
  );

  const employeesData = propEmployees ? { content: propEmployees } : fetchedEmployees;

  const [formData, setFormData] = useState<Partial<Department>>({
    departmentName: '',
    parentDepartmentCode: undefined,
    managerEmployeeId: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          departmentName: initialData.departmentName,
          parentDepartmentCode: initialData.parentDepartmentCode,
          managerEmployeeId: initialData.managerEmployeeId,
        });
      } else {
        setFormData({
          departmentName: '',
          parentDepartmentCode: undefined,
          managerEmployeeId: undefined,
        });
      }
      setErrors({});
    }, 0);
  }, [initialData, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.departmentName?.trim()) {
      newErrors.departmentName = 'اسم القسم مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
  };

  // Map departments for parent department dropdown
  const parentDepartmentOptions = (departmentsData || [])
    .filter((dept) => dept.deptCode !== initialData?.departmentCode) // Filter self
    .map((dept) => ({
      value: dept.deptCode,
      label: dept.deptName || dept.deptName || '',
    }));

  // Map employees for manager dropdown
  const managerOptions = ((employeesData as { employees?: EmployeeResponse[]; content?: EmployeeResponse[] })?.employees ||
    (employeesData as { content?: EmployeeResponse[] })?.content || [])
    .map((emp: EmployeeResponse) => ({
      value: emp.employeeNo,
      label: `${emp.employeeName || emp.employeeName || ''} (${emp.employeeNo})`,
    }));

  return (
    <AnimatedDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'تعديل القسم' : 'إضافة قسم جديد'}
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, paddingTop: 1 }}>
        <SmartRow>
          <SmartField>
            <AnimatedTextField
              label="اسم القسم"
              value={formData.departmentName || ''}
              onChange={(val: string) => setFormData({ ...formData, departmentName: val })}
              error={!!errors.departmentName}
              helperText={errors.departmentName}
              required
              autoFocus
            />
          </SmartField>
        </SmartRow>

        <SmartRow>
          <SmartField>
            <AnimatedSelect
              label="القسم الرئيسي"
              value={formData.parentDepartmentCode || 0}
              onChange={(val: string | number) => setFormData({ ...formData, parentDepartmentCode: val === 0 ? undefined : (val as number) })}
              options={[{ value: 0, label: 'لا يوجد قسم رئيسي' }, ...parentDepartmentOptions]}
            />
          </SmartField>
          <SmartField>
            <AnimatedAutocomplete
              label="المدير"
              value={managerOptions.find(opt => opt.value === (formData.managerEmployeeId || 0)) || null}
              onChange={(val) => {
                const option = val as { value: number; label: string } | null;
                setFormData({ ...formData, managerEmployeeId: option?.value === 0 ? undefined : option?.value });
              }}
              options={[{ value: 0, label: 'لا يوجد مدير' }, ...managerOptions]}
              getOptionLabel={(opt) => (opt as { label: string }).label}
            />
          </SmartField>
        </SmartRow>
      </Box>
    </AnimatedDialog>
  );
}

