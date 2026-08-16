import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types/auth";
import { LoadingState } from "@/components/ui/StateDisplays";

interface ProtectedRouteProps {
  children: ReactNode;
  /** If omitted, any authenticated user may view the route. */
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing, hasRole } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <LoadingState label="Checking your session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !hasRole(...roles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
