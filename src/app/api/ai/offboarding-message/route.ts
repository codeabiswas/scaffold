import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGroqClient, DEFAULT_MODEL } from "@/lib/groq";
import { buildOffboardingPrompt } from "@/lib/prompts/offboarding-message";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { habitId } = body;

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

  // Count total check-ins
  const { count } = await supabase
    .from("check_ins")
    .select("*", { count: "exact", head: true })
    .eq("habit_id", habitId)
    .eq("performed", true);

  const prompt = buildOffboardingPrompt({
    tipiScores: profile.tipi_scores,
    habitGoal: habit.goal,
    habitDescription: habit.ai_plan?.habit || habit.goal,
    totalCheckIns: count || 0,
    finalSrbai: Number(habit.current_srbai),
  });

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
    console.error("AI offboarding message failed:", e);
    return NextResponse.json(
      { error: "Failed to generate message" },
      { status: 500 }
    );
  }
}
