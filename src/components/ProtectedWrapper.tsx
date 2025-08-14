import React, { useEffect } from "react";

interface ProtectedWrapperProps {
  role: string;
  roles: string[];
  children: React.ReactNode;
}

export const ProtectedWrapper: React.FC<ProtectedWrapperProps> = ({ role, roles, children }) => {

  useEffect(() => {
    // Check if user is not authenticated (roles array is empty)
    // or if user doesn't have the required role
    if (roles.length === 0 || !roles.includes(role)) {
      // Use window.location for clean redirect to Next.js login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [roles, role]);

  // Don't render children if not authorized
  if (roles.length === 0 || !roles.includes(role)) {
    return null;
  }
  
  return <>{children}</>;
};

export default ProtectedWrapper;