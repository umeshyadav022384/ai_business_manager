import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Receipt, HandCoins, Wallet, Minus, Equal } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getFinancialSummary } from "../api/reports";
import type { FinancialSummaryDto } from "../api/reports";
import { formatCurrency } from "../lib/currency";
import Button from "../components/ui/Button";
import Card, { CardBody } from "../components/ui/Card";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import MetricCard from "../components/ui/MetricCard";
import PageHeader from "../components/ui/PageHeader";

type Preset = "today" | "week" | "month" | "custom";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getRangeForPreset(preset: Preset): { from: string; to: string } {
  const now = new Date();
  if (preset === "today") return { from: isoDate(now), to: isoDate(now) };
  if (preset === "week") {
    const start = new Date(now);
    start.setUTCDate(now.getUTCDate() - now.getUTCDay());
    return { from: isoDate(start), to: isoDate(now) };
  }
  return {
    from: isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))),
    to: isoDate(now),
  };
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

export default function ReportsPage() {
  const { currentBusiness } = useAuth();
  const currencyCode = currentBusiness?.currency ?? "NPR";

  const [preset, setPreset] = useState<Preset>("month");
  const [customFrom, setCustomFrom] = useState(isoDate(new Date()));
  const [customTo, setCustomTo] = useState(isoDate(new Date()));
  const [summary, setSummary] = useState<FinancialSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    setIsLoading(true);
    setError(null);
    try {
      const range = preset === "custom" ? { from: customFrom, to: customTo } : getRangeForPreset(preset);
      const data = await getFinancialSummary(range.from, range.to);
      setSummary(data);
    } catch {
      setError("Could not load the financial report.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo]);

  const hasData = summary && (Number(summary.revenue) > 0 || Number(summary.expenses) > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Reports" description="Your business's financial performance at a glance." />

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            variant={preset === p.key ? "primary" : "secondary"}
            size="sm"
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </Button>
        ))}
        <Button variant={preset === "custom" ? "primary" : "secondary"} size="sm" onClick={() => setPreset("custom")}>
          Custom Range
        </Button>
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-10 rounded-lg border border-ink-200 px-3 text-sm"
          />
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-10 rounded-lg border border-ink-200 px-3 text-sm"
          />
        </div>
      )}

      {error && (
        <EmptyState
          title="Something went wrong"
          description={error}
          action={<Button variant="secondary" size="sm" onClick={loadSummary}>Try again</Button>}
        />
      )}

      {!error && isLoading && <Loading label="Loading report..." />}

      {!error && !isLoading && summary && !hasData && (
        <EmptyState
          title="No financial data yet"
          description="Create sales and expenses to see your financial performance."
        />
      )}

      {!error && !isLoading && summary && hasData && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Revenue" value={formatCurrency(summary.revenue, currencyCode)} icon={<BarChart3 className="h-5 w-5" />} accent="brand" />
            <MetricCard label="COGS" value={formatCurrency(summary.cogs, currencyCode)} icon={<TrendingDown className="h-5 w-5" />} accent="warning" />
            <MetricCard label="Gross Profit" value={formatCurrency(summary.gross_profit, currencyCode)} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
            <MetricCard label="Expenses" value={formatCurrency(summary.expenses, currencyCode)} icon={<Receipt className="h-5 w-5" />} accent="warning" />
            <MetricCard label="Net Profit" value={formatCurrency(summary.net_profit, currencyCode)} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
          </div>

          <Card>
            <CardBody className="space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">How this is calculated</p>
              <div className="flex flex-wrap items-center gap-2 text-ink-700">
                <span className="font-medium">{formatCurrency(summary.revenue, currencyCode)}</span>
                <span className="text-ink-400">Revenue</span>
                <Minus className="h-3.5 w-3.5 text-ink-400" />
                <span className="font-medium">{formatCurrency(summary.cogs, currencyCode)}</span>
                <span className="text-ink-400">COGS</span>
                <Equal className="h-3.5 w-3.5 text-ink-400" />
                <span className="font-medium text-success-700">{formatCurrency(summary.gross_profit, currencyCode)}</span>
                <span className="text-ink-400">Gross Profit</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-ink-700">
                <span className="font-medium">{formatCurrency(summary.gross_profit, currencyCode)}</span>
                <span className="text-ink-400">Gross Profit</span>
                <Minus className="h-3.5 w-3.5 text-ink-400" />
                <span className="font-medium">{formatCurrency(summary.expenses, currencyCode)}</span>
                <span className="text-ink-400">Expenses</span>
                <Equal className="h-3.5 w-3.5 text-ink-400" />
                <span className="font-medium text-success-700">{formatCurrency(summary.net_profit, currencyCode)}</span>
                <span className="text-ink-400">Net Profit</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
                  <HandCoins className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-ink-500">Customer Udhaar</p>
                  <p className="text-lg font-semibold text-ink-900">
                    {formatCurrency(summary.customer_udhaar, currencyCode)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
                  <Wallet className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-ink-500">Supplier Payables</p>
                  <p className="text-lg font-semibold text-ink-900">
                    {formatCurrency(summary.supplier_payables, currencyCode)}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}