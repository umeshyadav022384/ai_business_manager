import { useState } from "react";
import type { FormEvent } from "react";
import { Building2, User, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { updateBusiness, updateProfile, changePassword } from "../api/settings";
import Card, { CardBody, CardHeader } from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";

export default function SettingsPage() {
  const { user, currentBusiness, refreshUser } = useAuth();

  // --- Business profile ---
  const [businessName, setBusinessName] = useState(currentBusiness?.name ?? "");
  const [country, setCountry] = useState(currentBusiness?.country ?? "");
  const [currency, setCurrency] = useState(currentBusiness?.currency ?? "");
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [businessSuccess, setBusinessSuccess] = useState<string | null>(null);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);

  // --- User profile ---
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // --- Change password ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function handleBusinessSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSavingBusiness) return;
    setBusinessError(null);
    setBusinessSuccess(null);
    setIsSavingBusiness(true);
    try {
      await updateBusiness({ name: businessName, country, currency });
      await refreshUser();
      setBusinessSuccess("Business profile updated.");
    } catch {
      setBusinessError("Could not update your business profile.");
    } finally {
      setIsSavingBusiness(false);
    }
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSavingProfile) return;
    setProfileError(null);
    setProfileSuccess(null);
    if (!fullName.trim()) {
      setProfileError("Full name is required.");
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateProfile({ full_name: fullName });
      await refreshUser();
      setProfileSuccess("Profile updated.");
    } catch {
      setProfileError("Could not update your profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSavingPassword) return;
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    setIsSavingPassword(true);
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPasswordError(detail ?? "Could not change your password.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Manage your business profile, your account, and your password." />

      <Card>
        <CardHeader className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-ink-400" />
          <h2 className="text-sm font-semibold text-ink-800">Business Profile</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleBusinessSubmit} className="space-y-4">
            {businessError && (
              <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{businessError}</p>
            )}
            {businessSuccess && (
              <p className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">{businessSuccess}</p>
            )}
            <Input label="Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
            <Select label="Business Type" value={currentBusiness?.business_type ?? ""} disabled>
              <option value="grocery">Grocery / Kirana</option>
              <option value="clothing">Clothing</option>
            </Select>
            <p className="-mt-2 text-xs text-ink-400">Business type cannot be changed after registration.</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} required />
              <Input label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} required />
            </div>
            <Button type="submit" isLoading={isSavingBusiness}>Save Business Profile</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <User className="h-4 w-4 text-ink-400" />
          <h2 className="text-sm font-semibold text-ink-800">Your Profile</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {profileError && (
              <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">{profileSuccess}</p>
            )}
            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Input label="Email" value={user?.email ?? ""} disabled helperText="Email cannot be changed here." />
            <Button type="submit" isLoading={isSavingProfile}>Save Profile</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-ink-400" />
          <h2 className="text-sm font-semibold text-ink-800">Change Password</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordError && (
              <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">{passwordSuccess}</p>
            )}
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="At least 8 characters."
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" isLoading={isSavingPassword}>Change Password</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}