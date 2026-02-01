import { canAccessRoute, getUserRole } from './permissions';
import type { UserRole } from '@/types/roles';

/**
 * Protect a route by checking if the current user has access
 * Returns true if access is allowed, false otherwise
 */
export function protectRoute(pathname: string): boolean {
  const role = getUserRole();
  return canAccessRoute(role, pathname);
}

/**
 * Get the redirect path for unauthorized access
 */
export function getUnauthorizedRedirect(role: UserRole | null): string {
  if (!role) {
    return '/login';
  }

  // For employees, redirect to dashboard (shows employee-specific content)
  if (role === 'Employee') {
    return '/dashboard';
  }

  // For other roles, redirect to dashboard
  return '/dashboard';
}

/**
 * Check if user should be redirected and return the redirect path
 */
export function shouldRedirect(pathname: string): string | null {
  const role = getUserRole();
  
  if (!role) {
    return '/login';
  }

  // Allow access to dashboard and self-service
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/self-service')) {
    return null;
  }

  // Check if route is accessible
  if (!canAccessRoute(role, pathname)) {
    return getUnauthorizedRedirect(role);
  }

  return null;
}

/**
 * Route protection configuration
 * Maps routes to required permission levels
 */
export const ROUTE_PERMISSIONS: Record<string, { module: string; action: string }> = {
  '/dashboard/employees': { module: 'employees', action: 'read' },
  '/dashboard/employees/attendance': { module: 'attendance', action: 'read' },
  '/dashboard/employees/leave-requests': { module: 'leave', action: 'read' },
  '/dashboard/employees/loan-requests': { module: 'loans', action: 'read' },
  '/dashboard/employees/allowance-requests': { module: 'leave', action: 'read' },
  '/dashboard/employees/installment-postpone': { module: 'loans', action: 'read' },
  '/dashboard/payroll/calculation': { module: 'payroll', action: 'read' },
  '/dashboard/payroll/approval': { module: 'payroll', action: 'approve' },
  '/dashboard/payroll/reports': { module: 'reports', action: 'read' },
  '/dashboard/payroll/timesheets': { module: 'reports', action: 'read' },
  '/dashboard/projects': { module: 'projects', action: 'read' },
  '/dashboard/projects/payment-schedules': { module: 'projects', action: 'read' },
  '/dashboard/projects/payment-requests': { module: 'projects', action: 'read' },
  '/dashboard/projects/transfer-requests': { module: 'projects', action: 'read' },
  '/dashboard/projects/labor-assignments': { module: 'projects', action: 'read' },
  '/dashboard/temp-labor/requests': { module: 'temp-labor', action: 'read' },
  '/dashboard/temp-labor/assignments': { module: 'temp-labor', action: 'read' },
  '/dashboard/temp-labor/availability': { module: 'temp-labor', action: 'read' },
  '/dashboard/warehouse/items': { module: 'warehouse', action: 'read' },
  '/dashboard/warehouse/purchase-orders': { module: 'warehouse', action: 'read' },
  '/dashboard/warehouse/receiving': { module: 'warehouse', action: 'read' },
  '/dashboard/warehouse/issuing': { module: 'warehouse', action: 'read' },
  '/dashboard/warehouse/transfers': { module: 'warehouse', action: 'read' },
  '/dashboard/warehouse/balance-reports': { module: 'warehouse', action: 'read' },
  '/dashboard/approvals/pending': { module: 'approvals', action: 'read' },
  '/dashboard/approvals/history': { module: 'approvals', action: 'read' },
  '/dashboard/reports/attendance': { module: 'reports', action: 'read' },
  '/dashboard/reports/expiring-documents': { module: 'reports', action: 'read' },
  '/dashboard/reports/projects': { module: 'reports', action: 'read' },
  '/dashboard/reports/inventory': { module: 'reports', action: 'read' },
  '/dashboard/reports/system-usage': { module: 'reports', action: 'read' },
  '/dashboard/settings/users': { module: 'settings', action: 'read' },
  '/dashboard/settings/departments': { module: 'settings', action: 'read' },
  '/dashboard/settings/holidays': { module: 'settings', action: 'read' },
  '/dashboard/settings/time-schedules': { module: 'settings', action: 'read' },
  '/dashboard/settings/system-logs': { module: 'settings', action: 'read' },
};

