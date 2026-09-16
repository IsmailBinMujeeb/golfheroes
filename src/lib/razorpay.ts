import { supabase } from "./supabase";
import type { PlanInterval } from "./types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export const PLANS: Record<PlanInterval, { label: string; pricePaise: number; note: string }> = {
  monthly: { label: "Monthly", pricePaise: 49900, note: "Billed every month, cancel any time" },
  yearly: { label: "Yearly", pricePaise: 499000, note: "Two months free compared with monthly" },
};

export function yearlySavingPct() {
  const twelveMonths = PLANS.monthly.pricePaise * 12;
  return Math.round(((twelveMonths - PLANS.yearly.pricePaise) / twelveMonths) * 100);
}

async function loadCheckout(): Promise<void> {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay checkout could not load. Check your connection."));
    document.body.appendChild(script);
  });
}

interface OrderPayload {
  kind: "subscription" | "donation";
  plan?: PlanInterval;
  amount_paise?: number;
  charity_id?: string | null;
  contribution_pct?: number;
}

/**
 * Orders are created by an Edge Function so the Razorpay key secret never
 * reaches the browser, and the signature is verified server-side before any
 * subscription row is marked active.
 */
export async function startCheckout(
  payload: OrderPayload,
  user: { email: string; name?: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await loadCheckout();

    const { data: order, error } = await supabase.functions.invoke("razorpay-create-order", {
      body: payload,
    });
    if (error) throw new Error(error.message);

    const verified = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const rzp = new window.Razorpay!({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        order_id: order.order_id,
        amount: order.amount,
        currency: "INR",
        name: "Digital Heroes",
        description:
          payload.kind === "donation" ? "Donation" : `${payload.plan === "yearly" ? "Yearly" : "Monthly"} subscription`,
        prefill: { email: user.email, name: user.name ?? "" },
        theme: { color: "#4C7C59" },
        modal: {
          ondismiss: () => resolve({ ok: false, error: "Payment cancelled before it completed." }),
        },
        handler: async (response: Record<string, string>) => {
          const { error: verifyError } = await supabase.functions.invoke("razorpay-verify", {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          });
          resolve(verifyError ? { ok: false, error: verifyError.message } : { ok: true });
        },
      });
      rzp.open();
    });

    return verified.ok ? { ok: true } : { ok: false, error: verified.error ?? "Payment failed." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Payment could not start." };
  }
}
