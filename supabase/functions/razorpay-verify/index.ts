// Verifies the Razorpay signature before anything is marked paid. A forged
// callback from the browser cannot activate a subscription: without the key
// secret the HMAC will not match.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createHmac } from "node:crypto";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const expected = createHmac("sha256", Deno.env.get("RAZORPAY_KEY_SECRET")!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return json({ error: "Signature did not match" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .maybeSingle();

    if (!payment) return json({ error: "No order on record" }, 404);
    if (payment.status === "paid") return json({ ok: true, already: true });

    await supabase
      .from("payments")
      .update({ status: "paid", razorpay_payment_id })
      .eq("id", payment.id);

    if (payment.kind === "subscription") {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("razorpay_order_id", razorpay_order_id)
        .maybeSingle();

      if (subscription) {
        const start = new Date();
        const end = new Date(start);
        if (subscription.plan === "yearly") end.setFullYear(end.getFullYear() + 1);
        else end.setMonth(end.getMonth() + 1);

        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            razorpay_payment_id,
            current_period_start: start.toISOString(),
            current_period_end: end.toISOString(),
          })
          .eq("id", subscription.id);

        // Older subscriptions for this user are superseded.
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("user_id", subscription.user_id)
          .neq("id", subscription.id)
          .eq("status", "active");

        await supabase
          .from("payments")
          .update({ subscription_id: subscription.id })
          .eq("id", payment.id);
      }
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Verification failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
