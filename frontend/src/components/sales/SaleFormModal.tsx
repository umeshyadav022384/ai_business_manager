import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { listProducts } from "../../api/products";
import type { ProductDto } from "../../api/products";
import { listCustomers } from "../../api/customers";
import type { CustomerDto } from "../../api/customers";
import { createSale, updateSale } from "../../api/sales";
import type { SaleDto, SaleItemCreatePayload } from "../../api/sales";
import { formatCurrency } from "../../lib/currency";

interface ItemRow {
  productId: string;
  variantId: string;
  quantity: string;
  unitPrice: string;
}

interface SaleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  currencyCode: string;
  sale?: SaleDto;
}

type PaymentStatus = "paid" | "partial" | "due";

function blankRow(): ItemRow {
  return { productId: "", variantId: "", quantity: "1", unitPrice: "" };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  due: "Due",
};

const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  paid: "text-success-700",
  partial: "text-warning-600",
  due: "text-danger-600",
};

export default function SaleFormModal({
  isOpen,
  onClose,
  onSaved,
  currencyCode,
  sale,
}: SaleFormModalProps) {
  const isEditMode = Boolean(sale);

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const [customerId, setCustomerId] = useState("");
  const [saleDate, setSaleDate] = useState(todayIsoDate());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [items, setItems] = useState<ItemRow[]>([blankRow()]);
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});

  // Amount paid is tracked separately from the computed total. On a
  // new sale it defaults to (and tracks) the total until the user
  // types into the field themselves — after that we stop overwriting
  // it. On an edit, it's seeded from the sale's existing amount_paid
  // and is never auto-reset to "fully paid" — only clamped down if a
  // later item edit makes the total smaller than what's already paid.
  const [amountPaid, setAmountPaid] = useState("0");
  const [amountPaidTouched, setAmountPaidTouched] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsLoadingOptions(true);
    Promise.all([listProducts(), listCustomers()])
      .then(([productData, customerData]) => {
        setProducts(productData);
        setCustomers(customerData);
      })
      .catch(() => setError("Could not load products/customers for this form."))
      .finally(() => setIsLoadingOptions(false));

    if (sale) {
      setCustomerId(sale.customer?.id ?? "");
      setSaleDate(sale.sale_date);
      setInvoiceNumber(sale.invoice_number ?? "");
      setNotes(sale.notes ?? "");
      setDiscount(sale.discount);
      setTax(sale.tax);
      setItems(
        sale.items.map((item) => ({
          productId: item.product_id,
          variantId: item.product_variant_id ?? "",
          quantity: item.quantity.toString(),
          unitPrice: item.unit_price,
        }))
      );
      // Seed from the existing sale's own payment record — never
      // silently reset an existing partial/due sale back to "paid".
      setAmountPaid(sale.amount_paid);
      setAmountPaidTouched(true);
    } else {
      setCustomerId("");
      setSaleDate(todayIsoDate());
      setInvoiceNumber("");
      setNotes("");
      setDiscount("0");
      setTax("0");
      setItems([blankRow()]);
      setAmountPaid("0");
      setAmountPaidTouched(false);
    }
    setProductSearch({});
  }, [isOpen, sale]);

  function updateItem(index: number, field: keyof ItemRow, value: string) {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (field === "productId") return { ...row, productId: value, variantId: "" };
        return { ...row, [field]: value };
      })
    );
  }

  function addItemRow() {
    setItems((prev) => [...prev, blankRow()]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function getProduct(productId: string): ProductDto | undefined {
    return products.find((p) => p.id === productId);
  }

  function getAvailableStock(row: ItemRow): number | null {
    const product = getProduct(row.productId);
    if (!product) return null;
    if (row.variantId) {
      const variant = product.variants.find((v) => v.id === row.variantId);
      return variant ? variant.stock_quantity : null;
    }
    if (product.variants.length === 1) return product.variants[0].stock_quantity;
    return null;
  }

  function lineTotal(row: ItemRow): number {
    const quantity = Number(row.quantity);
    const unitPrice = Number(row.unitPrice);
    if (Number.isNaN(quantity) || Number.isNaN(unitPrice)) return 0;
    return quantity * unitPrice;
  }

  const subtotal = useMemo(() => items.reduce((sum, row) => sum + lineTotal(row), 0), [items]);
  const total = useMemo(() => {
    const discountValue = Number(discount) || 0;
    const taxValue = Number(tax) || 0;
    return Math.max(0, subtotal - discountValue + taxValue);
  }, [subtotal, discount, tax]);

  // Keep amount paid in sync with the total: on a brand-new sale it
  // defaults to (and tracks) "fully paid" until the user edits it
  // directly. On any sale, if the total drops below what's already
  // entered as paid, clamp down — amount_paid can never exceed total —
  // but never bump it up on its own once the user has touched it or
  // we're editing an existing sale.
  useEffect(() => {
    const numericAmountPaid = Number(amountPaid) || 0;
    if (!isEditMode && !amountPaidTouched) {
      setAmountPaid(total.toFixed(2));
      return;
    }
    if (numericAmountPaid > total) {
      setAmountPaid(total.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  function handleAmountPaidChange(value: string) {
    setAmountPaidTouched(true);
    if (value === "") {
      setAmountPaid("");
      return;
    }
    const numericValue = Math.max(0, Math.min(Number(value) || 0, total));
    setAmountPaid(numericValue.toString());
  }

  const numericAmountPaid = Number(amountPaid) || 0;
  const balanceDue = Math.max(0, total - numericAmountPaid);
  const paymentStatus: PaymentStatus =
    balanceDue <= 0 && total > 0
      ? "paid"
      : numericAmountPaid > 0 && balanceDue > 0
        ? "partial"
        : "due";

  function validate(): string | null {
    if (items.length === 0) return "Add at least one item.";
    for (const row of items) {
      if (!row.productId) return "Every item needs a product selected.";
      const product = getProduct(row.productId);
      if (product && product.variants.length > 1 && !row.variantId) {
        return `Select a size/color for "${product.name}".`;
      }
      if (!row.quantity || Number(row.quantity) <= 0) {
        return "Quantity must be greater than zero for every item.";
      }
      if (row.unitPrice === "" || Number(row.unitPrice) < 0) {
        return "Unit price must be zero or more for every item.";
      }
      if (!isEditMode) {
        const available = getAvailableStock(row);
        if (available !== null && Number(row.quantity) > available) {
          return `Only ${available} units available for "${product?.name}".`;
        }
      }
    }
    if (amountPaid === "" || Number(amountPaid) < 0) {
      return "Amount paid cannot be negative.";
    }
    if (Number(amountPaid) > total) {
      return "Amount paid cannot exceed the sale total.";
    }
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

    const itemPayloads: SaleItemCreatePayload[] = items.map((row) => ({
      product_id: row.productId,
      product_variant_id: row.variantId || null,
      quantity: Number(row.quantity),
      unit_price: Number(row.unitPrice),
    }));

    const payload = {
      customer_id: customerId || null,
      sale_date: saleDate,
      invoice_number: invoiceNumber || null,
      notes: notes || null,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      amount_paid: Number(amountPaid) || 0,
      items: itemPayloads,
    };

    try {
      if (isEditMode && sale) {
        await updateSale(sale.id, payload);
        onSaved("Sale was updated.");
      } else {
        await createSale(payload);
        onSaved("Sale was recorded.");
      }
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      setError(detail ?? "Could not save this sale. Please check the values and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Sale" : "New Sale"}
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="sale-form" isLoading={isSubmitting}>
            {isEditMode ? "Save Changes" : "Save Sale"}
          </Button>
        </>
      }
    >
      <form id="sale-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Walk-in customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="Sale Date"
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            required
          />
        </div>

        <Input
          label="Invoice Number"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          placeholder="e.g. INV-001 (optional)"
        />

        <div className="space-y-3 border-t border-ink-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Sale Items
          </p>

          {isLoadingOptions ? (
            <p className="text-sm text-ink-400">Loading products...</p>
          ) : (
            <div className="space-y-3">
              {items.map((row, index) => {
                const product = getProduct(row.productId);
                const needsVariant = product && product.variants.length > 1;
                const available = getAvailableStock(row);
                const search = productSearch[index] ?? "";
                const filteredProducts = search
                  ? products.filter((p) =>
                      p.name.toLowerCase().includes(search.toLowerCase())
                    )
                  : products;

                return (
                  <div key={index} className="rounded-lg border border-ink-200 p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                          <input
                            value={product ? product.name : search}
                            onChange={(e) => {
                              setProductSearch((prev) => ({ ...prev, [index]: e.target.value }));
                              updateItem(index, "productId", "");
                            }}
                            placeholder="Search for a product..."
                            className="h-9 w-full rounded-lg border border-ink-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                          />
                          {!product && search && (
                            <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-ink-200 bg-white shadow-elevated">
                              {filteredProducts.length === 0 ? (
                                <p className="px-3 py-2 text-sm text-ink-400">No products found</p>
                              ) : (
                                filteredProducts.map((p) => (
                                  <button
                                    type="button"
                                    key={p.id}
                                    onClick={() => {
                                      updateItem(index, "productId", p.id);
                                      setProductSearch((prev) => ({ ...prev, [index]: "" }));
                                    }}
                                    className="block w-full px-3 py-2 text-left text-sm hover:bg-ink-50"
                                  >
                                    {p.name}
                                    <span className="ml-2 text-xs text-ink-400">
                                      {formatCurrency(p.selling_price, currencyCode)}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {needsVariant && (
                          <select
                            value={row.variantId}
                            onChange={(e) => updateItem(index, "variantId", e.target.value)}
                            className="h-9 w-full rounded-lg border border-ink-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                          >
                            <option value="">Select size/color...</option>
                            {product!.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {[v.size, v.color].filter(Boolean).join(" / ") || "Default"} — {v.stock_quantity} in stock
                              </option>
                            ))}
                          </select>
                        )}

                        {available !== null && (
                          <p
                            className={
                              Number(row.quantity) > available
                                ? "text-xs font-medium text-danger-600"
                                : "text-xs text-ink-400"
                            }
                          >
                            {Number(row.quantity) > available
                              ? `Only ${available} units available.`
                              : `${available} units available`}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={row.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            className="h-9 rounded-lg border border-ink-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Unit Price"
                            value={row.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                            className="h-9 rounded-lg border border-ink-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                          />
                        </div>
                      </div>

                      <div className="flex w-28 shrink-0 flex-col items-end gap-2 pt-1.5">
                        <p className="text-sm font-medium text-ink-800">
                          {formatCurrency(lineTotal(row), currencyCode)}
                        </p>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            aria-label="Remove item"
                            className="rounded-md p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={addItemRow}
          >
            Add Item
          </Button>
        </div>

        <div className="space-y-2 border-t border-ink-100 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Discount"
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
            <Input
              label="Tax"
              type="number"
              min="0"
              step="0.01"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
            />
          </div>

          <div className="flex flex-col items-end gap-1 pt-2 text-sm">
            <div className="flex w-48 justify-between text-ink-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, currencyCode)}</span>
            </div>
            <div className="flex w-48 justify-between text-base font-semibold text-ink-900">
              <span>Total</span>
              <span>{formatCurrency(total, currencyCode)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-ink-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Payment
          </p>

          <Input
            label="Amount Paid"
            type="number"
            min="0"
            max={total}
            step="0.01"
            value={amountPaid}
            onChange={(e) => handleAmountPaidChange(e.target.value)}
          />

          <div className="rounded-lg bg-ink-50 px-3 py-2 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Total</span>
              <span className="font-medium text-ink-800">{formatCurrency(total, currencyCode)}</span>
            </div>
            <div className="mt-1 flex justify-between text-ink-500">
              <span>Amount Paid</span>
              <span className="font-medium text-ink-800">
                {formatCurrency(numericAmountPaid, currencyCode)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-ink-500">
              <span>Balance Due</span>
              <span className="font-medium text-ink-800">
                {formatCurrency(balanceDue, currencyCode)}
              </span>
            </div>
            <div className="mt-1 flex justify-between border-t border-ink-200 pt-1 text-ink-500">
              <span>Payment Status</span>
              <span className={`font-medium ${PAYMENT_STATUS_CLASS[paymentStatus]}`}>
                {PAYMENT_STATUS_LABEL[paymentStatus]}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes about this sale"
            className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </form>
    </Modal>
  );
}