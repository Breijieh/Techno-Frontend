// Role-Based Access Control Type Definitions

// User Roles
export type UserRole = 
  | 'Admin'
  | 'General Manager'
  | 'HR Manager'
  | 'Finance Manager'
  | 'Project Manager'
  | 'Project Secretary'
  | 'Project Advisor'
  | 'Regional Project Manager'
  | 'Warehouse Manager'
  | 'Employee';

// Permission Levels
export type PermissionLevel = 
  | 'FULL'      // Complete access (create, read, update, delete, approve)
  | 'MANAGE'    // Create, read, update (no delete/approve)
  | 'APPROVE'   // Can approve/reject requests
  | 'VIEW'      // Read-only access
  | 'REQUEST'   // Can create requests only
  | 'SELF'      // Can manage own data only
  | 'OWN';      // Can view own data only

// Module Names
export type Module = 
  | 'attendance'
  | 'leave'
  | 'loans'
  | 'payroll'
  | 'projects'
  | 'warehouse'
  | 'reports'
  | 'employees'
  | 'settings'
  | 'temp-labor'
  | 'approvals';

// Role Permissions Interface
export interface RolePermissions {
  role: UserRole;
  modules: {
    [key in Module]?: PermissionLevel;
  };
}

// Role Permissions Matrix based on README.md
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  'Admin': {
    role: 'Admin',
    modules: {
      attendance: 'FULL',
      leave: 'FULL',
      loans: 'FULL',
      payroll: 'FULL',
      projects: 'FULL',
      warehouse: 'FULL',
      reports: 'FULL',
      employees: 'FULL',
      settings: 'FULL',
      'temp-labor': 'FULL',
      approvals: 'FULL',
    },
  },
  'General Manager': {
    role: 'General Manager',
    modules: {
      attendance: 'VIEW',
      leave: 'VIEW',
      loans: 'VIEW',
      payroll: 'APPROVE',
      projects: 'VIEW',
      warehouse: 'VIEW',
      reports: 'FULL',
      employees: 'VIEW',
      settings: 'VIEW',
    },
  },
  'HR Manager': {
    role: 'HR Manager',
    modules: {
      attendance: 'MANAGE',
      leave: 'APPROVE',
      loans: 'APPROVE',
      payroll: 'APPROVE',
      projects: 'VIEW',
      warehouse: undefined, // No access
      reports: 'VIEW', // HR Reports only
      employees: 'MANAGE',
      settings: 'VIEW',
    },
  },
  'Finance Manager': {
    role: 'Finance Manager',
    modules: {
      attendance: 'VIEW',
      leave: 'VIEW',
      loans: 'APPROVE',
      payroll: 'APPROVE',
      projects: 'VIEW',
      warehouse: undefined, // No access
      reports: 'VIEW', // Finance Reports only
      employees: 'VIEW',
      settings: 'VIEW',
    },
  },
  'Project Manager': {
    role: 'Project Manager',
    modules: {
      attendance: 'VIEW',
      leave: 'APPROVE',
      loans: 'VIEW',
      payroll: 'VIEW',
      projects: 'FULL',
      warehouse: 'REQUEST',
      reports: 'VIEW', // Project Reports only
      employees: 'VIEW',
      'temp-labor': 'VIEW',
    },
  },
  'Project Secretary': {
    role: 'Project Secretary',
    modules: {
      attendance: 'MANAGE',
      leave: 'VIEW',
      loans: 'VIEW',
      payroll: 'VIEW',
      projects: 'VIEW',
      warehouse: undefined,
      reports: 'VIEW', // Project Reports only
      employees: 'VIEW',
      approvals: 'APPROVE', // For manual attendance
    },
  },
  'Project Advisor': {
    role: 'Project Advisor',
    modules: {
      attendance: 'VIEW',
      leave: 'VIEW',
      loans: 'VIEW',
      payroll: 'VIEW',
      projects: 'VIEW',
      warehouse: undefined,
      reports: 'VIEW',
      employees: 'VIEW',
    },
  },
  'Regional Project Manager': {
    role: 'Regional Project Manager',
    modules: {
      attendance: 'VIEW',
      leave: 'VIEW',
      loans: 'VIEW',
      payroll: 'VIEW',
      projects: 'FULL',
      warehouse: 'VIEW',
      reports: 'VIEW',
      employees: 'VIEW',
      approvals: 'APPROVE', // For transfer requests
    },
  },
  'Warehouse Manager': {
    role: 'Warehouse Manager',
    modules: {
      attendance: undefined, // No access
      leave: undefined, // No access
      loans: undefined, // No access
      payroll: undefined, // No access
      projects: undefined, // No access
      warehouse: 'FULL',
      reports: 'VIEW', // Warehouse Reports only
    },
  },
  'Employee': {
    role: 'Employee',
    modules: {
      attendance: 'SELF',
      leave: 'REQUEST',
      loans: 'REQUEST',
      payroll: 'OWN',
      reports: 'OWN',
    },
  },
};

// Route to Module Mapping
export const ROUTE_MODULE_MAP: Record<string, Module> = {
  '/dashboard': 'employees',
  '/dashboard/employees': 'employees',
  '/dashboard/employees/attendance': 'attendance',
  '/dashboard/employees/leave-requests': 'leave',
  '/dashboard/employees/loan-requests': 'loans',
  '/dashboard/employees/allowance-requests': 'leave',
  '/dashboard/employees/installment-postpone': 'loans',
  '/dashboard/employees/loan-installments': 'loans',
  '/dashboard/employees/leave-balance': 'leave',
  '/dashboard/employees/manual-attendance': 'attendance',
  '/dashboard/employees/attendance-closure': 'attendance',
  '/dashboard/payroll/calculation': 'payroll',
  '/dashboard/payroll/approval': 'payroll',
  '/dashboard/payroll/reports': 'reports',
  '/dashboard/payroll/timesheets': 'reports',
  '/dashboard/payroll/allowances': 'payroll',
  '/dashboard/payroll/deductions': 'payroll',
  '/dashboard/projects': 'projects',
  '/dashboard/projects/payment-schedules': 'projects',
  '/dashboard/projects/payment-requests': 'projects',
  '/dashboard/projects/payment-process': 'projects',
  '/dashboard/projects/due-payments': 'projects',
  '/dashboard/projects/transfer-requests': 'projects',
  '/dashboard/projects/labor-assignments': 'projects',
  '/dashboard/temp-labor/requests': 'temp-labor',
  '/dashboard/temp-labor/assignments': 'temp-labor',
  '/dashboard/temp-labor/availability': 'temp-labor',
  '/dashboard/warehouse/items': 'warehouse',
  '/dashboard/warehouse/categories': 'warehouse',
  '/dashboard/warehouse/stores': 'warehouse',
  '/dashboard/warehouse/purchase-orders': 'warehouse',
  '/dashboard/warehouse/receiving': 'warehouse',
  '/dashboard/warehouse/issuing': 'warehouse',
  '/dashboard/warehouse/transfers': 'warehouse',
  '/dashboard/warehouse/balance-reports': 'warehouse',
  '/dashboard/approvals/pending': 'approvals',
  '/dashboard/approvals/history': 'approvals',
  '/dashboard/reports/attendance': 'reports',
  '/dashboard/reports/expiring-documents': 'reports',
  '/dashboard/reports/projects': 'reports',
  '/dashboard/reports/project-payments': 'reports',
  '/dashboard/reports/loan-installments': 'reports',
  '/dashboard/reports/employee-leaves': 'reports',
  '/dashboard/reports/inventory': 'reports',
  '/dashboard/reports/system-usage': 'reports',
  '/dashboard/settings/users': 'settings',
  '/dashboard/settings/departments': 'settings',
  '/dashboard/settings/holidays': 'settings',
  '/dashboard/settings/time-schedules': 'settings',
  '/dashboard/settings/suppliers': 'settings',
  '/dashboard/settings/transaction-types': 'settings',
  '/dashboard/settings/system-logs': 'settings',
  '/dashboard/settings/employee-allowances': 'settings',
  '/dashboard/settings/allowance-percentages': 'settings',
  '/dashboard/settings/reset-password': 'settings',
  '/dashboard/self-service': 'attendance',
  '/dashboard/self-service/attendance': 'attendance',
  '/dashboard/self-service/attendance-history': 'attendance',
  '/dashboard/self-service/profile': 'employees',
  '/dashboard/self-service/leave': 'leave',
  '/dashboard/self-service/loan': 'loans',
  '/dashboard/self-service/allowance': 'leave',
  '/dashboard/self-service/installment-postpone': 'loans',
  '/dashboard/self-service/payroll': 'payroll',
};

