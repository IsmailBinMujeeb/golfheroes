import * as React from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Charity } from "@/lib/types";

/** Compact search-and-select list, reused by signup and by charity settings. */
export function CharityPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (charity: Charity) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [charities, setCharities] = React.useState<Charity[] | null>(null);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  React.useEffect(() => {
    let active = true;
    setCharities(null);
    let request = supabase.from("charities").select("*").eq("is_active", true).order("name");
    if (debounced.trim()) request = request.ilike("name", `%${debounced.trim()}%`);
    void request.then(({ data }) => {
      if (active) setCharities((data as Charity[]) ?? []);
    });
    return () => {
      active = false;
    };
  }, [debounced]);

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search charities by name"
        aria-label="Search charities"
      />
      <div className="max-h-64 divide-y divide-line-700 overflow-y-auto border border-line-700">
        {charities === null ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : charities.length === 0 ? (
          <p className="p-4 text-sm text-cream-300">
            No charities match that search. Clear it to see the full list.
          </p>
        ) : (
          charities.map((charity) => (
            <button
              key={charity.id}
              type="button"
              onClick={() => onChange(charity)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-800",
                value === charity.id && "bg-sage-500/10"
              )}
            >
              <CharityMark charity={charity} />
              <span className="min-w-0">
                <span className="block truncate text-sm text-cream-100">{charity.name}</span>
                <span className="block truncate text-xs text-cream-300">{charity.category}</span>
              </span>
              {value === charity.id ? (
                <span className="ml-auto text-xs text-sage-400">Selected</span>
              ) : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function CharityMark({ charity, className }: { charity: Pick<Charity, "name" | "logo_url">; className?: string }) {
  if (charity.logo_url) {
    return (
      <img
        src={charity.logo_url}
        alt=""
        className={cn("size-9 shrink-0 border border-line-700 object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center border border-line-700 bg-ink-900 font-display text-sm text-sage-400",
        className
      )}
      aria-hidden
    >
      {charity.name.slice(0, 1)}
    </span>
  );
}
