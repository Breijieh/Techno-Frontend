'use client';

import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { Department } from '@/types';
import { departmentsApi } from '@/lib/api/departments';
import { employeesApi } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';
import { useMemo } from 'react';

interface DepartmentViewFormProps {
  open: boolean;
  onClose: () => void;
  department: Department | null;
}

export default function DepartmentViewForm({
  open,
  onClose,
  department,
}: DepartmentViewFormProps) {
  // Fetch departments for parent department name resolution
  const { data: departmentsData } = useApi(
    () => departmentsApi.getAllDepartments(),
    { immediate: open && !!department } // Only fetch when form is open and department exists
  );

  // Fetch employees for manager name resolution
  const { data: employeesData } = useApi(
    () => employeesApi.getAllEmployees({ page: 0, size: 1000, sortBy: 'employeeNo', sortDirection: 'asc' }),
    { immediate: open && !!department } // Only fetch when form is open and department exists
  );

  const fields = useMemo(() => {
    if (!department) return [];
    
    const getParentDepartmentName = (parentCode?: number) => {
      if (!parentCode) return 'غير متوفر';
      const parent = (departmentsData || []).find((d) => d.deptCode === parentCode);
      return parent?.deptName || parent?.deptName || 'غير متوفر';
    };

    const getManagerName = (managerId?: number) => {
      if (!managerId) return 'غير متوفر';
      const manager = (employeesData?.content || []).find((e) => e.employeeNo === managerId);
      return manager?.employeeName || manager?.employeeName || 'غير متوفر';
    };
    
    return [
      { label: 'رمز القسم', value: department.departmentCode, type: 'text' as const },
      { label: 'اسم القسم', value: department.departmentName, type: 'text' as const },
      { label: 'القسم الرئيسي', value: getParentDepartmentName(department.parentDepartmentCode), type: 'text' as const },
      { label: 'المدير', value: getManagerName(department.managerEmployeeId), type: 'text' as const },
      { label: 'عدد الموظفين', value: department.employeeCount, type: 'text' as const },
    ];
  }, [department, departmentsData, employeesData]);

  if (!department) return null;

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل القسم"
      fields={fields}
      maxWidth="md"
    />
  );
}

