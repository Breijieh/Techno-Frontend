'use client';


import { getUserRole } from '@/lib/permissions';
import RoleDashboard from '@/components/dashboard/RoleDashboard';
import useRouteProtection from '@/hooks/useRouteProtection';

export default function DashboardPage() {
  const userRole = getUserRole();
  // Protect route - all authenticated users can access dashboard
  // This hook already handles authentication check, no need for duplicate useEffect
  useRouteProtection();

  return (
    <RoleDashboard role={userRole} />
  );
}


