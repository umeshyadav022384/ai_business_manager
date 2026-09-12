import apiClient from "./client";

export interface CustomerDto {
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

export interface CustomerCreatePayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export type CustomerUpdatePayload = Partial<CustomerCreatePayload>;

export async function listCustomers(): Promise<CustomerDto[]> {
  const response = await apiClient.get<CustomerDto[]>("/api/v1/customers");
  return response.data;
}

export async function createCustomer(payload: CustomerCreatePayload): Promise<CustomerDto> {
  const response = await apiClient.post<CustomerDto>("/api/v1/customers", payload);
  return response.data;
}

export async function updateCustomer(
  customerId: string,
  payload: CustomerUpdatePayload
): Promise<CustomerDto> {
  const response = await apiClient.put<CustomerDto>(
    `/api/v1/customers/${customerId}`,
    payload
  );
  return response.data;
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await apiClient.delete(`/api/v1/customers/${customerId}`);
}

export interface CustomerBalanceDto {
  customer_id: string;
  total_sales: string;
  total_paid: string;
  balance: string;
}

export interface LedgerEntryDto {
  date: string;
  type: "sale" | "purchase" | "payment";
  reference: string | null;
  amount: string;
  paid: string | null;
  due: string | null;
}

export interface CustomerLedgerDto {
  balance: CustomerBalanceDto;
  entries: LedgerEntryDto[];
}

export interface CustomerPaymentDto {
  id: string;
  customer_id: string;
  sale_id: string | null;
  amount: string;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerPaymentPayload {
  amount: number;
  payment_date: string;
  sale_id?: string | null;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
}

export async function getCustomerBalance(customerId: string): Promise<CustomerBalanceDto> {
  const response = await apiClient.get<CustomerBalanceDto>(`/api/v1/customers/${customerId}/balance`);
  return response.data;
}

export async function getCustomerLedger(customerId: string): Promise<CustomerLedgerDto> {
  const response = await apiClient.get<CustomerLedgerDto>(`/api/v1/customers/${customerId}/ledger`);
  return response.data;
}

export async function recordCustomerPayment(
  customerId: string,
  payload: CustomerPaymentPayload
): Promise<CustomerPaymentDto> {
  const response = await apiClient.post<CustomerPaymentDto>(
    `/api/v1/customers/${customerId}/payments`,
    payload
  );
  return response.data;
}