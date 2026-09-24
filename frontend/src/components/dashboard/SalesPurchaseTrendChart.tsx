import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Card, { CardBody, CardHeader } from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import type { SaleDto } from "../../api/sales";
import type { PurchaseDto } from "../../api/purchases";

interface Props {
  sales: SaleDto[];
  purchases: PurchaseDto[];
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function SalesPurchaseTrendChart({ sales, purchases }: Props) {
  const days = lastNDays(14);
  const data = days.map((day) => ({
    day: day.slice(5),
    sales: sales.filter((s) => s.sale_date === day).reduce((sum, s) => sum + Number(s.total), 0),
    purchases: purchases.filter((p) => p.purchase_date === day).reduce((sum, p) => sum + Number(p.total_amount), 0),
  }));

  const hasData = data.some((d) => d.sales > 0 || d.purchases > 0);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-ink-800">Sales & Purchase Trend (14 days)</h2>
      </CardHeader>
      <CardBody>
        {!hasData ? (
          <EmptyState title="No trend data yet" description="Record sales and purchases to see the trend here." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" name="Sales" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="purchases" name="Purchases" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}