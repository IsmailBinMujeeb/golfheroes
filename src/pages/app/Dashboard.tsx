import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { CharityMark } from "@/components/shared/CharityPicker";
import { Countdown } from "@/components/shared/Countdown";
import { DrawNumbers } from "@/components/shared/DrawNumbers";
import { LockedModule, SubscribeBanner } from "@/components/shared/SubscribeGate";
import { EmptyState } from "@/components/shared/states";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getOpenDraw } from "@/lib/entries";
import { PICKS } from "@/lib/draw";
import { formatDate, formatMonth, formatPaise } from "@/lib/format";
import type { Charity, Draw, DrawEntry, Score, Winner } from "@/lib/types";

export default function Dashboard() {
  const { user, profile, subscription, isSubscribed, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [charity, setCharity] = React.useState<Charity | null>(null);
  const [scores, setScores] = React.useState<Score[] | null>(null);
  const [draw, setDraw] = React.useState<Draw | null>(null);
  const [entry, setEntry] = React.useState<DrawEntry | null>(null);
  const [winnings, setWinnings] = React.useState<Winner[] | null>(null);

  React.useEffect(() => {
    if (!user) return;
    if (isAdmin) return navigate("/admin");
    let active = true;

    void (async () => {
      const [{ data: scoreRows }, { data: winnerRows }, openDraw] = await Promise.all([
        supabase
          .from("scores")
          .select("*")
          .eq("user_id", user.id)
          .order("played_on", { ascending: false })
          .limit(PICKS),
        supabase.from("winners").select("*").eq("user_id", user.id),
        getOpenDraw(),
      ]);
      if (!active) return;
      setScores((scoreRows as Score[]) ?? []);
      setWinnings((winnerRows as Winner[]) ?? []);
      setDraw(openDraw);

      if (openDraw) {
        const { data: entryRow } = await supabase
          .from("draw_entries")
          .select("*")
          .eq("draw_id", openDraw.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (active) setEntry((entryRow as DrawEntry) ?? null);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  React.useEffect(() => {
    if (!profile?.charity_id) return setCharity(null);
    void supabase
      .from("charities")
      .select("*")
      .eq("id", profile.charity_id)
      .maybeSingle()
      .then(({ data }) => setCharity((data as Charity) ?? null));
  }, [profile?.charity_id]);

  const totalWon = (winnings ?? []).reduce((sum, w) => sum + w.amount_paise, 0);
  const pendingCount = (winnings ?? []).filter((w) => w.payout_status === "unpaid").length;

  const gate = (node: React.ReactNode, label: string) =>
    isSubscribed ? node : <LockedModule label={label}>{node}</LockedModule>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {profile?.full_name ? `Hello, ${profile.full_name.split(" ")[0]}` : "Your dashboard"}
        </h1>
        <p className="mt-1 text-sm text-cream-300">
          Scores, charity, draw and winnings — the whole month on one screen.
        </p>
      </div>

      {!isSubscribed ? <SubscribeBanner /> : null}

      <Panel>
        <PanelBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-cream-300">Subscription</p>
            <p className="mt-1 font-display text-lg">
              {isSubscribed
                ? `${subscription?.plan === "yearly" ? "Yearly" : "Monthly"} plan`
                : subscription?.status === "lapsed"
                  ? "Lapsed"
                  : "No active plan"}
            </p>
            {subscription?.current_period_end ? (
              <p className="tnum mt-1 text-sm text-cream-300">
                {subscription.cancel_at_period_end ? "Ends" : "Renews"}{" "}
                {formatDate(subscription.current_period_end)}
              </p>
            ) : null}
          </div>
          <Button asChild variant="outline">
            <Link to={isSubscribed ? "/account" : "/subscribe"}>
              {isSubscribed ? "Manage plan" : "Choose a plan"}
            </Link>
          </Button>
        </PanelBody>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>Your charity</PanelTitle>
            <Link to="/charity" className="text-sm text-sage-400 hover:underline">
              Change
            </Link>
          </PanelHeader>
          <PanelBody>
            {charity ? (
              <div className="flex items-center gap-3">
                <CharityMark charity={charity} className="size-11" />
                <div>
                  <p className="text-cream-100">{charity.name}</p>
                  <p className="tnum text-sm text-sage-400">
                    Giving {profile?.contribution_pct ?? 10}% of every payment
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No charity picked yet"
                body="Choose a cause and your contribution starts flowing to it from the next payment."
                action={
                  <Button asChild size="sm">
                    <Link to="/charities">Browse charities</Link>
                  </Button>
                }
              />
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>This month's draw</PanelTitle>
            {entry ? <Badge tone="sage">Entered</Badge> : <Badge tone="amber">Not entered</Badge>}
          </PanelHeader>
          <PanelBody>
            {gate(
              draw ? (
                <div className="space-y-3">
                  <p className="text-sm text-cream-300">{formatMonth(draw.draw_month)} draw</p>
                  {entry ? (
                    <DrawNumbers numbers={entry.numbers} size="sm" />
                  ) : (
                    <p className="text-sm text-cream-300">
                      Log {PICKS - (scores?.length ?? 0)} more{" "}
                      {PICKS - (scores?.length ?? 0) === 1 ? "score" : "scores"} to enter.
                    </p>
                  )}
                  <p className="tnum text-sm">
                    Closes in <Countdown to={draw.draws_at} className="text-amber-400" /> · pool{" "}
                    {formatPaise(draw.pool_paise + draw.rollover_in_paise)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-cream-300">
                  No draw is open right now. The next one opens at the start of the month.
                </p>
              ),
              "Subscribe to enter the monthly draw"
            )}
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>Recent scores</PanelTitle>
            <Link to="/scores" className="text-sm text-sage-400 hover:underline">
              Enter today's score
            </Link>
          </PanelHeader>
          <PanelBody>
            {scores === null ? (
              <Skeleton className="h-20 w-full" />
            ) : scores.length === 0 ? (
              <p className="text-sm text-cream-300">
                Nothing logged yet. Your first score takes about ten seconds.
              </p>
            ) : (
              <>
                <Sparkline scores={[...scores].reverse().map((s) => s.score)} />
                <ul className="tnum mt-4 space-y-1.5 text-sm">
                  {scores.map((s) => (
                    <li key={s.id} className="flex justify-between text-cream-300">
                      <span>{formatDate(s.played_on)}</span>
                      <span className="text-cream-100">{s.score}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Winnings</PanelTitle>
            <Link to="/winnings" className="text-sm text-sage-400 hover:underline">
              View details
            </Link>
          </PanelHeader>
          <PanelBody>
            {gate(
              <>
                <p className="tnum font-display text-3xl font-semibold text-amber-400">
                  {formatPaise(totalWon)}
                </p>
                <p className="mt-2 text-sm text-cream-300">
                  {winnings && winnings.length > 0
                    ? pendingCount > 0
                      ? `${pendingCount} payout${pendingCount === 1 ? "" : "s"} still to clear`
                      : "Everything you've won has been paid"
                    : "No wins yet. Every month is a fresh set of numbers."}
                </p>
              </>,
              "Subscribe to play for the pool"
            )}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

/** Tiny inline trend of the five retained scores. */
function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const span = Math.max(1, max - min);
  const points = scores
    .map((score, i) => {
      const x = (i / (scores.length - 1)) * 100;
      const y = 32 - ((score - min) / span) * 28;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 34" preserveAspectRatio="none" className="h-12 w-full" aria-hidden>
      <polyline points={points} fill="none" stroke="#4C7C59" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
