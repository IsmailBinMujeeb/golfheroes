import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const links = [
  { to: "/charities", label: "Charities" },
  { to: "/how-it-works", label: "How it works" },
];

export function PublicLayout() {
  const { user, isSubscribed } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-ink-900">
      <header className="sticky top-0 z-40 border-b border-line-700 bg-ink-900/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between px-5">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight">
            golf<span className="italic text-sage-400">.heroes</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn("text-cream-300 transition-colors hover:text-cream-100", isActive && "text-cream-100")
                }
              >
                {link.label}
              </NavLink>
            ))}
            {user ? (
              <Link to="/dashboard" className="text-cream-300 hover:text-cream-100">
                Dashboard
              </Link>
            ) : (
              <Link to="/auth" className="text-cream-300 hover:text-cream-100">
                Log in
              </Link>
            )}
          </nav>

          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link to={isSubscribed ? "/dashboard" : "/subscribe"}>
              {isSubscribed ? "Go to dashboard" : "Subscribe"}
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="md:hidden">
            <Link to={user ? "/dashboard" : "/auth"}>{user ? "Dashboard" : "Log in"}</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line-700">
        <div className="mx-auto grid max-w-content gap-8 px-5 py-12 md:grid-cols-4">
          <div>
            <p className="font-display text-base font-semibold">
              golf<span className="italic text-sage-400">.heroes</span>
            </p>
            <p className="mt-2 max-w-xs text-sm text-cream-300">
              Golf scores in, charity money out, one draw a month.
            </p>
          </div>
          <FooterColumn
            title="Platform"
            items={[
              { to: "/charities", label: "Charity directory" },
              { to: "/how-it-works", label: "How draws work" },
              { to: "/subscribe", label: "Plans" },
            ]}
          />
          <FooterColumn
            title="Account"
            items={[
              { to: "/auth", label: "Log in" },
              { to: "/dashboard", label: "Dashboard" },
            ]}
          />
          <div className="text-sm text-cream-300">
            <p className="mb-3 text-cream-100">Contact</p>
            <p>hello@golfheroes.co.in</p>
            <p className="mt-4 text-xs text-cream-500">
              Draws are open to active subscribers who have logged five scores. Prize money is paid after
              score verification.
            </p>
          </div>
        </div>
        <div className="border-t border-line-700">
          <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-2 px-5 py-5 text-xs text-cream-500">
            <p>© {new Date().getFullYear()} Golf Heroes</p>
            <p>golfheroes.co.in</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, items }: { title: string; items: { to: string; label: string }[] }) {
  return (
    <div className="text-sm">
      <p className="mb-3 text-cream-100">{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="text-cream-300 hover:text-cream-100">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
