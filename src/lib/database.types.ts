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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };

      charities: {
        Row: Charity;
        Insert: Partial<Charity>;
        Update: Partial<Charity>;
        Relationships: [];
      };

      charity_events: {
        Row: CharityEvent;
        Insert: Partial<CharityEvent>;
        Update: Partial<CharityEvent>;
        Relationships: [];
      };

      subscriptions: {
        Row: Subscription;
        Insert: Partial<Subscription>;
        Update: Partial<Subscription>;
        Relationships: [];
      };

      payments: {
        Row: Payment;
        Insert: Partial<Payment>;
        Update: Partial<Payment>;
        Relationships: [];
      };

      scores: {
        Row: Score;
        Insert: Partial<Score>;
        Update: Partial<Score>;
        Relationships: [];
      };

      draws: {
        Row: Draw;
        Insert: Partial<Draw>;
        Update: Partial<Draw>;
        Relationships: [];
      };

      draw_entries: {
        Row: DrawEntry;
        Insert: Partial<DrawEntry>;
        Update: Partial<DrawEntry>;
        Relationships: [];
      };

      winners: {
        Row: Winner;
        Insert: Partial<Winner>;
        Update: Partial<Winner>;
        Relationships: [];
      };

      audit_log: {
        Row: AuditEntry;
        Insert: Partial<AuditEntry>;
        Update: Partial<AuditEntry>;
        Relationships: [];
      };

      app_settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key?: string;
          value?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: Record<string, never>;

    Enums: Record<string, never>;

    CompositeTypes: Record<string, never>;
  };
}
