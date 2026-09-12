import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HandCoins, Users, Eye } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listCustomers, getCustomerBalance } from "../api/customers";
import type { CustomerDto, CustomerBalanceDto } from "../api/customers";
import { recordCustomerPayment } from "../api/customers";
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

interface CustomerWithBalance {
  customer: CustomerDto;
  balance: CustomerBalanceDto;
}

function statusFor(balance: CustomerBalanceDto): "paid" | "partial" | "due" {
  const outstanding = Number(balance.balance);
  if (outstanding <= 0) return "paid";
  if (Number(balance.total_paid) > 0) return "partial";
  return "due";
}

const STATUS_LABEL: Record<string, string> = { paid: "Paid", partial: "Partial", due: "Due" };
const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  paid: "success",
  partial: "warning",
  due: "danger",
};

export default function CustomerUdhaarPage() {
  const { currentBusiness } = useAuth();
  const currencyCode = currentBusiness?.currency ?? "NPR";

  const [rows, setRows] = useState<CustomerWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [payingCustomer, setPayingCustomer] = useState<CustomerWithBalance | null>(null);

  async function loadData() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const customers = await listCustomers();
      const balances = await Promise.all(customers.map((c) => getCustomerBalance(c.id)));
      setRows(customers.map((customer, i) => ({ customer, balance: balances[i] })));
    } catch {
      setLoadError("Could not load customer balances. Check your connection and try again.");
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

  const totalUdhaar = useMemo(
    () => rows.reduce((sum, r) => sum + Math.max(0, Number(r.balance.balance)), 0),
    [rows]
  );
  const customersWithDue = useMemo(
    () => rows.filter((r) => Number(r.balance.balance) > 0).length,
    [rows]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Customer Udhaar" description="Customers who currently owe your business money." />

      {successMessage && (
        <div className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700">{successMessage}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Total Customer Udhaar"
          value={formatCurrency(totalUdhaar, currencyCode)}
          icon={<HandCoins className="h-5 w-5" />}
          accent="danger"
        />
        <MetricCard
          label="Customers With Due"
          value={customersWithDue.toString()}
          icon={<Users className="h-5 w-5" />}
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
            <TableHeaderCell>Customer</TableHeaderCell>
            <TableHeaderCell>Total Sales</TableHeaderCell>
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
              emptyTitle="No customers yet"
              emptyDescription="Add customers to track sales and Udhaar."
              loadingLabel="Loading balances..."
            />
            {!isLoading && rows.map(({ customer, balance }) => {
              const status = statusFor(balance);
              return (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium text-ink-800">{customer.name}</TableCell>
                  <TableCell>{formatCurrency(balance.total_sales, currencyCode)}</TableCell>
                  <TableCell>{formatCurrency(balance.total_paid, currencyCode)}</TableCell>
                  <TableCell className="font-medium text-ink-800">
                    {formatCurrency(balance.balance, currencyCode)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Link to={`/customer-udhaar/${customer.id}`}>
                        <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                          View Ledger
                        </Button>
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={Number(balance.balance) <= 0}
                        onClick={() => setPayingCustomer({ customer, balance })}
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

      {payingCustomer && (
        <RecordPaymentModal
          isOpen={Boolean(payingCustomer)}
          onClose={() => setPayingCustomer(null)}
          currentBalance={Number(payingCustomer.balance.balance)}
          currencyCode={currencyCode}
          title={`Record Payment — ${payingCustomer.customer.name}`}
          onSubmit={async (payload) => {
            await recordCustomerPayment(payingCustomer.customer.id, payload);
            setSuccessMessage(`Payment recorded for ${payingCustomer.customer.name}.`);
            await loadData();
          }}
        />
      )}
    </div>
  );
}