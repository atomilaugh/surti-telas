import React from 'react';
import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';

import { useAuth } from '@/app/providers/AppProviders';
import { Spinner } from '@/shared/ui';
import { hasRequiredPermission } from './protectedRouteHelpers';

const ProtectedLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)]">
    <Spinner size="lg" />
  </div>
);

interface Props {
  children: ReactElement;
  allowedRoles: string[];
  requiredPermissions?: string[];
}

const ProtectedRoute: React.FC<Props> = ({ children, allowedRoles, requiredPermissions }) => {
  const { user, isAuthenticated, sessionChecked } = useAuth();

  if (!sessionChecked) {
    return <ProtectedLoader />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const hasAllowedRole = allowedRoles?.length
    ? allowedRoles.map((r) => r.toLowerCase()).includes(user.role.toLowerCase())
    : true;

  if (!hasAllowedRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermissions && requiredPermissions.length > 0 && !hasRequiredPermission(user.permissions, requiredPermissions)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return React.cloneElement(children, {
    userRole: user.role,
    userName: user.email?.split('@')[0] || 'Usuario',
    onLogout: () => useAuth.getState().logout(),
  });
};

export default ProtectedRoute;