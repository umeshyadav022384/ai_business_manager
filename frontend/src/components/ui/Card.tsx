import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Base surface used everywhere: dashboard metric tiles, product rows,
 * form panels. Keep padding/border/shadow decisions here so pages
 * never hand-roll their own card styling. */
export default function Card({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-ink-200 bg-white shadow-card",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn("border-b border-ink-100 px-5 py-4", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...rest }: CardProps) {
  return (
    <div className={cn("p-5", className)} {...rest}>
      {children}
    </div>
  );
}