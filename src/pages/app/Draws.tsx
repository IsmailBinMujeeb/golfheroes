import * as React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Countdown } from "@/components/shared/Countdown";
import { DrawNumbers } from "@/components/shared/DrawNumbers";
import { EmptyState } from "@/components/shared/states";
import { LockedModule, SubscribeBanner } from "@/components/shared/SubscribeGate";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { matchCount } from "@/lib/draw";
import { formatMonth, formatPaise } from "@/lib/format";
import type { Draw, DrawEntry } from "@/lib/types";

type EntryWithDraw = DrawEntry & { draws: Draw | null };

export default function Draws() {
  const { user, isSubscribed } = useAuth();
  const [entries, setEntries] = React.useState<EntryWithDraw[] | null>(null);

  React.useEffect(() => {
    if (!user) return;
    void supabase
      .from("draw_entries")
      .select("*, draws(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setEntries((data as unknown as EntryWithDraw[]) ?? []));
  }, [user]);

  const upcoming = (entries ?? []).filter((e) => e.draws && e.draws.status !== "published");
  const past = (entries ?? []).filter((e) => e.draws && e.draws.status === "published");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Draws</h1>
        <p className="mt-1 text-sm text-cream-300">
          What you're entered in, and how every past month turned out.
        </p>
      </div>

      {!isSubscribed ? <SubscribeBanner /> : null}

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past results</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {entries === null ? (
            <Skeleton className="h-40 w-full" />
          ) : upcoming.length === 0 ? (
            <EmptyState
              title="You're not in a draw yet"
              body="Five logged scores is all it takes. Your scores become your numbers automatically."
              action={
                <Button asChild size="sm">
                  <Link to="/scores">Log a score</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {upcoming.map((entry) => (
                <Panel key={entry.id}>
                  <PanelHeader>
                    <PanelTitle>{formatMonth(entry.draws!.draw_month)} draw</PanelTitle>
                    <Badge tone="sage">Entered</Badge>
                  </PanelHeader>
                  <PanelBody className="space-y-4">
                    {isSubscribed ? (
                      <DrawNumbers numbers={entry.numbers} />
                    ) : (
                      <LockedModule label="Subscribe to keep your entry live">
                        <DrawNumbers numbers={entry.numbers} />
                      </LockedModule>
                    )}
                    <div className="tnum flex flex-wrap gap-x-8 gap-y-2 text-sm text-cream-300">
                      <span>
                        Draws in <Countdown to={entry.draws!.draws_at} className="text-amber-400" />
                      </span>
                      <span>
                        Pool so far{" "}
                        <span className="text-cream-100">
                          {formatPaise(entry.draws!.pool_paise + entry.draws!.rollover_in_paise)}
                        </span>
                      </span>
                      <span>
                        Type <span className="text-cream-100">{entry.draws!.type}</span>
                      </span>
                    </div>
                  </PanelBody>
                </Panel>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {entries === null ? (
            <Skeleton className="h-40 w-full" />
          ) : past.length === 0 ? (
            <EmptyState
              title="No results to show yet"
              body="Once this month's draw is published, the numbers and your result land here."
            />
          ) : (
            <div className="space-y-4">
              {past.map((entry) => {
                const winning = entry.draws!.winning_numbers ?? [];
                const matched = matchCount(entry.numbers, winning);
                return (
                  <Panel key={entry.id}>
                    <PanelHeader>
                      <PanelTitle>{formatMonth(entry.draws!.draw_month)}</PanelTitle>
                      <Badge tone={matched >= 3 ? "sage" : "neutral"}>
                        {matched >= 3 ? `Matched ${matched}` : "No match"}
                      </Badge>
                    </PanelHeader>
                    <PanelBody className="space-y-4">
                      <div>
                        <p className="mb-2 text-sm text-cream-300">Winning numbers</p>
                        <DrawNumbers numbers={winning} reveal />
                      </div>
                      <div>
                        <p className="mb-2 text-sm text-cream-300">Your numbers</p>
                        <DrawNumbers numbers={entry.numbers} matched={winning} size="sm" />
                      </div>
                    </PanelBody>
                  </Panel>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
