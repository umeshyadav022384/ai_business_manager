import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listSuppliers, getSupplierLedger, recordSupplierPayment } from "../api/suppliers";
import type { SupplierDto, SupplierLedgerDto } from "../api/suppliers";
import { formatCurrency } from "../lib/currency";
import Button from "../components/ui/Button";
import Card, { CardBody, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import RecordPaymentModal from "../components/shared/RecordPaymentModal";

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentBusiness } = useAuth();
  const currencyCode = currentBusiness?.currency ?? "NPR";

  const [supplier, setSupplier] = useState<SupplierDto | null>(null);
  const [ledger, setLedger] = useState<SupplierLedgerDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadData() {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [suppliers, ledgerData] = await Promise.all([listSuppliers(), getSupplierLedger(id)]);
      setSupplier(suppliers.find((s) => s.id === id) ?? null);
      setLedger(ledgerData);
    } catch {
      setError("Could not load this supplier.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  if (isLoading) return <Loading label="Loading supplier..." />;
  if (error || !supplier || !ledger) {
    return (
      <EmptyState
        title="Something went wrong"
        description={error ?? "Supplier not found."}
        action={
          <Link to="/supplier-payables">
            <Button variant="secondary" size="sm">Back to Supplier Payables</Button>
          </Link>
        }
      />
    );
  }

  const balance = Number(ledger.balance.balance);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/supplier-payables" className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700">
        <ArrowLeft className="h-4 w-4" /> Back to Supplier Payables
      </Link>

      {successMessage && (
        <div className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700">{successMessage}</div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{supplier.name}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {supplier.phone ?? "No phone"}{supplier.email ? ` · ${supplier.email}` : ""}
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setIsPaymentModalOpen(true)}
          disabled={balance <= 0}
        >
          Record Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm text-ink-500">Total Purchases</p>
            <p className="mt-1 text-xl font-semibold text-ink-900">
              {formatCurrency(ledger.balance.total_purchases, currencyCode)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-ink-500">Total Paid</p>
            <p className="mt-1 text-xl font-semibold text-ink-900">
              {formatCurrency(ledger.balance.total_paid, currencyCode)}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-ink-500">Total Payable</p>
            <p className={`mt-1 text-xl font-semibold ${balance > 0 ? "text-danger-600" : "text-success-700"}`}>
              {formatCurrency(balance, currencyCode)}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-ink-800">Transaction History</h2>
        </CardHeader>
        <CardBody>
          {ledger.entries.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Purchases and payments for this supplier will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-ink-400">
                  <tr>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Reference</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Paid</th>
                    <th className="py-2">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.entries.map((entry, i) => (
                    <tr key={i} className="border-t border-ink-100">
                      <td className="py-2 pr-3">{entry.date}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={entry.type === "payment" ? "success" : "brand"}>
                          {entry.type === "payment" ? "Payment" : "Purchase"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">{entry.reference ?? "—"}</td>
                      <td className="py-2 pr-3">{formatCurrency(entry.amount, currencyCode)}</td>
                      <td className="py-2 pr-3">
                        {entry.paid !== null ? formatCurrency(entry.paid, currencyCode) : "—"}
                      </td>
                      <td className="py-2">
                        {entry.due !== null ? formatCurrency(entry.due, currencyCode) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        currentBalance={balance}
        currencyCode={currencyCode}
        title={`Record Payment — ${supplier.name}`}
        onSubmit={async (payload) => {
          await recordSupplierPayment(supplier.id, payload);
          setSuccessMessage("Payment recorded successfully.");
          await loadData();
        }}
      />
    </div>
  );
}