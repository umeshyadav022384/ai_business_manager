import apiClient from "./client";
import type { SupplierDto } from "./suppliers";

export interface PurchaseItemDto {
  id: string;
  product_id: string;
  product_variant_id: string | null;
  product_name: string;
  variant_label: string | null;
  quantity: number;
  unit_cost: string;
  total_cost: string;
}

export interface PurchaseDto {
  id: string;
  business_id: string;
  supplier: SupplierDto | null;
  purchase_date: string;
  invoice_number: string | null;
  notes: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total_amount: string;
  items: PurchaseItemDto[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseItemCreatePayload {
  product_id: string;
  product_variant_id?: string | null;
  quantity: number;
  unit_cost: number;
}

export interface PurchaseCreatePayload {
  supplier_id?: string | null;
  purchase_date: string;
  invoice_number?: string | null;
  notes?: string | null;
  discount?: number;
  tax?: number;
  items: PurchaseItemCreatePayload[];
}

export type PurchaseUpdatePayload = PurchaseCreatePayload;

export interface PurchaseListFilters {
  supplier_id?: string;
  date_from?: string;
  date_to?: string;
  invoice_number?: string;
}

export async function listPurchases(filters?: PurchaseListFilters): Promise<PurchaseDto[]> {
  const response = await apiClient.get<PurchaseDto[]>("/api/v1/purchases", {
    params: filters,
  });
  return response.data;
}

export async function getPurchase(purchaseId: string): Promise<PurchaseDto> {
  const response = await apiClient.get<PurchaseDto>(`/api/v1/purchases/${purchaseId}`);
  return response.data;
}

export async function createPurchase(payload: PurchaseCreatePayload): Promise<PurchaseDto> {
  const response = await apiClient.post<PurchaseDto>("/api/v1/purchases", payload);
  return response.data;
}

export async function updatePurchase(
  purchaseId: string,
  payload: PurchaseUpdatePayload
): Promise<PurchaseDto> {
  const response = await apiClient.put<PurchaseDto>(
    `/api/v1/purchases/${purchaseId}`,
    payload
  );
  return response.data;
}

export async function deletePurchase(purchaseId: string): Promise<void> {
  await apiClient.delete(`/api/v1/purchases/${purchaseId}`);
}