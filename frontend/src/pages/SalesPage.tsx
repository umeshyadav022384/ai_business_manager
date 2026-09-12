import { useEffect, useMemo, useState } from "react";
import { Plus, X, Receipt, TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listSales, deleteSale } from "../api/sales";
import type { SaleDto } from "../api/sales";
import { listCustomers } from "../api/customers";
import type { CustomerDto } from "../api/customers";
import { formatCurrency } from "../lib/currency";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import MetricCard from "../components/ui/MetricCard";
import SaleFormModal from "../components/sales/SaleFormModal";
import SaleDetailModal from "../components/sales/SaleDetailModal";
import {
  default as Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableState,
} from "../components/ui/Table";

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export default function SalesPage() {
  const { currentBusiness } = useAuth();
  const currencyCode = currentBusiness?.currency ?? "NPR";

  const [sales, setSales] = useState<SaleDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [customerFilter, setCustomerFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleDto | undefined>(undefined);
  const [viewingSale, setViewingSale] = useState<SaleDto | null>(null);
  const [deletingSale, setDeletingSale] = useState<SaleDto | null>(null);

  async function loadData() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [saleData, customerData] = await Promise.all([listSales(), listCustomers()]);
      setSales(saleData);
      setCustomers(customerData);
    } catch {
      setLoadError("Could not load sales. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // Every metric below is computed from the sales actually loaded —
  // never fabricated.
  const todaysSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => isSameUtcDay(new Date(s.sale_date), now));
  }, [sales]);

  const thisMonthSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      const d = new Date(s.sale_date);
      return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
    });
  }, [sales]);

  const totalProfit = useMemo(
    () => sales.reduce((sum, s) => sum + Number(s.total_profit), 0),
    [sales]
  );

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchesCustomer = customerFilter === "all" || s.customer?.id === customerFilter;
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        (s.invoice_number ?? "").toLowerCase().includes(term) ||
        (s.customer?.name ?? "").toLowerCase().includes(term);
      return matchesCustomer && matchesSearch;
    });
  }, [sales, customerFilter, search]);

  function openCreateModal() {
    setEditingSale(undefined);
    setIsFormOpen(true);
  }

  function openEditModal(sale: SaleDto) {
    setViewingSale(null);
    setEditingSale(sale);
    setIsFormOpen(true);
  }

  function handleSaved(message: string) {
    setSuccessMessage(message);
    loadData();
  }

  async function confirmDelete() {
    const target = deletingSale;
    if (!target) return;
    try {
      await deleteSale(target.id);
      setSuccessMessage("Sale was cancelled and stock was restored.");
      setDeletingSale(null);
      setViewingSale(null);
      await loadData();
    } catch {
      setLoadError("Could not cancel this sale.");
      setDeletingSale(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Sales"
        description="Record and track your sales transactions."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            New Sale
          </Button>
        }
      />

      {successMessage && (
        <div className="flex items-center justify-between rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700">
          {successMessage}
          <button onClick={() => setSuccessMessage(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Today's Sales"
          value={todaysSales.length.toString()}
          icon={<Receipt className="h-5 w-5" />}
          accent="brand"
        />
        <MetricCard
          label="This Month"
          value={thisMonthSales.length.toString()}
          icon={<Receipt className="h-5 w-5" />}
          accent="accent"
        />
        <MetricCard
          label="Total Sales"
          value={sales.length.toString()}
          icon={<Receipt className="h-5 w-5" />}
          accent="brand"
        />
        <MetricCard
          label="Total Profit"
          value={formatCurrency(totalProfit, currencyCode)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="success"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice or customer..."
          className="h-10 flex-1 rounded-lg border border-ink-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
        <Select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="sm:w-56"
        >
          <option value="all">All customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {loadError && (
        <EmptyState
          title="Something went wrong"
          description={loadError}
          action={
            <Button variant="secondary" size="sm" onClick={loadData}>
              Try again
            </Button>
          }
        />
      )}

      {!loadError && (
        <Table>
          <TableHead>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Invoice</TableHeaderCell>
            <TableHeaderCell>Customer</TableHeaderCell>
            <TableHeaderCell>Items</TableHeaderCell>
            <TableHeaderCell>Total</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableHead>
          <TableBody>
            <TableState
              colSpan={6}
              isLoading={isLoading}
              isEmpty={!isLoading && filteredSales.length === 0}
              emptyTitle={sales.length === 0 ? "No sales yet" : "No sales match your filters"}
              emptyDescription={
                sales.length === 0
                  ? "Record your first sale to start tracking revenue."
                  : "Try a different search term or customer."
              }
              loadingLabel="Loading sales..."
            />
            {!isLoading &&
              filteredSales.map((sale) => (
                <TableRow
                  key={sale.id}
                  className="cursor-pointer"
                  onClick={() => setViewingSale(sale)}
                >
                  <TableCell>{sale.sale_date}</TableCell>
                  <TableCell>{sale.invoice_number ?? "—"}</TableCell>
                  <TableCell>{sale.customer?.name ?? "Walk-in"}</TableCell>
                  <TableCell>{sale.items.length}</TableCell>
                  <TableCell className="font-medium text-ink-800">
                    {formatCurrency(sale.total, currencyCode)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-brand-600">View</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}

      <SaleFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={handleSaved}
        currencyCode={currencyCode}
        sale={editingSale}
      />

      <SaleDetailModal
        isOpen={Boolean(viewingSale)}
        onClose={() => setViewingSale(null)}
        sale={viewingSale}
        currencyCode={currencyCode}
        onEdit={() => viewingSale && openEditModal(viewingSale)}
        onDelete={() => viewingSale && setDeletingSale(viewingSale)}
      />

      {deletingSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => setDeletingSale(null)}
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-elevated"
          >
            <h2 className="text-base font-semibold text-ink-800">Cancel this sale?</h2>
            <p className="mt-1 text-sm text-ink-500">
              This will permanently delete this sale and return its items to your stock.
              This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeletingSale(null)}>
                Keep Sale
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Cancel Sale
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}