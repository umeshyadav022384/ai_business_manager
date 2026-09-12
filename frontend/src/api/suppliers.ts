import apiClient from "./client";

export interface SupplierDto {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierCreatePayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export type SupplierUpdatePayload = Partial<SupplierCreatePayload>;

export async function listSuppliers(): Promise<SupplierDto[]> {
  const response = await apiClient.get<SupplierDto[]>("/api/v1/suppliers");
  return response.data;
}

export async function createSupplier(payload: SupplierCreatePayload): Promise<SupplierDto> {
  const response = await apiClient.post<SupplierDto>("/api/v1/suppliers", payload);
  return response.data;
}

export async function updateSupplier(
  supplierId: string,
  payload: SupplierUpdatePayload
): Promise<SupplierDto> {
  const response = await apiClient.put<SupplierDto>(
    `/api/v1/suppliers/${supplierId}`,
    payload
  );
  return response.data;
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  await apiClient.delete(`/api/v1/suppliers/${supplierId}`);
}

export interface SupplierBalanceDto {
  supplier_id: string;
  total_purchases: string;
  total_paid: string;
  balance: string;
}

export interface SupplierLedgerEntryDto {
  date: string;
  type: "purchase" | "payment";
  reference: string | null;
  amount: string;
  paid: string | null;
  due: string | null;
}

export interface SupplierLedgerDto {
  balance: SupplierBalanceDto;
  entries: SupplierLedgerEntryDto[];
}

export interface SupplierPaymentDto {
  id: string;
  supplier_id: string;
  purchase_id: string | null;
  amount: string;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface SupplierPaymentPayload {
  amount: number;
  payment_date: string;
  purchase_id?: string | null;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
}

export async function getSupplierBalance(
  supplierId: string
): Promise<SupplierBalanceDto> {
  const response = await apiClient.get<SupplierBalanceDto>(
    `/api/v1/suppliers/${supplierId}/balance`
  );
  return response.data;
}

export async function getSupplierLedger(
  supplierId: string
): Promise<SupplierLedgerDto> {
  const response = await apiClient.get<SupplierLedgerDto>(
    `/api/v1/suppliers/${supplierId}/ledger`
  );
  return response.data;
}

export async function recordSupplierPayment(
  supplierId: string,
  payload: SupplierPaymentPayload
): Promise<SupplierPaymentDto> {
  const response = await apiClient.post<SupplierPaymentDto>(
    `/api/v1/suppliers/${supplierId}/payments`,
    payload
  );
  return response.data;
}