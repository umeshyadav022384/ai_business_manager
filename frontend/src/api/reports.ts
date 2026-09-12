import apiClient from "./client";

export interface FinancialSummaryDto {
  date_from: string | null;
  date_to: string | null;
  revenue: string;
  cogs: string;
  gross_profit: string;
  expenses: string;
  net_profit: string;
  customer_udhaar: string;
  supplier_payables: string;
}

export async function getFinancialSummary(dateFrom?: string, dateTo?: string): Promise<FinancialSummaryDto> {
  const response = await apiClient.get<FinancialSummaryDto>("/api/v1/reports/summary", {
    params: { date_from: dateFrom, date_to: dateTo },
  });
  return response.data;
}