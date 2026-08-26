import { useState } from "react";
import { Menu, Bell, LogOut, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, currentBusiness, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {currentBusiness && (
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink-800">
              {currentBusiness.name}
            </p>
            <p className="text-xs capitalize text-ink-400">
              {currentBusiness.business_type}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="rounded-full p-2 text-ink-500 hover:bg-ink-100"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <User className="h-4 w-4" />
            </span>
            <span className="hidden text-sm font-medium text-ink-700 sm:inline">
              {user?.full_name}
            </span>
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsMenuOpen(false)}
                role="presentation"
              />
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-ink-200 bg-white py-1 shadow-elevated">
                <div className="border-b border-ink-100 px-3 py-2">
                  <p className="truncate text-sm font-medium text-ink-800">
                    {user?.full_name}
                  </p>
                  <p className="truncate text-xs text-ink-400">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}