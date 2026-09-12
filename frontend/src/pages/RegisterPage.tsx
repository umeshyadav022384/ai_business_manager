import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { RegisterPayload } from "../api/auth";
import AuthSplitLayout from "../components/layout/AuthSplitLayout";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";

const initialForm: RegisterPayload = {
  email: "",
  password: "",
  full_name: "",
  business_name: "",
  business_type: "grocery",
  country: "",
  currency: "",
};

type FieldErrors = Partial<Record<keyof RegisterPayload, string>>;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterPayload>(initialForm);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof RegisterPayload, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!form.full_name.trim()) errors.full_name = "Full name is required.";
    if (!form.email.trim()) errors.email = "Email is required.";
    if (!form.password) {
      errors.password = "Password is required.";
    } else if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (!form.business_name.trim()) errors.business_name = "Business name is required.";
    if (!form.country.trim()) errors.country = "Country is required.";
    if (!form.currency.trim()) errors.currency = "Currency is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    setServerError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register(form);
      navigate("/");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setServerError("An account with this email already exists.");
      } else {
        setServerError("Registration failed. Please check your details and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout
      title="Create your business account"
      subtitle="Start managing your business with AI Business Manager."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {serverError && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {serverError}
          </p>
        )}

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Your details
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Full Name"
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
              error={fieldErrors.full_name}
              placeholder="e.g. Ram Shrestha"
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              error={fieldErrors.email}
              placeholder="you@yourshop.com"
            />
          </div>

          <Input
            label="Password"
            type={isPasswordVisible ? "text" : "password"}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            error={fieldErrors.password}
            helperText={!fieldErrors.password ? "At least 8 characters." : undefined}
            placeholder="Create a password"
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
        </div>

        <div className="space-y-4 border-t border-ink-100 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Your business
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Business Name"
              value={form.business_name}
              onChange={(e) => updateField("business_name", e.target.value)}
              error={fieldErrors.business_name}
              placeholder="e.g. Ram Kirana Store"
            />
            <Select
              label="Business Type"
              value={form.business_type}
              onChange={(e) => updateField("business_type", e.target.value)}
            >
              <option value="grocery">Grocery / Kirana</option>
              <option value="clothing">Clothing</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Country"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
              error={fieldErrors.country}
              placeholder="Nepal"
            />
            <Input
              label="Currency"
              value={form.currency}
              onChange={(e) => updateField("currency", e.target.value)}
              error={fieldErrors.currency}
              placeholder="NPR"
            />
          </div>
        </div>

        <Button
          type="submit"
          isLoading={isSubmitting}
          leftIcon={<UserPlus className="h-4 w-4" />}
          className="w-full"
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}