import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { DrawNumbers } from "@/components/shared/DrawNumbers";
import { EmptyState } from "@/components/shared/states";
import { supabase } from "@/lib/supabase";
import { seedFrom, simulateDraw, type SimulationResult } from "@/lib/draw";
import { formatDate, formatMonth, formatPaise } from "@/lib/format";
import type { Draw, DrawEntry, DrawType, Profile } from "@/lib/types";

type EntryRow = DrawEntry & { profiles: Pick<Profile, "full_name" | "email"> | null };

export default function AdminDraws() {
  const { toast } = useToast();
  const [draws, setDraws] = React.useState<Draw[] | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const { data } = await supabase.from("draws").select("*").order("draw_month", { ascending: false });
    const rows = (data as Draw[]) ?? [];
    setDraws(rows);
    setSelectedId((current) => current ?? rows[0]?.id ?? null);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function createNextDraw() {
    const latest = draws?.[0];
    const base = latest ? new Date(latest.draw_month) : new Date();
    const month = new Date(base.getFullYear(), base.getMonth() + (latest ? 1 : 0), 1);
    const closes = new Date(month.getFullYear(), month.getMonth() + 1, 0, 20, 0, 0);

    const { error } = await supabase.from("draws").insert({
      draw_month: month.toISOString().slice(0, 10),
      draws_at: closes.toISOString(),
      type: "random",
      status: "draft",
      split_5: 40,
      split_4: 35,
      split_3: 25,
    });
    if (error) return toast("That draw couldn't be created — one may already exist for the month.", "error");
    toast("Draw created.", "success");
    await load();
  }

  const selected = draws?.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Draws</h1>
          <p className="mt-1 text-sm text-cream-300">
            Configure the month, simulate as often as you like, publish once.
          </p>
        </div>
        <Button onClick={() => void createNextDraw()}>Create next draw</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[20rem,1fr] xl:items-start">
        <Panel>
          <PanelHeader>
            <PanelTitle>All draws</PanelTitle>
          </PanelHeader>
          {draws === null ? (
            <div className="p-4">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : draws.length === 0 ? (
            <PanelBody>
              <EmptyState title="No draws yet" body="Create the first draw to start collecting entries." />
            </PanelBody>
          ) : (
            <ul className="divide-y divide-line-700">
              {draws.map((draw) => (
                <li key={draw.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(draw.id)}
                    className={`flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-ink-900 ${
                      draw.id === selectedId ? "bg-ink-900" : ""
                    }`}
                  >
                    <span className="tnum text-sm">{formatMonth(draw.draw_month)}</span>
                    <StatusBadge status={draw.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {selected ? <DrawEditor key={selected.id} draw={selected} onChanged={load} /> : null}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Draw["status"] }) {
  if (status === "published") return <Badge tone="sage">Published</Badge>;
  if (status === "simulated") return <Badge tone="amber">Simulated</Badge>;
  return <Badge>Draft</Badge>;
}

function DrawEditor({ draw, onChanged }: { draw: Draw; onChanged: () => Promise<void> }) {
  const { toast } = useToast();
  const [type, setType] = React.useState<DrawType>(draw.type);
  const [split, setSplit] = React.useState({ five: draw.split_5, four: draw.split_4, three: draw.split_3 });
  const [entries, setEntries] = React.useState<EntryRow[] | null>(null);
  const [activeSubs, setActiveSubs] = React.useState<number | null>(null);
  const [result, setResult] = React.useState<SimulationResult | null>(null);
  const [running, setRunning] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);

  const locked = draw.status === "published";
  const total = split.five + split.four + split.three;

  React.useEffect(() => {
    void (async () => {
      const [{ data: entryRows }, subs] = await Promise.all([
        supabase.from("draw_entries").select("*, profiles(full_name, email)").eq("draw_id", draw.id),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);
      setEntries((entryRows as unknown as EntryRow[]) ?? []);
      setActiveSubs(subs.count ?? 0);
    })();

    if (draw.status === "published" && draw.winning_numbers) {
      void replayPublished();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw.id]);

  async function replayPublished() {
    const { data } = await supabase.from("draw_entries").select("*").eq("draw_id", draw.id);
    const rows = (data as DrawEntry[]) ?? [];
    setResult(
      simulateDraw({
        type: draw.type,
        entries: rows.map((e) => ({ user_id: e.user_id, numbers: e.numbers })),
        poolPaise: draw.pool_paise,
        rolloverInPaise: draw.rollover_in_paise,
        split: { five: draw.split_5, four: draw.split_4, three: draw.split_3 },
        seed: seedFrom(draw.id),
        winningNumbers: draw.winning_numbers ?? undefined,
      })
    );
  }

  function runSimulation() {
    if (total !== 100) return toast("The three tiers have to add up to 100%.", "error");
    if (!entries || entries.length === 0) return toast("No entries in this draw yet.", "error");

    setRunning(true);
    const simulation = simulateDraw({
      type,
      entries: entries.map((e) => ({
        user_id: e.user_id,
        numbers: e.numbers,
        display_name: e.profiles?.full_name ?? e.profiles?.email ?? e.user_id.slice(0, 8),
      })),
      poolPaise: draw.pool_paise,
      rolloverInPaise: draw.rollover_in_paise,
      split,
      seed: seedFrom(`${draw.id}:${Date.now()}`),
    });
    setResult(simulation);
    setRunning(false);

    void supabase
      .from("draws")
      .update({
        type,
        split_5: split.five,
        split_4: split.four,
        split_3: split.three,
        status: "simulated",
        entries_count: entries.length,
        active_subscribers: activeSubs ?? 0,
      })
      .eq("id", draw.id)
      .then(() => onChanged());
  }

  async function publish() {
    if (!result) return;
    setPublishing(true);

    const winnerRows = result.tiers.flatMap((tier) =>
      tier.winners.map((winner) => ({
        draw_id: draw.id,
        user_id: winner.user_id,
        tier: tier.tier,
        amount_paise: winner.amount_paise,
        verification_status: "pending" as const,
        payout_status: "unpaid" as const,
      }))
    );

    const { error: drawError } = await supabase
      .from("draws")
      .update({
        status: "published",
        type,
        winning_numbers: result.winning_numbers,
        split_5: split.five,
        split_4: split.four,
        split_3: split.three,
        rollover_out_paise: result.rollover_out_paise,
        entries_count: result.entries_count,
        active_subscribers: activeSubs ?? 0,
        published_at: new Date().toISOString(),
      })
      .eq("id", draw.id);

    if (drawError) {
      setPublishing(false);
      return toast("Publishing failed. Nothing was released.", "error");
    }

    if (winnerRows.length > 0) await supabase.from("winners").insert(winnerRows);

    // Record each entry's result so subscribers see their match without a recompute.
    await Promise.all(
      (entries ?? []).map((entry) =>
        supabase
          .from("draw_entries")
          .update({
            match_count: entry.numbers.filter((n) => result.winning_numbers.includes(n)).length,
          })
          .eq("id", entry.id)
      )
    );

    // Unclaimed jackpot carries into the next open draw.
    if (result.rollover_out_paise > 0) {
      const { data: nextDraw } = await supabase
        .from("draws")
        .select("*")
        .neq("status", "published")
        .order("draw_month", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (nextDraw) {
        const next = nextDraw as Draw;
        await supabase
          .from("draws")
          .update({ rollover_in_paise: next.rollover_in_paise + result.rollover_out_paise })
          .eq("id", next.id);
      }
    }

    await supabase.from("audit_log").insert({
      action: "draw.published",
      entity: "draws",
      entity_id: draw.id,
      meta: {
        winning_numbers: result.winning_numbers,
        winners: winnerRows.length,
        rollover_out_paise: result.rollover_out_paise,
      },
    });

    setPublishing(false);
    toast("Draw published.", "success");
    await onChanged();
  }

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader>
          <PanelTitle>{formatMonth(draw.draw_month)} draw</PanelTitle>
          <StatusBadge status={draw.status} />
        </PanelHeader>
        <PanelBody className="space-y-6">
          <div className="tnum grid gap-4 sm:grid-cols-3">
            <Fact label="Entries" value={entries ? String(entries.length) : "…"} />
            <Fact label="Active subscribers" value={activeSubs !== null ? String(activeSubs) : "…"} />
            <Fact
              label="Pool including rollover"
              value={formatPaise(draw.pool_paise + draw.rollover_in_paise)}
            />
          </div>

          {locked ? (
            <p className="border border-line-700 bg-ink-900 px-4 py-3 text-sm text-cream-300">
              Published {draw.published_at ? formatDate(draw.published_at) : ""}. The editor is read-only
              from here — results can't be changed once subscribers have seen them.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="draw-type">Draw type</Label>
                  <Select
                    id="draw-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as DrawType)}
                  >
                    <option value="random">Random — standard lottery pull</option>
                    <option value="algorithmic">Algorithmic — weighted by score frequency</option>
                  </Select>
                </div>
              </div>

              <div>
                <p className="text-sm text-cream-300">Pool split</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <SplitInput
                    label="5-match"
                    value={split.five}
                    onChange={(five) => setSplit((s) => ({ ...s, five }))}
                  />
                  <SplitInput
                    label="4-match"
                    value={split.four}
                    onChange={(four) => setSplit((s) => ({ ...s, four }))}
                  />
                  <SplitInput
                    label="3-match"
                    value={split.three}
                    onChange={(three) => setSplit((s) => ({ ...s, three }))}
                  />
                </div>
                <p className={`tnum mt-2 text-sm ${total === 100 ? "text-cream-300" : "text-danger"}`}>
                  Totals {total}% — has to be 100%.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={runSimulation} disabled={running || total !== 100}>
                  {running ? "Running…" : result ? "Re-run simulation" : "Run simulation"}
                </Button>
                {result ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="accent">Publish results</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Publish this draw?</DialogTitle>
                        <DialogDescription>
                          Subscribers see these numbers immediately, {countWinners(result)} winner
                          {countWinners(result) === 1 ? "" : "s"} enter verification, and the editor locks.
                          This can't be undone or re-run.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="ghost">Keep it in simulation</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button variant="accent" onClick={() => void publish()} disabled={publishing}>
                            {publishing ? "Publishing…" : "Publish results"}
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : null}
              </div>
            </>
          )}
        </PanelBody>
      </Panel>

      {result ? (
        <Panel>
          <PanelHeader>
            <PanelTitle>{locked ? "Published result" : "Simulation preview"}</PanelTitle>
            {result.rollover_out_paise > 0 ? (
              <Badge tone="amber">Jackpot rolls over: {formatPaise(result.rollover_out_paise)}</Badge>
            ) : null}
          </PanelHeader>
          <PanelBody className="space-y-6">
            <div>
              <p className="mb-2 text-sm text-cream-300">Winning numbers</p>
              <DrawNumbers numbers={result.winning_numbers} size="lg" reveal />
            </div>

            {result.tiers.map((tier) => (
              <div key={tier.tier}>
                <div className="tnum flex items-baseline justify-between border-b border-line-700 pb-2">
                  <p className="font-display text-lg">Matched {tier.tier}</p>
                  <p className="text-sm text-cream-300">
                    {tier.share_pct}% · {formatPaise(tier.pool_paise)} ·{" "}
                    {tier.winners.length} winner{tier.winners.length === 1 ? "" : "s"}
                  </p>
                </div>
                {tier.winners.length === 0 ? (
                  <p className="pt-3 text-sm text-cream-300">
                    {tier.tier === 5
                      ? "Nobody matched five — this carries into next month."
                      : "Nobody matched this tier this month."}
                  </p>
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Winner</TH>
                        <TH>Numbers</TH>
                        <TH>Amount</TH>
                      </TR>
                    </THead>
                    <tbody>
                      {tier.winners.map((winner) => (
                        <TR key={winner.user_id}>
                          <TD>{winner.display_name ?? winner.user_id.slice(0, 8)}</TD>
                          <TD className="tnum text-cream-300">{winner.numbers.join(" · ")}</TD>
                          <TD className="tnum text-amber-400">{formatPaise(winner.amount_paise)}</TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            ))}
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}

function countWinners(result: SimulationResult) {
  return result.tiers.reduce((sum, tier) => sum + tier.winners.length, 0);
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line-700 bg-ink-900 px-4 py-3">
      <p className="text-sm text-cream-300">{label}</p>
      <p className="mt-1 font-display text-xl">{value}</p>
    </div>
  );
}

function SplitInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`split-${label}`}>{label}</Label>
      <Input
        id={`split-${label}`}
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tnum"
      />
    </div>
  );
}
