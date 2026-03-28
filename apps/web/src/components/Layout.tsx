import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { PhoneCall, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3">
          {/* Dormero logo mark - red shoe icon */}
          <div className="w-8 h-8 bg-dormero-700 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">D</span>
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">Dormero Viktoria</div>
            <div className="text-xs text-gray-500">Control Center</div>
          </div>
        </div>
        <div className="h-6 w-px bg-gray-200 mx-2" />
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              location.pathname === "/"
                ? "bg-dormero-50 text-dormero-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <PhoneCall size={14} />
            Call Logs
          </Link>
          <Link
            to="/feedback"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              location.pathname === "/feedback"
                ? "bg-dormero-50 text-dormero-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <Star size={14} />
            Feedback
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-500">Viktoria is live</span>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
