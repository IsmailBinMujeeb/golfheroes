import * as React from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Countdown } from "@/components/shared/Countdown";
import { CharityMark } from "@/components/shared/CharityPicker";
import { formatMonth, formatPaise } from "@/lib/format";
import type { Charity } from "@/lib/types";

interface PublicStats {
  total_charity_paise: number;
  prize_pool_paise: number;
  subscriber_count: number;
  next_draw_at: string | null;
  draw_month: string | null;
}

interface PublicWinner {
  first_name: string;
  amount_paise: number;
  tier: number;
  draw_month: string;
}

export default function Home() {
  const [stats, setStats] = React.useState<PublicStats | null>(null);
  const [charity, setCharity] = React.useState<Charity | null>(null);
  const [winners, setWinners] = React.useState<PublicWinner[]>([]);

  React.useEffect(() => {
    void supabase
      .from("public_stats")
      .select("*")
      .maybeSingle()
      .then(({ data }) => setStats((data as PublicStats) ?? null));

    void supabase
      .from("charities")
      .select("*")
      .eq("is_featured", true)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setCharity((data as Charity) ?? null));

    void supabase
      .from("public_winners")
      .select("*")
      .limit(4)
      .then(({ data }) => setWinners((data as PublicWinner[]) ?? []));
  }, []);

  return (
    <>
      <section className="border-b border-line-700">
        <div className="mx-auto max-w-content px-5 py-20 md:py-28">
          <h1 className="max-w-3xl font-display text-display font-semibold">
            Your worst round of the year can still be someone's best week.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream-300">
            Subscribe, log your five most recent Stableford scores, and those five numbers become your
            entry in the monthly draw. At least a tenth of every subscription goes to a charity you pick.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/subscribe">Subscribe now</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/how-it-works">See how draws work</Link>
            </Button>
          </div>

          <dl className="mt-16 grid gap-px border border-line-700 bg-line-700 sm:grid-cols-3">
            <Counter
              label="Raised for charity so far"
              value={stats ? formatPaise(stats.total_charity_paise) : null}
            />
            <Counter
              label={stats?.draw_month ? `${formatMonth(stats.draw_month)} prize pool` : "This month's prize pool"}
              value={stats ? formatPaise(stats.prize_pool_paise) : null}
              accent
            />
            <Counter
              label="Next draw"
              value={
                stats ? (stats.next_draw_at ? <Countdown to={stats.next_draw_at} /> : "Announced soon") : null
              }
            />
          </dl>
        </div>
      </section>

      <section className="border-b border-line-700">
        <div className="mx-auto max-w-content px-5 py-16">
          <h2 className="font-display text-lead font-semibold">Three things happen every month</h2>
          <ol className="mt-10 grid gap-px bg-line-700 md:grid-cols-3">
            <Step
              step="Play"
              body="Log the Stableford score from your latest round. Only your five most recent scores are kept, so the ticket always reflects how you're playing now."
            />
            <Step
              step="Give"
              body="Pick a cause at signup and set your share. Ten percent is the floor; plenty of members give more, and you can donate outside the subscription too."
            />
            <Step
              step="Win"
              body="Your five scores are matched against the month's five drawn numbers. Match three, four or five and you take a share of that tier's pool."
            />
          </ol>
        </div>
      </section>

      {charity ? (
        <section className="border-b border-line-700">
          <div className="mx-auto grid max-w-content gap-10 px-5 py-16 md:grid-cols-[1.2fr,1fr] md:items-center">
            <div>
              <p className="text-sm text-sage-400">Charity in the spotlight</p>
              <h2 className="mt-3 font-display text-lead font-semibold">{charity.name}</h2>
              <p className="mt-4 max-w-prose text-cream-300">
                {charity.short_description ?? charity.description}
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link to={`/charities/${charity.slug}`}>Read their profile</Link>
              </Button>
            </div>
            {charity.cover_url ? (
              <img
                src={charity.cover_url}
                alt=""
                className="h-64 w-full border border-line-700 object-cover"
              />
            ) : (
              <div className="flex h-64 items-center justify-center border border-line-700 bg-ink-800">
                <CharityMark charity={charity} className="size-16 text-2xl" />
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="border-b border-line-700">
        <div className="mx-auto max-w-content px-5 py-16">
          <h2 className="font-display text-lead font-semibold">How the pool splits</h2>
          <p className="mt-3 max-w-xl text-cream-300">
            A fixed share of every subscription goes into the month's pool. That pool divides across three
            match tiers and is split equally between everyone in a tier.
          </p>
          <div className="mt-8 grid gap-px border border-line-700 bg-line-700 sm:grid-cols-3">
            <Tier match="Match 5" share="40% of the pool" note="Rolls over if nobody wins it" accent />
            <Tier match="Match 4" share="35% of the pool" note="Paid out the same month" />
            <Tier match="Match 3" share="25% of the pool" note="Paid out the same month" />
          </div>
        </div>
      </section>

      {winners.length > 0 ? (
        <section className="border-b border-line-700">
          <div className="mx-auto max-w-content px-5 py-16">
            <h2 className="font-display text-lead font-semibold">Recently paid out</h2>
            <ul className="mt-8 divide-y divide-line-700 border border-line-700">
              {winners.map((winner, i) => (
                <li key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-cream-100">
                    {winner.first_name} · matched {winner.tier}
                  </span>
                  <span className="tnum text-sage-400">{formatPaise(winner.amount_paise)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mx-auto max-w-content px-5 py-20">
          <h2 className="max-w-2xl font-display text-lead font-semibold">
            Every round you play puts money somewhere that needs it.
          </h2>
          <Button asChild size="lg" className="mt-8">
            <Link to="/subscribe">Subscribe now</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function Counter({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode | null;
  accent?: boolean;
}) {
  return (
    <div className="bg-ink-900 px-5 py-6">
      <dt className="text-sm text-cream-300">{label}</dt>
      <dd
        className={`tnum mt-2 font-display text-3xl font-semibold ${
          accent ? "text-amber-400" : "text-cream-100"
        }`}
      >
        {value ?? <Skeleton className="h-8 w-32" />}
      </dd>
    </div>
  );
}

function Step({ step, body }: { step: string; body: string }) {
  return (
    <li className="bg-ink-900 px-6 py-8">
      <h3 className="font-display text-2xl font-semibold text-sage-400">{step}</h3>
      <p className="mt-3 text-sm leading-relaxed text-cream-300">{body}</p>
    </li>
  );
}

function Tier({
  match,
  share,
  note,
  accent,
}: {
  match: string;
  share: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-ink-900 px-5 py-6">
      <p className={`font-display text-xl font-semibold ${accent ? "text-amber-400" : "text-cream-100"}`}>
        {match}
      </p>
      <p className="tnum mt-2 text-sm text-cream-100">{share}</p>
      <p className="mt-1 text-sm text-cream-300">{note}</p>
    </div>
  );
}
