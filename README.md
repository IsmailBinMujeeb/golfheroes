# Digital Heroes

A subscription platform where golfers log Stableford scores, part of every
subscription goes to a charity they choose, and those same scores become their
numbers in a monthly draw.

Built against the Digital Heroes PRD v1.0 and its UI specification.

**Stack:** React 18 · Vite · TypeScript · Tailwind CSS · shadcn-style components
(Radix) · Supabase (Postgres, Auth, Storage, Edge Functions) · Razorpay ·
Recharts.

---

## 1. Prerequisites

- Node.js 18 or newer
- A **new** Supabase project (not a personal or existing one)
- A **new** Vercel account for deployment (not a personal or existing one)
- A Razorpay account — test mode is fine for the selection process

---

## 2. Install and run locally

```bash
npm install
cp .env.example .env     # then fill in the values from step 3
npm run dev
```

The app runs at `http://localhost:5173`. Until Supabase is configured the
console will tell you so and pages will render empty.

---

## 3. Environment variables

Create `.env` in the project root:

```bash
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
```

Find the first two in Supabase under **Project Settings → API**. The Razorpay
key ID is in the Razorpay dashboard under **Settings → API Keys**.

The Razorpay **key secret** deliberately never appears here. It lives in Edge
Function secrets (step 5) so the browser cannot see it.

---

## 4. Set up the database

In the Supabase dashboard, open the **SQL Editor** and run the two files in
order:

1. `supabase/schema.sql` — tables, enums, triggers, row level security, the
   public views and the private storage bucket for proof screenshots.
2. `supabase/seed.sql` — five charities with events, and an open draw for the
   current month so the dashboard has something to show.

Then enable the auth providers you want under **Authentication → Providers**.
Email/password works out of the box. For the "Continue with Google" button, turn
on the Google provider and add your site URL to the redirect allowlist.

### Make yourself an admin

Sign up through the app first, then run:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

Log out and back in, and `/admin` opens. Roles cannot be changed from the
client — a database trigger blocks any role edit that doesn't come from an
existing admin.

---

## 5. Deploy the Edge Functions

Three functions handle everything that must not be trusted to the browser.

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>

supabase secrets set \
  RAZORPAY_KEY_ID=rzp_test_xxxxxxxx \
  RAZORPAY_KEY_SECRET=your_key_secret

supabase functions deploy razorpay-create-order
supabase functions deploy razorpay-verify
supabase functions deploy delete-account
```

| Function | What it does |
|---|---|
| `razorpay-create-order` | Creates the Razorpay order. The amount comes from a server-side plan table, never from the request, so a user cannot name their own price. |
| `razorpay-verify` | Recomputes the HMAC signature before anything is marked paid. A forged callback cannot activate a subscription. |
| `delete-account` | Deletes the caller's own auth user; profile, scores and entries cascade. |

---

## 6. Deploy to Vercel

```bash
npm install -g vercel
vercel          # first deploy, creates the project
vercel --prod
```

Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_RAZORPAY_KEY_ID`
under **Project → Settings → Environment Variables**, then redeploy.

`vercel.json` already rewrites all routes to `index.html`, which client-side
routing needs. After deploying, add your Vercel URL to Supabase under
**Authentication → URL Configuration** so email links and OAuth redirect back
correctly.

---

## 7. Test credentials to hand over

Create these through the app, then note them in your submission:

| Role | How |
|---|---|
| Subscriber | Sign up, subscribe with Razorpay test card `4111 1111 1111 1111`, any future expiry, any CVV. |
| Admin | Sign up separately, then run the `update profiles` statement from step 4. |

---

## 8. Project layout

```
src/
  components/
    ui/        Button, Input, Panel, Badge, Tabs, Dialog, Slider, Switch,
               Table, Skeleton, Toast — shadcn-style, built on Radix
    layout/    Three distinct shells: public, subscriber, admin, plus guards
    shared/    DrawNumbers, Countdown, CharityPicker, SubscribeGate, states
  pages/
    public/    Home, HowItWorks, Charities, CharityDetail, Auth, Subscribe
    app/       Dashboard, Scores, Draws, CharitySettings, Winnings, Account
    admin/     Overview, Users, Draws, Charities, Winners
  lib/
    draw.ts    The draw engine — number generation, matching, prize maths
    entries.ts Keeps a subscriber's draw entry in step with their scores
    razorpay.ts Checkout helper and plan pricing
    supabase.ts, types.ts, database.types.ts, format.ts, utils.ts
  context/
    AuthContext.tsx  Session, profile and live subscription status
supabase/
  schema.sql, seed.sql, functions/
```

---

## 9. How the core logic works

**Scores are the ticket.** Stableford scores run 1–45, and so do the draw
numbers, so a subscriber's five retained scores *are* their five numbers. Log a
sixth score and it replaces the oldest, so the ticket tracks current form.
Identical scores are nudged to the next free number, deterministically, so the
same five scores always produce the same ticket.

**The rolling-five rule is enforced in the database,** not only in the UI. A
trigger on `scores` deletes anything beyond the five most recent, so an API
client or an admin edit can't leave a sixth row behind. One entry per date is a
unique constraint; duplicates must be edited or deleted.

**Two draw types.** Random is a standard lottery pull. Algorithmic weights each
number by how often it appears across the month's entries, with +1 smoothing so
every number stays reachable. Both run through a seeded PRNG, so a simulation is
reproducible and a published result can be re-derived for an audit.

**Money is stored in paise** as integers throughout. No float ever touches the
pool maths. Each tier's pool is divided equally among its winners with the
remainder handed to the first, so tier totals add back to the pool exactly.

**Rollover.** The 5-match pool carries into the next open draw when unclaimed.
The 4- and 3-match tiers do not roll over, per the PRD, so unclaimed amounts
there are reported separately as retained.

---

## 10. Two ambiguities in the PRD, and how they were resolved

**The prize-pool share is never specified,** while subscribers may give up to
100% to charity. Taken literally those two rules collide. The prize pool takes
its fixed cut (30%, in `app_settings`) from what remains *after* the charity
share, so a subscriber giving 100% simply contributes nothing to the pool
instead of pushing the split negative.

**Access control for non-subscribers** is described only as "restricted". A hard
redirect wall is a dead end, so the dashboard keeps its shape and shows blurred
modules behind a "Subscribe to unlock" banner. Writes are still blocked at the
database level: the RLS policy on `scores` requires a live subscription.

---

## 11. Security notes

- Row level security is on for every table. Subscribers reach only their own
  rows; admin access runs through a `security definer` helper.
- Role escalation is blocked by a trigger, not just a policy.
- A payout cannot be marked paid unless verification is approved — that's a
  check constraint, not a UI rule.
- Proof screenshots live in a private bucket, readable only by the uploader and
  admins, and are opened through short-lived signed URLs.
- Subscriptions and payments are written only by the service role inside Edge
  Functions.

---

## 12. Testing checklist

- [ ] Sign up, log in, reset password
- [ ] Subscribe on both monthly and yearly plans
- [ ] Log six scores and confirm the oldest drops away
- [ ] Try a duplicate date and confirm the inline error
- [ ] Change charity and contribution percentage, check the live readout
- [ ] Create a draw, simulate it, re-run it, publish it
- [ ] Confirm an unclaimed jackpot lands in the next draw's rollover
- [ ] Upload proof as a winner; approve, reject with a reason, mark as paid
- [ ] Check every dashboard module and admin screen
- [ ] Resize to mobile: sidebar becomes a tab bar, tables become stacked cards
- [ ] Tab through the app and confirm focus is always visible
