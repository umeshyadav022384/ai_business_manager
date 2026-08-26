export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

/** Total stock for a product is the sum of all its variant quantities
 * — for grocery (one implicit variant) this is just that variant's
 * count; for clothing it's the sum across size/color rows. */
export function getTotalStock(variants: { stock_quantity: number }[]): number {
  return variants.reduce((sum, v) => sum + v.stock_quantity, 0);
}

export function getStockStatus(
  totalStock: number,
  reorderLevel: number | null
): StockStatus {
  if (totalStock <= 0) return "out_of_stock";
  if (reorderLevel !== null && totalStock <= reorderLevel) return "low_stock";
  return "in_stock";
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};