import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Card, { CardBody, CardHeader } from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import type { SaleDto } from "../../api/sales";

interface Props {
  sales: SaleDto[];
}

export default function TopProductsChart({ sales }: Props) {
  const quantityByProduct = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.items) {
      quantityByProduct.set(item.product_name, (quantityByProduct.get(item.product_name) ?? 0) + item.quantity);
    }
  }
  const data = Array.from(quantityByProduct.entries())
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-ink-800">Top-Selling Products</h2>
      </CardHeader>
      <CardBody>
        {data.length === 0 ? (
          <EmptyState title="No sales yet" description="Top-selling products will appear here once you record sales." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="quantity" name="Units sold" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}