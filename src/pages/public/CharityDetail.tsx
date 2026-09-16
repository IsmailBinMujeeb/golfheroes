import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { CharityMark } from "@/components/shared/CharityPicker";
import { useAuth } from "@/context/AuthContext";
import { startCheckout } from "@/lib/razorpay";
import { formatDate } from "@/lib/format";
import type { Charity, CharityEvent } from "@/lib/types";

export default function CharityDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, profile, refresh } = useAuth();
  const { toast } = useToast();

  const [charity, setCharity] = React.useState<Charity | null>(null);
  const [events, setEvents] = React.useState<CharityEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [donation, setDonation] = React.useState("500");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const { data, error: loadError } = await supabase
        .from("charities")
        .select("*")
        .eq("slug", slug ?? "")
        .maybeSingle();
      if (!active) return;
      if (loadError) setError("This charity could not be loaded. Refresh to try again.");
      setCharity((data as Charity) ?? null);
      if (data) {
        const { data: eventRows } = await supabase
          .from("charity_events")
          .select("*")
          .eq("charity_id", (data as Charity).id)
          .order("event_date");
        if (active) setEvents((eventRows as CharityEvent[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  async function selectCharity() {
    if (!user) return navigate("/auth", { state: { from: `/charities/${slug}` } });
    if (!charity) return;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ charity_id: charity.id })
      .eq("id", user.id);
    if (updateError) return toast("That charity could not be saved. Try again.", "error");
    await refresh();
    toast(`${charity.name} is now your charity.`, "success");
  }

  async function donate() {
    if (!user || !charity) return navigate("/auth", { state: { from: `/charities/${slug}` } });
    const rupees = Number(donation);
    if (!Number.isFinite(rupees) || rupees < 50) {
      return toast("Enter an amount of ₹50 or more.", "error");
    }
    setBusy(true);
    const result = await startCheckout(
      { kind: "donation", amount_paise: Math.round(rupees * 100), charity_id: charity.id },
      { email: user.email ?? "", name: profile?.full_name }
    );
    setBusy(false);
    toast(
      result.ok ? `Donation sent to ${charity.name}. Thank you.` : result.error,
      result.ok ? "success" : "error"
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-content space-y-4 px-5 py-16">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-content px-5 py-16">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!charity) {
    return (
      <div className="mx-auto max-w-content px-5 py-16">
        <EmptyState
          title="No charity at this address"
          body="The link may be out of date. The directory has every charity currently on the platform."
          action={
            <Button asChild variant="outline">
              <Link to="/charities">Back to the directory</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const isCurrent = profile?.charity_id === charity.id;

  return (
    <div>
      {charity.cover_url ? (
        <img src={charity.cover_url} alt="" className="h-64 w-full border-b border-line-700 object-cover" />
      ) : null}

      <div className="mx-auto max-w-content px-5 py-12">
        <div className="flex items-start gap-4">
          <CharityMark charity={charity} className="size-14" />
          <div>
            <h1 className="font-display text-lead font-semibold">{charity.name}</h1>
            <p className="mt-1 text-sm text-cream-300">{charity.category}</p>
          </div>
        </div>

        <div className="mt-10 grid gap-12 md:grid-cols-[minmax(0,60ch),1fr]">
          <div>
            <p className="whitespace-pre-line leading-relaxed text-cream-300">
              {charity.description ?? charity.short_description}
            </p>

            <h2 className="mt-12 font-display text-xl font-semibold">Upcoming events</h2>
            {events.length === 0 ? (
              <p className="mt-3 text-sm text-cream-300">
                Nothing on the calendar right now. Events appear here as they're announced.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line-700 border border-line-700">
                {events.map((event) => (
                  <li key={event.id} className="flex items-center gap-4 px-4 py-4">
                    {event.image_url ? (
                      <img src={event.image_url} alt="" className="size-14 border border-line-700 object-cover" />
                    ) : null}
                    <div>
                      <p className="text-cream-100">{event.title}</p>
                      <p className="tnum text-sm text-cream-300">
                        {formatDate(event.event_date)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="h-fit space-y-6 border border-line-700 bg-ink-800 p-6">
            <div>
              <p className="font-display text-lg">Send your subscription here</p>
              <p className="mt-2 text-sm text-cream-300">
                Your chosen charity receives your contribution percentage of every payment.
              </p>
              <Button className="mt-4 w-full" onClick={() => void selectCharity()} disabled={isCurrent}>
                {isCurrent ? "This is your charity" : "Select this charity"}
              </Button>
            </div>

            <div className="border-t border-line-700 pt-6">
              <p className="font-display text-lg">Give directly</p>
              <p className="mt-2 text-sm text-cream-300">
                A one-off donation, separate from your subscription and the draw.
              </p>
              <div className="mt-4 flex gap-2">
                <Input
                  value={donation}
                  onChange={(e) => setDonation(e.target.value)}
                  inputMode="numeric"
                  aria-label="Donation amount in rupees"
                  className="tnum"
                />
                <Button variant="accent" onClick={() => void donate()} disabled={busy}>
                  {busy ? "Opening…" : "Donate"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
