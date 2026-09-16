// Creates a Razorpay order. The key secret lives only in Edge Function secrets,
// so the browser never sees it and can never name its own price: the amount for
// a subscription is taken from the server-side plan table, not the request.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PLANS: Record<string, number> = { monthly: 49900, yearly: 499000 };
const PRIZE_POOL_PCT = 30;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await anon.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const body = await req.json();
    const kind = body.kind === "donation" ? "donation" : "subscription";

    let amount: number;
    let charityPaise = 0;
    let prizePoolPaise = 0;
    let contributionPct = 10;

    if (kind === "subscription") {
      amount = PLANS[body.plan as string];
      if (!amount) return json({ error: "Unknown plan" }, 400);

      contributionPct = Math.min(100, Math.max(10, Number(body.contribution_pct ?? 10)));
      charityPaise = Math.round((amount * contributionPct) / 100);
      prizePoolPaise = Math.min(Math.round((amount * PRIZE_POOL_PCT) / 100), amount - charityPaise);

      await supabase
        .from("profiles")
        .update({ charity_id: body.charity_id ?? null, contribution_pct: contributionPct })
        .eq("id", user.id);
    } else {
      amount = Math.round(Number(body.amount_paise ?? 0));
      if (!Number.isFinite(amount) || amount < 5000) {
        return json({ error: "Donations start at ₹50" }, 400);
      }
      charityPaise = amount; // a direct donation goes to the charity in full
    }

    const auth = btoa(`${Deno.env.get("RAZORPAY_KEY_ID")}:${Deno.env.get("RAZORPAY_KEY_SECRET")}`);
    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount,
        currency: "INR",
        notes: { user_id: user.id, kind, plan: body.plan ?? "", charity_id: body.charity_id ?? "" },
      }),
    });

    if (!orderResponse.ok) {
      return json({ error: "Razorpay rejected the order" }, 502);
    }
    const order = await orderResponse.json();

    await supabase.from("payments").insert({
      user_id: user.id,
      kind,
      amount_paise: amount,
      charity_id: body.charity_id ?? null,
      charity_paise: charityPaise,
      prize_pool_paise: prizePoolPaise,
      razorpay_order_id: order.id,
      status: "created",
    });

    if (kind === "subscription") {
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        plan: body.plan,
        status: "pending",
        amount_paise: amount,
        razorpay_order_id: order.id,
      });
    }

    return json({ order_id: order.id, amount, currency: "INR" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Order creation failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
