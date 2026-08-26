import apiClient from "./client";

export interface ProductVariantDto {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface ProductVariantCreatePayload {
  size?: string | null;
  color?: string | null;
  stock_quantity: number;
}

export interface ProductVariantUpdatePayload {
  size?: string | null;
  color?: string | null;
  stock_quantity?: number;
}

export interface ProductDto {
  id: string;
  business_id: string;
  name: string;
  category: string | null;
  brand: string | null;
  unit: string | null;
  expiry_date: string | null;
  purchase_price: string;
  selling_price: string;
  reorder_level: number | null;
  created_at: string;
  updated_at: string;
  variants: ProductVariantDto[];
}

export interface ProductCreatePayload {
  name: string;
  category?: string | null;
  brand?: string | null;
  unit?: string | null;
  expiry_date?: string | null;
  purchase_price: number;
  selling_price: number;
  reorder_level?: number | null;
  variants?: ProductVariantCreatePayload[];
}

export interface ProductUpdatePayload {
  name?: string;
  category?: string | null;
  brand?: string | null;
  unit?: string | null;
  expiry_date?: string | null;
  purchase_price?: number;
  selling_price?: number;
  reorder_level?: number | null;
}

export async function listProducts(): Promise<ProductDto[]> {
  const response = await apiClient.get<ProductDto[]>("/api/v1/products");
  return response.data;
}

export async function createProduct(payload: ProductCreatePayload): Promise<ProductDto> {
  const response = await apiClient.post<ProductDto>("/api/v1/products", payload);
  return response.data;
}

export async function updateProduct(
  productId: string,
  payload: ProductUpdatePayload
): Promise<ProductDto> {
  const response = await apiClient.put<ProductDto>(
    `/api/v1/products/${productId}`,
    payload
  );
  return response.data;
}

export async function deleteProduct(productId: string): Promise<void> {
  await apiClient.delete(`/api/v1/products/${productId}`);
}

export async function addVariant(
  productId: string,
  payload: ProductVariantCreatePayload
): Promise<ProductVariantDto> {
  const response = await apiClient.post<ProductVariantDto>(
    `/api/v1/products/${productId}/variants`,
    payload
  );
  return response.data;
}

export async function updateVariant(
  variantId: string,
  payload: ProductVariantUpdatePayload
): Promise<ProductVariantDto> {
  const response = await apiClient.put<ProductVariantDto>(
    `/api/v1/products/variants/${variantId}`,
    payload
  );
  return response.data;
}

export async function deleteVariant(variantId: string): Promise<void> {
  await apiClient.delete(`/api/v1/products/variants/${variantId}`);
}