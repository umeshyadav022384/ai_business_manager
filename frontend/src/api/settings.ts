import apiClient from "./client";

export interface BusinessUpdatePayload {
  name?: string;
  country?: string;
  currency?: string;
}

export interface UserProfileUpdatePayload {
  full_name?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export async function updateBusiness(payload: BusinessUpdatePayload) {
  const response = await apiClient.put("/api/v1/business/current", payload);
  return response.data;
}

export async function updateProfile(payload: UserProfileUpdatePayload) {
  const response = await apiClient.put("/api/v1/auth/me", payload);
  return response.data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await apiClient.post("/api/v1/auth/change-password", payload);
}