// API Services Index - Export all API services

export { apiClient, ApiClient } from './client';
export * from './types';
export { authApi } from './auth';
export { employeesApi } from './employees';
export type { EmployeeRequest, EmployeeResponse, EmployeeListResponse, EmployeeSearchRequest, DocumentExpiryResponse } from './employees';
export { departmentsApi } from './departments';
export type { DepartmentResponse } from './departments';
export { contractTypesApi } from './contractTypes';
export type { ContractTypeResponse } from './contractTypes';
export { attendanceApi, manualAttendanceRequestApi, attendanceClosureApi } from './attendance';
export { leavesApi } from './leaves';
export { loansApi } from './loans';
export { payrollApi } from './payroll';
export { projectsApi } from './projects';
export { warehouseApi } from './warehouse';
export { notificationsApi } from './notifications';
export { reportsApi } from './reports';
export { allowancesApi } from './allowances';
export { approvalsApi } from './approvals';
export { dashboardApi } from './dashboard';
export { laborApi } from './labor';
export type {
  LaborRequestDto,
  LaborRequestResponse,
  LaborRequestDetailDto,
  LaborRequestDetailResponse,
  LaborAssignmentDto,
  LaborAssignmentResponse
} from './labor';
export { rolesApi } from './roles';
export type {
  RoleRequest,
  RoleResponse,
  RoleListResponse,
  RoleListParams
} from './roles';
export { holidaysApi } from './holidays';
export type {
  HolidayRequest,
  HolidayResponse
} from './holidays';
export { timeSchedulesApi, generateScheduleName, mapScheduleResponseToFrontend } from './timeSchedules';
export type {
  TimeScheduleRequest,
  TimeScheduleResponse
} from './timeSchedules';
export { suppliersApi, mapSupplierResponseToFrontend } from './suppliers';
export type {
  SupplierRequest,
  SupplierResponse
} from './suppliers';
export { transactionTypesApi, mapBackendToFrontend, mapFrontendToBackend } from './transactionTypes';
export type {
  TransactionTypeResponse,
  TransactionTypeRequest
} from './transactionTypes';
export { systemLogsApi, mapBackendToFrontend as mapSystemLogToFrontend } from './systemLogs';
export type {
  SystemLogResponse,
  SystemLogListResponse,
  SystemLogListParams
} from './systemLogs';
export { employeeContractAllowancesApi, mapBackendToFrontend as mapEmployeeContractAllowanceBackendToFrontend } from './employeeContractAllowances';
export type {
  EmployeeContractAllowanceRequest,
  EmployeeContractAllowanceResponse
} from './employeeContractAllowances';
export { salaryStructureApi, mergeBreakdownsToFrontend, splitFrontendToBackendRequests, mapBackendToFrontend as mapSalaryBreakdownBackendToFrontend } from './salaryStructure';
export type { SalaryBreakdownResponse, SalaryBreakdownRequest } from './salaryStructure';
export { specializationsApi } from './specializations';
export type { SpecializationRequest, SpecializationResponse } from './specializations';

