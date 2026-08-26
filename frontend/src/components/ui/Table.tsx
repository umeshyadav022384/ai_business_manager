import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import Loading from "./Loading";
import EmptyState from "./EmptyState";

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode;
}

/** Composable table primitives (Table, TableHead, TableRow, TableCell)
 * rather than a single data-driven component — pages compose their own
 * columns/rows, this just supplies consistent spacing, borders, and
 * hover/empty/loading states so no page hand-rolls table CSS. */
export default function Table({ children, className, ...rest }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white shadow-card">
      <table className={cn("w-full text-left text-sm", className)} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className="border-b border-ink-200 bg-ink-50/60" {...rest}>
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHeaderCell({
  children,
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500",
        className
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TableBody({ children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...rest}>{children}</tbody>;
}

export function TableRow({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-ink-100 last:border-0 hover:bg-ink-50/60", className)}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 text-ink-700", className)} {...rest}>
      {children}
    </td>
  );
}

interface TableStateProps {
  colSpan: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  loadingLabel?: string;
}

/** Drop this as the only row in <TableBody> when loading or empty —
 * keeps every table's loading/empty handling identical without each
 * page reimplementing the colSpan-cell trick. */
export function TableState({
  colSpan,
  isLoading,
  isEmpty,
  emptyTitle = "No records yet",
  emptyDescription,
  loadingLabel,
}: TableStateProps) {
  if (!isLoading && !isEmpty) return null;
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        {isLoading ? (
          <Loading label={loadingLabel} />
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </td>
    </tr>
  );
}