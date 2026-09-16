-- Digital Heroes — database schema
-- Run in the Supabase SQL editor of a fresh project, then run seed.sql.
-- Money is stored in paise (integers) everywhere. No floats touch the pool maths.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('subscriber', 'admin');
create type plan_interval as enum ('monthly', 'yearly');
create type subscription_status as enum ('pending', 'active', 'cancelled', 'lapsed');
create type draw_type as enum ('random', 'algorithmic');
create type draw_status as enum ('draft', 'simulated', 'published');
create type verification_status as enum ('pending', 'approved', 'rejected');
create type payout_status as enum ('unpaid', 'paid');
create type payment_kind as enum ('subscription', 'donation');
create type payment_status as enum ('created', 'paid', 'failed');

-- ---------------------------------------------------------------------------
-- Charities
-- ---------------------------------------------------------------------------
create table charities (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  slug              text not null unique,
  category          text not null default 'General',
  short_description text,
  description       text,
  logo_url          text,
  cover_url         text,
  is_featured       boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create table charity_events (
  id          uuid primary key default gen_random_uuid(),
  charity_id  uuid not null references charities(id) on delete cascade,
  title       text not null,
  event_date  date not null,
  location    text,
  image_url   text
);
create index on charity_events (charity_id, event_date);

-- ---------------------------------------------------------------------------
-- Profiles — one row per auth user
-- ---------------------------------------------------------------------------
create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  full_name             text,
  avatar_url            text,
  role                  user_role not null default 'subscriber',
  charity_id            uuid references charities(id) on delete set null,
  contribution_pct      int not null default 10 check (contribution_pct between 10 and 100),
  notifications_enabled boolean not null default true,
  show_in_winners       boolean not null default true,
  is_suspended          boolean not null default false,
  created_at            timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Subscriptions and payments
-- ---------------------------------------------------------------------------
create table subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references profiles(id) on delete cascade,
  plan                 plan_interval not null,
  status               subscription_status not null default 'pending',
  amount_paise         int not null,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  razorpay_order_id    text,
  razorpay_payment_id  text,
  created_at           timestamptz not null default now()
);
create index on subscriptions (user_id, created_at desc);

create table payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  subscription_id     uuid references subscriptions(id) on delete set null,
  kind                payment_kind not null,
  amount_paise        int not null,
  charity_id          uuid references charities(id) on delete set null,
  charity_paise       int not null default 0,
  prize_pool_paise    int not null default 0,
  razorpay_order_id   text unique,
  razorpay_payment_id text,
  status              payment_status not null default 'created',
  created_at          timestamptz not null default now()
);
create index on payments (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Scores — only the five most recent per user are ever retained
-- ---------------------------------------------------------------------------
create table scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  score      int not null check (score between 1 and 45),
  played_on  date not null,
  created_at timestamptz not null default now(),
  unique (user_id, played_on)          -- one entry per date; edit, don't duplicate
);
create index on scores (user_id, played_on desc);

-- The rolling-five rule is enforced in the database, not just the UI, so an API
-- client or an admin edit can't leave a sixth score behind.
create or replace function enforce_rolling_five()
returns trigger language plpgsql as $$
begin
  delete from scores
  where user_id = new.user_id
    and id not in (
      select id from scores
      where user_id = new.user_id
      order by played_on desc, created_at desc
      limit 5
    );
  return null;
end;
$$;

create trigger scores_rolling_five
  after insert on scores
  for each row execute function enforce_rolling_five();

-- ---------------------------------------------------------------------------
-- Draws
-- ---------------------------------------------------------------------------
create table draws (
  id                 uuid primary key default gen_random_uuid(),
  draw_month         date not null unique,       -- always the 1st of the month
  type               draw_type not null default 'random',
  status             draw_status not null default 'draft',
  winning_numbers    int[] check (winning_numbers is null or array_length(winning_numbers, 1) = 5),
  pool_paise         int not null default 0,
  rollover_in_paise  int not null default 0,
  rollover_out_paise int not null default 0,
  split_5            int not null default 40,
  split_4            int not null default 35,
  split_3            int not null default 25,
  active_subscribers int not null default 0,
  entries_count      int not null default 0,
  draws_at           timestamptz not null,
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  constraint split_totals_100 check (split_5 + split_4 + split_3 = 100)
);

create table draw_entries (
  id          uuid primary key default gen_random_uuid(),
  draw_id     uuid not null references draws(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  numbers     int[] not null check (array_length(numbers, 1) = 5),
  match_count int,
  created_at  timestamptz not null default now(),
  unique (draw_id, user_id)
);
create index on draw_entries (draw_id);

-- Every paid subscription feeds the open draw's pool as soon as it lands.
create or replace function accrue_prize_pool()
returns trigger language plpgsql as $$
declare
  open_draw_id uuid;
begin
  if new.status = 'paid' and new.kind = 'subscription' and new.prize_pool_paise > 0 then
    select id into open_draw_id
    from draws
    where status <> 'published'
    order by draw_month
    limit 1;

    if open_draw_id is not null then
      update draws
      set pool_paise = pool_paise + new.prize_pool_paise
      where id = open_draw_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger payments_accrue_pool
  after insert or update of status on payments
  for each row execute function accrue_prize_pool();

-- Keep the entry counter honest without a client round trip.
create or replace function refresh_entries_count()
returns trigger language plpgsql as $$
begin
  update draws d
  set entries_count = (select count(*) from draw_entries where draw_id = d.id)
  where d.id = coalesce(new.draw_id, old.draw_id);
  return null;
end;
$$;

create trigger draw_entries_count
  after insert or delete on draw_entries
  for each row execute function refresh_entries_count();

-- ---------------------------------------------------------------------------
-- Winners
-- ---------------------------------------------------------------------------
create table winners (
  id                  uuid primary key default gen_random_uuid(),
  draw_id             uuid not null references draws(id) on delete cascade,
  user_id             uuid not null references profiles(id) on delete cascade,
  tier                int not null check (tier in (3, 4, 5)),
  amount_paise        int not null,
  proof_url           text,
  verification_status verification_status not null default 'pending',
  rejection_reason    text,
  payout_status       payout_status not null default 'unpaid',
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  unique (draw_id, user_id),
  -- A payout can only be released once the proof has been approved.
  constraint paid_requires_approval
    check (payout_status = 'unpaid' or verification_status = 'approved')
);

create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references profiles(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  meta       jsonb,
  created_at timestamptz not null default now()
);

create table app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

insert into app_settings (key, value) values
  ('prize_pool_pct', '30'),
  ('min_contribution_pct', '10')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Helper: is the caller an admin?
-- ---------------------------------------------------------------------------
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Public read-only views (anon can read these; underlying tables stay locked)
-- ---------------------------------------------------------------------------
create or replace view public_stats
with (security_invoker = off) as
select
  coalesce((select sum(charity_paise) from payments where status = 'paid'), 0)::bigint as total_charity_paise,
  coalesce((select pool_paise + rollover_in_paise from draws where status <> 'published'
            order by draw_month limit 1), 0)::bigint as prize_pool_paise,
  (select count(*) from subscriptions where status = 'active')::bigint as subscriber_count,
  (select draws_at from draws where status <> 'published' order by draw_month limit 1) as next_draw_at,
  (select draw_month from draws where status <> 'published' order by draw_month limit 1) as draw_month;

create or replace view public_winners
with (security_invoker = off) as
select
  split_part(coalesce(p.full_name, 'A member'), ' ', 1) as first_name,
  w.amount_paise,
  w.tier,
  d.draw_month
from winners w
join profiles p on p.id = w.user_id
join draws d on d.id = w.draw_id
where w.payout_status = 'paid' and p.show_in_winners
order by w.paid_at desc nulls last;

grant select on public_stats, public_winners to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table profiles       enable row level security;
alter table charities      enable row level security;
alter table charity_events enable row level security;
alter table subscriptions  enable row level security;
alter table payments       enable row level security;
alter table scores         enable row level security;
alter table draws          enable row level security;
alter table draw_entries   enable row level security;
alter table winners        enable row level security;
alter table audit_log      enable row level security;
alter table app_settings   enable row level security;

-- Charities are public reading, admin writing.
create policy "charities are public" on charities for select using (true);
create policy "admins manage charities" on charities for all using (is_admin()) with check (is_admin());
create policy "events are public" on charity_events for select using (true);
create policy "admins manage events" on charity_events for all using (is_admin()) with check (is_admin());

-- Profiles: your own row, or anything if you're an admin.
create policy "read own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "update own profile" on profiles
  for update using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- Only an admin can hand out the admin role. A subscriber editing their own row
-- cannot escalate, because role changes are blocked by this trigger.
create or replace function guard_role_change()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Only an administrator can change a role';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on profiles
  for each row execute function guard_role_change();

-- Subscriptions and payments are written by the Edge Functions (service role),
-- which bypasses RLS. Clients read their own and may only flag a cancellation.
create policy "read own subscription" on subscriptions for select using (user_id = auth.uid() or is_admin());
create policy "cancel own subscription" on subscriptions
  for update using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
create policy "read own payments" on payments for select using (user_id = auth.uid() or is_admin());

-- Scores: yours to write, subject to an active subscription.
create policy "read own scores" on scores for select using (user_id = auth.uid() or is_admin());
create policy "write own scores" on scores
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from subscriptions s
      where s.user_id = auth.uid()
        and s.status = 'active'
        and (s.current_period_end is null or s.current_period_end > now())
    )
    and not exists (select 1 from profiles p where p.id = auth.uid() and p.is_suspended)
  );
create policy "edit own scores" on scores
  for update using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
create policy "delete own scores" on scores for delete using (user_id = auth.uid() or is_admin());

-- Draws are readable by everyone signed in; only admins configure them.
create policy "read draws" on draws for select using (true);
create policy "admins manage draws" on draws for all using (is_admin()) with check (is_admin());

create policy "read own entries" on draw_entries for select using (user_id = auth.uid() or is_admin());
create policy "write own entries" on draw_entries
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from draws d where d.id = draw_id and d.status <> 'published')
  );
create policy "update own entries" on draw_entries
  for update using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
create policy "delete own entries" on draw_entries for delete using (user_id = auth.uid() or is_admin());

-- Winners: read your own, upload your own proof, admins do the rest.
create policy "read own winnings" on winners for select using (user_id = auth.uid() or is_admin());
create policy "upload own proof" on winners
  for update using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
create policy "admins manage winners" on winners for all using (is_admin()) with check (is_admin());

create policy "admins read audit" on audit_log for select using (is_admin());
create policy "admins write audit" on audit_log
  for insert with check (is_admin() and (actor_id is null or actor_id = auth.uid()));

create policy "settings are readable" on app_settings for select using (true);
create policy "admins change settings" on app_settings for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Storage: winner proof screenshots, private by default
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

create policy "upload own proof file" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "replace own proof file" on storage.objects
  for update to authenticated
  using (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "read own or any proof" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );
