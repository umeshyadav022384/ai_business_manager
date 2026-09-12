import { useEffect, useMemo, useState } from "react";
import { Truck, Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { listSuppliers, deleteSupplier } from "../api/suppliers";
import type { SupplierDto } from "../api/suppliers";
import { listPurchases } from "../api/purchases";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import SupplierFormModal from "../components/suppliers/SupplierFormModal";
import {
  default as Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableState,
} from "../components/ui/Table";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  // Purchase counts per supplier are derived from real purchase data
  // (not fabricated) — fetched once alongside suppliers.
  const [purchaseCounts, setPurchaseCounts] = useState<Record<string, number>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | undefined>(undefined);
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierDto | null>(null);

  async function loadData() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [supplierData, purchaseData] = await Promise.all([
        listSuppliers(),
        listPurchases(),
      ]);
      setSuppliers(supplierData);
      const counts: Record<string, number> = {};
      for (const purchase of purchaseData) {
        if (purchase.supplier) {
          counts[purchase.supplier.id] = (counts[purchase.supplier.id] ?? 0) + 1;
        }
      }
      setPurchaseCounts(counts);
    } catch {
      setLoadError("Could not load suppliers. Check your connection and try again.");
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

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.phone ?? "").toLowerCase().includes(term) ||
        (s.email ?? "").toLowerCase().includes(term)
    );
  }, [suppliers, search]);

  function openCreateModal() {
    setEditingSupplier(undefined);
    setIsModalOpen(true);
  }

  function openEditModal(supplier: SupplierDto) {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  }

  function handleSaved(message: string) {
    setSuccessMessage(message);
    loadData();
  }

  async function confirmDelete() {
    if (!deletingSupplier) return;
    try {
      await deleteSupplier(deletingSupplier.id);
      setSuccessMessage(`"${deletingSupplier.name}" was deleted.`);
      setDeletingSupplier(null);
      await loadData();
    } catch {
      setLoadError("Could not delete this supplier.");
      setDeletingSupplier(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Suppliers"
        description={`${suppliers.length} supplier${suppliers.length === 1 ? "" : "s"}`}
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Add Supplier
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

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers..."
          className="pl-9"
        />
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
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Phone</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Address</TableHeaderCell>
            <TableHeaderCell>Purchases</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableHead>
          <TableBody>
            <TableState
              colSpan={6}
              isLoading={isLoading}
              isEmpty={!isLoading && filteredSuppliers.length === 0}
              emptyTitle={suppliers.length === 0 ? "No suppliers yet" : "No suppliers match your search"}
              emptyDescription={
                suppliers.length === 0
                  ? "Add your first supplier to start tracking purchases."
                  : "Try a different search term."
              }
              loadingLabel="Loading suppliers..."
            />
            {!isLoading &&
              filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <Truck className="h-4 w-4" />
                      </span>
                      <p className="font-medium text-ink-800">{supplier.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>{supplier.phone ?? "—"}</TableCell>
                  <TableCell>{supplier.email ?? "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {supplier.address ?? "—"}
                  </TableCell>
                  <TableCell>{purchaseCounts[supplier.id] ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEditModal(supplier)}
                        aria-label={`Edit ${supplier.name}`}
                        className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingSupplier(supplier)}
                        aria-label={`Delete ${supplier.name}`}
                        className="rounded-md p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}

      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
        supplier={editingSupplier}
      />

      {deletingSupplier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => setDeletingSupplier(null)}
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-elevated"
          >
            <h2 className="text-base font-semibold text-ink-800">Delete supplier?</h2>
            <p className="mt-1 text-sm text-ink-500">
              "{deletingSupplier.name}" will be removed. Past purchases from this supplier
              are kept, but will no longer show a supplier name.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeletingSupplier(null)}>
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