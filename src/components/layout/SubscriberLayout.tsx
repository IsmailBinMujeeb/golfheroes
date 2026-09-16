import { Link, NavLink, Outlet } from "react-router-dom";
import { CircleDollarSign, Gift, Heart, LayoutDashboard, ListOrdered, UserCog } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scores", label: "Scores", icon: ListOrdered },
  { to: "/draws", label: "Draws", icon: Gift },
  { to: "/charity", label: "Charity", icon: Heart },
  { to: "/winnings", label: "Winnings", icon: CircleDollarSign },
  { to: "/account", label: "Account", icon: UserCog },
];

export function SubscriberLayout() {
  const { profile, subscription, isSubscribed } = useAuth();

  return (
    <div className="min-h-screen bg-ink-900 lg:flex">
      <aside className="hidden w-60 shrink-0 border-r border-line-700 lg:block">
        <div className="flex h-16 items-center border-b border-line-700 px-5">
          <Link to="/" className="font-display text-base font-semibold">
            digital<span className="italic text-sage-400">.heroes</span>
          </Link>
        </div>
        <nav className="p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "mb-1 flex items-center gap-3 px-3 py-2 text-sm text-cream-300 transition-colors hover:bg-ink-800 hover:text-cream-100",
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-line-700 px-5">
          <Link to="/" className="font-display text-base font-semibold lg:hidden">
            digital<span className="italic text-sage-400">.heroes</span>
          </Link>
          <p className="hidden text-sm text-cream-300 lg:block">
            {profile?.full_name ? `Hello, ${profile.full_name.split(" ")[0]}` : profile?.email}
          </p>
          <SubscriptionBadge
            active={isSubscribed}
            status={subscription?.status ?? null}
            renewsOn={subscription?.current_period_end ?? null}
          />
        </header>

        <main className="flex-1 px-5 pb-24 pt-6 lg:pb-10">
          <div className="mx-auto max-w-content">
            <Outlet />
          </div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line-700 bg-ink-900 lg:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] text-cream-300",
                  isActive && "text-sage-400"
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function SubscriptionBadge({
  active,
  status,
  renewsOn,
}: {
  active: boolean;
  status: string | null;
  renewsOn: string | null;
}) {
  if (active) {
    return (
      <Badge tone="sage" className="tnum">
        Active{renewsOn ? ` · Renews ${formatDate(renewsOn)}` : ""}
      </Badge>
    );
  }
  if (status === "lapsed" || status === "cancelled") {
    return <Badge tone="amber">{status === "lapsed" ? "Lapsed" : "Cancelled"}</Badge>;
  }
  return <Badge>Not subscribed</Badge>;
}
