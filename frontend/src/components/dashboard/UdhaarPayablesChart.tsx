import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Card, { CardBody, CardHeader } from "../ui/Card";
import EmptyState from "../ui/EmptyState";

interface Props {
  customerUdhaar: number;
  supplierPayables: number;
  currencyCode: string;
}

export default function UdhaarPayablesChart({ customerUdhaar, supplierPayables }: Props) {
  const data = [
    { label: "Customer Udhaar", value: customerUdhaar },
    { label: "Supplier Payables", value: supplierPayables },
  ];
  const hasData = customerUdhaar > 0 || supplierPayables > 0;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-ink-800">Udhaar & Payables Overview</h2>
      </CardHeader>
      <CardBody>
        {!hasData ? (
          <EmptyState title="No outstanding balances" description="Customer Udhaar and supplier payables will appear here." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#dc2626" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}