import { useEffect, useMemo, useState } from "react";
import { Users, Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listCustomers, deleteCustomer } from "../api/customers";
import type { CustomerDto } from "../api/customers";
import { listSales } from "../api/sales";
import { formatCurrency } from "../lib/currency";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import CustomerFormModal from "../components/customers/CustomerFormModal";
import {
  default as Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableState,
} from "../components/ui/Table";

interface CustomerSalesSummary {
  count: number;
  total: number;
}

export default function CustomersPage() {
  const { currentBusiness } = useAuth();
  const currencyCode = currentBusiness?.currency ?? "NPR";

  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  // Sales count + total purchase amount per customer, derived from
  // real sales data (not fabricated) — fetched once alongside customers.
  const [salesSummary, setSalesSummary] = useState<Record<string, CustomerSalesSummary>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | undefined>(undefined);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerDto | null>(null);

  async function loadData() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [customerData, saleData] = await Promise.all([listCustomers(), listSales()]);
      setCustomers(customerData);
      const summary: Record<string, CustomerSalesSummary> = {};
      for (const sale of saleData) {
        if (sale.customer) {
          const existing = summary[sale.customer.id] ?? { count: 0, total: 0 };
          summary[sale.customer.id] = {
            count: existing.count + 1,
            total: existing.total + Number(sale.total),
          };
        }
      }
      setSalesSummary(summary);
    } catch {
      setLoadError("Could not load customers. Check your connection and try again.");
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

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone ?? "").toLowerCase().includes(term) ||
        (c.email ?? "").toLowerCase().includes(term)
    );
  }, [customers, search]);

  function openCreateModal() {
    setEditingCustomer(undefined);
    setIsModalOpen(true);
  }

  function openEditModal(customer: CustomerDto) {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  }

  function handleSaved(message: string) {
    setSuccessMessage(message);
    loadData();
  }

  async function confirmDelete() {
    if (!deletingCustomer) return;
    try {
      await deleteCustomer(deletingCustomer.id);
      setSuccessMessage(`"${deletingCustomer.name}" was deleted.`);
      setDeletingCustomer(null);
      await loadData();
    } catch {
      setLoadError("Could not delete this customer.");
      setDeletingCustomer(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Customers"
        description={`${customers.length} customer${customers.length === 1 ? "" : "s"}`}
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Add Customer
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
          placeholder="Search customers..."
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
            <TableHeaderCell>Sales</TableHeaderCell>
            <TableHeaderCell>Total Spent</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableHead>
          <TableBody>
            <TableState
              colSpan={7}
              isLoading={isLoading}
              isEmpty={!isLoading && filteredCustomers.length === 0}
              emptyTitle={customers.length === 0 ? "No customers yet" : "No customers match your search"}
              emptyDescription={
                customers.length === 0
                  ? "Add your first customer to start tracking sales."
                  : "Try a different search term."
              }
              loadingLabel="Loading customers..."
            />
            {!isLoading &&
              filteredCustomers.map((customer) => {
                const summary = salesSummary[customer.id] ?? { count: 0, total: 0 };
                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <Users className="h-4 w-4" />
                        </span>
                        <p className="font-medium text-ink-800">{customer.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{customer.phone ?? "—"}</TableCell>
                    <TableCell>{customer.email ?? "—"}</TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      {customer.address ?? "—"}
                    </TableCell>
                    <TableCell>{summary.count}</TableCell>
                    <TableCell>
                      {summary.count > 0 ? formatCurrency(summary.total, currencyCode) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEditModal(customer)}
                          aria-label={`Edit ${customer.name}`}
                          className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCustomer(customer)}
                          aria-label={`Delete ${customer.name}`}
                          className="rounded-md p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      )}

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
        customer={editingCustomer}
      />

      {deletingCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => setDeletingCustomer(null)}
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-elevated"
          >
            <h2 className="text-base font-semibold text-ink-800">Delete customer?</h2>
            <p className="mt-1 text-sm text-ink-500">
              "{deletingCustomer.name}" will be removed. Past sales to this customer are
              kept, but will no longer show a customer name.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeletingCustomer(null)}>
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