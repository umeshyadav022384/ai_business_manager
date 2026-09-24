import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Card, { CardBody, CardHeader } from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import type { ExpenseDto } from "../../api/expenses";

interface Props {
  expenses: ExpenseDto[];
}

const COLORS = ["#2563eb", "#f59e0b", "#16a34a", "#dc2626", "#7c3aed", "#0891b2"];

export default function ExpenseBreakdownChart({ expenses }: Props) {
  const totalsByCategory = new Map<string, number>();
  for (const expense of expenses) {
    const key = expense.category?.name ?? "Uncategorized";
    totalsByCategory.set(key, (totalsByCategory.get(key) ?? 0) + Number(expense.amount));
  }
  const data = Array.from(totalsByCategory.entries()).map(([name, value]) => ({ name, value }));

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-ink-800">Expense Breakdown</h2>
      </CardHeader>
      <CardBody>
        {data.length === 0 ? (
          <EmptyState title="No expenses yet" description="A breakdown by category will appear here once you add expenses." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}