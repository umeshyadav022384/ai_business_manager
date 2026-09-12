import { useEffect, useMemo, useState } from "react";
import { Plus, X, Receipt } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listPurchases, deletePurchase } from "../api/purchases";
import type { PurchaseDto } from "../api/purchases";
import { listSuppliers } from "../api/suppliers";
import type { SupplierDto } from "../api/suppliers";
import { formatCurrency } from "../lib/currency";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import MetricCard from "../components/ui/MetricCard";
import PurchaseFormModal from "../components/purchases/PurchaseFormModal";
import PurchaseDetailModal from "../components/purchases/PurchaseDetailModal";
import {
  default as Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableState,
} from "../components/ui/Table";

export default function PurchasesPage() {
  const { currentBusiness } = useAuth();
  const currencyCode = currentBusiness?.currency ?? "NPR";

  const [purchases, setPurchases] = useState<PurchaseDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [supplierFilter, setSupplierFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseDto | undefined>(undefined);
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseDto | null>(null);
  const [deletingPurchase, setDeletingPurchase] = useState<PurchaseDto | null>(null);

  async function loadData() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [purchaseData, supplierData] = await Promise.all([
        listPurchases(),
        listSuppliers(),
      ]);
      setPurchases(purchaseData);
      setSuppliers(supplierData);
    } catch {
      setLoadError("Could not load purchases. Check your connection and try again.");
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

  // Real metrics only — computed from the purchases actually loaded,
  // never fabricated.
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return purchases.filter((p) => {
      const d = new Date(p.purchase_date);
      return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
    }).length;
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchesSupplier = supplierFilter === "all" || p.supplier?.id === supplierFilter;
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        (p.invoice_number ?? "").toLowerCase().includes(term) ||
        (p.supplier?.name ?? "").toLowerCase().includes(term);
      return matchesSupplier && matchesSearch;
    });
  }, [purchases, supplierFilter, search]);

  function openCreateModal() {
    setEditingPurchase(undefined);
    setIsFormOpen(true);
  }

  function openEditModal(purchase: PurchaseDto) {
    setViewingPurchase(null);
    setEditingPurchase(purchase);
    setIsFormOpen(true);
  }

  function handleSaved(message: string) {
    setSuccessMessage(message);
    loadData();
  }

  async function confirmDelete() {
    const target = deletingPurchase;
    if (!target) return;
    try {
      await deletePurchase(target.id);
      setSuccessMessage("Purchase was deleted.");
      setDeletingPurchase(null);
      setViewingPurchase(null);
      await loadData();
    } catch {
      setLoadError("Could not delete this purchase.");
      setDeletingPurchase(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Purchases"
        description="Track inventory purchases and supplier transactions."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            New Purchase
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total Purchases"
          value={purchases.length.toString()}
          icon={<Receipt className="h-5 w-5" />}
          accent="brand"
        />
        <MetricCard
          label="This Month"
          value={thisMonthCount.toString()}
          icon={<Receipt className="h-5 w-5" />}
          accent="accent"
        />
        <MetricCard
          label="Suppliers"
          value={suppliers.length.toString()}
          icon={<Receipt className="h-5 w-5" />}
          accent="success"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice or supplier..."
          className="h-10 flex-1 rounded-lg border border-ink-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
        <Select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="sm:w-56"
        >
          <option value="all">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
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
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell>Items</TableHeaderCell>
            <TableHeaderCell>Total</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableHead>
          <TableBody>
            <TableState
              colSpan={6}
              isLoading={isLoading}
              isEmpty={!isLoading && filteredPurchases.length === 0}
              emptyTitle={purchases.length === 0 ? "No purchases yet" : "No purchases match your filters"}
              emptyDescription={
                purchases.length === 0
                  ? "Record your first purchase to start tracking inventory."
                  : "Try a different search term or supplier."
              }
              loadingLabel="Loading purchases..."
            />
            {!isLoading &&
              filteredPurchases.map((purchase) => (
                <TableRow
                  key={purchase.id}
                  className="cursor-pointer"
                  onClick={() => setViewingPurchase(purchase)}
                >
                  <TableCell>{purchase.purchase_date}</TableCell>
                  <TableCell>{purchase.invoice_number ?? "—"}</TableCell>
                  <TableCell>{purchase.supplier?.name ?? "—"}</TableCell>
                  <TableCell>{purchase.items.length}</TableCell>
                  <TableCell className="font-medium text-ink-800">
                    {formatCurrency(purchase.total_amount, currencyCode)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-brand-600">View</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}

      <PurchaseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={handleSaved}
        currencyCode={currencyCode}
        purchase={editingPurchase}
      />

      <PurchaseDetailModal
        isOpen={Boolean(viewingPurchase)}
        onClose={() => setViewingPurchase(null)}
        purchase={viewingPurchase}
        currencyCode={currencyCode}
        onEdit={() => viewingPurchase && openEditModal(viewingPurchase)}
        onDelete={() => viewingPurchase && setDeletingPurchase(viewingPurchase)}
      />

      {deletingPurchase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => setDeletingPurchase(null)}
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-elevated"
          >
            <h2 className="text-base font-semibold text-ink-800">Delete purchase?</h2>
            <p className="mt-1 text-sm text-ink-500">
              This will permanently delete this purchase and reverse its stock effect on
              your products. This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeletingPurchase(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}