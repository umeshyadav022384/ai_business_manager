import { useEffect, useState } from "react";
import { getHealth, type HealthResponse } from "../api/health";

/**
 * Phase 1 landing page. Its only job is to prove the frontend can reach
 * the backend over HTTP. This will be replaced by real routing/pages
 * once authentication and business features are built.
 */
export default function HealthCheckPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setError("Could not reach the backend API."));
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>AI Business Manager</h1>
      <h2>Frontend → Backend Connectivity Check</h2>

      {health && (
        <p style={{ color: "green" }}>
          ✅ Backend responded: status = "{health.status}", service = "
          {health.service}"
        </p>
      )}

      {error && <p style={{ color: "red" }}>❌ {error}</p>}

      {!health && !error && <p>Checking backend connection...</p>}
    </div>
  );
}
