'use client';

import { useEffect, useState } from 'react';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { Employee } from '@/types';
import { departmentsApi, employeesApi } from '@/lib/api';
import type { DepartmentResponse } from '@/lib/api';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';

interface EmployeeViewFormProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export default function EmployeeViewForm({
  open,
  onClose,
  employee,
}: EmployeeViewFormProps) {
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);

  // Load departments and managers when dialog opens
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      // Load departments
      try {
        const depts = await departmentsApi.getAllDepartments();
        setDepartments(depts);
      } catch (error) {
        console.error('Failed to load departments:', error);
      }

      // Load managers (employees)
      try {
        const response = await employeesApi.getAllEmployees({ page: 0, size: 1000 });
        const mappedManagers = response.employees.map(mapEmployeeResponseToEmployee);
        setManagers(mappedManagers);
      } catch (error) {
        console.error('Failed to load managers:', error);
      }
    };

    loadData();
  }, [open]); // Only depend on 'open' to prevent infinite loops

  if (!employee) return null;

  const getDepartmentName = (deptCode: number) => {
    const dept = departments.find((d) => d.deptCode === deptCode);
    return dept?.deptName || dept?.deptName || 'غير متوفر';
  };

  const getManagerName = (managerId?: number) => {
    if (!managerId) return 'غير متوفر';
    const manager = managers.find((e) => e.employeeId === managerId);
    return manager?.fullName || 'غير متوفر';
  };

  const contractColors: Record<string, { bg: string; text: string }> = {
    TECHNO: { bg: '#DBEAFE', text: '#1E40AF' },
    TEMPORARY: { bg: '#FEF3C7', text: '#92400E' },
    DAILY: { bg: '#FCE7F3', text: '#9F1239' },
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
    ON_LEAVE: { bg: '#FEF3C7', text: '#92400E' },
    INACTIVE: { bg: '#FEE2E2', text: '#991B1B' },
    TERMINATED: { bg: '#F3F4F6', text: '#374151' },
  };

  const fields = [
    { label: 'رقم الموظف', value: employee.employeeId, type: 'text' as const },
    { label: 'الاسم الكامل', value: employee.fullName, type: 'text' as const },
    { label: 'الاسم الأول', value: employee.firstName, type: 'text' as const },
    { label: 'اسم العائلة', value: employee.lastName, type: 'text' as const },
    { label: 'البريد الإلكتروني', value: employee.email, type: 'text' as const },
    { label: 'رقم الهاتف', value: employee.phone, type: 'text' as const },
    { label: 'الهوية الوطنية', value: employee.nationalId, type: 'text' as const },
    { label: 'رقم الإقامة', value: employee.residenceId, type: 'text' as const },
    { label: 'رقم الاشتراك في التامينات', value: employee.socialInsuranceNo, type: 'text' as const },
    { label: 'تاريخ الميلاد', value: employee.dateOfBirth, type: 'date' as const },
    { label: 'الجنسية', value: employee.nationality, type: 'text' as const },
    { label: 'مواطن سعودي', value: employee.isSaudi, type: 'boolean' as const },
    { label: 'القسم', value: getDepartmentName(employee.departmentCode), type: 'text' as const },
    { label: 'المنصب', value: employee.positionTitle, type: 'text' as const },
    {
      label: 'نوع العقد',
      value: employee.contractType,
      type: 'chip' as const,
      chipColor: contractColors[employee.contractType] || contractColors.TECHNO,
    },
    {
      label: 'الحالة',
      value: employee.status,
      type: 'chip' as const,
      chipColor: statusColors[employee.status] || statusColors.ACTIVE,
    },
    { label: 'تاريخ التوظيف', value: employee.hireDate, type: 'date' as const },
    { label: 'تاريخ إنهاء العقد', value: employee.terminationDate, type: 'date' as const },
    { label: 'الراتب الشهري', value: employee.monthlySalary, type: 'currency' as const },
    { label: 'رصيد الإجازات', value: employee.vacationBalance, type: 'text' as const },
    { label: 'المدير', value: getManagerName(employee.managerId), type: 'text' as const },
    { label: 'رقم جواز السفر', value: employee.passportNumber, type: 'text' as const },
    { label: 'صلاحية جواز السفر', value: employee.passportExpiry, type: 'date' as const },
    { label: 'صلاحية الإقامة', value: employee.residenceExpiry, type: 'date' as const },
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل الموظف"
      fields={fields}
      maxWidth="md"
    />
  );
}

