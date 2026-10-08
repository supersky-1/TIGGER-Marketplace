import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: React.ReactNode;
  requiredRole?: "buyer" | "seller" | "admin";
  requireVerified?: boolean;
}

function ProtectedRoute({
  children,
  requiredRole,
  requireVerified = false,
}: Props) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // Seller must be verified to access certain pages
  if (
    requireVerified &&
    user.role === "seller" &&
    user.isVerified !== true
  ) {
    return <Navigate to="/seller/verification" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;