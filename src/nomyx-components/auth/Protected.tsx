import React from "react";
import { ProtectedRouteProps } from "./types";

export const Protected: React.FC<ProtectedRouteProps> = ({ 
  role, 
  roles, 
  children, 
  redirectTo = "/login",
  onNavigate 
}) => {
  // Check if user has required role(s)
  const hasAccess = React.useMemo(() => {
    if (!roles || roles.length === 0) {
      return false;
    }

    if (!role) {
      return false;
    }

    if (typeof role === "string") {
      return roles.includes(role);
    }

    if (Array.isArray(role)) {
      return role.some(r => roles.includes(r));
    }

    return false;
  }, [role, roles]);

  React.useEffect(() => {
    if (!hasAccess && onNavigate) {
      // Get current path for redirect after login
      const currentPath = window.location.pathname;
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`;
      onNavigate(redirectUrl);
    }
  }, [hasAccess, onNavigate, redirectTo]);

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};

export default Protected;