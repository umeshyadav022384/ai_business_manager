import type { ReactNode } from "react";
import Card, { CardBody } from "./Card";
import { cn } from "../../lib/cn";

interface MetricCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  description?: string;
  accent?: "brand" | "accent" | "success" | "warning" | "danger";
}

const ACCENT_CLASSES: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  brand: "bg-brand-50 text-brand-600",
  accent: "bg-accent-100 text-accent-600",
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-600",
  danger: "bg-danger-50 text-danger-600",
};

/**
 * A metric tile that shows either a real value, or — when there's no
 * backing API yet — an honest description in place of a fabricated
 * number (see usage in DashboardPage). Never invent the value itself;
 * pass "—" and use `description` for the honest explanation.
 */
export default function MetricCard({
  label,
  value,
  icon,
  description,
  accent = "brand",
}: MetricCardProps) {
  return (
    <Card className="transition-shadow duration-150 hover:shadow-elevated">
      <CardBody className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink-900">
            {value}
          </p>
          {description && <p className="mt-1 text-xs text-ink-400">{description}</p>}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            ACCENT_CLASSES[accent]
          )}
        >
          {icon}
        </span>
      </CardBody>
    </Card>
  );
}