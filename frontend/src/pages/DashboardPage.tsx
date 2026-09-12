import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Receipt,
  ShoppingCart,
  BarChart3,
  Plus,
  ArrowRight,
  HandCoins,
  Wallet,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { listProducts } from "../api/products";
import type { ProductDto } from "../api/products";
import { listSales } from "../api/sales";
import type { SaleDto } from "../api/sales";
import { listPurchases } from "../api/purchases";
import type { PurchaseDto } from "../api/purchases";
import { getFinancialSummary } from "../api/reports";
import type { FinancialSummaryDto } from "../api/reports";

import { getStockStatus, getTotalStock } from "../lib/stock";
import { formatCurrency } from "../lib/currency";

import Card, { CardBody, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import MetricCard from "../components/ui/MetricCard";

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export default function DashboardPage() {
  const { user, currentBusiness } = useAuth();
  const currencyCode = currentBusiness?.currency ?? "NPR";

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [sales, setSales] = useState<SaleDto[]>([]);
  const [purchases, setPurchases] = useState<PurchaseDto[]>([]);

  // Phase 6 financial summary
  const [summary, setSummary] = useState<FinancialSummaryDto | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      // Use today's date for the Phase 6 financial summary.
      const todayIso = new Date().toISOString().slice(0, 10);

      const [productData, saleData, purchaseData, summaryData] =
        await Promise.all([
          listProducts(),
          listSales(),
          listPurchases(),

          // If the financial-summary endpoint fails, the rest of
          // the dashboard should still load normally.
          getFinancialSummary(todayIso, todayIso).catch(() => null),
        ]);

      setProducts(productData);
      setSales(saleData);
      setPurchases(purchaseData);
      setSummary(summaryData);
    } catch {
      setError("Could not load your dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const lowStockProducts = useMemo(() => {
    return products
      .map((p) => ({
        product: p,
        totalStock: getTotalStock(p.variants),
        status: getStockStatus(getTotalStock(p.variants), p.reorder_level),
      }))
      .filter((entry) => entry.status !== "in_stock")
      .sort((a, b) => a.totalStock - b.totalStock);
  }, [products]);

  // Today's Sales/Profit are still calculated directly from
  // the existing sales API. This intentionally remains unchanged.
  const todaysSales = useMemo(() => {
    const now = new Date();

    return sales.filter((s) => isSameUtcDay(new Date(s.sale_date), now));
  }, [sales]);

  const todaysSalesTotal = useMemo(
    () => todaysSales.reduce((sum, s) => sum + Number(s.total), 0),
    [todaysSales],
  );

  const todaysProfitTotal = useMemo(
    () => todaysSales.reduce((sum, s) => sum + Number(s.total_profit), 0),
    [todaysSales],
  );

  const recentSales = useMemo(() => sales.slice(0, 5), [sales]);

  const recentPurchases = useMemo(() => purchases.slice(0, 5), [purchases]);

  const firstName = user?.full_name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Welcome back{firstName ? `, ${firstName}` : ""} 👋
        </h1>

        <p className="mt-1 text-sm text-ink-500">
          {currentBusiness
            ? `${currentBusiness.name} · ${currentBusiness.business_type} · ${currentBusiness.country}`
            : "Your business overview for today."}
        </p>
      </div>

      {/* Error */}
      {error && (
        <EmptyState
          title="Something went wrong"
          description={error}
          action={
            <Button variant="secondary" size="sm" onClick={loadData}>
              Try again
            </Button>
          }
        />
      )}

      {/* Loading */}
      {!error && isLoading && <Loading label="Loading your dashboard..." />}

      {!error && !isLoading && (
        <>
          {/* =====================================================
              METRICS
              ===================================================== */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Existing card - unchanged */}
            <MetricCard
              label="Today's Sales"
              value={
                todaysSales.length > 0
                  ? formatCurrency(todaysSalesTotal, currencyCode)
                  : "—"
              }
              description={
                todaysSales.length > 0
                  ? `${todaysSales.length} sale${
                      todaysSales.length === 1 ? "" : "s"
                    } today`
                  : "No sales recorded today."
              }
              icon={<DollarSign className="h-5 w-5" />}
              accent="brand"
            />

            {/* Existing card - unchanged */}
            <MetricCard
              label="Today's Profit"
              value={
                todaysSales.length > 0
                  ? formatCurrency(todaysProfitTotal, currencyCode)
                  : "—"
              }
              description={
                todaysSales.length > 0
                  ? "From today's sales"
                  : "No sales recorded today."
              }
              icon={<TrendingUp className="h-5 w-5" />}
              accent="accent"
            />

            {/* Existing card - unchanged */}
            <MetricCard
              label="Total Products"
              value={products.length.toString()}
              description="Across your catalog"
              icon={<Package className="h-5 w-5" />}
              accent="brand"
            />

            {/* Existing card - unchanged */}
            <MetricCard
              label="Low Stock Items"
              value={lowStockProducts.length.toString()}
              description="At or below reorder level"
              icon={<AlertTriangle className="h-5 w-5" />}
              accent="warning"
            />

            {/* =================================================
                PHASE 6 FINANCIAL CARDS
                ================================================= */}

            <MetricCard
              label="Today's Expenses"
              value={
                summary ? formatCurrency(summary.expenses, currencyCode) : "—"
              }
              description={summary ? undefined : "Not available."}
              icon={<Receipt className="h-5 w-5" />}
              accent="warning"
            />

            <MetricCard
              label="Customer Udhaar"
              value={
                summary
                  ? formatCurrency(summary.customer_udhaar, currencyCode)
                  : "—"
              }
              description={summary ? undefined : "Not available."}
              icon={<HandCoins className="h-5 w-5" />}
              accent="danger"
            />

            <MetricCard
              label="Supplier Payables"
              value={
                summary
                  ? formatCurrency(summary.supplier_payables, currencyCode)
                  : "—"
              }
              description={summary ? undefined : "Not available."}
              icon={<Wallet className="h-5 w-5" />}
              accent="warning"
            />
          </div>

          {/* =====================================================
              SALES OVERVIEW + QUICK ACTIONS
              ===================================================== */}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-ink-400" />

                <h2 className="text-sm font-semibold text-ink-800">
                  Sales Overview
                </h2>
              </CardHeader>

              <CardBody>
                {sales.length === 0 ? (
                  <EmptyState
                    title="No sales data to display yet"
                    description="A chart of your sales trend will appear here once sales are recorded."
                  />
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-ink-500">
                      {sales.length} sale
                      {sales.length === 1 ? "" : "s"} recorded,{" "}
                      {formatCurrency(
                        sales.reduce((sum, s) => sum + Number(s.total), 0),
                        currencyCode,
                      )}{" "}
                      total revenue.
                    </p>

                    <p className="text-xs text-ink-400">
                      A visual trend chart will appear here in a future update.
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink-800">
                  Quick Actions
                </h2>
              </CardHeader>

              <CardBody className="space-y-2">
                <Link to="/sales">
                  <Button
                    variant="secondary"
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      New Sale
                    </span>

                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <Link to="/products">
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      View Inventory
                    </span>

                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardBody>
            </Card>
          </div>

          {/* =====================================================
              RECENT SALES + RECENT PURCHASES
              ===================================================== */}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Recent Sales */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-ink-400" />

                  <h2 className="text-sm font-semibold text-ink-800">
                    Recent Sales
                  </h2>
                </div>

                {recentSales.length > 0 && (
                  <Link
                    to="/sales"
                    className="text-sm text-brand-600 hover:underline"
                  >
                    View all
                  </Link>
                )}
              </CardHeader>

              <CardBody>
                {recentSales.length === 0 ? (
                  <EmptyState
                    title="No sales yet"
                    description="Your sales activity will appear here once you record your first sale."
                  />
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {recentSales.map((sale) => (
                      <li
                        key={sale.id}
                        className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink-800">
                            {sale.customer?.name ?? "Walk-in customer"}
                          </p>

                          <p className="text-xs text-ink-400">
                            {sale.sale_date}
                          </p>
                        </div>

                        <p className="text-sm font-medium text-ink-800">
                          {formatCurrency(sale.total, currencyCode)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            {/* Recent Purchases */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-ink-400" />

                  <h2 className="text-sm font-semibold text-ink-800">
                    Recent Purchases
                  </h2>
                </div>

                {recentPurchases.length > 0 && (
                  <Link
                    to="/purchases"
                    className="text-sm text-brand-600 hover:underline"
                  >
                    View all
                  </Link>
                )}
              </CardHeader>

              <CardBody>
                {recentPurchases.length === 0 ? (
                  <EmptyState
                    title="No purchases yet"
                    description="Recorded purchases will appear here once you log one."
                  />
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {recentPurchases.map((purchase) => (
                      <li
                        key={purchase.id}
                        className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink-800">
                            {purchase.supplier?.name ?? "No supplier"}
                          </p>

                          <p className="text-xs text-ink-400">
                            {purchase.purchase_date}
                          </p>
                        </div>

                        <p className="text-sm font-medium text-ink-800">
                          {formatCurrency(purchase.total_amount, currencyCode)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          {/* =====================================================
              LOW STOCK
              ===================================================== */}

          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-ink-400" />

                <h2 className="text-sm font-semibold text-ink-800">
                  Low Stock
                </h2>
              </div>

              <Link
                to="/products"
                className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
              >
                View all products
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>

            <CardBody>
              {lowStockProducts.length === 0 ? (
                <EmptyState
                  title="Everything is well stocked"
                  description="Products at or below their reorder level will show up here."
                />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {lowStockProducts.map(({ product, totalStock, status }) => (
                    <li
                      key={product.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink-800">
                          {product.name}
                        </p>

                        <p className="text-xs text-ink-400">
                          Stock: {totalStock}
                          {product.reorder_level !== null &&
                            ` · Reorder at: ${product.reorder_level}`}
                        </p>
                      </div>

                      <Badge
                        variant={
                          status === "out_of_stock" ? "danger" : "warning"
                        }
                      >
                        {status === "out_of_stock"
                          ? "Out of Stock"
                          : "Low Stock"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
