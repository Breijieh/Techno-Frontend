'use client';

import { useEffect, useState } from 'react';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import type { Employee } from '@/types';
import { departmentsApi, employeesApi } from '@/lib/api';
import type { DepartmentResponse } from '@/lib/api';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';
import EnhancedEmployeeView from './EnhancedEmployeeView';

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
  }, [open]);

  if (!employee) return null;

  return (
    <AnimatedDialog
      open={open}
      onClose={onClose}
      title="" // Title is handled by EnhancedEmployeeView
      maxWidth="md"
      hideHeader // We'll handle the header in EnhancedEmployeeView
    >
      <EnhancedEmployeeView
        employee={employee}
        onClose={onClose}
        departments={departments as any}
        managers={managers}
      />
    </AnimatedDialog>
  );
}

