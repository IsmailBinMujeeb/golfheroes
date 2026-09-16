import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/toast";
import { CharityMark, CharityPicker } from "@/components/shared/CharityPicker";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { PLANS, startCheckout } from "@/lib/razorpay";
import { formatPaise } from "@/lib/format";
import type { Charity } from "@/lib/types";

export default function CharitySettings() {
  const { user, profile, subscription, refresh } = useAuth();
  const { toast } = useToast();

  const [charity, setCharity] = React.useState<Charity | null>(null);
  const [picking, setPicking] = React.useState(false);
  const [pct, setPct] = React.useState(profile?.contribution_pct ?? 10);
  const [donation, setDonation] = React.useState("500");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setPct(profile?.contribution_pct ?? 10), [profile?.contribution_pct]);

  React.useEffect(() => {
    if (!profile?.charity_id) return setCharity(null);
    void supabase
      .from("charities")
      .select("*")
      .eq("id", profile.charity_id)
      .maybeSingle()
      .then(({ data }) => setCharity((data as Charity) ?? null));
  }, [profile?.charity_id]);

  const fee = subscription?.amount_paise ?? PLANS.monthly.pricePaise;
  const given = Math.round((fee * pct) / 100);
  const dirty = pct !== (profile?.contribution_pct ?? 10);

  async function saveSettings(nextCharityId?: string) {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        contribution_pct: pct,
        ...(nextCharityId ? { charity_id: nextCharityId } : {}),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast("Those changes didn't save. Try again.", "error");
    await refresh();
    toast("Changes saved.", "success");
  }

  async function donate() {
    if (!user || !charity) return;
    const rupees = Number(donation);
    if (!Number.isFinite(rupees) || rupees < 50) {
      return toast("Enter an amount of ₹50 or more.", "error");
    }
    const result = await startCheckout(
      { kind: "donation", amount_paise: Math.round(rupees * 100), charity_id: charity.id },
      { email: user.email ?? "", name: profile?.full_name }
    );
    toast(
      result.ok ? `Donation sent to ${charity.name}. Thank you.` : result.error,
      result.ok ? "success" : "error"
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Charity</h1>
        <p className="mt-1 text-sm text-cream-300">
          Where your money goes, and how much of it. Changes apply from your next payment.
        </p>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>Current charity</PanelTitle>
          <Button variant="outline" size="sm" onClick={() => setPicking((p) => !p)}>
            {picking ? "Close" : "Change charity"}
          </Button>
        </PanelHeader>
        <PanelBody className="space-y-5">
          {charity ? (
            <div className="flex items-center gap-3">
              <CharityMark charity={charity} className="size-12" />
              <div>
                <p className="text-cream-100">{charity.name}</p>
                <p className="text-sm text-cream-300">{charity.category}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-cream-300">
              You haven't picked a charity yet. Choose one and your contribution starts flowing.
            </p>
          )}

          {picking ? (
            <CharityPicker
              value={charity?.id ?? null}
              onChange={async (next) => {
                setCharity(next);
                setPicking(false);
                await saveSettings(next.id);
              }}
            />
          ) : null}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Contribution</PanelTitle>
        </PanelHeader>
        <PanelBody className="space-y-5">
          <div className="flex items-center gap-5">
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
          <p className="tnum text-sm text-sage-400">
            You give {formatPaise(given)} of every {formatPaise(fee)}.
          </p>
          <Button onClick={() => void saveSettings()} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Make an independent donation</PanelTitle>
        </PanelHeader>
        <PanelBody className="space-y-3">
          <p className="text-sm text-cream-300">
            Goes straight to your charity. It doesn't change your subscription or your draw entry.
          </p>
          <div className="flex max-w-sm gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="donation" className="sr-only">
                Donation amount in rupees
              </Label>
              <Input
                id="donation"
                value={donation}
                onChange={(e) => setDonation(e.target.value)}
                inputMode="numeric"
                className="tnum"
              />
            </div>
            <Button variant="accent" onClick={() => void donate()} disabled={!charity}>
              Donate
            </Button>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
