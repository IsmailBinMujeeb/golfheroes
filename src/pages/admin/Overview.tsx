import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { supabase } from "@/lib/supabase";
import { formatDate, formatMonth, formatPaise } from "@/lib/format";
import type { AuditEntry, Charity, Draw, Payment } from "@/lib/types";

interface Stats {
  users: number;
  activeSubs: number;
  poolPaise: number;
  charityPaise: number;
  entriesThisMonth: number;
}

export default function AdminOverview() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [charities, setCharities] = React.useState<Charity[]>([]);
  const [draws, setDraws] = React.useState<Draw[]>([]);
  const [audit, setAudit] = React.useState<AuditEntry[] | null>(null);

  React.useEffect(() => {
    void (async () => {
      const [users, subs, paymentRows, charityRows, drawRows, auditRows] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("payments").select("*").eq("status", "paid").order("created_at"),
        supabase.from("charities").select("*"),
        supabase.from("draws").select("*").order("draw_month"),
        supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(12),
      ]);

      const paid = (paymentRows.data as Payment[]) ?? [];
      const allDraws = (drawRows.data as Draw[]) ?? [];
      const open = allDraws.find((d) => d.status !== "published");

      setPayments(paid);
      setCharities((charityRows.data as Charity[]) ?? []);
      setDraws(allDraws);
      setAudit((auditRows.data as AuditEntry[]) ?? []);
      setStats({
        users: users.count ?? 0,
        activeSubs: subs.count ?? 0,
        poolPaise: paid.reduce((sum, p) => sum + p.prize_pool_paise, 0),
        charityPaise: paid.reduce((sum, p) => sum + p.charity_paise, 0),
        entriesThisMonth: open?.entries_count ?? 0,
      });
    })();
  }, []);

  const growth = React.useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const payment of payments) {
      if (payment.kind !== "subscription") continue;
      const month = payment.created_at.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    }
    let running = 0;
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => {
        running += count;
        return { month, subscribers: running };
      });
  }, [payments]);

  const charitySplit = React.useMemo(() => {
    const byCharity = new Map<string, number>();
    for (const payment of payments) {
      if (!payment.charity_id) continue;
      byCharity.set(payment.charity_id, (byCharity.get(payment.charity_id) ?? 0) + payment.charity_paise);
    }
    return [...byCharity.entries()]
      .map(([id, paise]) => ({
        name: charities.find((c) => c.id === id)?.name ?? "Unknown",
        rupees: Math.round(paise / 100),
      }))
      .sort((a, b) => b.rupees - a.rupees)
      .slice(0, 6);
  }, [payments, charities]);

  const poolOverTime = draws.map((draw) => ({
    month: formatMonth(draw.draw_month),
    rupees: Math.round((draw.pool_paise + draw.rollover_in_paise) / 100),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-cream-300">Platform totals, trends and the recent audit trail.</p>
      </div>

      <div className="grid gap-px border border-line-700 bg-line-700 sm:grid-cols-2 xl:grid-cols-5">
        <Tile label="Total users" value={stats ? String(stats.users) : null} />
        <Tile label="Active subscriptions" value={stats ? String(stats.activeSubs) : null} />
        <Tile label="Prize pool collected" value={stats ? formatPaise(stats.poolPaise) : null} />
        <Tile label="Raised for charity" value={stats ? formatPaise(stats.charityPaise) : null} />
        <Tile label="Entries this month" value={stats ? String(stats.entriesThisMonth) : null} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>Subscriber growth</PanelTitle>
          </PanelHeader>
          <PanelBody className="h-64">
            {growth.length === 0 ? (
              <EmptyState title="No payments yet" body="The chart fills in once subscriptions start." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growth}>
                  <CartesianGrid stroke="#26324A" vertical={false} />
                  <XAxis dataKey="month" stroke="#B8B3A6" fontSize={12} />
                  <YAxis stroke="#B8B3A6" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="subscribers" stroke="#4C7C59" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Where charity money went</PanelTitle>
          </PanelHeader>
          <PanelBody className="h-64">
            {charitySplit.length === 0 ? (
              <EmptyState title="No contributions yet" body="Charity totals appear after the first payment." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charitySplit} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid stroke="#26324A" horizontal={false} />
                  <XAxis type="number" stroke="#B8B3A6" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="#B8B3A6" fontSize={12} width={120} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="rupees" fill="#4C7C59" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </PanelBody>
        </Panel>

        <Panel className="xl:col-span-2">
          <PanelHeader>
            <PanelTitle>Prize pool by month</PanelTitle>
          </PanelHeader>
          <PanelBody className="h-64">
            {poolOverTime.length === 0 ? (
              <EmptyState title="No draws created yet" body="Create a draw to start tracking the pool." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={poolOverTime}>
                  <CartesianGrid stroke="#26324A" vertical={false} />
                  <XAxis dataKey="month" stroke="#B8B3A6" fontSize={12} />
                  <YAxis stroke="#B8B3A6" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="rupees" fill="#C97C3D" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>Recent activity</PanelTitle>
        </PanelHeader>
        {audit === null ? (
          <div className="p-4">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : audit.length === 0 ? (
          <PanelBody>
            <EmptyState title="Nothing logged yet" body="Admin actions are recorded here as they happen." />
          </PanelBody>
        ) : (
          <ul className="divide-y divide-line-700">
            {audit.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <span className="text-cream-100">
                  {entry.action} · {entry.entity}
                </span>
                <span className="tnum text-cream-300">{formatDate(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

const tooltipStyle = {
  background: "#131C2E",
  border: "1px solid #26324A",
  color: "#F5F1E8",
  fontSize: 12,
};

function Tile({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-ink-900 px-5 py-5">
      <p className="text-sm text-cream-300">{label}</p>
      <p className="tnum mt-1 font-display text-2xl font-semibold">
        {value ?? <Skeleton className="h-7 w-20" />}
      </p>
    </div>
  );
}
