import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Receipt,
  Users,
  HandCoins,
  Wallet,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  X,
  Landmark,
  Building2,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: Package },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/supplier-payables", label: "Supplier Payables", icon: Landmark },
  { to: "/sales", label: "Sales", icon: Receipt },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/customer-udhaar", label: "Customer Udhaar", icon: HandCoins },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dark navy sidebar — the app's visual anchor. Desktop: fixed 264px
 * column, always visible (lg breakpoint up). Mobile/tablet: off-canvas
 * drawer with backdrop, controlled by isOpen/onClose.
 *
 * Only "/" and "/products" are real routes today; the rest are
 * placeholders for phases not yet built (Purchases, Sales, etc.) —
 * kept visible per the product's planned nav, not implemented here.
 */
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, currentBusiness, logout } = useAuth();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-navy-950/60 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          role="presentation"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 text-navy-300 shadow-navy transition-transform duration-200 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-white">
              AI Business Manager
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1 text-navy-400 hover:bg-navy-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-navy-800 text-white"
                    : "text-navy-300 hover:bg-navy-800/60 hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-500" />
                  )}
                  <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-navy-800 p-4">
          {currentBusiness && (
            <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-navy-800/60 px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-700 text-navy-300">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {currentBusiness.name}
                </p>
                <p className="truncate text-xs capitalize text-navy-400">
                  {currentBusiness.business_type}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {user?.full_name}
              </p>
              <p className="truncate text-xs text-navy-400">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Log out"
              className="shrink-0 rounded-md p-1.5 text-navy-400 hover:bg-navy-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}