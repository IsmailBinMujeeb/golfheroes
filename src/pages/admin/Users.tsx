import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import { supabase } from "@/lib/supabase";
import { syncDrawEntry } from "@/lib/entries";
import { formatDate } from "@/lib/format";
import type { Charity, Profile, Score, Subscription } from "@/lib/types";

type Row = Profile & {
  charities: Pick<Charity, "name"> | null;
  subscriptions: Pick<Subscription, "status" | "plan" | "current_period_end">[] | null;
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Row | null>(null);

  const load = React.useCallback(async () => {
    setRows(null);
    let request = supabase
      .from("profiles")
      .select("*, charities(name), subscriptions(status, plan, current_period_end)")
      .order("created_at", { ascending: false });
    if (query.trim()) request = request.or(`email.ilike.%${query.trim()}%,full_name.ilike.%${query.trim()}%`);
    const { data } = await request;
    setRows((data as unknown as Row[]) ?? []);
  }, [query]);

  React.useEffect(() => {
    const id = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(id);
  }, [load]);

  async function toggleSuspend(row: Row) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: !row.is_suspended })
      .eq("id", row.id);
    if (error) return toast("That change didn't save. Try again.", "error");
    toast(row.is_suspended ? "User reinstated." : "User suspended.", "success");
    setSelected(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-cream-300">
          Profiles, subscriptions and score history for every account.
        </p>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email"
        aria-label="Search users"
        className="max-w-sm"
      />

      <Panel>
        <PanelHeader>
          <PanelTitle>All accounts</PanelTitle>
          <span className="tnum text-sm text-cream-300">{rows?.length ?? 0}</span>
        </PanelHeader>
        {rows === null ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No accounts match" body="Clear the search to see every user." />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Subscription</TH>
                <TH>Charity</TH>
                <TH>Joined</TH>
                <TH />
              </TR>
            </THead>
            <tbody>
              {rows.map((row) => {
                const sub = row.subscriptions?.[0];
                return (
                  <TR key={row.id}>
                    <TD>
                      {row.full_name ?? "—"}
                      {row.role === "admin" ? (
                        <Badge tone="amber" className="ml-2">
                          Admin
                        </Badge>
                      ) : null}
                      {row.is_suspended ? (
                        <Badge tone="danger" className="ml-2">
                          Suspended
                        </Badge>
                      ) : null}
                    </TD>
                    <TD className="text-cream-300">{row.email}</TD>
                    <TD>
                      {sub ? (
                        <Badge tone={sub.status === "active" ? "sage" : "neutral"}>
                          {sub.status} · {sub.plan}
                        </Badge>
                      ) : (
                        <span className="text-cream-300">None</span>
                      )}
                    </TD>
                    <TD className="text-cream-300">{row.charities?.name ?? "—"}</TD>
                    <TD className="tnum text-cream-300">{formatDate(row.created_at)}</TD>
                    <TD>
                      <Button variant="outline" size="sm" onClick={() => setSelected(row)}>
                        View
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>

      {selected ? (
        <UserDrawer
          user={selected}
          onClose={() => setSelected(null)}
          onSaved={() => void load()}
          onToggleSuspend={() => void toggleSuspend(selected)}
        />
      ) : null}
    </div>
  );
}

function UserDrawer({
  user,
  onClose,
  onSaved,
  onToggleSuspend,
}: {
  user: Row;
  onClose: () => void;
  onSaved: () => void;
  onToggleSuspend: () => void;
}) {
  const { toast } = useToast();
  const [fullName, setFullName] = React.useState(user.full_name ?? "");
  const [role, setRole] = React.useState(user.role);
  const [pct, setPct] = React.useState(user.contribution_pct);
  const [scores, setScores] = React.useState<Score[] | null>(null);

  const loadScores = React.useCallback(async () => {
    const { data } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", user.id)
      .order("played_on", { ascending: false });
    setScores((data as Score[]) ?? []);
  }, [user.id]);

  React.useEffect(() => {
    void loadScores();
  }, [loadScores]);

  async function saveProfile() {
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, role, contribution_pct: pct })
      .eq("id", user.id);
    if (error) return toast("Those changes didn't save. Try again.", "error");
    toast("User updated.", "success");
    onSaved();
  }

  async function editScore(score: Score, value: number) {
    if (value < 1 || value > 45) return toast("Scores run from 1 to 45.", "error");
    const { error } = await supabase.from("scores").update({ score: value }).eq("id", score.id);
    if (error) return toast("That score didn't save.", "error");
    await supabase.from("audit_log").insert({
      action: "score.edited",
      entity: "scores",
      entity_id: score.id,
      meta: { from: score.score, to: value },
    });
    await syncDrawEntry(user.id);
    toast("Score updated.", "success");
    await loadScores();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-900/70" onClick={onClose}>
      <aside
        className="h-full w-[min(32rem,100vw)] overflow-y-auto border-l border-line-700 bg-ink-800 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">{user.full_name ?? user.email}</h2>
            <p className="text-sm text-cream-300">{user.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="drawer-name">Full name</Label>
            <Input id="drawer-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="drawer-role">Role</Label>
              <Select
                id="drawer-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Profile["role"])}
              >
                <option value="subscriber">Subscriber</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drawer-pct">Contribution %</Label>
              <Input
                id="drawer-pct"
                type="number"
                min={10}
                max={100}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                className="tnum"
              />
            </div>
          </div>
          <Button onClick={() => void saveProfile()}>Save changes</Button>
        </div>

        <h3 className="mt-8 font-display text-lg">Score history</h3>
        {scores === null ? (
          <TableSkeleton rows={3} />
        ) : scores.length === 0 ? (
          <p className="mt-2 text-sm text-cream-300">No scores logged.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-700 border border-line-700">
            {scores.map((score) => (
              <li key={score.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="tnum flex-1 text-sm text-cream-300">{formatDate(score.played_on)}</span>
                <Input
                  type="number"
                  min={1}
                  max={45}
                  defaultValue={score.score}
                  className="tnum h-8 w-20 text-center"
                  onBlur={(e) => {
                    const next = Number(e.target.value);
                    if (next !== score.score) void editScore(score, next);
                  }}
                  aria-label={`Score for ${formatDate(score.played_on)}`}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 border-t border-line-700 pt-6">
          <Button variant="danger" onClick={onToggleSuspend}>
            {user.is_suspended ? "Reinstate user" : "Suspend user"}
          </Button>
          <p className="mt-2 text-xs text-cream-300">
            Suspending blocks new score entries and removes the account from open draws.
          </p>
        </div>
      </aside>
    </div>
  );
}
