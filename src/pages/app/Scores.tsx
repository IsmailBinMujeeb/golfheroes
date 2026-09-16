import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import { SubscribeBanner } from "@/components/shared/SubscribeGate";
import { DrawNumbers } from "@/components/shared/DrawNumbers";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { syncDrawEntry } from "@/lib/entries";
import { numbersFromScores, PICKS } from "@/lib/draw";
import { formatDate, todayISO } from "@/lib/format";
import type { Score } from "@/lib/types";

export default function Scores() {
  const { user, isSubscribed } = useAuth();
  const { toast } = useToast();

  const [scores, setScores] = React.useState<Score[] | null>(null);
  const [playedOn, setPlayedOn] = React.useState(todayISO());
  const [score, setScore] = React.useState(30);
  const [editing, setEditing] = React.useState<Score | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", user.id)
      .order("played_on", { ascending: false })
      .limit(PICKS);
    setScores((data as Score[]) ?? []);
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const alreadyLogged = (scores ?? []).some(
    (s) => s.played_on === playedOn && s.id !== editing?.id
  );

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (score < 1 || score > 45) {
      return setError("Stableford scores run from 1 to 45.");
    }
    if (alreadyLogged) {
      return setError("You've already logged a score for this date — edit that one instead.");
    }
    if (!user) return;

    setBusy(true);
    const result = editing
      ? await supabase.from("scores").update({ score, played_on: playedOn }).eq("id", editing.id)
      : await supabase.from("scores").insert({ user_id: user.id, score, played_on: playedOn });
    setBusy(false);

    if (result.error) {
      return setError(
        result.error.code === "23505"
          ? "You've already logged a score for this date — edit that one instead."
          : "That score didn't save. Check your connection and try again."
      );
    }

    toast(editing ? "Score updated." : "Score saved.", "success");
    setEditing(null);
    setScore(30);
    setPlayedOn(todayISO());
    await load();
    const sync = await syncDrawEntry(user.id);
    if (sync.entered) toast("Your draw entry is up to date.");
  }

  async function remove(target: Score) {
    if (!user) return;
    const { error: deleteError } = await supabase.from("scores").delete().eq("id", target.id);
    if (deleteError) return toast("That score couldn't be deleted. Try again.", "error");
    toast("Score deleted.", "success");
    await load();
    await syncDrawEntry(user.id);
  }

  const ticket = scores && scores.length === PICKS ? numbersFromScores(scores) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Scores</h1>
        <p className="mt-1 text-sm text-cream-300">
          Only your five most recent rounds are kept. A sixth entry replaces the oldest automatically.
        </p>
      </div>

      {!isSubscribed ? <SubscribeBanner /> : null}

      <div className="grid gap-6 lg:grid-cols-[22rem,1fr] lg:items-start">
        <Panel>
          <PanelHeader>
            <PanelTitle>{editing ? "Edit a score" : "Enter a score"}</PanelTitle>
            {editing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setScore(30);
                  setPlayedOn(todayISO());
                  setError(null);
                }}
              >
                Cancel
              </Button>
            ) : null}
          </PanelHeader>
          <PanelBody>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="played-on">Date played</Label>
                <Input
                  id="played-on"
                  type="date"
                  max={todayISO()}
                  value={playedOn}
                  onChange={(e) => setPlayedOn(e.target.value)}
                  className="tnum"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="score">Stableford points</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setScore((s) => Math.max(1, s - 1))}
                    aria-label="Lower the score"
                  >
                    –
                  </Button>
                  <Input
                    id="score"
                    type="number"
                    min={1}
                    max={45}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="tnum text-center"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setScore((s) => Math.min(45, s + 1))}
                    aria-label="Raise the score"
                  >
                    +
                  </Button>
                </div>
              </div>

              {error ? (
                <p role="alert" className="border border-danger/50 bg-danger/5 px-3 py-2 text-sm">
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={busy || !isSubscribed}>
                {busy ? "Saving…" : editing ? "Update score" : "Save score"}
              </Button>
            </form>
          </PanelBody>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader>
              <PanelTitle>Your last five rounds</PanelTitle>
              <span className="tnum text-sm text-cream-300">{scores?.length ?? 0} of {PICKS}</span>
            </PanelHeader>
            {scores === null ? (
              <TableSkeleton rows={4} />
            ) : scores.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No scores yet"
                  body="Log your first round to start building the five scores that enter you into the draw."
                />
              </div>
            ) : (
              <ul className="divide-y divide-line-700">
                {scores.map((row) => (
                  <li key={row.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="tnum w-32 text-sm text-cream-300">{formatDate(row.played_on)}</span>
                    <span className="tnum flex-1 font-display text-xl">{row.score}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(row);
                        setScore(row.score);
                        setPlayedOn(row.played_on);
                      }}
                      aria-label={`Edit the score from ${formatDate(row.played_on)}`}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void remove(row)}
                      aria-label={`Delete the score from ${formatDate(row.played_on)}`}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Your numbers this month</PanelTitle>
            </PanelHeader>
            <PanelBody>
              {ticket ? (
                <>
                  <DrawNumbers numbers={ticket} />
                  <p className="mt-3 text-sm text-cream-300">
                    These come straight from your five scores. Log a new round and they change.
                  </p>
                </>
              ) : (
                <p className="text-sm text-cream-300">
                  {PICKS - (scores?.length ?? 0)} more{" "}
                  {PICKS - (scores?.length ?? 0) === 1 ? "score" : "scores"} and you're in this month's draw.
                </p>
              )}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}
