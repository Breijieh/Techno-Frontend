// Employee Data Mapper
// Maps between frontend Employee type and backend EmployeeResponse/EmployeeRequest

import type { Employee } from '@/types';
import type { EmployeeResponse, EmployeeRequest } from '@/lib/api/employees';

/**
 * Map backend EmployeeResponse to frontend Employee type
 */
export function mapEmployeeResponseToEmployee(response: EmployeeResponse): Employee {
  // Split employeeName into firstName and lastName
  const nameParts = (response.employeeName || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Convert employeeCategory to isSaudi boolean
  const isSaudi = response.employeeCategory === 'S';

  // Convert dates
  const hireDate = response.hireDate ? new Date(response.hireDate) : new Date();
  const terminationDate = response.terminationDate ? new Date(response.terminationDate) : undefined;
  const passportExpiry = response.passportExpiryDate ? new Date(response.passportExpiryDate) : undefined;
  const residencyExpiry = response.residencyExpiryDate ? new Date(response.residencyExpiryDate) : undefined;

  // Convert status
  const status = (response.employmentStatus || 'ACTIVE') as Employee['status'];

  // Convert contract type
  const contractType = (response.empContractType || 'TECHNO') as Employee['contractType'];

  // Convert leave balance
  const vacationBalance = response.leaveBalanceDays ? Number(response.leaveBalanceDays) : 0;

  // Convert salary
  const monthlySalary = response.monthlySalary ? Number(response.monthlySalary) : 0;

  return {
    employeeId: response.employeeNo,
    residenceId: response.residencyNo || '',
    nationalId: response.nationalId || '',
    firstName,
    lastName,
    fullName: response.employeeName || '',
    email: response.email || '',
    phone: response.mobile || '',
    dateOfBirth: response.dateOfBirth ? new Date(response.dateOfBirth) : undefined,
    hireDate,
    terminationDate,
    departmentCode: response.primaryDeptCode || 0,
    positionTitle: response.specializationNameAr || response.primaryDeptEnName || '', // التخصص أو اسم القسم
    specializationCode: response.specializationCode,
    contractType,
    status,
    monthlySalary,
    nationality: response.nationality || '',
    isSaudi,
    passportNumber: response.passportNo,
    passportExpiry,
    residenceExpiry: residencyExpiry,
    vacationBalance,
    managerId: undefined, // Not available in backend
    projectCode: response.primaryProjectCode,
    socialInsuranceNo: response.socialInsuranceNo,
  };
}

/**
 * Map frontend Employee type to backend EmployeeRequest
 */
export function mapEmployeeToEmployeeRequest(employee: Partial<Employee>): EmployeeRequest {
  // Combine firstName and lastName into employeeName
  const employeeName = employee.fullName ||
    `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '';

  // Convert isSaudi to employeeCategory
  const employeeCategory = employee.isSaudi ? 'S' : 'F';

  // Convert status to employmentStatus
  const employmentStatus = employee.status || 'ACTIVE';

  // Convert contractType to empContractType
  const empContractType = employee.contractType || 'TECHNO';

  // Convert dates to ISO strings
  const hireDate = employee.hireDate
    ? (employee.hireDate instanceof Date ? employee.hireDate.toISOString().split('T')[0] : employee.hireDate)
    : new Date().toISOString().split('T')[0];

  const passportExpiryDate = employee.passportExpiry
    ? (employee.passportExpiry instanceof Date ? employee.passportExpiry.toISOString().split('T')[0] : employee.passportExpiry)
    : undefined;

  const residencyExpiryDate = employee.residenceExpiry
    ? (employee.residenceExpiry instanceof Date ? employee.residenceExpiry.toISOString().split('T')[0] : employee.residenceExpiry)
    : undefined;

  const dateOfBirth = employee.dateOfBirth
    ? (employee.dateOfBirth instanceof Date ? employee.dateOfBirth.toISOString().split('T')[0] : employee.dateOfBirth)
    : undefined;

  // Convert leaveBalanceDays
  const leaveBalanceDays = employee.vacationBalance || 0;

  return {
    employeeName,
    nationalId: employee.nationalId || '',
    nationality: employee.nationality || '',
    employeeCategory,
    passportNo: employee.passportNumber,
    passportExpiryDate,
    residencyNo: employee.residenceId || '',
    residencyExpiryDate,
    dateOfBirth,
    hireDate,
    terminationDate: employee.terminationDate
      ? (employee.terminationDate instanceof Date ? employee.terminationDate.toISOString().split('T')[0] : employee.terminationDate)
      : undefined,
    employmentStatus,
    empContractType,
    specializationCode: employee.specializationCode,
    primaryDeptCode: employee.departmentCode && employee.departmentCode !== 0 ? employee.departmentCode : undefined,
    primaryProjectCode: employee.projectCode,
    monthlySalary: employee.monthlySalary || 0,
    socialInsuranceNo: employee.socialInsuranceNo,
    leaveBalanceDays,
    email: employee.email || '',
    mobile: employee.phone || '',
    username: employee.username,
    password: employee.password,
  };
}

/**
 * Map EmployeeResponse list to Employee list
 */
export function mapEmployeeResponseListToEmployeeList(responses: EmployeeResponse[]): Employee[] {
  return responses.map(mapEmployeeResponseToEmployee);
}

