export type Role = "subscriber" | "admin";
export type PlanInterval = "monthly" | "yearly";
export type SubscriptionStatus = "pending" | "active" | "cancelled" | "lapsed";
export type DrawType = "random" | "algorithmic";
export type DrawStatus = "draft" | "simulated" | "published";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type PayoutStatus = "unpaid" | "paid";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  charity_id: string | null;
  contribution_pct: number;
  notifications_enabled: boolean;
  is_suspended: boolean;
  created_at: string;
}

export interface Charity {
  id: string;
  name: string;
  slug: string;
  category: string;
  short_description: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CharityEvent {
  id: string;
  charity_id: string;
  title: string;
  event_date: string;
  location: string | null;
  image_url: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanInterval;
  status: SubscriptionStatus;
  amount_paise: number;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  kind: "subscription" | "donation";
  amount_paise: number;
  charity_id: string | null;
  charity_paise: number;
  prize_pool_paise: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: "created" | "paid" | "failed";
  created_at: string;
}

export interface Score {
  id: string;
  user_id: string;
  score: number;
  played_on: string;
  created_at: string;
}

export interface Draw {
  id: string;
  draw_month: string;
  type: DrawType;
  status: DrawStatus;
  winning_numbers: number[] | null;
  pool_paise: number;
  rollover_in_paise: number;
  rollover_out_paise: number;
  split_5: number;
  split_4: number;
  split_3: number;
  active_subscribers: number;
  entries_count: number;
  draws_at: string;
  published_at: string | null;
  created_at: string;
}

export interface DrawEntry {
  id: string;
  draw_id: string;
  user_id: string;
  numbers: number[];
  match_count: number | null;
  created_at: string;
}

export interface Winner {
  id: string;
  draw_id: string;
  user_id: string;
  tier: 3 | 4 | 5;
  amount_paise: number;
  proof_url: string | null;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  payout_status: PayoutStatus;
  paid_at: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

/** Joined shapes used by list screens. */
export type WinnerWithContext = Winner & {
  profile: Pick<Profile, "id" | "full_name" | "email"> | null;
  draw: Pick<Draw, "id" | "draw_month"> | null;
};

export type DrawEntryWithDraw = DrawEntry & { draw: Draw | null };
