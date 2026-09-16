import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import type { Charity, CharityEvent } from "@/lib/types";

const blank = {
  name: "",
  slug: "",
  category: "",
  short_description: "",
  description: "",
  logo_url: "",
  cover_url: "",
  is_featured: false,
  is_active: true,
};

export default function AdminCharities() {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<Charity[] | null>(null);
  const [editing, setEditing] = React.useState<Partial<Charity> | null>(null);

  const load = React.useCallback(async () => {
    const { data } = await supabase.from("charities").select("*").order("name");
    setRows((data as Charity[]) ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save(charity: Partial<Charity>) {
    const payload = {
      ...charity,
      slug: charity.slug?.trim() || slugify(charity.name ?? ""),
    };
    const { error } = charity.id
      ? await supabase.from("charities").update(payload).eq("id", charity.id)
      : await supabase.from("charities").insert(payload);
    if (error) return toast("That charity didn't save. Check the name and slug are unique.", "error");
    toast(charity.id ? "Charity updated." : "Charity added.", "success");
    setEditing(null);
    await load();
  }

  async function toggleActive(charity: Charity) {
    const { error } = await supabase
      .from("charities")
      .update({ is_active: !charity.is_active })
      .eq("id", charity.id);
    if (error) return toast("That change didn't save.", "error");
    toast(charity.is_active ? "Charity deactivated." : "Charity reactivated.", "success");
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Charities</h1>
          <p className="mt-1 text-sm text-cream-300">
            The directory subscribers choose from, plus the events on each profile.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...blank })}>Add charity</Button>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>All charities</PanelTitle>
        </PanelHeader>
        {rows === null ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <PanelBody>
            <EmptyState
              title="No charities listed"
              body="Add the first one so subscribers have somewhere to send their contribution."
              action={<Button onClick={() => setEditing({ ...blank })}>Add charity</Button>}
            />
          </PanelBody>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Category</TH>
                <TH>Status</TH>
                <TH>Featured</TH>
                <TH />
              </TR>
            </THead>
            <tbody>
              {rows.map((charity) => (
                <TR key={charity.id}>
                  <TD>{charity.name}</TD>
                  <TD className="text-cream-300">{charity.category}</TD>
                  <TD>
                    <Badge tone={charity.is_active ? "sage" : "neutral"}>
                      {charity.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TD>
                  <TD>{charity.is_featured ? <Badge tone="amber">Featured</Badge> : "—"}</TD>
                  <TD className="space-x-2 whitespace-nowrap">
                    <Button variant="outline" size="sm" onClick={() => setEditing(charity)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void toggleActive(charity)}>
                      {charity.is_active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      {editing ? (
        <CharityForm
          charity={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      ) : null}
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function CharityForm({
  charity,
  onCancel,
  onSave,
}: {
  charity: Partial<Charity>;
  onCancel: () => void;
  onSave: (charity: Partial<Charity>) => Promise<void>;
}) {
  const [form, setForm] = React.useState(charity);
  const set = <K extends keyof Charity>(key: K, value: Charity[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-900/70" onClick={onCancel}>
      <aside
        className="h-full w-[min(34rem,100vw)] overflow-y-auto border-l border-line-700 bg-ink-800 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">
            {charity.id ? "Edit charity" : "Add charity"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Close
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="Name">
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Slug">
              <Input
                value={form.slug ?? ""}
                placeholder={slugify(form.name ?? "")}
                onChange={(e) => set("slug", e.target.value)}
              />
            </Field>
            <Field label="Category">
              <Input value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} />
            </Field>
          </div>
          <Field label="Short description">
            <Input
              value={form.short_description ?? ""}
              onChange={(e) => set("short_description", e.target.value)}
            />
          </Field>
          <Field label="Full description">
            <Textarea
              className="min-h-36"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Logo URL">
              <Input value={form.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} />
            </Field>
            <Field label="Cover image URL">
              <Input value={form.cover_url ?? ""} onChange={(e) => set("cover_url", e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center justify-between border-t border-line-700 pt-4">
            <div>
              <p className="text-sm text-cream-100">Feature on the homepage</p>
              <p className="text-sm text-cream-300">Only one charity shows in the spotlight at a time.</p>
            </div>
            <Switch
              checked={form.is_featured ?? false}
              onCheckedChange={(checked) => set("is_featured", checked)}
              aria-label="Feature on the homepage"
            />
          </div>

          <Button onClick={() => void onSave(form)} className="w-full">
            {charity.id ? "Save changes" : "Add charity"}
          </Button>
        </div>

        {charity.id ? <EventsEditor charityId={charity.id} /> : null}
      </aside>
    </div>
  );
}

function EventsEditor({ charityId }: { charityId: string }) {
  const { toast } = useToast();
  const [events, setEvents] = React.useState<CharityEvent[] | null>(null);
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [location, setLocation] = React.useState("");

  const load = React.useCallback(async () => {
    const { data } = await supabase
      .from("charity_events")
      .select("*")
      .eq("charity_id", charityId)
      .order("event_date");
    setEvents((data as CharityEvent[]) ?? []);
  }, [charityId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function addEvent() {
    if (!title.trim() || !date) return toast("An event needs a title and a date.", "error");
    const { error } = await supabase
      .from("charity_events")
      .insert({ charity_id: charityId, title, event_date: date, location });
    if (error) return toast("That event didn't save.", "error");
    setTitle("");
    setDate("");
    setLocation("");
    toast("Event added.", "success");
    await load();
  }

  async function removeEvent(id: string) {
    await supabase.from("charity_events").delete().eq("id", id);
    toast("Event removed.", "success");
    await load();
  }

  return (
    <section className="mt-10 border-t border-line-700 pt-6">
      <h3 className="font-display text-lg">Events</h3>
      {events && events.length > 0 ? (
        <ul className="mt-3 divide-y divide-line-700 border border-line-700">
          {events.map((event) => (
            <li key={event.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <p className="text-sm text-cream-100">{event.title}</p>
                <p className="tnum text-xs text-cream-300">
                  {formatDate(event.event_date)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void removeEvent(event.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-cream-300">No events on this profile yet.</p>
      )}

      <div className="mt-4 space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="tnum" />
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
        </div>
        <Button variant="outline" onClick={() => void addEvent()}>
          Add event
        </Button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
