import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, Truck, Eye } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listSuppliers, getSupplierBalance, recordSupplierPayment } from "../api/suppliers";
import type { SupplierDto, SupplierBalanceDto } from "../api/suppliers";
import { formatCurrency } from "../lib/currency";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import MetricCard from "../components/ui/MetricCard";
import RecordPaymentModal from "../components/shared/RecordPaymentModal";
import {
  default as Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell, TableState,
} from "../components/ui/Table";

interface SupplierWithBalance {
  supplier: SupplierDto;
  balance: SupplierBalanceDto;
}

function statusFor(balance: SupplierBalanceDto): "paid" | "payable" {
  return Number(balance.balance) <= 0 ? "paid" : "payable";
}

const STATUS_LABEL: Record<string, string> = { paid: "Paid", payable: "Payable" };
const STATUS_VARIANT: Record<string, "success" | "danger"> = { paid: "success", payable: "danger" };

export default function SupplierPayablesPage() {
  const { currentBusiness } = useAuth();
  const currencyCode = currentBusiness?.currency ?? "NPR";

  const [rows, setRows] = useState<SupplierWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [payingSupplier, setPayingSupplier] = useState<SupplierWithBalance | null>(null);

  async function loadData() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const suppliers = await listSuppliers();
      const balances = await Promise.all(suppliers.map((s) => getSupplierBalance(s.id)));
      setRows(suppliers.map((supplier, i) => ({ supplier, balance: balances[i] })));
    } catch {
      setLoadError("Could not load supplier balances. Check your connection and try again.");
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

  const totalPayables = useMemo(
    () => rows.reduce((sum, r) => sum + Math.max(0, Number(r.balance.balance)), 0),
    [rows]
  );
  const suppliersWithDue = useMemo(
    () => rows.filter((r) => Number(r.balance.balance) > 0).length,
    [rows]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Supplier Payables" description="Money your business currently owes to suppliers." />

      {successMessage && (
        <div className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700">{successMessage}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Total Supplier Payables"
          value={formatCurrency(totalPayables, currencyCode)}
          icon={<Wallet className="h-5 w-5" />}
          accent="danger"
        />
        <MetricCard
          label="Suppliers With Due"
          value={suppliersWithDue.toString()}
          icon={<Truck className="h-5 w-5" />}
          accent="warning"
        />
      </div>

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
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell>Total Purchases</TableHeaderCell>
            <TableHeaderCell>Total Paid</TableHeaderCell>
            <TableHeaderCell>Balance Due</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableHead>
          <TableBody>
            <TableState
              colSpan={6}
              isLoading={isLoading}
              isEmpty={!isLoading && rows.length === 0}
              emptyTitle="No suppliers yet"
              emptyDescription="Add suppliers to track purchases and payables."
              loadingLabel="Loading balances..."
            />
            {!isLoading && rows.map(({ supplier, balance }) => {
              const status = statusFor(balance);
              return (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium text-ink-800">{supplier.name}</TableCell>
                  <TableCell>{formatCurrency(balance.total_purchases, currencyCode)}</TableCell>
                  <TableCell>{formatCurrency(balance.total_paid, currencyCode)}</TableCell>
                  <TableCell className="font-medium text-ink-800">
                    {formatCurrency(balance.balance, currencyCode)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Link to={`/suppliers/${supplier.id}`}>
                        <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                          View Ledger
                        </Button>
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={Number(balance.balance) <= 0}
                        onClick={() => setPayingSupplier({ supplier, balance })}
                      >
                        Record Payment
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {payingSupplier && (
        <RecordPaymentModal
          isOpen={Boolean(payingSupplier)}
          onClose={() => setPayingSupplier(null)}
          currentBalance={Number(payingSupplier.balance.balance)}
          currencyCode={currencyCode}
          title={`Record Payment — ${payingSupplier.supplier.name}`}
          onSubmit={async (payload) => {
            await recordSupplierPayment(payingSupplier.supplier.id, payload);
            setSuccessMessage(`Payment recorded for ${payingSupplier.supplier.name}.`);
            await loadData();
          }}
        />
      )}
    </div>
  );
}