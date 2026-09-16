import type {
  AuditEntry,
  Charity,
  CharityEvent,
  Draw,
  DrawEntry,
  Payment,
  Profile,
  Score,
  Subscription,
  Winner,
} from "./types";

type Table<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      charities: Table<Charity>;
      charity_events: Table<CharityEvent>;
      subscriptions: Table<Subscription>;
      payments: Table<Payment>;
      scores: Table<Score>;
      draws: Table<Draw>;
      draw_entries: Table<DrawEntry>;
      winners: Table<Winner>;
      audit_log: Table<AuditEntry>;
      app_settings: Table<{ key: string; value: string; updated_at: string }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
