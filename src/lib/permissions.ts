import type { UserRole, PermissionLevel, Module } from '@/types/roles';
import { ROLE_PERMISSIONS, ROUTE_MODULE_MAP } from '@/types/roles';

/**
 * Normalize backend role format to frontend role format
 * Backend: ADMIN, GENERAL_MANAGER, HR_MANAGER, etc. (uppercase, underscores)
 * Frontend: Admin, General Manager, HR Manager, etc. (capitalized, spaces)
 */
function normalizeUserRole(backendRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'ADMIN': 'Admin',
    'GENERAL_MANAGER': 'General Manager',
    'HR_MANAGER': 'HR Manager',
    'FINANCE_MANAGER': 'Finance Manager',
    'PROJECT_MANAGER': 'Project Manager',
    'PROJECT_SECRETARY': 'Project Secretary',
    'PROJECT_ADVISOR': 'Project Advisor',
    'REGIONAL_PROJECT_MANAGER': 'Regional Project Manager',
    'WAREHOUSE_MANAGER': 'Warehouse Manager',
    'EMPLOYEE': 'Employee',
  };

  const upperRole = backendRole.toUpperCase();
  // Return mapped role or try to match existing UserRole values
  if (roleMap[upperRole]) {
    return roleMap[upperRole];
  }

  // If already in correct format, return as-is (type assertion for safety)
  const validRoles: UserRole[] = ['Admin', 'General Manager', 'HR Manager', 'Finance Manager',
    'Project Manager', 'Project Secretary', 'Project Advisor', 'Regional Project Manager',
    'Warehouse Manager', 'Employee'];
  if (validRoles.includes(backendRole as UserRole)) {
    return backendRole as UserRole;
  }

  // Fallback: return Admin if unrecognized (shouldn't happen in production)
  return 'Admin';
}

// Arabic translations for role names
export const ROLE_ARABIC_NAMES: Record<UserRole, string> = {
  'Admin': 'مدير النظام',
  'General Manager': 'المدير العام',
  'HR Manager': 'مدير الموارد البشرية',
  'Finance Manager': 'مدير المالية',
  'Project Manager': 'مدير المشروع',
  'Project Secretary': 'سكرتير المشروع',
  'Project Advisor': 'مستشار المشروع',
  'Regional Project Manager': 'مدير المشاريع الإقليمي',
  'Warehouse Manager': 'مدير المستودعات',
  'Employee': 'موظف',
};

// Arabic translations for permission levels
export const PERMISSION_LEVEL_ARABIC: Record<PermissionLevel, string> = {
  'FULL': 'الوصول الكامل',
  'MANAGE': 'إدارة',
  'APPROVE': 'الموافقة',
  'VIEW': 'عرض',
  'REQUEST': 'طلب',
  'SELF': 'الذاتي',
  'OWN': 'الملكية',
};

/**
 * Get user role from sessionStorage
 * Checks both 'userRole' and 'userType' keys for backward compatibility
 * Normalizes role format from backend to frontend
 */
export function getUserRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  // Check both keys for compatibility (userType is set by LoginForm, userRole might be set elsewhere)
  const role = sessionStorage.getItem('userRole') || sessionStorage.getItem('userType');
  if (!role) return null;

  // Normalize the role to ensure it matches frontend format
  return normalizeUserRole(role);
}

/**
 * Check if a role has permission for a specific module and action
 */
export function hasPermission(
  role: UserRole | null,
  module: Module,
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'request' | 'view'
): boolean {
  if (!role) return false;

  // Admin has full access
  if (role === 'Admin') return true;

  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  const modulePermission = permissions.modules[module];
  if (!modulePermission) return false;

  // Map actions to permission levels
  switch (modulePermission) {
    case 'FULL':
      return true; // Full access to all actions
    case 'MANAGE':
      return ['create', 'read', 'update'].includes(action);
    case 'APPROVE':
      return action === 'approve' || action === 'read';
    case 'VIEW':
      return action === 'read' || action === 'view';
    case 'REQUEST':
      return action === 'request' || action === 'read';
    case 'SELF':
      return ['create', 'read', 'update'].includes(action); // Can manage own
    case 'OWN':
      return action === 'read' || action === 'view';
    default:
      return false;
  }
}

/**
 * Get all allowed routes for a role
 */
export function getAllowedRoutes(role: UserRole | null): string[] {
  if (!role) return ['/dashboard'];
  if (role === 'Admin') {
    // Admin has access to all routes
    return Object.keys(ROUTE_MODULE_MAP);
  }

  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return ['/dashboard'];

  const allowedRoutes: string[] = ['/dashboard'];

  // Check each route
  Object.entries(ROUTE_MODULE_MAP).forEach(([route, module]) => {
    const modulePermission = permissions.modules[module];
    if (modulePermission) {
      allowedRoutes.push(route);
    }
  });

  return allowedRoutes;
}

/**
 * Whitelist of allowed report routes for Employee role
 * Employees should only see reports related to their own data
 */
const EMPLOYEE_ALLOWED_REPORT_ROUTES = [
  '/dashboard/reports/attendance',          // Their own attendance
  '/dashboard/reports/expiring-documents', // Their own documents
];

/**
 * Page-level role restrictions for settings routes
 * These override module-level permissions to match useRouteProtection checks on individual pages
 */
const SETTINGS_ROUTE_ROLES: Record<string, UserRole[]> = {
  '/dashboard/settings/users': ['Admin'],
  '/dashboard/settings/departments': ['Admin', 'HR Manager'],
  '/dashboard/settings/specializations': ['Admin', 'HR Manager'],
  '/dashboard/settings/holidays': ['Admin', 'HR Manager'],
  '/dashboard/settings/time-schedules': ['Admin', 'HR Manager'],
  '/dashboard/settings/suppliers': ['Admin', 'Warehouse Manager', 'Finance Manager'],
  '/dashboard/settings/transaction-types': ['Admin'],
  '/dashboard/settings/system-logs': ['Admin'],
  '/dashboard/settings/employee-allowances': ['Admin', 'HR Manager'],
  '/dashboard/settings/allowance-percentages': ['Admin', 'Finance Manager'],
  '/dashboard/settings/reset-password': ['Admin'],
};

/**
 * Page-level role restrictions for routes with explicit useRouteProtection checks
 * These override module-level permissions to match actual page restrictions
 */
const ROUTE_ROLE_RESTRICTIONS: Record<string, UserRole[]> = {
  // Dashboard route - accessible to all authenticated roles
  '/dashboard': ['Admin', 'General Manager', 'HR Manager', 'Finance Manager', 'Project Manager', 'Project Secretary', 'Project Advisor', 'Regional Project Manager', 'Warehouse Manager', 'Employee'],

  // Payroll routes
  '/dashboard/payroll/calculation': ['Admin', 'HR Manager', 'Finance Manager'],
  '/dashboard/payroll/allowances': ['Admin', 'HR Manager', 'Finance Manager'],
  '/dashboard/payroll/deductions': ['Admin', 'HR Manager', 'Finance Manager'],
  '/dashboard/payroll/approval': ['Admin', 'HR Manager', 'General Manager', 'Finance Manager'],
  '/dashboard/payroll/reports': ['Admin', 'HR Manager', 'General Manager', 'Finance Manager'],
  '/dashboard/payroll/timesheets': ['Admin', 'HR Manager', 'General Manager', 'Finance Manager', 'Project Manager'],

  // Employee routes
  '/dashboard/employees': ['Admin', 'HR Manager', 'General Manager', 'Project Manager', 'Project Secretary', 'Regional Project Manager', 'Project Advisor'],
  '/dashboard/employees/attendance': ['Admin', 'HR Manager', 'General Manager', 'Project Manager'],
  '/dashboard/employees/leave-requests': ['Admin', 'HR Manager', 'General Manager', 'Project Manager'],
  '/dashboard/employees/loan-requests': ['Admin', 'HR Manager', 'General Manager'],
  '/dashboard/employees/allowance-requests': ['Admin', 'HR Manager', 'General Manager'],
  '/dashboard/employees/installment-postpone': ['Admin', 'HR Manager', 'General Manager'],
  '/dashboard/employees/attendance-closure': ['Admin'],
  '/dashboard/employees/manual-attendance': ['Admin', 'HR Manager', 'Project Manager', 'Project Secretary'],
  '/dashboard/employees/leave-balance': ['Admin', 'HR Manager'],
  '/dashboard/employees/loan-installments': ['Admin', 'HR Manager', 'Finance Manager'],

  // Project routes
  '/dashboard/projects': ['Admin', 'Project Manager', 'Finance Manager', 'Regional Project Manager', 'Project Secretary', 'Project Advisor'],
  '/dashboard/projects/payment-requests': ['Admin', 'General Manager', 'Project Manager', 'Finance Manager', 'Regional Project Manager'],
  '/dashboard/projects/transfer-requests': ['Admin', 'Project Manager', 'HR Manager', 'Regional Project Manager'],
  '/dashboard/projects/labor-assignments': ['Admin', 'Project Manager', 'HR Manager'],
  '/dashboard/projects/due-payments': ['Admin', 'Finance Manager', 'Project Manager'],
  '/dashboard/projects/payment-process': ['Admin', 'Finance Manager', 'Project Manager'],
  '/dashboard/projects/payment-schedules': ['Admin', 'Project Manager', 'Finance Manager', 'Regional Project Manager'],

  // Temporary Labor routes
  '/dashboard/temp-labor/requests': ['Admin', 'Project Manager', 'HR Manager'],
  '/dashboard/temp-labor/assignments': ['Admin', 'Project Manager', 'HR Manager'],
  '/dashboard/temp-labor/availability': ['Admin', 'Project Manager'],

  // Warehouse routes
  '/dashboard/warehouse/items': ['Admin', 'Warehouse Manager'],
  '/dashboard/warehouse/categories': ['Admin', 'Warehouse Manager'],
  '/dashboard/warehouse/stores': ['Admin', 'Warehouse Manager', 'Project Manager'],
  '/dashboard/warehouse/purchase-orders': ['Admin', 'Warehouse Manager', 'Finance Manager'],
  '/dashboard/warehouse/receiving': ['Admin', 'Warehouse Manager'],
  '/dashboard/warehouse/issuing': ['Admin', 'Warehouse Manager', 'Project Manager'],
  '/dashboard/warehouse/transfers': ['Admin', 'Warehouse Manager'],
  '/dashboard/warehouse/balance-reports': ['Admin', 'Warehouse Manager', 'Project Manager'],

  // Approval routes
  '/dashboard/approvals/pending': ['Admin', 'HR Manager', 'General Manager', 'Finance Manager', 'Project Manager', 'Project Secretary', 'Regional Project Manager'],
  '/dashboard/approvals/history': ['Admin', 'HR Manager', 'General Manager', 'Finance Manager', 'Project Manager'],

  // Help route
  '/dashboard/help': ['Admin', 'General Manager', 'HR Manager', 'Finance Manager', 'Project Manager', 'Warehouse Manager', 'Employee', 'Project Secretary', 'Project Advisor', 'Regional Project Manager'],

  // Notification route
  '/dashboard/notifications': ['Admin', 'General Manager', 'HR Manager', 'Finance Manager', 'Project Manager', 'Warehouse Manager', 'Employee', 'Project Secretary', 'Project Advisor', 'Regional Project Manager'],

  // Report routes
  '/dashboard/reports/attendance': ['Admin', 'HR Manager', 'General Manager', 'Project Secretary'],
  '/dashboard/reports/expiring-documents': ['Admin', 'HR Manager', 'General Manager'],
  '/dashboard/reports/projects': ['Admin', 'General Manager', 'Project Manager', 'Project Secretary', 'Regional Project Manager', 'Project Advisor'],
  '/dashboard/reports/project-payments': ['Admin', 'Finance Manager', 'Project Manager', 'General Manager', 'Regional Project Manager'],
  '/dashboard/reports/employee-leaves': ['Admin', 'HR Manager', 'General Manager'],
  '/dashboard/reports/loan-installments': ['Admin', 'HR Manager', 'Finance Manager'],
  '/dashboard/reports/system-usage': ['Admin'],
  '/dashboard/reports/inventory': ['Admin', 'Warehouse Manager'],

  // Settings routes (merge with existing SETTINGS_ROUTE_ROLES)
  ...SETTINGS_ROUTE_ROLES,
};

/**
 * Check if a role can access a specific route
 */
export function canAccessRoute(role: UserRole | null, pathname: string): boolean {
  if (!role) return false;
  // Check for Admin role (case-insensitive for safety)
  if (role === 'Admin' || role.toUpperCase() === 'ADMIN') return true;

  // Check page-level role restrictions FIRST (for all roles including Employee)
  // This ensures menu items match the actual useRouteProtection checks on individual pages
  const allowedRoles = ROUTE_ROLE_RESTRICTIONS[pathname];
  if (allowedRoles) {
    // If route has specific role restrictions, check them first
    if (!allowedRoles.includes(role)) {
      return false; // Deny access if role not in allowed list
    }
    // Role is allowed in explicit restrictions - return true immediately
    // This overrides module-level permissions for routes with explicit restrictions
    return true;
  }

  // Employee-specific route restrictions (only for routes NOT in ROUTE_ROLE_RESTRICTIONS)
  if (role === 'Employee') {
    // Employees should NOT have access to management routes
    // Deny access to employee management routes (except those explicitly allowed in ROUTE_ROLE_RESTRICTIONS)
    if (pathname.startsWith('/dashboard/employees')) {
      // Allow specific employee routes that are in ROUTE_ROLE_RESTRICTIONS
      if (pathname === '/dashboard/employees/leave-balance' ||
        pathname === '/dashboard/employees/loan-installments') {
        return true;
      }
      // Deny all other employee management routes
      return false;
    }

    // Deny access to payroll management routes (except those explicitly allowed in ROUTE_ROLE_RESTRICTIONS)
    if (pathname.startsWith('/dashboard/payroll/calculation') ||
      pathname.startsWith('/dashboard/payroll/approval') ||
      pathname.startsWith('/dashboard/payroll/allowances') ||
      pathname.startsWith('/dashboard/payroll/deductions')) {
      return false;
    }
    // Note: /dashboard/payroll/reports and /dashboard/payroll/timesheets are handled by ROUTE_ROLE_RESTRICTIONS above

    // Deny access to project management routes
    if (pathname.startsWith('/dashboard/projects')) {
      return false;
    }

    // Deny access to temporary labor routes
    if (pathname.startsWith('/dashboard/temp-labor')) {
      return false;
    }

    // Deny access to warehouse/inventory routes
    if (pathname.startsWith('/dashboard/warehouse')) {
      return false;
    }

    // Note: /dashboard/approvals routes are handled by ROUTE_ROLE_RESTRICTIONS above

    // Deny access to settings routes (except Help Center which is handled by ROUTE_ROLE_RESTRICTIONS)
    if (pathname.startsWith('/dashboard/settings')) {
      return false;
    }

    // For report routes, only allow specific ones from whitelist
    // Note: This only applies to routes NOT in ROUTE_ROLE_RESTRICTIONS
    if (pathname.startsWith('/dashboard/reports')) {
      return EMPLOYEE_ALLOWED_REPORT_ROUTES.includes(pathname);
    }

    // Check contract type for self-service restrictions
    const empContractType = sessionStorage.getItem('empContractType');
    const isTechnoEmployee = empContractType === 'TECHNO';

    // Allow dashboard and profile route for everyone
    if (pathname === '/dashboard' ||
      pathname === '/dashboard/self-service/profile') {
      return true;
    }

    // Attendance routes - allowed for everyone
    if (pathname === '/dashboard/self-service/attendance' ||
      pathname === '/dashboard/self-service/attendance-history') {
      return true;
    }

    // Other self-service routes - ONLY allowed for TECHNO employees
    if (pathname.startsWith('/dashboard/self-service')) {
      return isTechnoEmployee;
    }

    // Deny all other routes
    return false;
  }

  // Check exact pathname match
  const routeModule = ROUTE_MODULE_MAP[pathname];
  if (!routeModule) {
    // If route not in map, allow dashboard and self-service
    return pathname === '/dashboard' || pathname.startsWith('/dashboard/self-service');
  }

  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  const modulePermission = permissions.modules[routeModule];
  return !!modulePermission;
}

/**
 * Get permission level for a role and module
 */
export function getPermissionLevel(role: UserRole | null, module: Module): PermissionLevel | null {
  if (!role) return null;
  if (role === 'Admin') return 'FULL';

  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return null;

  return permissions.modules[module] || null;
}

/**
 * Complete mapping of menu labels to their corresponding routes
 * This ensures menu items are filtered based on actual route access
 */
export const MENU_LABEL_ROUTE_MAP: Record<string, string> = {
  // Main Menu
  'لوحة التحكم': '/dashboard',
  'قائمة الموظفين': '/dashboard/employees',
  'الحضور': '/dashboard/employees/attendance',
  'طلبات الإجازة': '/dashboard/employees/leave-requests',
  'طلبات القرض': '/dashboard/employees/loan-requests',
  'طلبات البدل': '/dashboard/employees/allowance-requests',
  'تأجيل الأقساط': '/dashboard/employees/installment-postpone',
  'أقساط القرض': '/dashboard/employees/loan-installments',
  'رصيد الإجازات': '/dashboard/employees/leave-balance',
  'الحضور اليدوي': '/dashboard/employees/manual-attendance',
  'إغلاق الحضور': '/dashboard/employees/attendance-closure',
  'حساب الراتب': '/dashboard/payroll/calculation',
  'اعتماد كشف الرواتب': '/dashboard/payroll/approval',
  'التقارير الشهرية': '/dashboard/payroll/reports',
  'سجلات الحضور': '/dashboard/payroll/timesheets',
  'البدلات الشهرية': '/dashboard/payroll/allowances',
  'الخصومات الشهرية': '/dashboard/payroll/deductions',
  'قائمة المشاريع': '/dashboard/projects',
  'جدول المدفوعات': '/dashboard/projects/payment-schedules',
  'طلبات الدفع': '/dashboard/projects/payment-requests',
  'عملية الدفع': '/dashboard/projects/payment-process',
  'المستحقات': '/dashboard/projects/due-payments',
  'طلبات النقل': '/dashboard/projects/transfer-requests',
  'تعيينات العمالة': '/dashboard/projects/labor-assignments',
  'طلبات العمالة المؤقتة': '/dashboard/temp-labor/requests',
  'تعيينات العمال': '/dashboard/temp-labor/assignments',
  'تقارير التوفر': '/dashboard/temp-labor/availability',
  'إدارة الأصناف': '/dashboard/warehouse/items',
  'فئات الأصناف': '/dashboard/warehouse/categories',
  'إدارة المستودعات': '/dashboard/warehouse/stores',
  'أوامر الشراء': '/dashboard/warehouse/purchase-orders',
  'الاستلام': '/dashboard/warehouse/receiving',
  'الإصدار': '/dashboard/warehouse/issuing',
  'التحويلات': '/dashboard/warehouse/transfers',
  'تقارير الرصيد': '/dashboard/warehouse/balance-reports',
  // Channels
  'الموافقات المعلقة': '/dashboard/approvals/pending',
  'سجل الموافقات': '/dashboard/approvals/history',
  'تقارير الحضور': '/dashboard/reports/attendance',
  'المستندات المنتهية': '/dashboard/reports/expiring-documents',
  'تقارير المشاريع': '/dashboard/reports/projects',
  'مدفوعات المشاريع': '/dashboard/reports/project-payments',
  'تقرير أقساط القرض': '/dashboard/reports/loan-installments',
  'إجازات الموظفين': '/dashboard/reports/employee-leaves',
  'تقارير المخزون': '/dashboard/reports/inventory',
  'استخدام النظام': '/dashboard/reports/system-usage',
  // Settings
  'إدارة المسؤولين': '/dashboard/settings/admin-users',
  'حسابات المستخدمين': '/dashboard/settings/users',
  'الأقسام': '/dashboard/settings/departments',
  'التخصصات': '/dashboard/settings/specializations',
  'تقويم العطلات': '/dashboard/settings/holidays',
  'جداول الوقت': '/dashboard/settings/time-schedules',
  'الموردون': '/dashboard/settings/suppliers',
  'أنواع المعاملات': '/dashboard/settings/transaction-types',
  'سجلات النظام': '/dashboard/settings/system-logs',
  'بدلات الموظفين': '/dashboard/settings/employee-allowances',
  'نسب البدلات': '/dashboard/settings/allowance-percentages',
  'إعادة تعيين كلمة المرور': '/dashboard/settings/reset-password',
  'الإشعارات': '/dashboard/settings/notifications',
  'مركز المساعدة': '/dashboard/help',
  // Self Service
  'الخدمة الذاتية': '/dashboard',
  'تسجيل الدخول والانصراف': '/dashboard/self-service/attendance',
  'سجل الحضور': '/dashboard/self-service/attendance-history',
  'ملفي الشخصي': '/dashboard/self-service/profile',
  'طلب إجازة': '/dashboard/self-service/leave',
  'طلب قرض': '/dashboard/self-service/loan',
  'طلب بدل': '/dashboard/self-service/allowance',
  'تأجيل قسط': '/dashboard/self-service/installment-postpone',
  'عرض كشف الراتب': '/dashboard/self-service/payroll',
  'مركز الإشعارات': '/dashboard/notifications',
};

/**
 * Filter menu items based on route access permissions
 * Uses canAccessRoute to ensure menu items only appear if user can access the route
 */
export function filterMenuItems<T extends { label: string; hasSubmenu?: boolean; submenu?: { label: string }[] }>(
  role: UserRole | null,
  menuItems: T[]
): T[] {
  if (!role) return [];
  if (role === 'Admin') return menuItems;

  const filteredItems: T[] = [];

  menuItems.forEach((item) => {
    // If item has submenu, filter submenu items based on route access
    if (item.hasSubmenu && item.submenu) {
      const filteredSubmenu = item.submenu.filter((subItem) => {
        const route = MENU_LABEL_ROUTE_MAP[subItem.label];

        // If no route mapping exists (like "Help Center"), allow it
        if (!route) return true;

        // Check if user can access this specific route
        return canAccessRoute(role, route);
      });

      // Only include parent item if it has at least one accessible submenu item
      if (filteredSubmenu.length > 0) {
        filteredItems.push({
          ...item,
          submenu: filteredSubmenu,
        } as T);
      }
    } else {
      // For items without submenu, check route access directly
      const route = MENU_LABEL_ROUTE_MAP[item.label];

      // If no route mapping exists, allow it (e.g., standalone items)
      if (!route) {
        filteredItems.push(item);
      } else {
        // Check if user can access this specific route
        if (canAccessRoute(role, route)) {
          filteredItems.push(item);
        }
      }
    }
  });

  return filteredItems;
}

/**
 * Check if user can perform an action on a module
 */
export function canPerformAction(
  role: UserRole | null,
  module: Module,
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'request'
): boolean {
  return hasPermission(role, module, action);
}

