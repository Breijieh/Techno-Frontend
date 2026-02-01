'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getUserRole, canAccessRoute } from '@/lib/permissions';
import type { UserRole } from '@/types/roles';

/**
 * Hook to protect routes based on user role
 * @param allowedRoles - Optional array of roles that can access this route. If not provided, uses canAccessRoute check.
 * Redirects to login if not authenticated, or to unauthorized/dashboard if no access
 */
const useRouteProtection = (allowedRoles?: UserRole[]) => {
  const router = useSafeRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);
  const lastPathname = useRef(pathname);
  const [, setIsChecking] = useState(true);

  useEffect(() => {
    // Reset redirect flag when pathname actually changes
    if (lastPathname.current !== pathname) {
      hasRedirected.current = false;
      lastPathname.current = pathname;
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setIsChecking(true);
      }, 0);
    }

    // Prevent multiple redirects
    if (hasRedirected.current) {
      setTimeout(() => {
        setIsChecking(false);
      }, 0);
      return;
    }

    // Small delay to ensure sessionStorage is fully populated
    const checkTimer = setTimeout(() => {
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');
      if (!isLoggedIn) {
        hasRedirected.current = true;
        setIsChecking(false);
        router.replace('/login');
        return;
      }

      const userRole = getUserRole();

      if (!userRole) {
        hasRedirected.current = true;
        setIsChecking(false);
        router.replace('/login');
        return;
      }

      let accessDenied = false;
      let reason = '';

      // If allowedRoles is provided, check if user's role is in the list
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(userRole)) {
          accessDenied = true;
          reason = `هذه الصفحة تتطلب أحد الأدوار التالية: ${allowedRoles.join(', ')}. دورك الحالي: ${userRole}`;
        }
      }

      // Also check general route access
      if (!accessDenied && !canAccessRoute(userRole, pathname)) {
        accessDenied = true;
        if (!reason) {
          reason = `دورك (${userRole}) لا يملك صلاحية للوصول إلى هذه الصفحة.`;
        }
      }

      if (accessDenied) {
        // Log access attempt for security (in production, this would go to a logging service)
        if (typeof window !== 'undefined') {
          console.warn('Access Denied:', {
            user: sessionStorage.getItem('userName'),
            role: userRole,
            path: pathname,
            reason,
            timestamp: new Date().toISOString(),
          });
        }

        // Redirect with reason and route information
        hasRedirected.current = true;
        setIsChecking(false);
        const params = new URLSearchParams();
        if (reason) params.set('reason', reason);
        params.set('route', pathname);
        router.replace(`/unauthorized?${params.toString()}`); // Use replace to avoid history entry
        return;
      }

      // User is authenticated and has access - mark checking as complete
      setIsChecking(false);
      // Don't reset hasRedirected here - only reset when pathname changes
      // This prevents redirects on re-renders
    }, 50); // Small delay to ensure sessionStorage is ready

    return () => clearTimeout(checkTimer);
  }, [router, pathname, allowedRoles]);
};

export default useRouteProtection;
