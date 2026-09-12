import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Optional trailing control rendered inside the input's right edge
   * — e.g. a password show/hide toggle. When provided, right padding
   * is added automatically so input text never runs under it. */
  rightElement?: ReactNode;
}

export default function Input({
  label,
  error,
  helperText,
  rightElement,
  className,
  id,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            "h-10 w-full rounded-lg border px-3 text-sm text-ink-800 placeholder:text-ink-400",
            "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500",
            "disabled:bg-ink-50 disabled:text-ink-400",
            error ? "border-danger-500" : "border-ink-200",
            rightElement ? "pr-10" : "",
            className
          )}
          {...rest}
        />
        {rightElement && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-danger-600">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-ink-400">{helperText}</p>
      ) : null}
    </div>
  );
}