import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { listProducts } from "../../api/products";
import type { ProductDto } from "../../api/products";
import { listSuppliers } from "../../api/suppliers";
import type { SupplierDto } from "../../api/suppliers";
import { createPurchase, updatePurchase } from "../../api/purchases";
import type { PurchaseDto, PurchaseItemCreatePayload } from "../../api/purchases";
import { formatCurrency } from "../../lib/currency";

interface ItemRow {
  productId: string;
  variantId: string;
  quantity: string;
  unitCost: string;
}

interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  currencyCode: string;
  purchase?: PurchaseDto;
}

function blankRow(): ItemRow {
  return { productId: "", variantId: "", quantity: "1", unitCost: "" };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PurchaseFormModal({
  isOpen,
  onClose,
  onSaved,
  currencyCode,
  purchase,
}: PurchaseFormModalProps) {
  const isEditMode = Boolean(purchase);

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIsoDate());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [items, setItems] = useState<ItemRow[]>([blankRow()]);
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsLoadingOptions(true);
    Promise.all([listProducts(), listSuppliers()])
      .then(([productData, supplierData]) => {
        setProducts(productData);
        setSuppliers(supplierData);
      })
      .catch(() => setError("Could not load products/suppliers for this form."))
      .finally(() => setIsLoadingOptions(false));

    if (purchase) {
      setSupplierId(purchase.supplier?.id ?? "");
      setPurchaseDate(purchase.purchase_date);
      setInvoiceNumber(purchase.invoice_number ?? "");
      setNotes(purchase.notes ?? "");
      setDiscount(purchase.discount);
      setTax(purchase.tax);
      setItems(
        purchase.items.map((item) => ({
          productId: item.product_id,
          variantId: item.product_variant_id ?? "",
          quantity: item.quantity.toString(),
          unitCost: item.unit_cost,
        }))
      );
    } else {
      setSupplierId("");
      setPurchaseDate(todayIsoDate());
      setInvoiceNumber("");
      setNotes("");
      setDiscount("0");
      setTax("0");
      setItems([blankRow()]);
    }
    setProductSearch({});
  }, [isOpen, purchase]);

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

  function lineTotal(row: ItemRow): number {
    const quantity = Number(row.quantity);
    const unitCost = Number(row.unitCost);
    if (Number.isNaN(quantity) || Number.isNaN(unitCost)) return 0;
    return quantity * unitCost;
  }

  const subtotal = useMemo(() => items.reduce((sum, row) => sum + lineTotal(row), 0), [items]);
  const total = useMemo(() => {
    const discountValue = Number(discount) || 0;
    const taxValue = Number(tax) || 0;
    return subtotal - discountValue + taxValue;
  }, [subtotal, discount, tax]);

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
      if (row.unitCost === "" || Number(row.unitCost) < 0) {
        return "Unit cost must be zero or more for every item.";
      }
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

    const itemPayloads: PurchaseItemCreatePayload[] = items.map((row) => ({
      product_id: row.productId,
      product_variant_id: row.variantId || null,
      quantity: Number(row.quantity),
      unit_cost: Number(row.unitCost),
    }));

    const payload = {
      supplier_id: supplierId || null,
      purchase_date: purchaseDate,
      invoice_number: invoiceNumber || null,
      notes: notes || null,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      items: itemPayloads,
    };

    try {
      if (isEditMode && purchase) {
        await updatePurchase(purchase.id, payload);
        onSaved("Purchase was updated.");
      } else {
        await createPurchase(payload);
        onSaved("Purchase was added.");
      }
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      setError(detail ?? "Could not save this purchase. Please check the values and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Purchase" : "New Purchase"}
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="purchase-form" isLoading={isSubmitting}>
            {isEditMode ? "Save Changes" : "Save Purchase"}
          </Button>
        </>
      }
    >
      <form id="purchase-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input
            label="Purchase Date"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
          />
        </div>

        <Input
          label="Invoice Number"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          placeholder="e.g. INV-001"
        />

        <div className="space-y-3 border-t border-ink-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Purchase Items
          </p>

          {isLoadingOptions ? (
            <p className="text-sm text-ink-400">Loading products...</p>
          ) : (
            <div className="space-y-3">
              {items.map((row, index) => {
                const product = getProduct(row.productId);
                const needsVariant = product && product.variants.length > 1;
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
                                {[v.size, v.color].filter(Boolean).join(" / ") || "Default"}
                              </option>
                            ))}
                          </select>
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
                            placeholder="Unit Cost"
                            value={row.unitCost}
                            onChange={(e) => updateItem(index, "unitCost", e.target.value)}
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

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes about this purchase"
            className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </form>
    </Modal>
  );
}