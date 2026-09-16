import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import { supabase } from "@/lib/supabase";
import { formatMonth, formatPaise } from "@/lib/format";
import type { Draw, Profile, Winner } from "@/lib/types";

type Row = Winner & {
  profiles: Pick<Profile, "full_name" | "email"> | null;
  draws: Pick<Draw, "draw_month"> | null;
};

export default function AdminWinners() {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [rejecting, setRejecting] = React.useState<Row | null>(null);
  const [reason, setReason] = React.useState("");
  const [viewing, setViewing] = React.useState<{ row: Row; url: string } | null>(null);

  const load = React.useCallback(async () => {
    const { data } = await supabase
      .from("winners")
      .select("*, profiles(full_name, email), draws(draw_month)")
      .order("created_at", { ascending: false });
    setRows((data as unknown as Row[]) ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function approve(row: Row) {
    const { error } = await supabase
      .from("winners")
      .update({ verification_status: "approved", rejection_reason: null })
      .eq("id", row.id);
    if (error) return toast("That approval didn't save.", "error");
    await supabase.from("audit_log").insert({
      action: "winner.approved",
      entity: "winners",
      entity_id: row.id,
    });
    toast("Winner approved.", "success");
    await load();
  }

  async function reject() {
    if (!rejecting) return;
    if (!reason.trim()) return toast("Give a reason — the winner sees it.", "error");
    const { error } = await supabase
      .from("winners")
      .update({ verification_status: "rejected", rejection_reason: reason.trim() })
      .eq("id", rejecting.id);
    if (error) return toast("That rejection didn't save.", "error");
    await supabase.from("audit_log").insert({
      action: "winner.rejected",
      entity: "winners",
      entity_id: rejecting.id,
      meta: { reason: reason.trim() },
    });
    toast("Winner rejected with a reason.", "success");
    setRejecting(null);
    setReason("");
    await load();
  }

  async function markPaid(row: Row) {
    const { error } = await supabase
      .from("winners")
      .update({ payout_status: "paid", paid_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast("That payout didn't save.", "error");
    await supabase.from("audit_log").insert({
      action: "winner.paid",
      entity: "winners",
      entity_id: row.id,
      meta: { amount_paise: row.amount_paise },
    });
    toast("Marked as paid.", "success");
    await load();
  }

  async function openProof(row: Row) {
    if (!row.proof_url) return toast("No proof uploaded yet.", "error");
    const { data } = await supabase.storage.from("proofs").createSignedUrl(row.proof_url, 300);
    if (!data?.signedUrl) return toast("That file couldn't be opened.", "error");
    setViewing({ row, url: data.signedUrl });
  }

  const pending = (rows ?? []).filter((r) => r.verification_status === "pending" || r.verification_status === "rejected");
  const approved = (rows ?? []).filter(
    (r) => r.verification_status === "approved" && r.payout_status === "unpaid"
  );
  const paid = (rows ?? []).filter((r) => r.payout_status === "paid");

  function renderTable(list: Row[], mode: "review" | "approved" | "paid") {
    if (rows === null) return <TableSkeleton />;
    if (list.length === 0) {
      return (
        <EmptyState
          title={
            mode === "review"
              ? "Nothing waiting on review"
              : mode === "approved"
                ? "No approved payouts outstanding"
                : "Nothing paid out yet"
          }
          body={
            mode === "review"
              ? "Winners appear here as soon as a draw is published."
              : mode === "approved"
                ? "Approve a verified winner and it lands here ready to pay."
                : "Completed payouts are archived on this tab."
          }
        />
      );
    }

    return (
      <Table>
        <THead>
          <TR>
            <TH>Winner</TH>
            <TH>Draw</TH>
            <TH>Tier</TH>
            <TH>Amount</TH>
            <TH>Proof</TH>
            <TH />
          </TR>
        </THead>
        <tbody>
          {list.map((row) => (
            <TR key={row.id}>
              <TD>
                {row.profiles?.full_name ?? row.profiles?.email ?? "—"}
                {row.verification_status === "rejected" ? (
                  <Badge tone="danger" className="ml-2">
                    Rejected
                  </Badge>
                ) : null}
              </TD>
              <TD className="tnum text-cream-300">
                {row.draws ? formatMonth(row.draws.draw_month) : "—"}
              </TD>
              <TD className="tnum">Matched {row.tier}</TD>
              <TD className="tnum text-amber-400">{formatPaise(row.amount_paise)}</TD>
              <TD>
                {row.proof_url ? (
                  <Button variant="ghost" size="sm" onClick={() => void openProof(row)}>
                    View proof
                  </Button>
                ) : (
                  <span className="text-sm text-cream-300">Not uploaded</span>
                )}
              </TD>
              <TD className="space-x-2 whitespace-nowrap">
                {mode === "review" ? (
                  <>
                    <Button size="sm" onClick={() => void approve(row)} disabled={!row.proof_url}>
                      Approve
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setRejecting(row)}>
                      Reject
                    </Button>
                  </>
                ) : mode === "approved" ? (
                  <Button variant="accent" size="sm" onClick={() => void markPaid(row)}>
                    Mark as paid
                  </Button>
                ) : (
                  <Badge tone="sage">Paid</Badge>
                )}
              </TD>
            </TR>
          ))}
        </tbody>
      </Table>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Winners</h1>
        <p className="mt-1 text-sm text-cream-300">
          Check the uploaded scores against what was logged, then release the payout.
        </p>
      </div>

      <Tabs defaultValue="review">
        <TabsList>
          <TabsTrigger value="review">Pending review ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved, unpaid ({approved.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({paid.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="review">
          <Panel>
            <PanelHeader>
              <PanelTitle>Waiting on verification</PanelTitle>
            </PanelHeader>
            {renderTable(pending, "review")}
          </Panel>
        </TabsContent>
        <TabsContent value="approved">
          <Panel>
            <PanelHeader>
              <PanelTitle>Ready to pay</PanelTitle>
            </PanelHeader>
            {renderTable(approved, "approved")}
          </Panel>
        </TabsContent>
        <TabsContent value="paid">
          <Panel>
            <PanelHeader>
              <PanelTitle>Completed payouts</PanelTitle>
            </PanelHeader>
            {renderTable(paid, "paid")}
          </Panel>
        </TabsContent>
      </Tabs>

      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this submission</DialogTitle>
            <DialogDescription>
              The winner sees this reason and can upload a new screenshot.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="The dates in the screenshot don't match the scores logged here."
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void reject()}>
              Reject submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="w-[min(48rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>
              Proof from {viewing?.row.profiles?.full_name ?? viewing?.row.profiles?.email}
            </DialogTitle>
          </DialogHeader>
          {viewing ? (
            <img src={viewing.url} alt="Uploaded score screenshot" className="max-h-[70vh] w-full object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
