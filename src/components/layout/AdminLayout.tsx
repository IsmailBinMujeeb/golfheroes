import { Link, NavLink, Outlet } from "react-router-dom";
import * as React from "react";
import { BarChart3, Building2, Dices, Menu, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/admin", label: "Overview", icon: BarChart3, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/draws", label: "Draws", icon: Dices },
  { to: "/admin/charities", label: "Charities", icon: Building2 },
  { to: "/admin/winners", label: "Winners", icon: Trophy },
];

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-ink-900 lg:flex">
      {/* Operations tool: flatter, colder, no charity warmth. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 border-r border-line-700 bg-ink-900 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-line-700 px-5">
          <span className="font-display text-base font-semibold">digital.heroes</span>
          <Badge tone="amber">Admin</Badge>
        </div>
        <nav className="p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "mb-1 flex items-center gap-3 px-3 py-2 text-sm text-cream-300 hover:bg-ink-800 hover:text-cream-100",
                  isActive && "bg-ink-800 text-cream-100"
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 bg-ink-900/70 lg:hidden" onClick={() => setOpen(false)} />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-line-700 px-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="size-4" />
              <span className="sr-only">Open admin menu</span>
            </Button>
            <p className="text-sm text-cream-300">{profile?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-cream-300 hover:text-cream-100">
              Subscriber view
            </Link>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              Log out
            </Button>
          </div>
        </header>

        <main className="flex-1 px-5 py-6">
          <div className="mx-auto max-w-[1280px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
