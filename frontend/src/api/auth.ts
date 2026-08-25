import apiClient from "./client";

export interface BusinessDto {
  id: string;
  name: string;
  business_type: string;
  country: string;
  currency: string;
  created_at: string;
}

export interface UserDto {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface MembershipDto {
  business: BusinessDto;
  role: "owner" | "manager" | "staff";
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  business_name: string;
  business_type: string;
  country: string;
  currency: string;
}

export interface RegisterResponse {
  user: UserDto;
  business: BusinessDto;
  access_token: string;
  token_type: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface MeResponse {
  user: UserDto;
  memberships: MembershipDto[];
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>("/api/v1/auth/register", payload);
  return response.data;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/api/v1/auth/login", {
    email,
    password,
  });
  return response.data;
}

export async function getMe(): Promise<MeResponse> {
  const response = await apiClient.get<MeResponse>("/api/v1/auth/me");
  return response.data;
}