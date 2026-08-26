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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listProducts } from "../api/products";
import type { ProductDto } from "../api/products";
import { getStockStatus, getTotalStock } from "../lib/stock";
import Card, { CardBody, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  emptyHint?: string;
}

/** A metric tile that either shows a real value, or — when there's no
 * backing API yet (Sales/Purchases don't exist until a later phase) —
 * an honest "not available" hint instead of a fabricated number. */
function MetricCard({ label, value, icon, emptyHint }: MetricCardProps) {
  return (
    <Card>
      <CardBody className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{value}</p>
          {emptyHint && <p className="mt-1 text-xs text-ink-400">{emptyHint}</p>}
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          {icon}
        </span>
      </CardBody>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, currentBusiness } = useAuth();

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProducts() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listProducts();
      setProducts(data);
    } catch {
      setError("Could not load your inventory data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">
          Welcome back, {user?.full_name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink-500">
          {currentBusiness
            ? `${currentBusiness.name} · ${currentBusiness.business_type} · ${currentBusiness.country}`
            : "Here's what's happening with your business"}
        </p>
      </div>

      {error && (
        <EmptyState
          title="Something went wrong"
          description={error}
          action={
            <Button variant="secondary" size="sm" onClick={loadProducts}>
              Try again
            </Button>
          }
        />
      )}

      {!error && isLoading && <Loading label="Loading your dashboard..." />}

      {!error && !isLoading && (
        <>
          {/* Metrics: Total Products and Low Stock come from the real
              Products API. Today's Sales/Profit have no backing API
              yet (Sales isn't built), so they show an honest empty
              hint instead of a fabricated number. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Today's Sales"
              value="—"
              icon={<DollarSign className="h-5 w-5" />}
              emptyHint="No sales recorded today."
            />
            <MetricCard
              label="Today's Profit"
              value="—"
              icon={<TrendingUp className="h-5 w-5" />}
              emptyHint="No sales recorded today."
            />
            <MetricCard
              label="Total Products"
              value={products.length.toString()}
              icon={<Package className="h-5 w-5" />}
            />
            <MetricCard
              label="Low Stock Items"
              value={lowStockProducts.length.toString()}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-ink-400" />
                <h2 className="text-sm font-semibold text-ink-800">Recent Sales</h2>
              </CardHeader>
              <CardBody>
                <EmptyState
                  title="No recent sales"
                  description="Recorded sales will appear here once you start selling."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-ink-400" />
                <h2 className="text-sm font-semibold text-ink-800">Recent Purchases</h2>
              </CardHeader>
              <CardBody>
                <EmptyState
                  title="No recent purchases"
                  description="Recorded purchases will appear here once you log one."
                />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-ink-400" />
              <h2 className="text-sm font-semibold text-ink-800">Sales Overview</h2>
            </CardHeader>
            <CardBody>
              <EmptyState
                title="No sales data to display yet"
                description="A chart of your sales trend will appear here once sales are recorded."
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-ink-400" />
                <h2 className="text-sm font-semibold text-ink-800">Low Stock</h2>
              </div>
              <Link to="/products" className="text-sm text-brand-600 hover:underline">
                View all products
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
                        <p className="text-sm font-medium text-ink-800">{product.name}</p>
                        <p className="text-xs text-ink-400">
                          Stock: {totalStock}
                          {product.reorder_level !== null &&
                            ` · Reorder at: ${product.reorder_level}`}
                        </p>
                      </div>
                      <Badge variant={status === "out_of_stock" ? "danger" : "warning"}>
                        {status === "out_of_stock" ? "Out of Stock" : "Low Stock"}
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