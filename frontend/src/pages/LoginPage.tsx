import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthSplitLayout from "../components/layout/AuthSplitLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = "Email is required.";
    if (!password) errors.password = "Password is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return; // guards against double-submit (e.g. double Enter)

    setServerError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setServerError("Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout
      title="Welcome back"
      subtitle="Sign in to manage your business."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {serverError}
          </p>
        )}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          placeholder="you@yourshop.com"
        />

        <Input
          label="Password"
          type={isPasswordVisible ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          placeholder="Enter your password"
          rightElement={
            <button
              type="button"
              onClick={() => setIsPasswordVisible((v) => !v)}
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
            >
              {isPasswordVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />

        <Button
          type="submit"
          isLoading={isSubmitting}
          leftIcon={<LogIn className="h-4 w-4" />}
          className="w-full"
        >
          {isSubmitting ? "Logging in..." : "Log In"}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}