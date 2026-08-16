import { NavLink } from "react-router-dom";
import { PawPrint } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { NAV_GROUPS } from "./navConfig";

export function Sidebar() {
  const { hasRole } = useAuth();

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-5">
        <PawPrint className="h-6 w-6 text-primary" aria-hidden="true" />
        <span className="text-lg font-semibold text-gray-900">CarePaws</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => !item.roles || hasRole(...item.roles));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="mb-6">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {visibleItems.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === "/"}
                      className={({ isActive }) =>
                        `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive ? "bg-emerald-50 text-primary" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
