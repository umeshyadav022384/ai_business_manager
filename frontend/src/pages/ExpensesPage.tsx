import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Receipt, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listExpenses, listCategories, deleteExpense } from "../api/expenses";
import type { ExpenseDto, ExpenseCategoryDto } from "../api/expenses";
import { formatCurrency } from "../lib/currency";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import MetricCard from "../components/ui/MetricCard";
import ExpenseFormModal from "../components/expenses/ExpenseFormModal";
import {
  default as Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell, TableState,
} from "../components/ui/Table";

export default function ExpensesPage() {
  const { currentBusiness } = useAuth();
  const currencyCode = currentBusiness?.currency ?? "NPR";

  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseDto | undefined>(undefined);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadData() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [expenseData, categoryData] = await Promise.all([listExpenses(), listCategories()]);
      setExpenses(expenseData);
      setCategories(categoryData);
    } catch {
      setLoadError("Could not load expenses. Check your connection and try again.");
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

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );
  const thisMonthTotal = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((e) => {
        const d = new Date(e.expense_date);
        return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === "all") return expenses;
    return expenses.filter((e) => e.category?.id === categoryFilter);
  }, [expenses, categoryFilter]);

  function openCreateModal() {
    setEditingExpense(undefined);
    setIsModalOpen(true);
  }
  function openEditModal(expense: ExpenseDto) {
    setEditingExpense(expense);
    setIsModalOpen(true);
  }
  function handleSaved(message: string) {
    setSuccessMessage(message);
    loadData();
  }
  function handleCategoryCreated(category: ExpenseCategoryDto) {
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function confirmDelete() {
    if (!deletingExpense) return;
    setIsDeleting(true);
    try {
      await deleteExpense(deletingExpense.id);
      setSuccessMessage("Expense was deleted.");
      setDeletingExpense(null);
      await loadData();
    } catch {
      setLoadError("Could not delete this expense.");
      setDeletingExpense(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Expenses"
        description="Track business expenses and operating costs."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Add Expense
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Total Expenses"
          value={formatCurrency(totalExpenses, currencyCode)}
          icon={<Receipt className="h-5 w-5" />}
          accent="brand"
        />
        <MetricCard
          label="This Month"
          value={formatCurrency(thisMonthTotal, currencyCode)}
          icon={<Receipt className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="max-w-xs">
        <option value="all">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>

      {loadError && (
        <EmptyState
          title="Something went wrong"
          description={loadError}
          action={<Button variant="secondary" size="sm" onClick={loadData}>Try again</Button>}
        />
      )}

      {!loadError && (
        <Table>
          <TableHead>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Description</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Payment Method</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
            <TableHeaderCell>Reference</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableHead>
          <TableBody>
            <TableState
              colSpan={7}
              isLoading={isLoading}
              isEmpty={!isLoading && filteredExpenses.length === 0}
              emptyTitle={expenses.length === 0 ? "No expenses yet" : "No expenses match this filter"}
              emptyDescription={
                expenses.length === 0
                  ? "Start tracking your business expenses to understand your real business performance."
                  : "Try a different category."
              }
              loadingLabel="Loading expenses..."
            />
            {!isLoading && filteredExpenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.expense_date}</TableCell>
                <TableCell className="font-medium text-ink-800">{expense.description}</TableCell>
                <TableCell>{expense.category?.name ?? "—"}</TableCell>
                <TableCell className="capitalize">{expense.payment_method.replace("_", " ")}</TableCell>
                <TableCell className="font-medium text-ink-800">
                  {formatCurrency(expense.amount, currencyCode)}
                </TableCell>
                <TableCell>{expense.reference_number ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openEditModal(expense)}
                      aria-label={`Edit ${expense.description}`}
                      className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingExpense(expense)}
                      aria-label={`Delete ${expense.description}`}
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

      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
        expense={editingExpense}
      />

      {deletingExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => !isDeleting && setDeletingExpense(null)}
          role="presentation"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-xl bg-white p-5 shadow-elevated">
            <h2 className="text-base font-semibold text-ink-800">Delete expense?</h2>
            <p className="mt-1 text-sm text-ink-500">
              "{deletingExpense.description}" will be permanently removed.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeletingExpense(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}