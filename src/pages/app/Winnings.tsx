import * as React from "react";
import { UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/states";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatDate, formatMonth, formatPaise } from "@/lib/format";
import type { Draw, Winner } from "@/lib/types";

type WinnerRow = Winner & { draws: Pick<Draw, "draw_month"> | null };

export default function Winnings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = React.useState<WinnerRow[] | null>(null);
  const [uploading, setUploading] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("winners")
      .select("*, draws(draw_month)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data as unknown as WinnerRow[]) ?? []);
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function uploadProof(winner: WinnerRow, file: File) {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      return toast("That file is over 5 MB. Upload a smaller screenshot.", "error");
    }
    setUploading(winner.id);

    const path = `${user.id}/${winner.id}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("proofs").upload(path, file, {
      upsert: true,
    });

    if (uploadError) {
      setUploading(null);
      return toast("The upload didn't go through. Try again in a moment.", "error");
    }

    const { error: updateError } = await supabase
      .from("winners")
      .update({ proof_url: path, verification_status: "pending", rejection_reason: null })
      .eq("id", winner.id);

    setUploading(null);
    if (updateError) return toast("The file uploaded but the record didn't update. Try again.", "error");
    toast("Proof submitted for verification.", "success");
    await load();
  }

  const total = (rows ?? []).reduce((sum, r) => sum + r.amount_paise, 0);
  const paid = (rows ?? [])
    .filter((r) => r.payout_status === "paid")
    .reduce((sum, r) => sum + r.amount_paise, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Winnings</h1>
        <p className="mt-1 text-sm text-cream-300">
          Every win, what stage it's at, and what's still to be paid.
        </p>
      </div>

      <div className="grid gap-px border border-line-700 bg-line-700 sm:grid-cols-2">
        <Stat label="Total won" value={rows ? formatPaise(total) : null} />
        <Stat label="Paid out" value={rows ? formatPaise(paid) : null} accent />
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>Your wins</PanelTitle>
        </PanelHeader>
        {rows === null ? (
          <div className="p-4">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <PanelBody>
            <EmptyState
              title="Nothing won yet"
              body="Keep your five scores current and you're in every monthly draw automatically."
            />
          </PanelBody>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Draw</TH>
                <TH>Tier</TH>
                <TH>Amount</TH>
                <TH>Status</TH>
                <TH>Proof</TH>
              </TR>
            </THead>
            <tbody>
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD className="tnum">{row.draws ? formatMonth(row.draws.draw_month) : "—"}</TD>
                  <TD className="tnum">Matched {row.tier}</TD>
                  <TD className="tnum text-amber-400">{formatPaise(row.amount_paise)}</TD>
                  <TD>
                    <StatusBadge row={row} />
                    {row.verification_status === "rejected" && row.rejection_reason ? (
                      <p className="mt-1 max-w-xs text-xs text-cream-300">{row.rejection_reason}</p>
                    ) : null}
                    {row.payout_status === "paid" && row.paid_at ? (
                      <p className="tnum mt-1 text-xs text-cream-300">Paid {formatDate(row.paid_at)}</p>
                    ) : null}
                  </TD>
                  <TD>
                    {row.verification_status === "approved" ? (
                      <span className="text-sm text-cream-300">Verified</span>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-2 border border-line-600 px-3 py-1.5 text-sm text-cream-100 hover:bg-ink-900">
                        <UploadCloud className="size-4" />
                        {uploading === row.id
                          ? "Uploading…"
                          : row.proof_url
                            ? "Replace screenshot"
                            : "Upload screenshot"}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadProof(row, file);
                          }}
                        />
                      </label>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <p className="text-sm text-cream-300">
        Verification means a screenshot of the same scores from your golf platform. An admin checks it
        against what you logged here before the payout is released.
      </p>
    </div>
  );
}

function StatusBadge({ row }: { row: Winner }) {
  if (row.payout_status === "paid") return <Badge tone="sage">Paid</Badge>;
  if (row.verification_status === "approved") return <Badge tone="amber">Approved, awaiting payout</Badge>;
  if (row.verification_status === "rejected") return <Badge tone="danger">Rejected — re-upload</Badge>;
  return <Badge>Pending verification</Badge>;
}

function Stat({ label, value, accent }: { label: string; value: string | null; accent?: boolean }) {
  return (
    <div className="bg-ink-900 px-5 py-5">
      <p className="text-sm text-cream-300">{label}</p>
      <p
        className={`tnum mt-1 font-display text-2xl font-semibold ${
          accent ? "text-sage-400" : "text-cream-100"
        }`}
      >
        {value ?? <Skeleton className="h-7 w-24" />}
      </p>
    </div>
  );
}
