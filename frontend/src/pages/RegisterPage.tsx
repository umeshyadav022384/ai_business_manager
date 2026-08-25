import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { RegisterPayload } from "../api/auth";

const initialForm: RegisterPayload = {
  email: "",
  password: "",
  full_name: "",
  business_name: "",
  business_type: "grocery",
  country: "",
  currency: "",
};

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterPayload>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof RegisterPayload, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(form);
      navigate("/");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError("An account with this email already exists.");
      } else {
        setError("Registration failed. Please check your details and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "3rem auto", fontFamily: "sans-serif" }}>
      <h1>Create Your Business Account</h1>
      <form onSubmit={handleSubmit}>
        <fieldset style={{ marginBottom: "1.5rem" }}>
          <legend>Your details</legend>
          <label>
            Full Name
            <input
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
          <label style={{ display: "block", marginTop: "0.75rem" }}>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
          <label style={{ display: "block", marginTop: "0.75rem" }}>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              required
              minLength={8}
              style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
        </fieldset>

        <fieldset style={{ marginBottom: "1.5rem" }}>
          <legend>Your business</legend>
          <label>
            Business Name
            <input
              value={form.business_name}
              onChange={(e) => updateField("business_name", e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
          <label style={{ display: "block", marginTop: "0.75rem" }}>
            Business Type
            <select
              value={form.business_type}
              onChange={(e) => updateField("business_type", e.target.value)}
              style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            >
              <option value="grocery">Grocery / Kirana</option>
              <option value="clothing">Clothing</option>
            </select>
          </label>
          <label style={{ display: "block", marginTop: "0.75rem" }}>
            Country
            <input
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
              required
              placeholder="Nepal"
              style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
          <label style={{ display: "block", marginTop: "0.75rem" }}>
            Currency
            <input
              value={form.currency}
              onChange={(e) => updateField("currency", e.target.value)}
              required
              placeholder="NPR"
              style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
        </fieldset>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create Account"}
        </button>
      </form>
      <p style={{ marginTop: "1rem" }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}