import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { deleteProduct, listProducts } from "../api/products";
import type { ProductDto } from "../api/products";
import { getStockStatus, getTotalStock, STOCK_STATUS_LABEL } from "../lib/stock";
import type { StockStatus } from "../lib/stock";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import ProductFormModal from "../components/products/ProductFormModal";
import {
  default as Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableState,
} from "../components/ui/Table";

const STATUS_BADGE_VARIANT: Record<StockStatus, "success" | "warning" | "danger"> = {
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "danger",
};

export default function ProductsPage() {
  const { currentBusiness } = useAuth();
  const isClothing = currentBusiness?.business_type === "clothing";

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | undefined>(undefined);
  const [deletingProduct, setDeletingProduct] = useState<ProductDto | null>(null);

  async function loadProducts() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listProducts();
      setProducts(data);
    } catch {
      setLoadError("Could not load products. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        search.trim() === "" ||
        p.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        (p.brand ?? "").toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  function openCreateModal() {
    setEditingProduct(undefined);
    setIsModalOpen(true);
  }

  function openEditModal(product: ProductDto) {
    setEditingProduct(product);
    setIsModalOpen(true);
  }

  function handleSaved(message: string) {
    setSuccessMessage(message);
    loadProducts();
  }

  async function confirmDelete() {
    if (!deletingProduct) return;
    try {
      await deleteProduct(deletingProduct.id);
      setSuccessMessage(`"${deletingProduct.name}" was deleted.`);
      setDeletingProduct(null);
      await loadProducts();
    } catch {
      setLoadError("Could not delete this product.");
      setDeletingProduct(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Products</h1>
          <p className="text-sm text-ink-500">
            {currentBusiness
              ? `${currentBusiness.name} · ${currentBusiness.business_type}`
              : "Manage your inventory"}
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
          Add Product
        </Button>
      </div>

      {successMessage && (
        <div className="flex items-center justify-between rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700">
          {successMessage}
          <button onClick={() => setSuccessMessage(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or brand..."
            className="pl-9"
          />
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="sm:w-56"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {loadError && (
        <EmptyState
          title="Something went wrong"
          description={loadError}
          action={
            <Button variant="secondary" size="sm" onClick={loadProducts}>
              Try again
            </Button>
          }
        />
      )}

      {!loadError && (
        <Table>
          <TableHead>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            {isClothing && <TableHeaderCell>Variants</TableHeaderCell>}
            <TableHeaderCell>Price</TableHeaderCell>
            <TableHeaderCell>Stock</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableHead>
          <TableBody>
            <TableState
              colSpan={isClothing ? 7 : 6}
              isLoading={isLoading}
              isEmpty={!isLoading && filteredProducts.length === 0}
              emptyTitle={
                products.length === 0 ? "No products yet" : "No products match your filters"
              }
              emptyDescription={
                products.length === 0
                  ? "Add your first product to start tracking inventory."
                  : "Try a different search term or category."
              }
              loadingLabel="Loading products..."
            />
            {!isLoading &&
              filteredProducts.map((product) => {
                const totalStock = getTotalStock(product.variants);
                const status = getStockStatus(totalStock, product.reorder_level);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-100 text-ink-400">
                          <Package className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-medium text-ink-800">{product.name}</p>
                          {product.brand && (
                            <p className="text-xs text-ink-400">{product.brand}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.category ?? "—"}</TableCell>
                    {isClothing && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {product.variants.map((v) => (
                            <Badge key={v.id} variant="neutral">
                              {[v.size, v.color].filter(Boolean).join(" / ") || "Default"}:{" "}
                              {v.stock_quantity}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>Rs. {product.selling_price}</TableCell>
                    <TableCell>{totalStock}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[status]}>
                        {STOCK_STATUS_LABEL[status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEditModal(product)}
                          aria-label={`Edit ${product.name}`}
                          className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(product)}
                          aria-label={`Delete ${product.name}`}
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

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
        businessType={currentBusiness?.business_type}
        product={editingProduct}
      />

      {deletingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => setDeletingProduct(null)}
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-elevated"
          >
            <h2 className="text-base font-semibold text-ink-800">Delete product?</h2>
            <p className="mt-1 text-sm text-ink-500">
              This will permanently delete "{deletingProduct.name}" and all of its
              variants. This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeletingProduct(null)}>
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