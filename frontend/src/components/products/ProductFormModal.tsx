import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import {
  addVariant,
  createProduct,
  deleteVariant,
  updateProduct,
  updateVariant,
} from "../../api/products";
import type { ProductDto } from "../../api/products";

interface VariantRow {
  /** Present for a variant that already exists in the database (edit
   * mode); absent for a row the user just added in this session. */
  id?: string;
  size: string;
  color: string;
  stock_quantity: number;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  businessType: string | undefined;
  /** Pass an existing product to edit it; omit/undefined to create a
   * new one. */
  product?: ProductDto;
}

function blankVariantRow(): VariantRow {
  return { size: "", color: "", stock_quantity: 0 };
}

/**
 * One modal for both create and edit — the fields are identical
 * either way, only the submit behavior differs (createProduct vs.
 * updateProduct + reconciling variant rows against the backend's
 * per-variant endpoints).
 */
export default function ProductFormModal({
  isOpen,
  onClose,
  onSaved,
  businessType,
  product,
}: ProductFormModalProps) {
  const isEditMode = Boolean(product);
  const isClothing = businessType === "clothing";

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [variantRows, setVariantRows] = useState<VariantRow[]>([blankVariantRow()]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Re-seed the form whenever the modal opens, for either a fresh
  // create or a specific product's current values.
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setDeletedVariantIds([]);

    if (product) {
      setName(product.name);
      setCategory(product.category ?? "");
      setBrand(product.brand ?? "");
      setUnit(product.unit ?? "");
      setExpiryDate(product.expiry_date ?? "");
      setPurchasePrice(product.purchase_price);
      setSellingPrice(product.selling_price);
      setReorderLevel(product.reorder_level?.toString() ?? "");
      setVariantRows(
        product.variants.length > 0
          ? product.variants.map((v) => ({
              id: v.id,
              size: v.size ?? "",
              color: v.color ?? "",
              stock_quantity: v.stock_quantity,
            }))
          : [blankVariantRow()]
      );
    } else {
      setName("");
      setCategory("");
      setBrand("");
      setUnit("");
      setExpiryDate("");
      setPurchasePrice("");
      setSellingPrice("");
      setReorderLevel("");
      setVariantRows([blankVariantRow()]);
    }
  }, [isOpen, product]);

  function updateVariantRow(index: number, field: keyof VariantRow, value: string) {
    setVariantRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, [field]: field === "stock_quantity" ? Number(value) : value }
          : row
      )
    );
  }

  function addVariantRow() {
    setVariantRows((prev) => [...prev, blankVariantRow()]);
  }

  function removeVariantRow(index: number) {
    const row = variantRows[index];
    if (row.id) {
      setDeletedVariantIds((prev) => [...prev, row.id!]);
    }
    setVariantRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const corePayload = {
      name,
      category: category || null,
      brand: brand || null,
      unit: isClothing ? null : unit || null,
      expiry_date: isClothing ? null : expiryDate || null,
      purchase_price: Number(purchasePrice),
      selling_price: Number(sellingPrice),
      reorder_level: reorderLevel ? Number(reorderLevel) : null,
    };

    try {
      if (isEditMode && product) {
        await updateProduct(product.id, corePayload);

        for (const variantId of deletedVariantIds) {
          await deleteVariant(variantId);
        }
        for (const row of variantRows) {
          if (row.id) {
            await updateVariant(row.id, {
              size: isClothing ? row.size || null : null,
              color: isClothing ? row.color || null : null,
              stock_quantity: row.stock_quantity,
            });
          } else if (!isClothing || row.size || row.color) {
            await addVariant(product.id, {
              size: isClothing ? row.size || null : null,
              color: isClothing ? row.color || null : null,
              stock_quantity: row.stock_quantity,
            });
          }
        }
        onSaved(`"${name}" was updated.`);
      } else {
        await createProduct({
          ...corePayload,
          variants: isClothing
            ? variantRows
                .filter((row) => row.size || row.color)
                .map((row) => ({
                  size: row.size || null,
                  color: row.color || null,
                  stock_quantity: row.stock_quantity,
                }))
            : [{ stock_quantity: variantRows[0]?.stock_quantity ?? 0 }],
        });
        onSaved(`"${name}" was added.`);
      }
      onClose();
    } catch {
      setError("Could not save this product. Please check the values and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Product" : "Add Product"}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" isLoading={isSubmitting}>
            {isEditMode ? "Save Changes" : "Add Product"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {error}
          </p>
        )}

        <Input
          label="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Basmati Rice 5kg"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Grains"
          />
          <Input
            label="Brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Kohinoor"
          />
        </div>

        {!isClothing && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="kg, packet, liter..."
              helperText="How this product is measured or sold"
            />
            <Input
              label="Expiry Date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Purchase Price"
            type="number"
            step="0.01"
            min="0"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            required
          />
          <Input
            label="Selling Price"
            type="number"
            step="0.01"
            min="0"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            required
          />
        </div>

        <Input
          label="Reorder Level"
          type="number"
          min="0"
          value={reorderLevel}
          onChange={(e) => setReorderLevel(e.target.value)}
          helperText="You'll be flagged as low stock at or below this quantity"
        />

        {isClothing ? (
          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">
              Variants (size / color / stock)
            </p>
            <div className="space-y-2">
              {variantRows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    placeholder="Size"
                    value={row.size}
                    onChange={(e) => updateVariantRow(index, "size", e.target.value)}
                    className="h-9 w-24 rounded-lg border border-ink-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  />
                  <input
                    placeholder="Color"
                    value={row.color}
                    onChange={(e) => updateVariantRow(index, "color", e.target.value)}
                    className="h-9 flex-1 rounded-lg border border-ink-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Stock"
                    value={row.stock_quantity}
                    onChange={(e) =>
                      updateVariantRow(index, "stock_quantity", e.target.value)
                    }
                    className="h-9 w-20 rounded-lg border border-ink-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariantRow(index)}
                    aria-label="Remove variant"
                    className="rounded-md p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={addVariantRow}
              className="mt-2"
            >
              Add variant
            </Button>
          </div>
        ) : (
          <Input
            label="Stock Quantity"
            type="number"
            min="0"
            value={variantRows[0]?.stock_quantity ?? 0}
            onChange={(e) => updateVariantRow(0, "stock_quantity", e.target.value)}
          />
        )}
      </form>
    </Modal>
  );
}