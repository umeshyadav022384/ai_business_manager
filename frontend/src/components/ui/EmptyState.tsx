import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Used both for genuine empty states ("No products yet") and error
 * states (pass a different icon/title/description) — same visual
 * treatment, since a blank screen is the thing we're avoiding in both
 * cases, not just when data is missing. */
export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-12 text-center">
      <div className="text-ink-300">
        {icon ?? <Inbox className="h-10 w-10" aria-hidden="true" />}
      </div>
      <div>
        <p className="text-sm font-medium text-ink-700">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-ink-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}