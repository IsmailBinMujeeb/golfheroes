import * as React from "react";
import { useNavigate } from "react-router-dom";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { PLANS } from "@/lib/razorpay";
import { formatDate, formatPaise } from "@/lib/format";

export default function Account() {
  const { user, profile, subscription, isSubscribed, refresh, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = React.useState(profile?.full_name ?? "");
  const [notifications, setNotifications] = React.useState(profile?.notifications_enabled ?? true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setNotifications(profile?.notifications_enabled ?? true);
  }, [profile]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, notifications_enabled: notifications })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast("Those changes didn't save. Try again.", "error");
    await refresh();
    toast("Profile updated.", "success");
  }

  async function cancelSubscription() {
    if (!subscription) return;
    const { error } = await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("id", subscription.id);
    if (error) return toast("The cancellation didn't go through. Try again.", "error");
    await refresh();
    toast("Your plan ends at the close of this period. Nothing else changes until then.", "success");
  }

  async function deleteAccount() {
    const { error } = await supabase.functions.invoke("delete-account", {});
    if (error) return toast("The account couldn't be deleted. Contact support.", "error");
    await signOut();
    navigate("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Account</h1>
        <p className="mt-1 text-sm text-cream-300">Your details, your plan, your notifications.</p>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>Profile</PanelTitle>
        </PanelHeader>
        <PanelBody className="max-w-md space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full-name">Full name</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-email">Email</Label>
            <Input id="account-email" value={user?.email ?? ""} disabled />
          </div>
          <div className="flex items-center justify-between border-t border-line-700 pt-4">
            <div>
              <p className="text-sm text-cream-100">Draw and payout emails</p>
              <p className="text-sm text-cream-300">Results, payout updates and renewal reminders.</p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
              aria-label="Draw and payout emails"
            />
          </div>
          <Button onClick={() => void saveProfile()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Subscription</PanelTitle>
        </PanelHeader>
        <PanelBody className="space-y-4">
          {isSubscribed && subscription ? (
            <>
              <div className="tnum space-y-1 text-sm">
                <p className="text-cream-100">
                  {subscription.plan === "yearly" ? "Yearly" : "Monthly"} ·{" "}
                  {formatPaise(subscription.amount_paise)}
                </p>
                {subscription.current_period_end ? (
                  <p className="text-cream-300">
                    {subscription.cancel_at_period_end ? "Ends" : "Renews"}{" "}
                    {formatDate(subscription.current_period_end)}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => navigate("/subscribe")}>
                  Change plan
                </Button>
                {!subscription.cancel_at_period_end ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="danger">Cancel plan</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancel your plan?</DialogTitle>
                        <DialogDescription>
                          You keep access and stay in the draw until{" "}
                          {subscription.current_period_end
                            ? formatDate(subscription.current_period_end)
                            : "the end of this period"}
                          . After that, scores stop entering draws and contributions stop.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="ghost">Keep my plan</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button variant="danger" onClick={() => void cancelSubscription()}>
                            Cancel plan
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-cream-300">
                No active plan. Subscribing from {formatPaise(PLANS.monthly.pricePaise)} a month puts you
                back in the draw.
              </p>
              <Button onClick={() => navigate("/subscribe")}>Choose a plan</Button>
            </div>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Leaving</PanelTitle>
        </PanelHeader>
        <PanelBody className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void signOut()}>
            Log out
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="danger">Delete account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  This removes your profile, scores and draw entries. Past charity contributions stay with
                  the charities. Unpaid winnings are forfeited. It can't be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Keep my account</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="danger" onClick={() => void deleteAccount()}>
                    Delete account
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PanelBody>
      </Panel>
    </div>
  );
}
