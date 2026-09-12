import apiClient from "./client";

export interface ExpenseCategoryDto {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseDto {
  id: string;
  business_id: string;
  category: ExpenseCategoryDto | null;
  description: string;
  amount: string;
  expense_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategoryPayload {
  name: string;
  description?: string | null;
}

export interface ExpenseCreatePayload {
  category_id?: string | null;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
}

export type ExpenseUpdatePayload = Partial<ExpenseCreatePayload>;

export async function listCategories(): Promise<ExpenseCategoryDto[]> {
  const response = await apiClient.get<ExpenseCategoryDto[]>("/api/v1/expense-categories");
  return response.data;
}

export async function createCategory(payload: ExpenseCategoryPayload): Promise<ExpenseCategoryDto> {
  const response = await apiClient.post<ExpenseCategoryDto>("/api/v1/expense-categories", payload);
  return response.data;
}

export async function listExpenses(): Promise<ExpenseDto[]> {
  const response = await apiClient.get<ExpenseDto[]>("/api/v1/expenses");
  return response.data;
}

export async function createExpense(payload: ExpenseCreatePayload): Promise<ExpenseDto> {
  const response = await apiClient.post<ExpenseDto>("/api/v1/expenses", payload);
  return response.data;
}

export async function updateExpense(id: string, payload: ExpenseUpdatePayload): Promise<ExpenseDto> {
  const response = await apiClient.put<ExpenseDto>(`/api/v1/expenses/${id}`, payload);
  return response.data;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/expenses/${id}`);
}