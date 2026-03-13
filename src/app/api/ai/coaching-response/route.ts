import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGroqClient, DEFAULT_MODEL } from "@/lib/groq";
import {
  buildCoachingResponsePrompt,
  buildGenericCoachingResponsePrompt,
} from "@/lib/prompts/coaching-response";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { habitId, missedReason } = body;

  // Get profile + habit
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: habit } = await supabase
    .from("habits")
    .select("*")
    .eq("id", habitId)
    .single();

  if (!profile || !habit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let prompt: { system: string; user: string };

  if (profile.treatment === "a") {
    // Treatment A: generic coaching (no personality calibration)
    prompt = buildGenericCoachingResponsePrompt({
      habitGoal: habit.goal,
      habitDescription: habit.ai_plan?.habit || habit.goal,
      missedReason,
      consecutiveMisses: habit.consecutive_misses + 1,
      currentSrbai: Number(habit.current_srbai),
    });
  } else {
    // Treatment B: personalized coaching
    prompt = buildCoachingResponsePrompt({
      tipiScores: profile.tipi_scores,
      habitGoal: habit.goal,
      habitDescription: habit.ai_plan?.habit || habit.goal,
      missedReason,
      consecutiveMisses: habit.consecutive_misses + 1,
      currentSrbai: Number(habit.current_srbai),
    });
  }

  try {
    const completion = await getGroqClient().chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.7,
    });

    const message = completion.choices[0]?.message?.content || "";

    return NextResponse.json({ message });
  } catch (e) {
    console.error("AI coaching response failed:", e);
    return NextResponse.json(
      { error: "Failed to generate coaching response" },
      { status: 500 }
    );
  }
}
