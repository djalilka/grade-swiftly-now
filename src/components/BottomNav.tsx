import { Link } from "@tanstack/react-router";
import { ClipboardCheck, BarChart3, Settings } from "lucide-react";

const TABS = [
  { to: "/", label: "التصحيح", Icon: ClipboardCheck, exact: false },
  { to: "/reports", label: "التقارير", Icon: BarChart3, exact: true },
  { to: "/settings", label: "الإعدادات", Icon: Settings, exact: true },
] as const;

export function BottomNav() {
  return (
    <nav
      dir="rtl"
      aria-label="التنقل الرئيسي"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur"
    >
      <ul className="mx-auto flex w-full max-w-xl items-stretch">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: to === "/" ? false : true }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-1 px-2 py-3 text-xs font-semibold transition-colors hover:text-primary"
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
