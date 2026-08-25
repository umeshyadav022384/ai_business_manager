import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Minimal protected landing page. Confirms auth + business context are
 * both resolved correctly, and links out to the feature pages built so
 * far (Products, as of Phase 3).
 */
export default function DashboardPage() {
  const { user, currentBusiness, logout } = useAuth();

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>AI Business Manager</h1>

      <p>
        Logged in as <strong>{user?.full_name}</strong> ({user?.email})
      </p>

      {currentBusiness && (
        <p>
          Business: <strong>{currentBusiness.name}</strong> (
          {currentBusiness.business_type}, {currentBusiness.country},{" "}
          {currentBusiness.currency})
        </p>
      )}

      <p>
        <Link to="/products">Manage Products &rarr;</Link>
      </p>

      <button onClick={logout}>Log Out</button>
    </div>
  );
}