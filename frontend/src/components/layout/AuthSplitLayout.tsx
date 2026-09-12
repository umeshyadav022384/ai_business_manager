import type { ReactNode } from "react";
import { Sparkles, BarChart3, Package, Users } from "lucide-react";

interface AuthSplitLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

const FEATURE_POINTS = [
  { icon: Package, text: "Track products and stock in real time" },
  { icon: BarChart3, text: "See sales and profit at a glance" },
  { icon: Users, text: "Keep customer and credit records organized" },
];

/**
 * Desktop: split-screen — a dark navy branding panel (left) and a
 * white form surface on the canvas background (right). Below the `lg`
 * breakpoint, the branding panel collapses to a compact header above
 * the form instead of a second column, so mobile never gets squeezed
 * into two narrow halves.
 */
export default function AuthSplitLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthSplitLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Branding panel */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-navy-900 px-8 py-10 text-white lg:w-1/2 lg:px-16 lg:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-600/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-accent-600/20 blur-3xl"
        />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <span className="text-sm font-semibold">AI Business Manager</span>
        </div>

        <div className="relative mt-10 max-w-md lg:mt-0">
          <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
            Run your business smarter.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-navy-300">
            One place to manage products, stock, and customers for your
            grocery or clothing shop — built for small retail businesses
            across Nepal and India.
          </p>

          <ul className="mt-8 hidden space-y-4 lg:block">
            {FEATURE_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-navy-300">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-white" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative hidden text-xs text-navy-400 lg:block">
          © {new Date().getFullYear()} AI Business Manager
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-canvas px-4 py-10 sm:px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
            <h1 className="text-xl font-semibold tracking-tight text-ink-900">{title}</h1>
            <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>
        </div>
      </div>
    </div>
  );
}