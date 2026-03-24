'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: Role;
  requiredPermission?: {
    action: string;
    resource: string;
  };
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback = <div>Access Denied</div>,
}: ProtectedRouteProps) {
  const { isAuthenticated, hasMinimumRole, hasRolePermission, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-full flex flex-col gap-5 items-center justify-center">
        <div className="text-lg text-blue-600">Loading...</div>
        <div className="border-4 border-blue-500 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    return fallback;
  }

  // Check role-based access
  if (requiredRole && !hasMinimumRole(requiredRole)) {
    return fallback;
  }

  // Check permission-based access
  if (requiredPermission && !hasRolePermission(requiredPermission.action, requiredPermission.resource)) {
    return fallback;
  }

  return <>{children}</>;
}
