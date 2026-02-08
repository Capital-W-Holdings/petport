import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingState } from '@/components/ui';
import { UserRole } from '@/lib/api';

interface AdminRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallback?: React.ReactNode;
}

/**
 * Route wrapper that requires admin (or higher) role.
 * Redirects to /dashboard if user lacks permission.
 */
export function AdminRoute({
  children,
  requiredRole = 'ADMIN',
  fallback,
}: AdminRouteProps) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <LoadingState message="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(requiredRole)) {
    // User is authenticated but lacks permission
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * Convenience wrapper for SUPER_ADMIN only routes.
 */
export function SuperAdminRoute({
  children,
  fallback,
}: Omit<AdminRouteProps, 'requiredRole'>) {
  return (
    <AdminRoute requiredRole="SUPER_ADMIN" fallback={fallback}>
      {children}
    </AdminRoute>
  );
}
