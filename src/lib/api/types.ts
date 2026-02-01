// API Response Types - Matching Backend DTOs

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

// ========== Authentication Types ==========
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  type: string;
  userId: number;
  username: string;
  userType: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nationalId: string;
  userType: 'ADMIN' | 'GENERAL_MANAGER' | 'HR_MANAGER' | 'FINANCE_MANAGER' | 'PROJECT_MANAGER' | 'REGIONAL_PROJECT_MANAGER' | 'PROJECT_SECRETARY' | 'PROJECT_ADVISOR' | 'WAREHOUSE_MANAGER' | 'EMPLOYEE' | 'USER';
  employeeNo?: number;
  employeeId?: number; // Alias for backward compatibility
  isActive?: boolean;
  assignedProjectId?: number;
  assignedProjectIds?: number[];
}

export interface UserInfoResponse {
  userId: number;
  username: string;
  nationalId?: string;
  userType: string;
  isActive: boolean | string; // Can be boolean or 'Y'/'N' character
  employeeNo?: number;
  employeeId?: number; // Alias for employeeNo for backward compatibility
  employeeName?: string;
  departmentCode?: number;
  projectCode?: number;
  roles?: string[];
  lastLoginDate?: string;
  lastLoginTime?: string;
  empContractType?: string;
}

// ========== Error Types ==========
export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}

// ========== Pagination Types ==========
export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// ========== Common Request/Response Types ==========
export interface IdResponse {
  id: number;
}

export interface StatusUpdateRequest {
  status: string;
  notes?: string;
}

export interface ApprovalRequest {
  approved: boolean;
  notes?: string;
}

// ========== Dashboard Types ==========
export interface DashboardStatsResponse {
  totalEmployees: number;
  activeEmployees: number;
  totalProjects: number;
  activeProjects: number;
  monthlyPayroll: number;
  pendingApprovals: number;
  expiringDocuments: number;
  overtimeAlerts: number;
}

export interface EmployeeDistributionResponse {
  saudiCount: number;
  nonSaudiCount: number;
}

export interface AttendanceOverviewResponse {
  weeks: string[];
  present: number[];
  absent: number[];
  onLeave: number[];
}

export interface ProjectStatusResponse {
  projectCodes: number[];
  completionPercentages: number[];
}

