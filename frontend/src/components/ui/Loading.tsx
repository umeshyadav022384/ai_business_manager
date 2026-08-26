import { Loader2 } from "lucide-react";

interface LoadingProps {
  label?: string;
  className?: string;
}

/** Consistent loading state for any API-driven section. Use inside a
 * page's content area, not full-screen, so surrounding layout (sidebar,
 * topbar) stays visible while data loads. */
export default function Loading({ label = "Loading...", className }: LoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 py-12 text-ink-400 ${className ?? ""}`}
    >
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}