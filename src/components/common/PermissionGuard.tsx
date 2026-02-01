'use client';

import { ReactNode } from 'react';
import { getUserRole, hasPermission } from '@/lib/permissions';
import type { Module } from '@/types/roles';
import AccessDeniedBanner from './AccessDeniedBanner';

interface PermissionGuardProps {
  module: Module;
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'request' | 'view';
  children: ReactNode;
  fallback?: ReactNode;
  showTooltip?: boolean;
  showBanner?: boolean;
  compact?: boolean;
}

/**
 * PermissionGuard component that conditionally renders children based on user permissions
 * 
 * @example
 * <PermissionGuard module="employees" action="create">
 *   <Button>Add Employee</Button>
 * </PermissionGuard>
 * 
 * @example With banner fallback
 * <PermissionGuard module="employees" action="create" showBanner>
 *   <Button>Add Employee</Button>
 * </PermissionGuard>
 */
export default function PermissionGuard({
  module,
  action,
  children,
  fallback = null,
  showBanner = false,
  compact = false,
}: PermissionGuardProps) {
  const role = getUserRole();
  const hasAccess = hasPermission(role, module, action);

  if (!hasAccess) {
    if (showBanner) {
      return (
        <AccessDeniedBanner
          action={action}
          module={module.replace('-', ' ')}
          compact={compact}
        />
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

