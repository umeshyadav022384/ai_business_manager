import { Pencil, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import type { SaleDto } from "../../api/sales";
import { formatCurrency } from "../../lib/currency";

interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleDto | null;
  currencyCode: string;
  onEdit: () => void;
  onDelete: () => void;
}

export default function SaleDetailModal({
  isOpen,
  onClose,
  sale,
  currencyCode,
  onEdit,
  onDelete,
}: SaleDetailModalProps) {
  if (!sale) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sale Details"
      className="max-w-xl"
      footer={
        <>
          <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>
            Cancel Sale
          </Button>
          <Button variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={onEdit}>
            Edit
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-ink-400">Customer</p>
            <p className="font-medium text-ink-800">{sale.customer?.name ?? "Walk-in customer"}</p>
          </div>
          <div>
            <p className="text-ink-400">Date</p>
            <p className="font-medium text-ink-800">{sale.sale_date}</p>
          </div>
          <div>
            <p className="text-ink-400">Invoice Number</p>
            <p className="font-medium text-ink-800">{sale.invoice_number ?? "—"}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Items
          </p>
          <div className="overflow-hidden rounded-lg border border-ink-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50/60 text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit Price</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id} className="border-t border-ink-100">
                    <td className="px-3 py-2">
                      {item.product_name}
                      {item.variant_label && (
                        <span className="ml-1 text-xs text-ink-400">
                          ({item.variant_label})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{formatCurrency(item.unit_price, currencyCode)}</td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(item.total, currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-sm">
          <div className="flex w-56 justify-between text-ink-500">
            <span>Subtotal</span>
            <span>{formatCurrency(sale.subtotal, currencyCode)}</span>
          </div>
          <div className="flex w-56 justify-between text-ink-500">
            <span>Discount</span>
            <span>-{formatCurrency(sale.discount, currencyCode)}</span>
          </div>
          <div className="flex w-56 justify-between text-ink-500">
            <span>Tax</span>
            <span>+{formatCurrency(sale.tax, currencyCode)}</span>
          </div>
          <div className="flex w-56 justify-between border-t border-ink-100 pt-1 text-base font-semibold text-ink-900">
            <span>Total</span>
            <span>{formatCurrency(sale.total, currencyCode)}</span>
          </div>
          <div className="flex w-56 justify-between text-sm text-success-700">
            <span>Profit</span>
            <span>{formatCurrency(sale.total_profit, currencyCode)}</span>
          </div>
        </div>

        {sale.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Notes</p>
            <p className="mt-1 text-sm text-ink-600">{sale.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}