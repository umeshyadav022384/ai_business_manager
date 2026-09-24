import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Card, { CardBody, CardHeader } from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import type { SaleDto } from "../../api/sales";
import type { ExpenseDto } from "../../api/expenses";

interface Props {
  sales: SaleDto[];
  expenses: ExpenseDto[];
}

function lastNMonths(n: number): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-US", { month: "short" }),
    });
  }
  return months;
}

export default function RevenueExpenseProfitChart({ sales, expenses }: Props) {
  const months = lastNMonths(6);
  const data = months.map(({ key, label }) => {
    const revenue = sales
      .filter((s) => s.sale_date.startsWith(key))
      .reduce((sum, s) => sum + Number(s.total), 0);
    const expenseTotal = expenses
      .filter((e) => e.expense_date.startsWith(key))
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return { label, revenue, expenses: expenseTotal, profit: revenue - expenseTotal };
  });

  const hasData = data.some((d) => d.revenue > 0 || d.expenses > 0);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-ink-800">Revenue vs Expenses (6 months)</h2>
      </CardHeader>
      <CardBody>
        {!hasData ? (
          <EmptyState title="No financial data yet" description="Record sales and expenses to see this chart." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}