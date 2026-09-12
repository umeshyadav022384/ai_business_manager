import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { createExpense, updateExpense, createCategory } from "../../api/expenses";
import type { ExpenseDto, ExpenseCategoryDto } from "../../api/expenses";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  categories: ExpenseCategoryDto[];
  onCategoryCreated: (category: ExpenseCategoryDto) => void;
  expense?: ExpenseDto;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpenseFormModal({
  isOpen,
  onClose,
  onSaved,
  categories,
  onCategoryCreated,
  expense,
}: ExpenseFormModalProps) {
  const isEditMode = Boolean(expense);

  const [categoryId, setCategoryId] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayIsoDate());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsAddingCategory(false);
    setNewCategoryName("");
    setCategoryId(expense?.category?.id ?? "");
    setDescription(expense?.description ?? "");
    setAmount(expense?.amount ?? "");
    setExpenseDate(expense?.expense_date ?? todayIsoDate());
    setPaymentMethod(expense?.payment_method ?? "cash");
    setReferenceNumber(expense?.reference_number ?? "");
    setNotes(expense?.notes ?? "");
  }, [isOpen, expense]);

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    try {
      const category = await createCategory({ name: newCategoryName.trim() });
      onCategoryCreated(category);
      setCategoryId(category.id);
      setIsAddingCategory(false);
      setNewCategoryName("");
    } catch {
      setError("Could not create that category.");
    }
  }

  function validate(): string | null {
    if (!description.trim()) return "Description is required.";
    if (!amount || Number(amount) <= 0) return "Amount must be greater than zero.";
    if (!expenseDate) return "Expense date is required.";
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      category_id: categoryId || null,
      description,
      amount: Number(amount),
      expense_date: expenseDate,
      payment_method: paymentMethod,
      reference_number: referenceNumber || null,
      notes: notes || null,
    };

    try {
      if (isEditMode && expense) {
        await updateExpense(expense.id, payload);
        onSaved("Expense was updated.");
      } else {
        await createExpense(payload);
        onSaved("Expense was added.");
      }
      onClose();
    } catch {
      setError("Could not save this expense. Please check the values and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Expense" : "Add Expense"}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" isLoading={isSubmitting}>
            {isEditMode ? "Save Changes" : "Add Expense"}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>
        )}

        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Shop electricity bill"
          required
        />

        {isAddingCategory ? (
          <div className="flex items-end gap-2">
            <Input
              label="New Category Name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Electricity"
            />
            <Button type="button" variant="secondary" onClick={handleAddCategory}>
              Add
            </Button>
          </div>
        ) : (
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setIsAddingCategory(true);
              } else {
                setCategoryId(e.target.value);
              }
            }}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="__new__">+ Add new category...</option>
          </Select>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Input
            label="Expense Date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />
        </div>

        <Select label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="card">Card</option>
          <option value="digital_wallet">Digital Wallet</option>
          <option value="other">Other</option>
        </Select>

        <Input
          label="Reference Number"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Optional"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional"
            className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </form>
    </Modal>
  );
}