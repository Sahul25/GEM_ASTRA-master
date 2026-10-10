import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

/**
 * Redirects to /login if not authenticated.
 * Accepts optional `role` prop to restrict a section to a specific role;
 * if the user has a different role they're redirected to their own home.
 */
export function ProtectedRoute({ role }: { role?: "admin" | "reviewer" }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    // Redirect to the correct dashboard for this user's role
    const home = user.role === "admin" ? "/gov" : "/bidder";
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
