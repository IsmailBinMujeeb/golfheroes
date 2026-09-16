import * as React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/toast";
import { CharityMark, CharityPicker } from "@/components/shared/CharityPicker";
import { useAuth } from "@/context/AuthContext";
import { PLANS, startCheckout, yearlySavingPct } from "@/lib/razorpay";
import { splitSubscription } from "@/lib/draw";
import { formatPaise } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Charity, PlanInterval } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRIZE_POOL_PCT = 30;

export default function Subscribe() {
  const { user, profile, isSubscribed, refresh } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [plan, setPlan] = React.useState<PlanInterval>("monthly");
  const [charity, setCharity] = React.useState<Charity | null>(null);
  const [pct, setPct] = React.useState(profile?.contribution_pct ?? 10);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!profile?.charity_id) return;
    void supabase
      .from("charities")
      .select("*")
      .eq("id", profile.charity_id)
      .maybeSingle()
      .then(({ data }) => setCharity((data as Charity) ?? null));
  }, [profile?.charity_id]);

  if (!user) return <Navigate to="/auth" state={{ from: "/subscribe" }} replace />;
  if (isSubscribed) return <Navigate to="/dashboard" replace />;

  const price = PLANS[plan].pricePaise;
  const split = splitSubscription(price, pct, PRIZE_POOL_PCT);

  async function confirm() {
    if (!charity) return toast("Pick a charity before paying.", "error");
    setBusy(true);
    const result = await startCheckout(
      { kind: "subscription", plan, charity_id: charity.id, contribution_pct: pct },
      { email: user?.email ?? "", name: profile?.full_name }
    );
    setBusy(false);

    if (!result.ok) return toast(result.error, "error");
    await refresh();
    toast("You're subscribed. Log your first score to enter this month's draw.", "success");
    navigate("/dashboard");
  }

  return (
    <div className="mx-auto max-w-content px-5 py-16">
      <h1 className="font-display text-lead font-semibold">Choose how you play</h1>
      <p className="mt-3 max-w-xl text-cream-300">
        Same draw entry on both plans. The yearly plan just costs less per month.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr,22rem] lg:items-start">
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-xl font-semibold">1. Pick a plan</h2>
            <div className="mt-4 grid gap-px bg-line-700 sm:grid-cols-2">
              {(Object.keys(PLANS) as PlanInterval[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPlan(key)}
                  className={cn(
                    "bg-ink-900 px-5 py-6 text-left transition-colors",
                    plan === key ? "bg-ink-800 ring-1 ring-inset ring-sage-500" : "hover:bg-ink-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg">{PLANS[key].label}</span>
                    {key === "yearly" ? (
                      <span className="tnum border border-amber-500/50 px-2 py-0.5 text-xs text-amber-400">
                        Save {yearlySavingPct()}%
                      </span>
                    ) : null}
                  </div>
                  <p className="tnum mt-3 font-display text-3xl font-semibold">
                    {formatPaise(PLANS[key].pricePaise)}
                    <span className="text-base font-normal text-cream-300">
                      {key === "monthly" ? " / month" : " / year"}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-cream-300">{PLANS[key].note}</p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">2. Pick a charity</h2>
            <p className="mt-2 text-sm text-cream-300">
              You can change this later without affecting your subscription.
            </p>
            <div className="mt-4">
              {charity ? (
                <div className="mb-3 flex items-center gap-3 border border-sage-500/50 bg-sage-500/5 px-4 py-3">
                  <CharityMark charity={charity} />
                  <span className="flex-1 text-sm text-cream-100">{charity.name}</span>
                  <Check className="size-4 text-sage-400" />
                </div>
              ) : null}
              <CharityPicker value={charity?.id ?? null} onChange={setCharity} />
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">3. Set your contribution</h2>
            <p className="mt-2 text-sm text-cream-300">
              Ten percent is the floor. Anything above that is yours to decide.
            </p>
            <div className="mt-6 flex items-center gap-5">
              <Slider
                value={[pct]}
                onValueChange={([next]) => setPct(next)}
                min={10}
                max={100}
                step={1}
                aria-label="Charity contribution percentage"
              />
              <span className="tnum w-14 text-right font-display text-2xl">{pct}%</span>
            </div>
            <p className="tnum mt-4 text-sm text-sage-400">
              You give {formatPaise(split.charity_paise)} of every {formatPaise(price)}.
            </p>
          </section>
        </div>

        <aside className="border border-line-700 bg-ink-800 p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg">Order summary</h2>
          <dl className="tnum mt-5 space-y-3 text-sm">
            <Row label={`${PLANS[plan].label} plan`} value={formatPaise(price)} />
            <Row
              label={charity ? `To ${charity.name}` : "To your charity"}
              value={formatPaise(split.charity_paise)}
              tone="sage"
            />
            <Row label="Into the prize pool" value={formatPaise(split.prize_pool_paise)} tone="amber" />
            <Row label="Running the platform" value={formatPaise(split.platform_paise)} />
          </dl>

          <Button className="mt-6 w-full" onClick={() => void confirm()} disabled={busy || !charity}>
            {busy ? "Opening payment…" : "Confirm and subscribe"}
          </Button>
          <p className="mt-3 text-xs text-cream-500">
            Payment is handled by Razorpay. Card details never touch this site.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "sage" | "amber";
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line-700 pb-3 last:border-0">
      <dt className="text-cream-300">{label}</dt>
      <dd
        className={cn(
          "text-cream-100",
          tone === "sage" && "text-sage-400",
          tone === "amber" && "text-amber-400"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
