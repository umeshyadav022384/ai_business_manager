import apiClient from "./client";

export type InsightType =
  | "low_stock" | "best_seller" | "slow_seller" | "sales_trend"
  | "expense_warning" | "profit_insight" | "customer_udhaar" | "supplier_payable";
export type InsightSeverity = "info" | "warning" | "critical";

export interface InsightDto {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
}

export async function listInsights(): Promise<InsightDto[]> {
  const response = await apiClient.get<InsightDto[]>("/api/v1/insights");
  return response.data;
}