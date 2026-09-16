import { supabase } from "./supabase";
import { numbersFromScores, PICKS } from "./draw";
import type { Draw, Score } from "./types";

/** The draw currently accepting entries, if there is one. */
export async function getOpenDraw(): Promise<Draw | null> {
  const { data } = await supabase
    .from("draws")
    .select("*")
    .neq("status", "published")
    .order("draw_month", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Draw) ?? null;
}

/**
 * Keeps a subscriber's entry in step with their scores. Called after every
 * score insert, edit or delete: five scores means an entry, fewer means none.
 * Published draws are never touched.
 */
export async function syncDrawEntry(userId: string) {
  const draw = await getOpenDraw();
  if (!draw) return { entered: false as const };

  const { data: scoreRows } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("played_on", { ascending: false })
    .limit(PICKS);

  const scores = (scoreRows as Score[]) ?? [];

  if (scores.length < PICKS) {
    await supabase.from("draw_entries").delete().eq("draw_id", draw.id).eq("user_id", userId);
    return { entered: false as const, needed: PICKS - scores.length };
  }

  const numbers = numbersFromScores(scores);
  await supabase
    .from("draw_entries")
    .upsert({ draw_id: draw.id, user_id: userId, numbers }, { onConflict: "draw_id,user_id" });

  return { entered: true as const, numbers, draw };
}
