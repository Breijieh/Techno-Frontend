import type { UserRole } from '@/types/roles';
import type { Employee, AttendanceTransaction, LeaveRequest, LoanRequest, Project, SalaryHeader } from '@/types';

/**
 * Filter employees based on user role
 * - Project Managers: Only employees in their projects
 * - HR Managers: Employees in their departments
 * - Employees: Only themselves
 * - Others: All employees (or filtered by permissions)
 */
export function filterEmployeesByRole(
  employees: Employee[],
  role: UserRole | null,
  userEmployeeId?: number,
  userProjectCode?: number,
  userDepartmentCode?: number
): Employee[] {
  if (!role) return [];

  if (role === 'Employee') {
    // Employees can only see themselves
    if (userEmployeeId) {
      return employees.filter(emp => emp.employeeId === userEmployeeId);
    }
    return [];
  }

  if (role === 'Project Manager') {
    // Project Managers see employees in their projects
    if (userProjectCode) {
      return employees.filter(emp => emp.projectCode === userProjectCode);
    }
    return [];
  }

  if (role === 'HR Manager') {
    // HR Managers see employees in their departments
    if (userDepartmentCode) {
      return employees.filter(emp => emp.departmentCode === userDepartmentCode);
    }
    // If no department specified, show all (HR can manage all)
    return employees;
  }

  // Admin, General Manager, Finance Manager see all
  return employees;
}

/**
 * Filter attendance transactions based on user role
 */
export function filterAttendanceByRole(
  attendance: AttendanceTransaction[],
  role: UserRole | null,
  userEmployeeId?: number,
  userProjectCode?: number
): AttendanceTransaction[] {
  if (!role) return [];

  if (role === 'Employee') {
    // Employees can only see their own attendance
    if (userEmployeeId) {
      return attendance.filter(att => att.employeeId === userEmployeeId);
    }
    return [];
  }

  if (role === 'Project Manager') {
    // Project Managers see attendance for their project
    if (userProjectCode) {
      return attendance.filter(att => att.projectCode === userProjectCode);
    }
    return [];
  }

  // Admin, HR Manager, General Manager see all
  return attendance;
}

/**
 * Filter leave requests based on user role
 */
export function filterLeaveRequestsByRole(
  leaveRequests: LeaveRequest[],
  role: UserRole | null,
  userEmployeeId?: number
): LeaveRequest[] {
  if (!role) return [];

  if (role === 'Employee') {
    // Employees can only see their own requests
    if (userEmployeeId) {
      return leaveRequests.filter(req => req.employeeId === userEmployeeId);
    }
    return [];
  }

  if (role === 'Project Manager') {
    // Project Managers see requests for employees in their projects
    // This would require joining with employee data
    // For now, return all (should be filtered by employee project in real implementation)
    return leaveRequests;
  }

  // Admin, HR Manager see all
  return leaveRequests;
}

/**
 * Filter loan requests based on user role
 */
export function filterLoanRequestsByRole(
  loanRequests: LoanRequest[],
  role: UserRole | null,
  userEmployeeId?: number
): LoanRequest[] {
  if (!role) return [];

  if (role === 'Employee') {
    // Employees can only see their own requests
    if (userEmployeeId) {
      return loanRequests.filter(req => req.employeeId === userEmployeeId);
    }
    return [];
  }

  // Admin, HR Manager, Finance Manager see all
  return loanRequests;
}

/**
 * Filter allowance requests based on user role
 */
export function filterAllowanceRequestsByRole<T extends { employeeId?: number }>(
  allowanceRequests: T[],
  role: UserRole | null,
  userEmployeeId?: number
): T[] {
  if (!role) return [];

  if (role === 'Employee') {
    // Employees can only see their own requests
    if (userEmployeeId) {
      return allowanceRequests.filter(req => req.employeeId === userEmployeeId);
    }
    return [];
  }

  // Admin, HR Manager, Finance Manager see all
  return allowanceRequests;
}

/**
 * Filter installment postpone requests based on user role
 */
export function filterInstallmentPostponeByRole<T extends { employeeId?: number }>(
  postponeRequests: T[],
  role: UserRole | null,
  userEmployeeId?: number
): T[] {
  if (!role) return [];

  if (role === 'Employee') {
    // Employees can only see their own requests
    if (userEmployeeId) {
      return postponeRequests.filter(req => req.employeeId === userEmployeeId);
    }
    return [];
  }

  // Admin, HR Manager, Finance Manager see all
  return postponeRequests;
}

/**
 * Filter projects based on user role
 */
export function filterProjectsByRole(
  projects: Project[],
  role: UserRole | null,
  userProjectCode?: number
): Project[] {
  if (!role) return [];

  if (role === 'Project Manager') {
    // Project Managers see only their assigned projects
    if (userProjectCode) {
      return projects.filter(proj => proj.projectCode === userProjectCode);
    }
    return [];
  }

  // Admin, General Manager, HR Manager, Finance Manager see all
  return projects;
}

/**
 * Filter payroll (salary headers) based on user role
 * - Employees: Only their own payroll
 * - Project Managers: Payroll for employees in their projects (requires employees data)
 * - HR Managers: Payroll for employees in their departments (requires employees data)
 * - Others: All payroll
 */
export function filterPayrollByRole(
  payroll: SalaryHeader[],
  role: UserRole | null,
  userEmployeeId?: number,
  employees?: Employee[],
  userProjectCode?: number,
  userDepartmentCode?: number
): SalaryHeader[] {
  if (!role) return [];

  if (role === 'Employee') {
    // Employees can only see their own payroll
    if (userEmployeeId) {
      return payroll.filter(sal => sal.employeeNo === userEmployeeId);
    }
    return [];
  }

  if (role === 'Project Manager' && employees && userProjectCode) {
    // Project Managers see payroll for employees in their projects
    const projectEmployeeIds = employees
      .filter(emp => emp.projectCode === userProjectCode)
      .map(emp => emp.employeeId);
    return payroll.filter(sal => projectEmployeeIds.includes(sal.employeeNo));
  }

  if (role === 'HR Manager' && employees && userDepartmentCode) {
    // HR Managers see payroll for employees in their departments
    const deptEmployeeIds = employees
      .filter(emp => emp.departmentCode === userDepartmentCode)
      .map(emp => emp.employeeId);
    return payroll.filter(sal => deptEmployeeIds.includes(sal.employeeNo));
  }

  // Admin, General Manager, Finance Manager see all
  // Also return all if employees data not provided for Project/HR Managers
  return payroll;
}

/**
 * Get user context from sessionStorage
 * In a real app, this would come from the backend
 */
export function getUserContext(): {
  employeeId?: number;
  projectCode?: number;
  departmentCode?: number;
} {
  if (typeof window === 'undefined') {
    return {};
  }

  // In a real implementation, this would be fetched from the backend
  // For now, we'll use sessionStorage or return empty
  const employeeId = sessionStorage.getItem('employeeId');
  const projectCode = sessionStorage.getItem('projectCode');
  const departmentCode = sessionStorage.getItem('departmentCode');

  return {
    employeeId: employeeId ? parseInt(employeeId, 10) : undefined,
    projectCode: projectCode ? parseInt(projectCode, 10) : undefined,
    departmentCode: departmentCode ? parseInt(departmentCode, 10) : undefined,
  };
}

