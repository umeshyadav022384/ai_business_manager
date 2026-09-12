import apiClient from "./client";
import type { CustomerDto } from "./customers";

export interface SaleItemDto {
  id: string;
  product_id: string;
  product_variant_id: string | null;
  product_name: string;
  variant_label: string | null;
  quantity: number;
  unit_price: string;
  unit_cost: string;
  total: string;
  profit: string;
}

export interface SaleDto {
  id: string;
  business_id: string;
  customer: CustomerDto | null;
  invoice_number: string | null;
  sale_date: string;
  notes: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;

  // Payment tracking
  amount_paid: string;
  balance_due: string;
  payment_status: string;

  total_profit: string;
  items: SaleItemDto[];
  created_at: string;
  updated_at: string;
}

export interface SaleItemCreatePayload {
  product_id: string;
  product_variant_id?: string | null;
  quantity: number;
  unit_price: number;
}

export interface SaleCreatePayload {
  customer_id?: string | null;
  sale_date: string;
  invoice_number?: string | null;
  notes?: string | null;
  discount?: number;
  tax?: number;
  items: SaleItemCreatePayload[];

  // Initial payment made when the sale is created/updated
  amount_paid?: number | null;
}

export type SaleUpdatePayload = SaleCreatePayload;

export interface SaleListFilters {
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  invoice_number?: string;
}

export async function listSales(
  filters?: SaleListFilters
): Promise<SaleDto[]> {
  const response = await apiClient.get<SaleDto[]>("/api/v1/sales", {
    params: filters,
  });
  return response.data;
}

export async function getSale(saleId: string): Promise<SaleDto> {
  const response = await apiClient.get<SaleDto>(
    `/api/v1/sales/${saleId}`
  );
  return response.data;
}

export async function createSale(
  payload: SaleCreatePayload
): Promise<SaleDto> {
  const response = await apiClient.post<SaleDto>(
    "/api/v1/sales",
    payload
  );
  return response.data;
}

export async function updateSale(
  saleId: string,
  payload: SaleUpdatePayload
): Promise<SaleDto> {
  const response = await apiClient.put<SaleDto>(
    `/api/v1/sales/${saleId}`,
    payload
  );
  return response.data;
}

export async function deleteSale(saleId: string): Promise<void> {
  await apiClient.delete(`/api/v1/sales/${saleId}`);
}