import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateVariantStock,
} from "../api/products";
import type { ProductDto, ProductVariantCreatePayload } from "../api/products";

/**
 * Phase 3 minimal Products page. The create form doesn't branch into
 * "GroceryForm" vs "ClothingForm" components — it's one form that
 * shows a variants sub-section only when the current business is
 * clothing. Grocery submits with an empty variants array, and the
 * backend auto-creates the single default variant (see
 * services/product_service.py).
 */
export default function ProductsPage() {
  const { currentBusiness } = useAuth();
  const isClothing = currentBusiness?.business_type === "clothing";

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [variants, setVariants] = useState<ProductVariantCreatePayload[]>([
    { size: "", color: "", stock_quantity: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadProducts() {
    setIsLoading(true);
    try {
      const data = await listProducts();
      setProducts(data);
      setError(null);
    } catch {
      setError("Could not load products.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function updateVariantField(
    index: number,
    field: keyof ProductVariantCreatePayload,
    value: string,
  ) {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === index
          ? {
              ...v,
              [field]: field === "stock_quantity" ? Number(value) : value,
            }
          : v,
      ),
    );
  }

  function addVariantRow() {
    setVariants((prev) => [
      ...prev,
      { size: "", color: "", stock_quantity: 0 },
    ]);
  }

  function removeVariantRow(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await createProduct({
        name,
        category: category || null,
        brand: brand || null,
        unit: isClothing ? null : unit || null,
        purchase_price: Number(purchasePrice),
        selling_price: Number(sellingPrice),
        reorder_level: reorderLevel ? Number(reorderLevel) : null,
        variants: isClothing
          ? variants
              .filter((v) => v.size || v.color)
              .map((v) => ({
                size: v.size || null,
                color: v.color || null,
                stock_quantity: v.stock_quantity,
              }))
          : variants.map((v) => ({
              // ← Send the stock from the form!
              size: null,
              color: null,
              stock_quantity: v.stock_quantity,
            })),
      });
      setName("");
      setCategory("");
      setBrand("");
      setUnit("");
      setPurchasePrice("");
      setSellingPrice("");
      setReorderLevel("");
      setVariants([{ size: "", color: "", stock_quantity: 0 }]);
      await loadProducts();
    } catch {
      setError("Could not create product. Check the form values.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(productId: string) {
    try {
      await deleteProduct(productId);
      await loadProducts();
    } catch {
      setError("Could not delete product.");
    }
  }

  async function handleStockChange(variantId: string, newValue: string) {
    const quantity = Number(newValue);
    if (Number.isNaN(quantity) || quantity < 0) return;
    try {
      await updateVariantStock(variantId, quantity);
      await loadProducts();
    } catch {
      setError("Could not update stock.");
    }
  }

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "sans-serif",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <p>
        <Link to="/">&larr; Back to dashboard</Link>
      </p>
      <h1>Products</h1>
      {currentBusiness && (
        <p style={{ color: "#555" }}>
          {currentBusiness.name} ({currentBusiness.business_type})
        </p>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Add a Product</h2>
      <form onSubmit={handleCreate} style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "0.4rem" }}
            />
          </label>
          <label>
            Category
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ display: "block", width: "100%", padding: "0.4rem" }}
            />
          </label>
          <label>
            Brand
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              style={{ display: "block", width: "100%", padding: "0.4rem" }}
            />
          </label>
          {!isClothing && (
            <label>
              Unit (kg, packet, liter...)
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.4rem" }}
              />
            </label>
          )}
          <label>
            Purchase Price
            <input
              type="number"
              step="0.01"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "0.4rem" }}
            />
          </label>
          <label>
            Selling Price
            <input
              type="number"
              step="0.01"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "0.4rem" }}
            />
          </label>
          <label>
            Reorder Level
            <input
              type="number"
              min="0"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              style={{ display: "block", width: "100%", padding: "0.4rem" }}
            />
          </label>
          {!isClothing && (
            <label>
              Initial Stock
              <input
                type="number"
                min="0"
                value={variants[0]?.stock_quantity ?? 0}
                onChange={(e) =>
                  updateVariantField(0, "stock_quantity", e.target.value)
                }
                style={{ display: "block", width: "100%", padding: "0.4rem" }}
              />
            </label>
          )}
        </div>

        {isClothing && (
          <div style={{ marginTop: "1rem" }}>
            <h3 style={{ marginBottom: "0.5rem" }}>
              Variants (size / color / stock)
            </h3>
            {variants.map((variant, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <input
                  placeholder="Size (e.g. S, M, L)"
                  value={variant.size ?? ""}
                  onChange={(e) =>
                    updateVariantField(index, "size", e.target.value)
                  }
                  style={{ padding: "0.4rem", flex: 1 }}
                />
                <input
                  placeholder="Color"
                  value={variant.color ?? ""}
                  onChange={(e) =>
                    updateVariantField(index, "color", e.target.value)
                  }
                  style={{ padding: "0.4rem", flex: 1 }}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Stock"
                  value={variant.stock_quantity}
                  onChange={(e) =>
                    updateVariantField(index, "stock_quantity", e.target.value)
                  }
                  style={{ padding: "0.4rem", width: 100 }}
                />
                {variants.length > 1 && (
                  <button type="button" onClick={() => removeVariantRow(index)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addVariantRow}>
              + Add another variant
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ marginTop: "1rem" }}
        >
          {isSubmitting ? "Saving..." : "Add Product"}
        </button>
      </form>

      <h2>Existing Products</h2>
      {isLoading && <p>Loading...</p>}
      {!isLoading && products.length === 0 && <p>No products yet.</p>}

      {products.map((product) => (
        <div
          key={product.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 6,
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
            }}
          >
            <div>
              <strong>{product.name}</strong>{" "}
              {product.category && (
                <span style={{ color: "#777" }}>({product.category})</span>
              )}
              <div style={{ color: "#555", fontSize: "0.9rem" }}>
                Purchase: {product.purchase_price} &middot; Sell:{" "}
                {product.selling_price}
                {product.reorder_level !== null && (
                  <> &middot; Reorder at: {product.reorder_level}</>
                )}
              </div>
            </div>
            <button onClick={() => handleDelete(product.id)}>Delete</button>
          </div>

          <table
            style={{
              width: "100%",
              marginTop: "0.75rem",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                {isClothing && <th>Size</th>}
                {isClothing && <th>Color</th>}
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <tr
                  key={variant.id}
                  style={{ borderBottom: "1px solid #f5f5f5" }}
                >
                  {isClothing && <td>{variant.size ?? "-"}</td>}
                  {isClothing && <td>{variant.color ?? "-"}</td>}
                  <td>
                    <input
                      type="number"
                      min="0"
                      defaultValue={variant.stock_quantity}
                      onBlur={(e) =>
                        handleStockChange(variant.id, e.target.value)
                      }
                      style={{ width: 80, padding: "0.2rem" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
