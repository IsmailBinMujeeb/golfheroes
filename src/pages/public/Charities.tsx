import * as React from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { CharityMark } from "@/components/shared/CharityPicker";
import type { Charity } from "@/lib/types";

export default function Charities() {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [category, setCategory] = React.useState("all");
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
    if (category !== "all") request = request.eq("category", category);
    void request.then(({ data }) => {
      if (active) setCharities((data as Charity[]) ?? []);
    });
    return () => {
      active = false;
    };
  }, [debounced, category]);

  // Categories come from the whole directory, so filtering never removes the
  // option you would need to get back.
  const [categories, setCategories] = React.useState<string[]>(["all"]);
  React.useEffect(() => {
    void supabase
      .from("charities")
      .select("category")
      .eq("is_active", true)
      .then(({ data }) => {
        const set = new Set((data ?? []).map((row) => (row as { category: string }).category));
        setCategories(["all", ...Array.from(set).sort()]);
      });
  }, []);

  const featured = charities?.find((c) => c.is_featured) ?? null;
  const rest = (charities ?? []).filter((c) => c.id !== featured?.id);

  return (
    <div className="mx-auto max-w-content px-5 py-16">
      <h1 className="font-display text-lead font-semibold">Charities on the platform</h1>
      <p className="mt-3 max-w-xl text-cream-300">
        Every subscriber sends part of their fee to one of these. Pick the one you want your golf to pay for.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name"
          aria-label="Search charities"
          className="sm:max-w-sm"
        />
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="sm:max-w-[14rem]"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </Select>
      </div>

      {charities === null ? (
        <div className="mt-10 space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : charities.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nothing matches that search"
            body="Try a different name, or clear the filters to see every charity on the platform."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {featured ? (
            <article className="mt-10 grid gap-6 border border-line-700 bg-ink-800 p-6 md:grid-cols-[1fr,1.1fr] md:items-center">
              {featured.cover_url ? (
                <img src={featured.cover_url} alt="" className="h-52 w-full object-cover" />
              ) : (
                <div className="flex h-52 items-center justify-center bg-ink-900">
                  <CharityMark charity={featured} className="size-14 text-xl" />
                </div>
              )}
              <div>
                <p className="text-sm text-sage-400">Featured this month</p>
                <h2 className="mt-2 font-display text-2xl font-semibold">{featured.name}</h2>
                <p className="mt-3 text-sm text-cream-300">{featured.short_description}</p>
                <Button asChild variant="outline" className="mt-5">
                  <Link to={`/charities/${featured.slug}`}>View profile</Link>
                </Button>
              </div>
            </article>
          ) : null}

          <ul className="mt-6 divide-y divide-line-700 border border-line-700">
            {rest.map((charity) => (
              <li key={charity.id}>
                <Link
                  to={`/charities/${charity.slug}`}
                  className="flex items-center gap-4 px-5 py-5 transition-colors hover:bg-ink-800"
                >
                  <CharityMark charity={charity} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <p className="text-cream-100">{charity.name}</p>
                    <p className="truncate text-sm text-cream-300">{charity.short_description}</p>
                  </div>
                  <span className="hidden shrink-0 border border-line-600 px-2 py-0.5 text-xs text-cream-300 sm:inline">
                    {charity.category}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
