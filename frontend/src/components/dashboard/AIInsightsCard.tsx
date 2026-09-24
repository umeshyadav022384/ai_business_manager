import { useEffect, useState } from "react";
import { Sparkles, AlertTriangle, TrendingUp } from "lucide-react";
import { listInsights } from "../../api/insights";
import type { InsightDto } from "../../api/insights";
import Card, { CardBody, CardHeader } from "../ui/Card";
import Loading from "../ui/Loading";
import EmptyState from "../ui/EmptyState";

const SEVERITY_ICON: Record<InsightDto["severity"], typeof AlertTriangle> = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: TrendingUp,
};

const SEVERITY_CLASS: Record<InsightDto["severity"], string> = {
  critical: "bg-danger-50 text-danger-600",
  warning: "bg-warning-50 text-warning-600",
  info: "bg-brand-50 text-brand-600",
};

export default function AIInsightsCard() {
  const [insights, setInsights] = useState<InsightDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listInsights()
      .then(setInsights)
      .catch(() => setError("Could not load insights."))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-ink-400" />
        <h2 className="text-sm font-semibold text-ink-800">AI Business Insights</h2>
      </CardHeader>
      <CardBody>
        {isLoading && <Loading label="Analyzing your business..." />}
        {!isLoading && error && (
          <EmptyState title="Something went wrong" description={error} />
        )}
        {!isLoading && !error && insights.length === 0 && (
          <EmptyState
            title="No insights yet"
            description="As you record more sales, purchases, and expenses, useful insights will appear here."
          />
        )}
        {!isLoading && !error && insights.length > 0 && (
          <ul className="space-y-3">
            {insights.map((insight, i) => {
              const Icon = SEVERITY_ICON[insight.severity];
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${SEVERITY_CLASS[insight.severity]}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-800">{insight.title}</p>
                    <p className="text-sm text-ink-500">{insight.message}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}