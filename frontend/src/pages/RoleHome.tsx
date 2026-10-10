import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/** Redirects the user to their role-specific home page after login. */
export function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/gov" : "/bidder"} replace />;
}
