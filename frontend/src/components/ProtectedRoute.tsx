import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps a page that requires authentication. While the initial
 * "am I logged in" check is in flight (loading the token from storage
 * and calling /me), it shows a simple loading state rather than
 * flashing the login page and then redirecting.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <p style={{ padding: "2rem", fontFamily: "sans-serif" }}>Loading...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}